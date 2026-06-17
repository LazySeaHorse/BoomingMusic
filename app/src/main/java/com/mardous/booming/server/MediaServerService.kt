package com.mardous.booming.server

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import com.mardous.booming.data.local.repository.SongRepository
import com.mardous.booming.ui.screen.MainActivity
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import java.io.File
import java.io.FileInputStream
import java.io.IOException
import java.net.URLDecoder
import java.net.URLEncoder

@Serializable
data class ServerSong(
    val id: Long,
    val title: String,
    val artist: String,
    val album: String,
    val duration: Long,
    val path: String,
    val dateAdded: Long,
    val dateModified: Long,
    val size: Long
)

class MediaServerService : Service(), KoinComponent {
    
    private var server: MediaServer? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val songRepository: SongRepository by inject()
    
    companion object {
        const val CHANNEL_ID = "BoomingServerChannel"
        const val NOTIFICATION_ID = 2390 // Unique notification ID
        const val ACTION_LOG = "com.mardous.booming.ACTION_LOG"
        const val EXTRA_LOG = "log_message"
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        
        server = MediaServer(this, songRepository, 8080).apply {
            try {
                start()
                Log.d("BoomingServer", "Server started on port 8080")
                sendLog("Server started on port 8080")
            } catch (e: IOException) {
                Log.e("BoomingServer", "Failed to start server", e)
                sendLog("Failed to start server: ${e.message}")
            }
        }
    }
    
    override fun onDestroy() {
        server?.stop()
        serviceScope.cancel()
        super.onDestroy()
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Booming Web Server",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Booming Web Server")
            .setContentText("Media server running on ${getIpAddress()}:8080")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .build()
    }
    
    private fun getIpAddress(): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            val ipList = mutableListOf<Pair<String, String>>()
            for (intf in interfaces) {
                if (!intf.isUp || intf.isLoopback) continue
                val addrs = intf.inetAddresses
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address && !addr.isLinkLocalAddress) {
                        val host = addr.hostAddress ?: continue
                        ipList.add(intf.name to host)
                    }
                }
            }
            
            val preferredInterfaces = listOf("wlan", "ap", "softap", "rndis")
            for (pref in preferredInterfaces) {
                val found = ipList.find { it.first.contains(pref, ignoreCase = true) }
                if (found != null) {
                    return found.second
                }
            }
            
            for (ipPair in ipList) {
                val ip = ipPair.second
                if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
                    return ip
                }
            }
            
            if (ipList.isNotEmpty()) {
                return ipList.first().second
            }
        } catch (ex: Exception) {
            Log.e("BoomingServer", "Error getting IP address", ex)
        }
        return "0.0.0.0"
    }
    
    private fun sendLog(message: String) {
        val intent = Intent(ACTION_LOG).apply {
            putExtra(EXTRA_LOG, message)
        }
        sendBroadcast(intent)
    }
    
    inner class MediaServer(
        private val context: Context,
        private val repository: SongRepository,
        port: Int
    ) : NanoHTTPD(port) {
        
        private val json = Json { ignoreUnknownKeys = true }
        
        override fun serve(session: IHTTPSession): Response {
            val uri = session.uri
            val method = session.method
            
            sendLog("$method $uri")
            
            val response = when {
                uri == "/" -> serveAsset("index.html", "text/html")
                uri == "/list" -> handleList()
                uri.startsWith("/stream/") -> handleStream(uri.substring(8), session)
                else -> {
                    // Serve static assets (js, css, svg, etc.) from the assets folder
                    val filename = uri.trimStart('/')
                    val mimeType = getMimeTypeForAsset(filename)
                    if (mimeType != null) {
                        serveAsset(filename, mimeType)
                    } else {
                        newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found")
                    }
                }
            }
            
            return addCorsHeaders(response)
        }
        
        private fun getMimeTypeForAsset(filename: String): String? {
            val ext = filename.substringAfterLast('.', "").lowercase()
            return when (ext) {
                "html" -> "text/html"
                "css" -> "text/css"
                "js" -> "application/javascript"
                "svg" -> "image/svg+xml"
                "json" -> "application/json"
                "png" -> "image/png"
                "jpg", "jpeg" -> "image/jpeg"
                "gif" -> "image/gif"
                "webp" -> "image/webp"
                "woff" -> "font/woff"
                "woff2" -> "font/woff2"
                "ttf" -> "font/ttf"
                else -> null
            }
        }
        
        private fun addCorsHeaders(response: Response): Response {
            response.addHeader("Access-Control-Allow-Origin", "*")
            response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            response.addHeader("Access-Control-Allow-Headers", "Content-Type, Range")
            response.addHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges")
            return response
        }
        
        private fun serveAsset(filename: String, mimeType: String): Response {
            return try {
                val input = context.assets.open(filename)
                newFixedLengthResponse(Response.Status.OK, mimeType, input, input.available().toLong())
            } catch (e: IOException) {
                newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found")
            }
        }
        
        private fun handleList(): Response {
            return runBlocking {
                try {
                    val songs = repository.songs().map { song ->
                        ServerSong(
                            id = song.id,
                            title = song.title,
                            artist = song.artistName,
                            album = song.albumName,
                            duration = song.duration,
                            path = URLEncoder.encode(song.data, "UTF-8"),
                            dateAdded = song.dateAdded,
                            dateModified = song.rawDateModified,
                            size = song.size
                        )
                    }
                    val jsonData = json.encodeToString(songs)
                    newFixedLengthResponse(Response.Status.OK, "application/json", jsonData)
                } catch (e: Exception) {
                    sendLog("Error fetching songs: ${e.message}")
                    newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error: ${e.message}")
                }
            }
        }
        
        private fun handleStream(encodedPath: String, session: IHTTPSession): Response {
            val path = URLDecoder.decode(encodedPath, "UTF-8")
            val file = File(path)
            
            if (!file.exists()) {
                return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "File not found")
            }
            
            val mimeType = when (file.extension.lowercase()) {
                "mp3" -> "audio/mpeg"
                "m4a" -> "audio/mp4"
                "ogg" -> "audio/ogg"
                "flac" -> "audio/flac"
                else -> "audio/*"
            }
            
            val fileLength = file.length()
            val range = session.headers["range"]
            
            return if (range != null) {
                val ranges = parseRange(range, fileLength)
                if (ranges != null) {
                    val (start, end) = ranges
                    val contentLength = end - start + 1
                    
                    val response = newFixedLengthResponse(
                        Response.Status.PARTIAL_CONTENT,
                        mimeType,
                        FileInputStream(file).apply { skip(start) },
                        contentLength
                    )
                    
                    response.addHeader("Content-Range", "bytes $start-$end/$fileLength")
                    response.addHeader("Accept-Ranges", "bytes")
                    response
                } else {
                    newFixedLengthResponse(Response.Status.RANGE_NOT_SATISFIABLE, "text/plain", "Invalid range")
                }
            } else {
                val response = newFixedLengthResponse(
                    Response.Status.OK,
                    mimeType,
                    FileInputStream(file),
                    fileLength
                )
                response.addHeader("Accept-Ranges", "bytes")
                response
            }
        }
        
        private fun parseRange(range: String, fileLength: Long): Pair<Long, Long>? {
            val regex = "bytes=(\\d*)-(\\d*)".toRegex()
            val match = regex.find(range) ?: return null
            
            val start = match.groupValues[1].toLongOrNull() ?: 0
            val end = match.groupValues[2].toLongOrNull() ?: (fileLength - 1)
            
            return if (start <= end && end < fileLength) {
                start to end
            } else {
                null
            }
        }
    }
}
