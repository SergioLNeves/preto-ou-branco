package com.pretoobranco.app

import android.content.Intent
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(MobilePlugin::class.java)
        super.onCreate(savedInstanceState)
        // savedInstanceState != null means this is a recreation (e.g. rotation),
        // not a fresh process start — HostService is already running, skip restarting it.
        if (savedInstanceState == null) {
            startForegroundService(Intent(this, HostService::class.java))
        }
    }
}
