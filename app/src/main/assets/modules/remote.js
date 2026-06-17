import { playerState, playSong } from './player.js';
import { trackListState } from './trackList.js';
import { updatePlayPauseButton, updateActiveTrack, updateNowPlaying } from './ui.js';

let socket = null;
let reconnectTimer = null;
export const remoteState = {
    target: 'web', // 'web' or 'phone'
    isPlaying: false,
    position: 0,
    song: null,
    shuffle: false,
    repeat: 'off',
    isUpdatingLocal: false // Guard flag to prevent feedback loops
};

export function initRemote() {
    connectWebSocket();
    
    // Bind the destination dropdown change event
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
    
    // Stop local playback if switching to phone
    if (target === 'phone' && playerState.player && !playerState.player.paused) {
        playerState.player.pause();
    }
}

function handleStateUpdate(msg) {
    const state = msg;
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

    if (state.target === 'phone') {
        // PHONE IS THE ACTIVE PLAYER (Browser is just a remote)
        // Ensure browser player is paused
        if (playerState.player && !playerState.player.paused) {
            remoteState.isUpdatingLocal = true;
            playerState.player.pause();
            remoteState.isUpdatingLocal = false;
        }

        // Update browser Now Playing UI to reflect the phone's player state
        if (state.song) {
            updateNowPlaying(state.song);
            
            // Highlight the active track in the list
            const index = trackListState.filteredSongs.findIndex(s => s.id === state.song.id);
            if (index !== -1) {
                updateActiveTrack(index);
            }
        } else {
            updateNowPlaying(null);
        }
        
        // Update play/pause buttons
        updatePlayPauseButton(state.isPlaying);
        
        // Update progress bar
        updateProgressBarUI(state.position, state.song ? state.song.duration : 0);
        
        // Update shuffle/repeat UI
        updateShuffleRepeatUI(state.shuffle, state.repeat);
    } else {
        // BROWSER IS THE ACTIVE PLAYER
        // If the song changed, play it locally
        if (state.song) {
            const localSongId = playerState.currentSong ? playerState.currentSong.id : null;
            if (localSongId !== state.song.id) {
                remoteState.isUpdatingLocal = true;
                playSong(state.song, trackListState.filteredSongs);
                remoteState.isUpdatingLocal = false;
            }
            
            // Sync play/pause
            if (playerState.player) {
                if (state.isPlaying && playerState.player.paused) {
                    remoteState.isUpdatingLocal = true;
                    playerState.player.play().catch(e => console.log(e));
                    remoteState.isUpdatingLocal = false;
                } else if (!state.isPlaying && !playerState.player.paused) {
                    remoteState.isUpdatingLocal = true;
                    playerState.player.pause();
                    remoteState.isUpdatingLocal = false;
                }
                
                // Sync position if it drifts by more than 2 seconds
                const diff = Math.abs(playerState.player.currentTime * 1000 - state.position);
                if (diff > 2000) {
                    remoteState.isUpdatingLocal = true;
                    playerState.player.currentTime = state.position / 1000;
                    remoteState.isUpdatingLocal = false;
                }
            }
        }
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

    // Update time labels
    ['current-time', 'fullscreen-current-time'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = formatTime(positionSecs);
    });
    
    ['total-time', 'fullscreen-total-time'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = formatTime(durationSecs);
    });

    // Update fills
    ['progress-fill', 'fullscreen-progress-fill', 'mini-progress-fill'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${pct}%`;
    });

    // Update handles
    ['progress-handle', 'fullscreen-progress-handle'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.left = `${pct}%`;
    });
}

function updateShuffleRepeatUI(shuffleEnabled, repeatMode) {
    // Shuffle UI
    const shuffleTitle = shuffleEnabled ? 'Shuffle: On' : 'Shuffle: Off';
    ['shuffle-btn', 'fs-shuffle-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('active', shuffleEnabled);
            btn.title = shuffleTitle;
        }
    });

    // Repeat UI
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
        // Throttle updates: only send every 1 second during playback to avoid clogging WS
        const currentSecs = Math.floor(player.currentTime);
        if (player.lastSentSecs !== currentSecs) {
            player.lastSentSecs = currentSecs;
            sendStateUpdate();
        }
    });
}
