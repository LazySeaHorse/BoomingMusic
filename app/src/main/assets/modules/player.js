/**
 * Player module - handles playback control, shuffle, and repeat
 */

import { updatePlayPauseButton, updateActiveTrack, updateNowPlaying } from './ui.js';
import { trackListState } from './trackList.js';
import { cycleTheme } from './theme.js';
import { remoteState, sendCommand } from './remote.js';

export const playerState = {
    currentSong: null,
    player: null,
    shuffleEnabled: false,
    shuffleID: 0,
    shuffleIndex: 0,
    repeatMode: 'off', // 'off', 'all', 'one'
    // Incremented each time a new src is loaded; lets async handlers
    // detect whether their load is still the current one.
    loadGeneration: 0
};

export function initPlayer() {
    playerState.player = document.getElementById('player');
    playerState.player.volume = 1;
}

export function playSong(song, filteredSongs) {
    // Always update now-playing display optimistically — on both phone and web targets.
    // The WebSocket state push will confirm/correct it, but the UI should feel instant.
    playerState.currentSong = song;
    updateNowPlaying(song);
    const songIndex = filteredSongs
        ? filteredSongs.findIndex(s => s.id === song.id)
        : -1;
    if (songIndex !== -1) updateActiveTrack(songIndex);

    if (remoteState.target === 'phone' && !remoteState.isUpdatingLocal) {
        // Phone is the playback device — just tell it to play this song.
        sendCommand({ type: 'SELECT', id: song.id });
        return;
    }

    // Cycle to next theme when a new song plays
    cycleTheme();

    // Bump generation so any stale async callbacks from a previous load can bail.
    const gen = ++playerState.loadGeneration;

    // For dummy songs, use a silent data URL so the player doesn't error
    if (song.path.startsWith('dummy')) {
        const silentWav = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
        playerState.player.src = silentWav;
    } else {
        playerState.player.src = `/stream/${song.path}`;
    }
    // DO NOT call player.load() here — it races with play() and causes an AbortError.
    // Setting src is sufficient; play() will trigger loading automatically.
    playerState.player.play().catch(e => {
        // AbortError is expected if another song is loaded before this one starts.
        // Any other error is worth logging.
        if (e.name !== 'AbortError') console.error('playSong play() error:', e);
    });
}

export function playNext(filteredSongs) {
    if (remoteState.target === 'phone') {
        sendCommand({ type: 'NEXT' });
        return;
    }
    if (!playerState.currentSong || filteredSongs.length === 0) return;

    if (playerState.shuffleEnabled) {
        playerState.shuffleIndex++;
        if (playerState.shuffleIndex >= filteredSongs.length) {
            if (playerState.repeatMode === 'all') {
                playerState.shuffleID = Math.floor(Math.random() * 2147483647);
                playerState.shuffleIndex = 0;
            } else {
                playerState.shuffleIndex--;
                return;
            }
        }
        const mappedIndex = millerShuffleLite(playerState.shuffleIndex, playerState.shuffleID, filteredSongs.length);
        playSong(filteredSongs[mappedIndex], filteredSongs);
        updateActiveTrack(mappedIndex);
        return;
    }

    const currentIndex = filteredSongs.findIndex(s => s.id === playerState.currentSong.id);
    if (currentIndex < filteredSongs.length - 1) {
        playSong(filteredSongs[currentIndex + 1], filteredSongs);
        updateActiveTrack(currentIndex + 1);
    } else if (playerState.repeatMode === 'all') {
        playSong(filteredSongs[0], filteredSongs);
        updateActiveTrack(0);
    }
}

export function playPrevious(filteredSongs) {
    if (remoteState.target === 'phone') {
        sendCommand({ type: 'PREV' });
        return;
    }
    if (!playerState.currentSong || filteredSongs.length === 0) return;

    // If more than 3 seconds into the song, restart it
    if (playerState.player.currentTime > 3) {
        playerState.player.currentTime = 0;
        return;
    }

    if (playerState.shuffleEnabled) {
        if (playerState.shuffleIndex > 0) {
            playerState.shuffleIndex--;
            const mappedIndex = millerShuffleLite(playerState.shuffleIndex, playerState.shuffleID, filteredSongs.length);
            playSong(filteredSongs[mappedIndex], filteredSongs);
            updateActiveTrack(mappedIndex);
        }
        return;
    }

    const currentIndex = filteredSongs.findIndex(s => s.id === playerState.currentSong.id);
    if (currentIndex > 0) {
        playSong(filteredSongs[currentIndex - 1], filteredSongs);
        updateActiveTrack(currentIndex - 1);
    } else if (playerState.repeatMode === 'all') {
        playSong(filteredSongs[filteredSongs.length - 1], filteredSongs);
        updateActiveTrack(filteredSongs.length - 1);
    }
}

export function togglePlayPause() {
    if (remoteState.target === 'phone') {
        sendCommand({ type: 'TOGGLE_PLAY' });
        return;
    }
    if (playerState.player.paused) {
        playerState.player.play();
    } else {
        playerState.player.pause();
    }
}

export function toggleShuffle() {
    if (remoteState.target === 'phone') {
        sendCommand({ type: 'SET_SHUFFLE', enabled: !remoteState.shuffle });
        return;
    }
    playerState.shuffleEnabled = !playerState.shuffleEnabled;
    if (playerState.shuffleEnabled) {
        playerState.shuffleID = Math.floor(Math.random() * 2147483647);
        playerState.shuffleIndex = -1;
    }
    const title = playerState.shuffleEnabled ? 'Shuffle: On' : 'Shuffle: Off';
    ['shuffle-btn', 'fs-shuffle-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('active', playerState.shuffleEnabled);
            btn.title = title;
        }
    });
}

export function toggleRepeat() {
    if (remoteState.target === 'phone') {
        const modes = ['off', 'all', 'one'];
        const nextMode = modes[(modes.indexOf(remoteState.repeat) + 1) % modes.length];
        sendCommand({ type: 'SET_REPEAT', mode: nextMode });
        return;
    }
    const modes = ['off', 'all', 'one'];
    const labels = { off: 'Repeat: Off', all: 'Repeat: All', one: 'Repeat: One' };
    const icons = { off: 'repeat.svg', all: 'repeat.svg', one: 'repeat-one.svg' };

    const currentIndex = modes.indexOf(playerState.repeatMode);
    playerState.repeatMode = modes[(currentIndex + 1) % modes.length];

    [{ btn: 'repeat-btn', icon: 'repeat-icon' }, { btn: 'fs-repeat-btn', icon: 'fs-repeat-icon' }].forEach(pair => {
        const btn = document.getElementById(pair.btn);
        const icon = document.getElementById(pair.icon);
        if (btn && icon) {
            btn.dataset.mode = playerState.repeatMode;
            btn.title = labels[playerState.repeatMode];
            icon.src = icons[playerState.repeatMode];
            btn.classList.toggle('active', playerState.repeatMode !== 'off');
        }
    });
}

/**
 * Miller Shuffle Algorithm - Lite variant
 * Source: https://github.com/RondeSC/Miller_Shuffle_Algo
 * Produces a unique shuffled index for each input index (0 to nlim-1)
 * without needing to store the shuffled array.
 */
function millerShuffleLite(inx, mixID, nlim) {
    if (nlim <= 1) return 0;
    if (nlim <= 2) return ((Math.floor(mixID / (Math.floor(inx / 2) + 1)) + inx) % nlim);

    var p1 = 52639, p2 = 33703;
    var randR = ((mixID ^ (13 * Math.floor(inx / nlim))) >>> 0);
    var si = ((randR % nlim) + inx) % nlim;

    var r1 = randR % 1063;
    var r2 = randR % 3631;
    var rx = Math.floor(randR / nlim) % nlim + 1;
    var rx2 = Math.floor(randR / 131) % nlim + 1;

    if (si % 3 === 0) si = (((si / 3) * p1 + r1) % Math.floor((nlim + 2) / 3)) * 3;
    if (si % 2 === 0) si = (((si / 2) * p2 + r2) % Math.floor((nlim + 1) / 2)) * 2;
    if ((si ^ rx2) < nlim) si = si ^ rx2;
    if (si < rx) si = ((rx - si - 1) * p2 + r1 + r2) % rx;
    else si = ((si - rx) * p1 + r2) % (nlim - rx) + rx;

    return si;
}
