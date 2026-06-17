package com.mardous.booming.server

object RemoteSyncState {
    @Volatile
    var target: String = "web" // "web" or "phone"

    @Volatile
    var isMutedForWeb: Boolean = true // default to true since target is "web"
        set(value) {
            field = value
            onMuteStateChanged?.invoke()
        }
    
    @Volatile
    var onMuteStateChanged: (() -> Unit)? = null
}
