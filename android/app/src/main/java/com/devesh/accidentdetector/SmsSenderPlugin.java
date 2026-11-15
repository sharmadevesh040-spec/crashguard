package com.devesh.accidentdetector;

import android.Manifest;
import android.telephony.SmsManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "SmsSender",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.SEND_SMS }
        )
    }
)
public class SmsSenderPlugin extends Plugin {

    @PluginMethod
    public void send(PluginCall call) {
        String phone = call.getString("phone");
        String message = call.getString("message");

        if (phone == null || phone.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }
        if (message == null || message.isEmpty()) {
            call.reject("Message is required");
            return;
        }

        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }

        doSend(call, phone, message);
    }

    @PermissionCallback
    protected void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            String phone = call.getString("phone");
            String message = call.getString("message");
            if (phone != null && message != null) {
                doSend(call, phone, message);
            } else {
                call.reject("Missing phone or message after permission grant");
            }
        } else {
            call.reject("SMS permission denied by user");
        }
    }

    private void doSend(PluginCall call, String phone, String message) {
        try {
            SmsManager smsManager = SmsManager.getDefault();

            if (message.length() > 160) {
                ArrayList<String> parts = smsManager.divideMessage(message);
                smsManager.sendMultipartTextMessage(phone, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phone, null, message, null, null);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("phone", phone);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to send SMS: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = getPermissionState("sms") == PermissionState.GRANTED;
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("sms", call, "requestPermissionCb");
    }

    @PermissionCallback
    protected void requestPermissionCb(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = getPermissionState("sms") == PermissionState.GRANTED;
        result.put("granted", granted);
        call.resolve(result);
    }
}
