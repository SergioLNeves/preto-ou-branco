package com.pretoobranco.app

import android.content.Intent
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

private const val TAG = "MobilePlugin"

/**
 * Capacitor plugin that bridges the JavaScript side to the Go server
 * running inside HostService (via the gomobile-generated AAR).
 *
 * Registered in MainActivity via addPlugin(MobilePlugin::class.java).
 *
 * JavaScript usage (via host-bridge.ts):
 *   Capacitor.Plugins.MobilePlugin.startServer()
 *   Capacitor.Plugins.MobilePlugin.startTunnel({ path: "..." })
 *   Capacitor.Plugins.MobilePlugin.getServerStatus()
 *   Capacitor.Plugins.MobilePlugin.stopTunnel()
 *   Capacitor.Plugins.MobilePlugin.stopServer()
 */
@CapacitorPlugin(name = "MobilePlugin")
class MobilePlugin : Plugin() {

    /** Starts HostService (which starts the Go server). */
    @PluginMethod
    fun startServer(call: PluginCall) {
        try {
            val intent = Intent(context, HostService::class.java)
            context.startForegroundService(intent)
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "startServer failed: ${e.message}")
            call.reject(e.message)
        }
    }

    /** Stops HostService and the Go server. */
    @PluginMethod
    fun stopServer(call: PluginCall) {
        try {
            val intent = Intent(context, HostService::class.java)
            context.stopService(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    /**
     * Starts the Cloudflare tunnel. cloudflared ships as a native library
     * (jniLibs/<abi>/libcloudflared.so) so the OS extracts it to
     * nativeLibraryDir, which is the only writable-at-install,
     * executable-at-runtime location allowed by Android's W^X policy.
     * The call blocks until the tunnel URL is ready or errors (~10–30s).
     * Run this on a background thread — Capacitor does this automatically.
     */
    @PluginMethod
    fun startTunnel(call: PluginCall) {
        try {
            val binPath = cloudflaredBinaryPath()
            val url = mobile.Mobile.startTunnel(binPath)
            val result = JSObject()
            result.put("url", url)
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "startTunnel failed: ${e.message}")
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun stopTunnel(call: PluginCall) {
        try {
            mobile.Mobile.stopTunnel()
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    /** Returns server/tunnel status as a JSON object. */
    @PluginMethod
    fun getServerStatus(call: PluginCall) {
        try {
            val json = mobile.Mobile.getServerStatus()
            call.resolve(JSObject(json))
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    /**
     * Returns the path to libcloudflared.so inside nativeLibraryDir, where the
     * package manager already extracted it (read-only, executable) at install
     * time. Built from mobile/android/app/src/main/jniLibs/<abi>/libcloudflared.so.
     */
    private fun cloudflaredBinaryPath(): String {
        val path = context.applicationInfo.nativeLibraryDir + "/libcloudflared.so"
        if (!java.io.File(path).exists()) {
            throw UnsupportedOperationException(
                "Tunnel indisponível neste dispositivo. Compartilhe o link pelo IP local."
            )
        }
        return path
    }
}
