import { playerState, playSong } from './player.js';
import { trackListState } from './trackList.js';
import { updatePlayPauseButton, updateActiveTrack, updateNowPlaying, updateModeIndicator } from './ui.js';

let socket = null;
let reconnectTimer = null;

// Clock-based fake seek tracking for phone target mode
let fakeSeekState = {
    songId: null,
    startPositionMs: 0,
    startTimeMs: 0,
    durationMs: 0,
    isPlaying: false
};
let fakeSeekAnimFrame = null;

export const remoteState = {
    target: 'phone', // 'phone', 'web', or 'standalone'
    isPlaying: false,
    position: 0,
    song: null,
    shuffle: false,
    repeat: 'off',
    isUpdatingLocal: false
};

export function initRemote() {
    connectWebSocket();
    
    const destinationSelect = document.getElementById('playback-destination');
    if (destinationSelect) {
        destinationSelect.addEventListener('change', (e) => {
            const target = e.target.value;
            setTarget(target);
        });
    }
}

function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('Remote WebSocket connected');
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };
    
    socket.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'STATE') {
                handleStateUpdate(msg);
            }
        } catch (e) {
            console.error('Error handling WS message', e);
        }
    };
    
    socket.onclose = () => {
        console.log('Remote WebSocket disconnected. Reconnecting...');
        socket = null;
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(connectWebSocket, 3000);
        }
    };
    
    socket.onerror = (err) => {
        console.error('Remote WebSocket error', err);
    };
}

export function sendCommand(cmd) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(cmd));
    }
}

function setTarget(target) {
    remoteState.target = target;
    sendCommand({ type: 'SET_TARGET', target: target });
    
    // Stop local playback when switching away from 'web' mode
    if (target !== 'web' && playerState.player && !playerState.player.paused) {
        playerState.player.pause();
    }
    
    updateModeIndicator(target);
}

function handleStateUpdate(msg) {
    const state = msg;
    const prevSongId = remoteState.song ? remoteState.song.id : null;
    
    remoteState.target = state.target;
    remoteState.isPlaying = state.isPlaying;
    remoteState.position = state.position;
    remoteState.song = state.song;
    remoteState.shuffle = state.shuffle;
    remoteState.repeat = state.repeat;

    // Sync select dropdown in settings
    const destinationSelect = document.getElementById('playback-destination');
    if (destinationSelect && destinationSelect.value !== state.target) {
        destinationSelect.value = state.target;
    }

    // Sync visual destination buttons
    document.querySelectorAll('.dest-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === state.target);
    });
    
    updateModeIndicator(state.target);
    updateShuffleRepeatUI(state.shuffle, state.repeat);

    if (state.target === 'phone') {
        // PHONE IS THE ACTIVE PLAYER — browser is just a remote
        // Ensure browser audio is stopped
        if (playerState.player && !playerState.player.paused) {
            remoteState.isUpdatingLocal = true;
            playerState.player.pause();
            remoteState.isUpdatingLocal = false;
        }

        if (state.song) {
            updateNowPlaying(state.song);
            const index = trackListState.filteredSongs.findIndex(s => s.id === state.song.id);
            if (index !== -1) updateActiveTrack(index);
        } else {
            updateNowPlaying(null);
        }
        
        updatePlayPauseButton(state.isPlaying);
        
        // Start clock-based fake seek for phone target
        const songChanged = state.song && state.song.id !== fakeSeekState.songId;
        if (state.song) {
            if (songChanged || Math.abs(state.position - getFakePosition()) > 3000) {
                startFakeSeek(state.song.id, state.position, state.song.duration, state.isPlaying);
            } else if (state.isPlaying !== fakeSeekState.isPlaying) {
                // Play/pause changed — update fake seek state
                fakeSeekState.startPositionMs = getFakePosition();
                fakeSeekState.startTimeMs = Date.now();
                fakeSeekState.isPlaying = state.isPlaying;
            }
        } else {
            stopFakeSeek();
            updateProgressBarUI(0, 0);
        }
        
    } else if (state.target === 'web') {
        // BROWSER IS THE ACTIVE PLAYER
        stopFakeSeek();

        if (state.song) {
            const localSongId = playerState.currentSong ? playerState.currentSong.id : null;
            if (localSongId !== state.song.id) {
                // Mark that the next play/pause events are our own sync, not user action.
                // We pin the generation before playSong bumps it, then clear the flag
                // once the audio element actually starts playing for THAT generation.
                remoteState.isUpdatingLocal = true;
                const expectedGen = playerState.loadGeneration + 1; // playSong will bump to this
                playSong(state.song, trackListState.filteredSongs);
                // Clear isUpdatingLocal when this specific load begins playing
                const clearWhenReady = () => {
                    if (playerState.loadGeneration === expectedGen) {
                        remoteState.isUpdatingLocal = false;
                    }
                    playerState.player.removeEventListener('play', clearWhenReady);
                    playerState.player.removeEventListener('error', clearWhenReady);
                };
                playerState.player.addEventListener('play', clearWhenReady);
                playerState.player.addEventListener('error', clearWhenReady);
            } else {
                if (playerState.player) {
                    if (state.isPlaying && playerState.player.paused) {
                        remoteState.isUpdatingLocal = true;
                        playerState.player.play()
                            .then(() => { remoteState.isUpdatingLocal = false; })
                            .catch(e => {
                                remoteState.isUpdatingLocal = false;
                                if (e.name !== 'AbortError') console.log(e);
                            });
                    } else if (!state.isPlaying && !playerState.player.paused) {
                        remoteState.isUpdatingLocal = true;
                        playerState.player.pause();
                        remoteState.isUpdatingLocal = false;
                    }

                    const diff = Math.abs(playerState.player.currentTime * 1000 - state.position);
                    if (diff > 2000) {
                        remoteState.isUpdatingLocal = true;
                        playerState.player.currentTime = state.position / 1000;
                        // 'seeked' fires synchronously in most browsers, so clear after a tick
                        setTimeout(() => { remoteState.isUpdatingLocal = false; }, 0);
                    }
                }
            }
        }
    } else {
        // STANDALONE — no sync, just update the mode indicator, leave both players alone
        stopFakeSeek();
    }
}

// --- Fake seek (clock-based, for phone target mode) ---

function startFakeSeek(songId, positionMs, durationMs, isPlaying) {
    stopFakeSeek();
    fakeSeekState = {
        songId,
        startPositionMs: positionMs,
        startTimeMs: Date.now(),
        durationMs,
        isPlaying
    };
    tickFakeSeek();
}

function stopFakeSeek() {
    if (fakeSeekAnimFrame) {
        cancelAnimationFrame(fakeSeekAnimFrame);
        fakeSeekAnimFrame = null;
    }
}

function getFakePosition() {
    if (!fakeSeekState.isPlaying) return fakeSeekState.startPositionMs;
    const elapsed = Date.now() - fakeSeekState.startTimeMs;
    return Math.min(fakeSeekState.startPositionMs + elapsed, fakeSeekState.durationMs);
}

function tickFakeSeek() {
    if (!fakeSeekState.songId) return;
    const pos = getFakePosition();
    updateProgressBarUI(pos, fakeSeekState.durationMs);
    
    // Stop ticking at end of song
    if (pos < fakeSeekState.durationMs || !fakeSeekState.isPlaying) {
        fakeSeekAnimFrame = requestAnimationFrame(tickFakeSeek);
    }
}

function updateProgressBarUI(positionMs, durationMs) {
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const positionSecs = positionMs / 1000;
    const durationSecs = durationMs / 1000;
    const pct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

    ['current-time', 'fullscreen-current-time'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = formatTime(positionSecs);
    });
    
    ['total-time', 'fullscreen-total-time'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = formatTime(durationSecs);
    });

    ['progress-fill', 'fullscreen-progress-fill', 'mini-progress-fill'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${pct}%`;
    });

    ['progress-handle', 'fullscreen-progress-handle'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.left = `${pct}%`;
    });
}

function updateShuffleRepeatUI(shuffleEnabled, repeatMode) {
    const shuffleTitle = shuffleEnabled ? 'Shuffle: On' : 'Shuffle: Off';
    ['shuffle-btn', 'fs-shuffle-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('active', shuffleEnabled);
            btn.title = shuffleTitle;
        }
    });

    const labels = { off: 'Repeat: Off', all: 'Repeat: All', one: 'Repeat: One' };
    const icons = { off: 'repeat.svg', all: 'repeat.svg', one: 'repeat-one.svg' };
    [{ btn: 'repeat-btn', icon: 'repeat-icon' }, { btn: 'fs-repeat-btn', icon: 'fs-repeat-icon' }].forEach(pair => {
        const btn = document.getElementById(pair.btn);
        const icon = document.getElementById(pair.icon);
        if (btn && icon) {
            btn.dataset.mode = repeatMode;
            btn.title = labels[repeatMode];
            icon.src = icons[repeatMode];
            btn.classList.toggle('active', repeatMode !== 'off');
        }
    });
}

// Intercept local player events to send updates to the WebSocket server
export function setupLocalPlayerEventBroadcasts() {
    const player = document.getElementById('player');
    if (!player) return;
    
    const sendStateUpdate = () => {
        if (remoteState.target === 'web' && !remoteState.isUpdatingLocal) {
            sendCommand({
                type: 'WEB_STATE',
                isPlaying: !player.paused,
                position: Math.floor(player.currentTime * 1000),
                id: playerState.currentSong ? playerState.currentSong.id : null
            });
        }
    };
    
    player.addEventListener('play', sendStateUpdate);
    player.addEventListener('pause', sendStateUpdate);
    player.addEventListener('seeked', sendStateUpdate);
    player.addEventListener('timeupdate', () => {
        const currentSecs = Math.floor(player.currentTime);
        if (player.lastSentSecs !== currentSecs) {
            player.lastSentSecs = currentSecs;
            sendStateUpdate();
        }
    });
}
