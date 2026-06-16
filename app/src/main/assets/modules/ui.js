/**
 * UI module - handles UI state and updates (now playing, fullscreen, settings)
 */

import { playerState } from './player.js';

export const uiState = {
    fullscreenPlayerOpen: false
};

export function updateNowPlaying(song) {
    const titleEl = document.getElementById('now-playing-title');
    const artistEl = document.getElementById('now-playing-artist');
    const miniTitleEl = document.getElementById('mini-player-title');
    const miniArtistEl = document.getElementById('mini-player-artist');
    const fsTitleEl = document.getElementById('fullscreen-now-playing-title');
    const fsArtistEl = document.getElementById('fullscreen-now-playing-artist');

    if (song) {
        const artistText = `${song.artist}${song.album ? ' • ' + song.album : ''}`;
        titleEl.textContent = song.title;
        artistEl.textContent = artistText;
        if (miniTitleEl) miniTitleEl.textContent = song.title;
        if (miniArtistEl) miniArtistEl.textContent = song.artist;
        if (fsTitleEl) fsTitleEl.textContent = song.title;
        if (fsArtistEl) fsArtistEl.textContent = artistText;
    } else {
        titleEl.textContent = 'No song playing';
        artistEl.textContent = '';
        if (miniTitleEl) miniTitleEl.textContent = 'No song playing';
        if (miniArtistEl) miniArtistEl.textContent = '';
        if (fsTitleEl) fsTitleEl.textContent = 'No song playing';
        if (fsArtistEl) fsArtistEl.textContent = '';
    }
}

export function updatePlayPauseButton(isPlaying) {
    const btn = document.getElementById('play-pause-btn');
    const icon = document.getElementById('play-pause-icon');
    const miniIcon = document.getElementById('mini-play-pause-icon');
    const fsIcon = document.getElementById('fs-play-pause-icon');

    const src = isPlaying ? 'pause.svg' : 'play.svg';
    const alt = isPlaying ? 'Pause' : 'Play';

    icon.src = src;
    icon.alt = alt;
    btn.title = alt;

    if (miniIcon) {
        miniIcon.src = src;
        miniIcon.alt = alt;
    }
    if (fsIcon) {
        fsIcon.src = src;
        fsIcon.alt = alt;
        const fsBtn = document.getElementById('fs-play-pause-btn');
        if (fsBtn) fsBtn.title = alt;
    }
}

export function updateActiveTrack(index) {
    document.querySelectorAll('.track-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.querySelector(`.track-item[data-index="${index}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function openFullscreenPlayer() {
    const fsPlayer = document.getElementById('fullscreen-player');
    fsPlayer.classList.add('open');
    document.body.classList.add('fullscreen-player-open');
    uiState.fullscreenPlayerOpen = true;
}

export function closeFullscreenPlayer() {
    const fsPlayer = document.getElementById('fullscreen-player');
    fsPlayer.classList.remove('open');
    document.body.classList.remove('fullscreen-player-open');
    uiState.fullscreenPlayerOpen = false;
}

export function openSettings() {
    document.getElementById('settings-modal').style.display = 'block';
}

export function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

export function toggleSortMenu() {
    const menu = document.getElementById('sort-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
