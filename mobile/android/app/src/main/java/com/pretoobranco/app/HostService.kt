package com.pretoobranco.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log

private const val CHANNEL_ID = "hosting_channel"
private const val NOTIF_ID = 1
private const val TAG = "HostService"

/**
 * Foreground Service that keeps the Go HTTP+WS server alive while the
 * device is hosting a room. Android kills background processes aggressively;
 * the foreground service + persistent notification prevent that.
 *
 * Started by MobilePlugin.startServer(); stopped by MobilePlugin.stopServer().
 */
class HostService : Service() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val dbPath = filesDir.absolutePath + "/app.db"
        val port = 8080

        try {
            mobile.Mobile.startServer(dbPath, port.toLong())
            Log.i(TAG, "Go server iniciado em :$port, db=$dbPath")
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao iniciar servidor Go: ${e.message}")
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIF_ID, buildNotification())
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            mobile.Mobile.stopServer()
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao parar servidor: ${e.message}")
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Hospedando sala")
            .setContentText("Toque para voltar ao jogo")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Hospedagem de sala",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Notificação ativa enquanto o dispositivo estiver hospedando uma sala"
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }
}
