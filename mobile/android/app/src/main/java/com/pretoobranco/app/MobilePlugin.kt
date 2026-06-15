package com.pretoobranco.app

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
 * HostService (and therefore the Go server) is started/stopped solely by
 * MainActivity — see its onCreate(). Keeping a single start point avoids
 * racing two independent "start the server" entry points.
 *
 * JavaScript usage (via host-bridge.ts):
 *   Capacitor.Plugins.MobilePlugin.startTunnel({ path: "..." })
 *   Capacitor.Plugins.MobilePlugin.getServerStatus()
 *   Capacitor.Plugins.MobilePlugin.stopTunnel()
 */
@CapacitorPlugin(name = "MobilePlugin")
class MobilePlugin : Plugin() {

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
