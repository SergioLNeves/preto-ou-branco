package com.pretoobranco.app

import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(MobilePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
