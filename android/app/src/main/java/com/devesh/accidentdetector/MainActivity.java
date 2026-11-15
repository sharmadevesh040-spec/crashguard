package com.devesh.accidentdetector;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int MIC_PERMISSION_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins register ho rahe hain
        registerPlugin(SmsSenderPlugin.class);
        registerPlugin(CrashGuardPlugin.class);

        super.onCreate(savedInstanceState);

        // 1. Runtime Permission check (Mic ke liye popup aayega)
        checkMicPermission();

        // 2. WebView ko Mic access dene ka system
        setupWebViewMicAccess();
    }

    private void checkMicPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, MIC_PERMISSION_CODE);
        }
    }

    private void setupWebViewMicAccess() {
        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(() -> {
                    // Ye line WebView ko Mic aur Camera ki permission grant karti hai
                    request.grant(request.getResources());
                });
            }
        });
    }
}