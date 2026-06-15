package com.pretoobranco.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.activity.result.contract.ActivityResultContracts
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            // Denying this only hides the "Hospedando sala" notification —
            // HostService still starts and the Go server still runs.
            startHostService()
        }

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(MobilePlugin::class.java)
        super.onCreate(savedInstanceState)
        // savedInstanceState != null means this is a recreation (e.g. rotation),
        // not a fresh process start — HostService is already running, skip restarting it.
        if (savedInstanceState == null) {
            // Android 13+ requires runtime permission to show the foreground
            // service notification. Request it first; startHostService() runs
            // either way (in the permission callback or immediately below).
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                startHostService()
            }
        }
    }

    private fun startHostService() {
        startForegroundService(Intent(this, HostService::class.java))
    }
}
