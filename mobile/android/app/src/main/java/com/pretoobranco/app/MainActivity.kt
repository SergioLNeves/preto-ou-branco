package com.pretoobranco.app

import android.content.Intent
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(MobilePlugin::class.java)
        super.onCreate(savedInstanceState)
        startForegroundService(Intent(this, HostService::class.java))
    }
}
