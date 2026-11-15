package com.devesh.accidentdetector;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

public class CrashGuardService extends Service implements SensorEventListener {

    private static final String TAG = "CrashGuardService";
    private static final String CHANNEL_ID = "crashguard_monitoring";
    private static final int NOTIFICATION_ID = 1001;
    private static final float GRAVITY = 9.81f;
    private static final long COOLDOWN_MS = 10000; // 10s between impacts

    public static boolean isRunning = false;

    private SensorManager sensorManager;
    private Sensor accelerometer;
    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;

    private float threshold = 30f;
    private String emergencyMessage = "";
    private String emergencyNumber = "112";
    private long lastImpactTime = 0;

    private Location lastKnownLocation = null;

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            lastKnownLocation = location;
        }

        @Override
        public void onProviderEnabled(String provider) {}

        @Override
        public void onProviderDisabled(String provider) {}
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
    }

    private static Handler failsafeHandler = new Handler(Looper.getMainLooper());
    private static Runnable failsafeRunnable = null;
    private static CrashGuardService instance = null;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        instance = this;
        Log.d(TAG, "Service starting");

        // Load settings from SharedPreferences (synced from JS)
        loadSettings();

        // Create notification channel and start foreground
        createNotificationChannel();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, buildNotification());
        }

        // Acquire WakeLock to keep CPU running
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "CrashGuard::Monitoring");
        wakeLock.acquire();

        // Start accelerometer
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
            Log.d(TAG, "Accelerometer registered (GAME delay)");
        } else {
            Log.e(TAG, "No accelerometer found!");
        }

        // Start GPS updates
        try {
            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER, 5000, 10, locationListener
            );
            // Get last known location immediately
            lastKnownLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (lastKnownLocation == null) {
                lastKnownLocation = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            }
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission missing: " + e.getMessage());
        }

        isRunning = true;
        return START_STICKY; // Restart if killed
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];

        float magnitude = (float) Math.sqrt(x * x + y * y + z * z);
        float netForce = Math.abs(magnitude - GRAVITY);

        // Impact detection
        long now = System.currentTimeMillis();
        if (netForce > threshold && (now - lastImpactTime) > COOLDOWN_MS) {
            lastImpactTime = now;
            Log.w(TAG, "🚨 IMPACT DETECTED! Force: " + netForce + " m/s²");
            onImpactDetected(netForce);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    private void onImpactDetected(float force) {
        // 1. Wake the UI (Bring app to foreground even if locked)
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        launchIntent.putExtra("impact_detected", true);
        startActivity(launchIntent);

        // 2. Update notification to show high-priority impact
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(NOTIFICATION_ID, buildImpactNotification(force));

        // 3. Start Native Failsafe Timer (20 seconds)
        // If JS doesn't abort this, Java will handle the emergency dispatch.
        abortFailsafe(); // Clear any existing
        failsafeRunnable = () -> {
            Log.w(TAG, "☢️ NATIVE FAILSAFE TRIGGERED! JavaScript UI failed to respond.");
            String message = buildAlertMessage();
            sendSmsToAllContacts(message);
            placeEmergencyCall(emergencyNumber);
        };
        failsafeHandler.postDelayed(failsafeRunnable, 20000);

        Log.d(TAG, "Impact handled - Native Failsafe active (20s)");
    }

    public static void jsHeartbeatReceived() {
        Log.d(TAG, "Heartbeat from JS: UI is active and handling the countdown.");
    }

    public static void abortFailsafe() {
        if (failsafeRunnable != null) {
            Log.d(TAG, "Native failsafe aborted by user/JS.");
            failsafeHandler.removeCallbacks(failsafeRunnable);
            failsafeRunnable = null;
        }
    }

    /**
     * Place a phone call silently without opening the dialer.
     * Requires CALL_PHONE permission.
     */
    public void placeEmergencyCall(String number) {
        if (number == null || number.isEmpty()) {
            Log.w(TAG, "No emergency number configured, skipping auto-call");
            return;
        }

        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CALL_PHONE)
                != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "CALL_PHONE permission not granted — cannot auto-call");
            return;
        }

        try {
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + number));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(callIntent);
            Log.d(TAG, "📞 Auto-calling emergency number: " + number);
        } catch (Exception e) {
            Log.e(TAG, "Failed to place emergency call: " + e.getMessage());
        }
    }

    private String buildAlertMessage() {
        StringBuilder sb = new StringBuilder();
        sb.append(emergencyMessage);

        if (lastKnownLocation != null) {
            double lat = lastKnownLocation.getLatitude();
            double lng = lastKnownLocation.getLongitude();
            sb.append("\nhttps://maps.google.com/maps?q=").append(lat).append(",").append(lng);
            sb.append("\n\nLat: ").append(String.format("%.6f", lat));
            sb.append(", Lng: ").append(String.format("%.6f", lng));
            sb.append("\nAccuracy: ").append(Math.round(lastKnownLocation.getAccuracy())).append("m");
        } else {
            sb.append("\n\nLocation unavailable.");
        }

        sb.append("\nTime: ").append(java.text.DateFormat.getDateTimeInstance().format(new java.util.Date()));
        return sb.toString();
    }

    private void sendSmsToAllContacts(String message) {
        SharedPreferences prefs = getSharedPreferences("CrashGuardPrefs", MODE_PRIVATE);
        String contactsJson = prefs.getString("contacts", "[]");

        try {
            JSONArray contacts = new JSONArray(contactsJson);
            SmsManager smsManager = SmsManager.getDefault();

            for (int i = 0; i < contacts.length(); i++) {
                JSONObject contact = contacts.getJSONObject(i);
                String phone = contact.getString("phone");

                try {
                    if (message.length() > 160) {
                        ArrayList<String> parts = smsManager.divideMessage(message);
                        smsManager.sendMultipartTextMessage(phone, null, parts, null, null);
                    } else {
                        smsManager.sendTextMessage(phone, null, message, null, null);
                    }
                    Log.d(TAG, "✅ SMS sent to: " + phone);
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to send SMS to " + phone + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing contacts: " + e.getMessage());
        }
    }

    private void loadSettings() {
        SharedPreferences prefs = getSharedPreferences("CrashGuardPrefs", MODE_PRIVATE);
        threshold = prefs.getFloat("threshold", 30f);
        emergencyMessage = prefs.getString("emergencyMessage",
            "🚨 EMERGENCY! I may have been in a road accident. Please call emergency services. My location:");
        emergencyNumber = prefs.getString("emergencyNumber", "112");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "CrashGuard Monitoring",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Persistent notification while CrashGuard is monitoring for accidents");
            NotificationManager nm = (NotificationManager) getSystemService(NotificationManager.class);
            nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🛡️ CrashGuard Active")
            .setContentText("Monitoring for accidents in background...")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private Notification buildImpactNotification(float force) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚨 IMPACT DETECTED!")
            .setContentText("Force: " + String.format("%.1f", force) + " m/s² — Emergency SMS sent!")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build();
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed");
        isRunning = false;

        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        if (locationManager != null) {
            locationManager.removeUpdates(locationListener);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }
}
