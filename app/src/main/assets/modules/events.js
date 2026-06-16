/**
 * Events module - centralized event listener setup
 */

import { togglePlayPause, playNext, playPrevious, toggleShuffle, toggleRepeat } from './player.js';
import { handleSearch, clearSearch, handleSort, loadSongs, initClusterize } from './trackList.js';
import { setLyricsMode } from './lyrics.js';
import { toggleSortMenu, openSettings, closeSettings, openFullscreenPlayer, closeFullscreenPlayer } from './ui.js';
import { initProgress } from './progress.js';
import { isMobile } from './utils.js';
import { playerState } from './player.js';
import { trackListState } from './trackList.js';
import { lyricsState } from './lyrics.js';
import { applyTheme } from './theme.js';

export async function initializeEventListeners() {
    // Initialize theme system with purple (index 0)
    applyTheme(0);
    
    // Search
    document.getElementById('search').addEventListener('input', handleSearch);
    document.getElementById('clear-search').addEventListener('click', clearSearch);

    // Sort menu
    document.getElementById('sort-btn').addEventListener('click', toggleSortMenu);
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function () {
            const sortBy = this.dataset.sort;
            handleSort(sortBy);
            document.getElementById('sort-menu').style.display = 'none';
        });
    });

    // Close sort menu when clicking outside
    document.addEventListener('click', function (e) {
        const sortMenu = document.getElementById('sort-menu');
        const sortBtn = document.getElementById('sort-btn');
        if (!sortMenu.contains(e.target) && !sortBtn.contains(e.target)) {
            sortMenu.style.display = 'none';
        }
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings').addEventListener('click', closeSettings);

    // Playback controls
    document.getElementById('shuffle-btn').addEventListener('click', toggleShuffle);
    document.getElementById('repeat-btn').addEventListener('click', toggleRepeat);
    document.getElementById('prev-btn').addEventListener('click', () => playPrevious(trackListState.filteredSongs));
    document.getElementById('next-btn').addEventListener('click', () => playNext(trackListState.filteredSongs));
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);

    // Mini player
    document.getElementById('mini-play-pause-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause();
    });
    document.getElementById('mini-next-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        playNext(trackListState.filteredSongs);
    });
    document.getElementById('mini-player-tap-area').addEventListener('click', () => {
        if (isMobile()) openFullscreenPlayer();
    });

    // Fullscreen player
    document.getElementById('fullscreen-collapse-btn').addEventListener('click', closeFullscreenPlayer);
    document.getElementById('fs-play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('fs-prev-btn').addEventListener('click', () => playPrevious(trackListState.filteredSongs));
    document.getElementById('fs-next-btn').addEventListener('click', () => playNext(trackListState.filteredSongs));
    document.getElementById('fs-shuffle-btn').addEventListener('click', toggleShuffle);
    document.getElementById('fs-repeat-btn').addEventListener('click', toggleRepeat);

    // Lyrics mode selector
    document.querySelectorAll('.lyrics-mode-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const mode = this.dataset.mode;
            setLyricsMode(mode);
        });
    });

    // Fullscreen lyrics mode selector
    document.querySelectorAll('.fullscreen-lyrics-mode-selector .lyrics-mode-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const mode = this.dataset.mode;
            setLyricsMode(mode);
        });
    });

    // Player events
    playerState.player.addEventListener('play', async () => {
        const { updatePlayPauseButton } = await import('./ui.js');
        updatePlayPauseButton(true);
    });

    playerState.player.addEventListener('pause', async () => {
        const { updatePlayPauseButton } = await import('./ui.js');
        updatePlayPauseButton(false);
        clearInterval(lyricsState.lyricsInterval);
    });

    playerState.player.addEventListener('ended', () => {
        clearInterval(lyricsState.lyricsInterval);
        if (playerState.repeatMode === 'one' && playerState.currentSong) {
            playSong(playerState.currentSong, trackListState.filteredSongs);
        } else {
            playNext(trackListState.filteredSongs);
        }
    });

    // Initialize progress bar
    initProgress();

    // Load songs and initialize clusterize
    await loadSongs();
    initClusterize();
}
