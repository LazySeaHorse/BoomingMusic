package com.mardous.booming.server

import com.mardous.booming.util.MediaServerPlaybackTarget

object RemoteSyncState {
    @Volatile
    var target: String = MediaServerPlaybackTarget.DEFAULT
        private set

    @Volatile
    var isMutedForWeb: Boolean = false
        private set
    
    @Volatile
    var onMuteStateChanged: (() -> Unit)? = null

    @Volatile
    var onTargetChanged: (() -> Unit)? = null

    fun setTarget(value: String?): String {
        val newTarget = when (value) {
            MediaServerPlaybackTarget.WEB -> MediaServerPlaybackTarget.WEB
            else -> MediaServerPlaybackTarget.PHONE
        }
        val oldTarget = target
        val oldMuted = isMutedForWeb

        target = newTarget
        isMutedForWeb = newTarget == MediaServerPlaybackTarget.WEB

        if (oldMuted != isMutedForWeb) {
            onMuteStateChanged?.invoke()
        }
        if (oldTarget != target) {
            onTargetChanged?.invoke()
        }
        return target
    }
}
