package com.mardous.booming.server

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.mardous.booming.data.local.repository.SongRepository
import com.mardous.booming.playback.PlaybackService
import com.mardous.booming.ui.screen.MainActivity
import com.mardous.booming.util.MEDIA_SERVER_PLAYBACK_TARGET
import com.mardous.booming.util.MediaServerPlaybackTarget
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.http.content.*
import io.ktor.server.plugins.partialcontent.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import java.io.File
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

@Serializable
data class SocketState(
    val type: String,
    val target: String,
    val isPlaying: Boolean,
    val position: Long,
    val shuffle: Boolean,
    val repeat: String,
    val song: ServerSong?
)

@Serializable
data class SocketCommand(
    val type: String,
    val id: Long? = null,
    val position: Long? = null,
    val volume: Float? = null,
    val enabled: Boolean? = null,
    val mode: String? = null,
    val target: String? = null,
    val isPlaying: Boolean? = null
)

class MediaServerService : Service(), KoinComponent {
    
    private var server: EmbeddedServer<CIOApplicationEngine, CIOApplicationEngine.Configuration>? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val songRepository: SongRepository by inject()
    private val preferences: SharedPreferences by inject()
    
    private var mediaController: MediaController? = null
    private var controllerFuture: ListenableFuture<MediaController>? = null
    
    private val webSocketSessions = java.util.Collections.synchronizedList(mutableListOf<WebSocketServerSession>())
    private val json = Json { ignoreUnknownKeys = true }
    private val remoteTargetChangedCallback = { broadcastState() }
    
    companion object {
        const val CHANNEL_ID = "BoomingServerChannel"
        const val NOTIFICATION_ID = 2390
        const val ACTION_LOG = "com.mardous.booming.ACTION_LOG"
        const val EXTRA_LOG = "log_message"
    }
    
    private val playerListener = object : Player.Listener {
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            broadcastState()
        }
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            broadcastState()
        }
        override fun onPositionDiscontinuity(oldPosition: Player.PositionInfo, newPosition: Player.PositionInfo, reason: Int) {
            broadcastState()
        }
        override fun onPlaybackStateChanged(playbackState: Int) {
            broadcastState()
        }
        override fun onShuffleModeEnabledChanged(shuffleModeEnabled: Boolean) {
            broadcastState()
        }
        override fun onRepeatModeChanged(repeatMode: Int) {
            broadcastState()
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        RemoteSyncState.setTarget(
            preferences.getString(MEDIA_SERVER_PLAYBACK_TARGET, MediaServerPlaybackTarget.DEFAULT)
        )
        RemoteSyncState.onTargetChanged = remoteTargetChangedCallback
        
        // Start Ktor server
        startKtorServer()
        
        // Connect MediaController to control & monitor playback
        connectMediaController()
    }
    
    private fun startKtorServer() {
        server = embeddedServer(CIO, port = 8080) {
            install(WebSockets)
            install(PartialContent)
            routing {
                // Serve index.html
                get("/") {
                    call.respondAsset("index.html", "text/html")
                }
                
                // Serve static assets dynamically from app assets
                get("/{filename...}") {
                    val filename = call.parameters.getAll("filename")?.joinToString("/") ?: ""
                    val mimeType = getMimeTypeForAsset(filename)
                    if (mimeType != null) {
                        call.respondAsset(filename, mimeType)
                    } else {
                        call.respond(HttpStatusCode.NotFound)
                    }
                }
                
                // Serve song list JSON
                get("/list") {
                    try {
                        val songs = songRepository.songs().map { song ->
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
                        call.respondText(jsonData, ContentType.Application.Json)
                    } catch (e: Exception) {
                        sendLog("Error fetching songs: ${e.message}")
                        call.respondText("Error: ${e.message}", status = HttpStatusCode.InternalServerError)
                    }
                }
                
                // Stream song endpoint (seekable via PartialContent plugin)
                get("/stream/{encodedPath}") {
                    val encodedPath = call.parameters["encodedPath"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                    val path = URLDecoder.decode(encodedPath, "UTF-8")
                    val file = File(path)
                    if (file.exists()) {
                        call.respond(LocalFileContent(file))
                    } else {
                        call.respond(HttpStatusCode.NotFound)
                    }
                }
                
                // WebSocket casting & remote control channel
                webSocket("/ws") {
                    synchronized(webSocketSessions) { webSocketSessions.add(this) }
                    try {
                        // Send current player state on connect
                        val stateStr = getSerializedState()
                        if (stateStr != null) {
                            send(Frame.Text(stateStr))
                        }
                        
                        for (frame in incoming) {
                            if (frame is Frame.Text) {
                                val message = frame.readText()
                                try {
                                    val cmd = json.decodeFromString<SocketCommand>(message)
                                    handleSocketCommand(cmd)
                                } catch (e: Exception) {
                                    Log.e("BoomingServer", "Error parsing command: $message", e)
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("BoomingServer", "WebSocket error", e)
                    } finally {
                        synchronized(webSocketSessions) { webSocketSessions.remove(this) }
                    }
                }
            }
        }.start(wait = false)
    }
    
    private suspend fun ApplicationCall.respondAsset(filename: String, contentType: String) {
        try {
            val inputStream = this@MediaServerService.assets.open(filename)
            respondOutputStream(ContentType.parse(contentType)) {
                inputStream.copyTo(this)
            }
        } catch (e: Exception) {
            respond(HttpStatusCode.NotFound)
        }
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
    
    private fun connectMediaController() {
        val sessionToken = SessionToken(this, ComponentName(this, PlaybackService::class.java))
        controllerFuture = MediaController.Builder(this, sessionToken).buildAsync()
        controllerFuture?.addListener({
            try {
                mediaController = controllerFuture?.get()
                mediaController?.addListener(playerListener)
                Log.d("BoomingServer", "MediaController connected")
                broadcastState()
            } catch (e: Exception) {
                Log.e("BoomingServer", "Failed to get MediaController", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }
    
    private fun handleSocketCommand(cmd: SocketCommand) {
        val controller = mediaController ?: return
        serviceScope.launch(Dispatchers.Main) {
            when (cmd.type) {
                "SET_TARGET" -> {
                    cmd.target?.let { target ->
                        val normalizedTarget = RemoteSyncState.setTarget(target)
                        preferences.edit {
                            putString(MEDIA_SERVER_PLAYBACK_TARGET, normalizedTarget)
                        }
                    }
                }
                "PLAY" -> {
                    if (!controller.isPlaying) {
                        controller.play()
                    }
                }
                "PAUSE" -> {
                    if (controller.isPlaying) {
                        controller.pause()
                    }
                }
                "TOGGLE_PLAY" -> {
                    if (controller.isPlaying) controller.pause() else controller.play()
                }
                "NEXT" -> {
                    controller.seekToNext()
                }
                "PREV" -> {
                    controller.seekToPrevious()
                }
                "SEEK" -> {
                    cmd.position?.let { pos ->
                        controller.seekTo(pos)
                    }
                }
                "SELECT" -> {
                    cmd.id?.let { songId ->
                        try {
                            val song = songRepository.song(songId)
                            controller.setMediaItem(song.toMediaItem())
                            controller.prepare()
                            controller.play()
                        } catch (e: Exception) {
                            Log.e("BoomingServer", "Failed to select song", e)
                        }
                    }
                }
                "SET_SHUFFLE" -> {
                    cmd.enabled?.let { enabled ->
                        controller.shuffleModeEnabled = enabled
                    }
                }
                "SET_REPEAT" -> {
                    cmd.mode?.let { mode ->
                        val repeatMode = when (mode) {
                            "all" -> Player.REPEAT_MODE_ALL
                            "one" -> Player.REPEAT_MODE_ONE
                            else -> Player.REPEAT_MODE_OFF
                        }
                        controller.repeatMode = repeatMode
                    }
                }
                "WEB_STATE" -> {
                    if (RemoteSyncState.target == MediaServerPlaybackTarget.WEB) {
                        cmd.isPlaying?.let { isPlaying ->
                            if (isPlaying != controller.isPlaying) {
                                if (isPlaying) controller.play() else controller.pause()
                            }
                        }
                        cmd.position?.let { pos ->
                            if (Math.abs(controller.currentPosition - pos) > 2000) {
                                controller.seekTo(pos)
                            }
                        }
                        cmd.id?.let { songId ->
                            val currentItem = controller.currentMediaItem
                            if (currentItem?.mediaId != songId.toString()) {
                                try {
                                    val song = songRepository.song(songId)
                                    controller.setMediaItem(song.toMediaItem())
                                    controller.prepare()
                                    if (cmd.isPlaying == true) controller.play() else controller.pause()
                                } catch (e: Exception) {
                                    // ignore
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    private suspend fun getSerializedState(): String? = withContext(Dispatchers.Main) {
        val controller = mediaController ?: return@withContext null
        val currentItem = controller.currentMediaItem
        val songId = currentItem?.mediaId?.toLongOrNull()
        val song = songId?.let { id ->
            try {
                songRepository.song(id)
            } catch (e: Exception) {
                null
            }
        }
        val serverSong = song?.let {
            ServerSong(
                id = it.id,
                title = it.title,
                artist = it.artistName,
                album = it.albumName,
                duration = it.duration,
                path = URLEncoder.encode(it.data, "UTF-8"),
                dateAdded = it.dateAdded,
                dateModified = it.rawDateModified,
                size = it.size
            )
        }
        val repeatModeStr = when (controller.repeatMode) {
            Player.REPEAT_MODE_ALL -> "all"
            Player.REPEAT_MODE_ONE -> "one"
            else -> "off"
        }
        
        val state = SocketState(
            type = "STATE",
            target = RemoteSyncState.target,
            isPlaying = controller.isPlaying,
            position = controller.currentPosition,
            shuffle = controller.shuffleModeEnabled,
            repeat = repeatModeStr,
            song = serverSong
        )
        json.encodeToString(state)
    }
    
    private fun broadcastState() {
        serviceScope.launch {
            val stateStr = getSerializedState() ?: return@launch
            broadcastMessage(stateStr)
        }
    }
    
    private fun broadcastMessage(message: String) {
        serviceScope.launch {
            val sessions = synchronized(webSocketSessions) { webSocketSessions.toList() }
            for (session in sessions) {
                try {
                    session.send(Frame.Text(message))
                } catch (e: Exception) {
                    // ignore
                }
            }
        }
    }
    
    override fun onDestroy() {
        server?.stop(1000, 2000)
        server = null
        RemoteSyncState.onTargetChanged = null
        
        serviceScope.launch(Dispatchers.Main) {
            mediaController?.removeListener(playerListener)
            mediaController?.release()
            mediaController = null
            controllerFuture?.cancel(true)
            controllerFuture = null
        }
        
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
}
