package com.devesh.accidentdetector;

import android.Manifest;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;

import java.io.OutputStream;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;

@CapacitorPlugin(
    name = "CrashGuard",
    permissions = {
        @Permission(
            alias = "phone",
            strings = { Manifest.permission.CALL_PHONE }
        )
    }
)
public class CrashGuardPlugin extends Plugin {

    /**
     * Start the foreground monitoring service.
     * Expects: { threshold: number, contacts: string (JSON), emergencyMessage: string }
     */
    @PluginMethod
    public void startMonitoring(PluginCall call) {
        Context context = getContext();

        // Sync settings from JS to SharedPreferences
        float threshold = call.getFloat("threshold", 30f);
        String contacts = call.getString("contacts", "[]");
        String emergencyMessage = call.getString("emergencyMessage",
            "🚨 EMERGENCY! I may have been in a road accident. Please call emergency services. My location:");

        SharedPreferences prefs = context.getSharedPreferences("CrashGuardPrefs", Context.MODE_PRIVATE);
        prefs.edit()
            .putFloat("threshold", threshold)
            .putString("contacts", contacts)
            .putString("emergencyMessage", emergencyMessage)
            .putString("emergencyNumber", call.getString("emergencyNumber", "112"))
            .apply();

        // Start the foreground service
        Intent serviceIntent = new Intent(context, CrashGuardService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    /**
     * Stop the foreground monitoring service.
     */
    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        Context context = getContext();
        Intent serviceIntent = new Intent(context, CrashGuardService.class);
        context.stopService(serviceIntent);

        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    /**
     * Check if the service is currently running.
     */
    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject result = new JSObject();
        result.put("running", CrashGuardService.isRunning);
        call.resolve(result);
    }

    /**
     * Place a phone call without opening the dialer.
     * Expects: { number: string }
     */
    @PluginMethod
    public void makeEmergencyCall(PluginCall call) {
        String number = call.getString("number", "112");

        if (getPermissionState("phone") != PermissionState.GRANTED) {
            // Save the call so we can resume after permission is granted
            requestPermissionForAlias("phone", call, "phonePermissionCallback");
            return;
        }

        doCall(call, number);
    }

    @PermissionCallback
    private void phonePermissionCallback(PluginCall call) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            String number = call.getString("number", "112");
            doCall(call, number);
        } else {
            call.reject("CALL_PHONE permission denied by user");
        }
    }

    private void doCall(PluginCall call, String number) {
        try {
            Context context = getContext();
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + number));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(callIntent);

            JSObject result = new JSObject();
            result.put("called", true);
            result.put("number", number);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to place call: " + e.getMessage(), e);
        }
    }

    /**
     * Check if CALL_PHONE permission is granted.
     */
    @PluginMethod
    public void checkCallPermission(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = getPermissionState("phone") == PermissionState.GRANTED;
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Request CALL_PHONE permission.
     */
    @PluginMethod
    public void requestCallPermission(PluginCall call) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("phone", call, "requestCallPermCb");
    }

    @PermissionCallback
    private void requestCallPermCb(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = getPermissionState("phone") == PermissionState.GRANTED;
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Save a base64 encoded video to the public gallery using MediaStore.
     */
    @PluginMethod
    public void saveVideoToGallery(PluginCall call) {
        String base64Data = call.getString("data");
        String fileName = call.getString("fileName", "accident_evidence_" + System.currentTimeMillis() + ".mp4");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Media data is required");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }
            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);

            Context context = getContext();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/CrashGuard");
                values.put(MediaStore.Video.Media.IS_PENDING, 1);
            }

            Uri uri = context.getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);

            if (uri != null) {
                try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
                    os.write(decodedBytes);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.clear();
                    values.put(MediaStore.Video.Media.IS_PENDING, 0);
                    context.getContentResolver().update(uri, values, null, null);
                }
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("path", uri.toString());
                call.resolve(result);
            } else {
                call.reject("Failed to create MediaStore entry");
            }
        } catch (Exception e) {
            call.reject("Error saving video: " + e.getMessage());
        }
    }

    /**
     * Save a base64 encoded photo to the public gallery using MediaStore.
     */
    @PluginMethod
    public void savePhotoToGallery(PluginCall call) {
        String base64Data = call.getString("data");
        String fileName = call.getString("fileName", "accident_photo_" + System.currentTimeMillis() + ".jpg");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Media data is required");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }
            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);

            Context context = getContext();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/CrashGuard");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
            }

            Uri uri = context.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);

            if (uri != null) {
                try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
                    os.write(decodedBytes);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    context.getContentResolver().update(uri, values, null, null);
                }
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Failed to create MediaStore entry");
            }
        } catch (Exception e) {
            call.reject("Error saving photo: " + e.getMessage());
        }
    }

    /**
     * Acknowledge that the JS countdown has started.
     */
    @PluginMethod
    public void acknowledgeImpact(PluginCall call) {
        CrashGuardService.jsHeartbeatReceived();
        call.resolve();
    }

    /**
     * Abort the native failsafe timer (User is safe).
     */
    @PluginMethod
    public void abortFailsafe(PluginCall call) {
        CrashGuardService.abortFailsafe();
        call.resolve();
    }
}
