/**
 * Lyrics module - handles lyrics fetching, parsing, and display
 */

import { escapeHtml } from './utils.js';
import { playerState } from './player.js';

export const lyricsState = {
    lyrics: [],
    plainLyricsText: '',
    lyricsInterval: null,
    lyricsMode: 'off' // 'off', 'synced', 'plain'
};

export function clearLyricsState() {
    lyricsState.lyrics = [];
    lyricsState.plainLyricsText = '';
    clearInterval(lyricsState.lyricsInterval);
    lyricsState.lyricsMode = 'off';
    document.querySelectorAll('.lyrics-mode-selector').forEach(sel => {
        sel.setAttribute('data-active', 'off');
    });
    document.querySelectorAll('.lyrics-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === 'off');
    });
    document.getElementById('lyrics-container').innerHTML = '';
    const fsLyricsContainer = document.getElementById('fullscreen-lyrics-container');
    if (fsLyricsContainer) fsLyricsContainer.innerHTML = '';
    
    // Remove has-lyrics class to show SVG
    const wrapper = document.querySelector('.lyrics-wrapper');
    const fsWrapper = document.querySelector('.fullscreen-lyrics-wrapper');
    if (wrapper) wrapper.classList.remove('has-lyrics');
    if (fsWrapper) fsWrapper.classList.remove('has-lyrics');
}

export async function loadLyrics(song) {
    clearInterval(lyricsState.lyricsInterval);
    const loadingHtml = '<div class="lyrics-loading">Loading lyrics...</div>';
    document.getElementById('lyrics-container').innerHTML = loadingHtml;
    const fsLyricsContainer = document.getElementById('fullscreen-lyrics-container');
    if (fsLyricsContainer) fsLyricsContainer.innerHTML = loadingHtml;

    try {
        const duration = Math.floor(song.duration / 1000);

        // Attempt 1: exact match with title + artist + duration
        const exactUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(song.artist)}&track_name=${encodeURIComponent(song.title)}&duration=${duration}`;
        const exactResponse = await fetch(exactUrl);

        if (exactResponse.ok) {
            const data = await exactResponse.json();
            if (data.syncedLyrics || data.plainLyrics) {
                applyLyricsData(data);
                return;
            }
        }

        // Attempt 2: search with artist + album using generic q parameter
        if (song.album) {
            const searchQuery = `${song.artist} ${song.album}`;
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
            const searchResponse = await fetch(searchUrl);

            if (searchResponse.ok) {
                const results = await searchResponse.json();
                if (results.length > 0 && (results[0].syncedLyrics || results[0].plainLyrics)) {
                    applyLyricsData(results[0]);
                    return;
                }
            }
        }

        showManualLyricsSearch(song);
    } catch (error) {
        console.error('Failed to load lyrics:', error);
        showManualLyricsSearch(song);
    }
}

function applyLyricsData(data) {
    if (data.syncedLyrics) {
        lyricsState.lyrics = parseSyncedLyrics(data.syncedLyrics);
    } else {
        lyricsState.lyrics = [];
    }

    lyricsState.plainLyricsText = data.plainLyrics || '';
    displayLyrics();

    if (lyricsState.lyricsMode === 'synced' && lyricsState.lyrics.length > 0 && !playerState.player.paused) {
        startLyricsSync();
    }
}

function showManualLyricsSearch(song) {
    lyricsState.lyrics = [];
    lyricsState.plainLyricsText = '';

    const defaultQuery = song ? `${song.artist} ${song.title}` : '';
    const searchHtml =
        '<div class="lyrics-manual-search">' +
        '<div class="lyrics-error">No lyrics found</div>' +
        '<div class="lyrics-search-form">' +
        '<input type="text" class="lyrics-search-input" id="lyrics-search-input" placeholder="Search for lyrics...">' +
        '<button class="lyrics-search-btn" id="lyrics-search-btn">Search</button>' +
        '</div>' +
        '</div>';

    const container = document.getElementById('lyrics-container');
    container.innerHTML = searchHtml;
    const fsLyricsContainer = document.getElementById('fullscreen-lyrics-container');
    if (fsLyricsContainer) fsLyricsContainer.innerHTML = searchHtml;

    // Add has-lyrics class to hide SVG when showing search
    const wrapper = document.querySelector('.lyrics-wrapper');
    const fsWrapper = document.querySelector('.fullscreen-lyrics-wrapper');
    if (wrapper) wrapper.classList.add('has-lyrics');
    if (fsWrapper) fsWrapper.classList.add('has-lyrics');

    const searchInput = document.getElementById('lyrics-search-input');
    const searchBtn = document.getElementById('lyrics-search-btn');
    searchInput.value = defaultQuery;

    searchBtn.addEventListener('click', () => searchLyricsManual(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchLyricsManual(searchInput.value);
    });
}

export async function searchLyricsManual(query) {
    if (!query.trim()) return;

    const loadingHtml = '<div class="lyrics-loading">Searching...</div>';
    document.getElementById('lyrics-container').innerHTML = loadingHtml;
    const fsLyricsContainer = document.getElementById('fullscreen-lyrics-container');
    if (fsLyricsContainer) fsLyricsContainer.innerHTML = loadingHtml;

    try {
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`;
        const response = await fetch(url);

        if (response.ok) {
            const results = await response.json();
            const match = results.find(r => r.syncedLyrics || r.plainLyrics);
            if (match) {
                applyLyricsData(match);
                return;
            }
        }

        showManualLyricsSearch(playerState.currentSong);
    } catch (error) {
        console.error('Manual lyrics search failed:', error);
        showManualLyricsSearch(playerState.currentSong);
    }
}

function parseSyncedLyrics(lyricsText) {
    if (!lyricsText) return [];

    const lines = lyricsText.split('\n');
    const parsed = [];

    for (const line of lines) {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const centiseconds = match[3].length === 2 ? parseInt(match[3]) : Math.floor(parseInt(match[3]) / 10);
            const time = minutes * 60 + seconds + centiseconds / 100;
            const text = match[4].trim();
            parsed.push({ time, text });
        }
    }

    return parsed;
}

function displayLyrics() {
    const container = document.getElementById('lyrics-container');
    const fsContainer = document.getElementById('fullscreen-lyrics-container');
    const wrapper = document.querySelector('.lyrics-wrapper');
    const fsWrapper = document.querySelector('.fullscreen-lyrics-wrapper');

    if (lyricsState.lyricsMode === 'off') {
        container.innerHTML = '';
        if (fsContainer) fsContainer.innerHTML = '';
        if (wrapper) wrapper.classList.remove('has-lyrics');
        if (fsWrapper) fsWrapper.classList.remove('has-lyrics');
        return;
    }

    let html = '';
    if (lyricsState.lyricsMode === 'synced') {
        if (lyricsState.lyrics.length === 0) {
            if (lyricsState.plainLyricsText) {
                html = `<div class="lyrics-fallback-note">Synced lyrics not available. Showing plain lyrics:</div><div class="lyrics-plain">${escapeHtml(lyricsState.plainLyricsText)}</div>`;
            } else {
                html = '<div class="lyrics-error">No synced lyrics available</div>';
            }
        } else {
            html = lyricsState.lyrics.map((line, index) =>
                `<div class="lyrics-line" data-index="${index}">${escapeHtml(line.text) || '♪'}</div>`
            ).join('');
        }
    } else if (lyricsState.lyricsMode === 'plain') {
        if (!lyricsState.plainLyricsText) {
            html = '<div class="lyrics-error">No plain lyrics available</div>';
        } else {
            html = `<div class="lyrics-plain">${escapeHtml(lyricsState.plainLyricsText)}</div>`;
        }
    }

    container.innerHTML = html;
    if (fsContainer) fsContainer.innerHTML = html;
    
    // Add has-lyrics class when displaying lyrics
    if (html) {
        if (wrapper) wrapper.classList.add('has-lyrics');
        if (fsWrapper) fsWrapper.classList.add('has-lyrics');
    } else {
        if (wrapper) wrapper.classList.remove('has-lyrics');
        if (fsWrapper) fsWrapper.classList.remove('has-lyrics');
    }
}

function startLyricsSync() {
    lyricsState.lyricsInterval = setInterval(() => {
        const currentTime = playerState.player.currentTime;
        const activeLine = findActiveLyricLine(currentTime);

        document.querySelectorAll('.lyrics-line').forEach(el => el.classList.remove('active'));

        if (activeLine !== -1) {
            const activeEl = document.querySelector(`.lyrics-line[data-index="${activeLine}"]`);
            if (activeEl) {
                activeEl.classList.add('active');
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 100);
}

function findActiveLyricLine(currentTime) {
    for (let i = lyricsState.lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyricsState.lyrics[i].time) {
            return i;
        }
    }
    return -1;
}

export function setLyricsMode(mode) {
    const previousMode = lyricsState.lyricsMode;
    lyricsState.lyricsMode = mode;

    document.querySelectorAll('.lyrics-mode-selector').forEach(sel => {
        sel.setAttribute('data-active', mode);
    });

    document.querySelectorAll('.lyrics-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    clearInterval(lyricsState.lyricsInterval);

    if (previousMode === 'off' && mode !== 'off' && playerState.currentSong) {
        loadLyrics(playerState.currentSong);
    } else {
        displayLyrics();

        if (mode === 'synced' && lyricsState.lyrics.length > 0 && !playerState.player.paused) {
            startLyricsSync();
        }
    }
}
