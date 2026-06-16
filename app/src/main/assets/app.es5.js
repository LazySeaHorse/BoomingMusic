/*
 * MooSeek - ES5 Compatible Version
 * This file is loaded by older browsers that do not support ES modules.
 * Modern browsers will load app.js via <script type="module"> instead.
 */

var songs = [];
var filteredSongs = [];
var currentSong = null;
var player = null;
var clusterize = null;
var lyrics = [];
var plainLyricsText = '';
var lyricsInterval = null;
var shuffleEnabled = false;
var shuffleID = 0;
var shuffleIndex = 0;
var repeatMode = 'off'; // 'off', 'all', 'one'
var isSeeking = false;
var lyricsMode = 'off'; // 'off', 'synced', 'plain'
var fullscreenPlayerOpen = false;

function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

document.addEventListener('DOMContentLoaded', function () {
    // Initialize audio element
    player = document.getElementById('player');
    player.volume = 1;

    // Progress bar interaction
    var progressBar = document.getElementById('progress-bar');
    var progressFill = document.getElementById('progress-fill');
    var progressHandle = document.getElementById('progress-handle');

    progressBar.addEventListener('mousedown', startSeeking);
    progressBar.addEventListener('click', seek);

    // Touch support for progress bar
    progressBar.addEventListener('touchstart', function (e) {
        e.preventDefault();
        isSeeking = true;
        progressBar.classList.add('seeking');
        seekTouch(e);

        var onTouchMove = function (e) { e.preventDefault(); seekTouch(e); };
        var onTouchEnd = function () {
            isSeeking = false;
            progressBar.classList.remove('seeking');
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    });

    function seekTouch(e) {
        var touch = e.touches[0];
        var rect = progressBar.getBoundingClientRect();
        var percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));

        if (player.duration) {
            player.currentTime = percent * player.duration;
            updateProgress();
        }
    }

    function startSeeking(e) {
        isSeeking = true;
        progressBar.classList.add('seeking');
        seek(e);

        var onMouseMove = function (e) { seek(e); };
        var onMouseUp = function () {
            isSeeking = false;
            progressBar.classList.remove('seeking');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function seek(e) {
        var rect = progressBar.getBoundingClientRect();
        var percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        if (player.duration) {
            player.currentTime = percent * player.duration;
            updateProgress();
        }
    }

    // Update progress bar
    function updateProgress() {
        if (!isSeeking && player.duration) {
            var percent = (player.currentTime / player.duration) * 100;
            progressFill.style.width = percent + '%';
            progressHandle.style.left = percent + '%';

            document.getElementById('current-time').textContent = formatTime(player.currentTime);
            document.getElementById('total-time').textContent = formatTime(player.duration);

            // Sync mini player progress
            var miniProgressFill = document.getElementById('mini-progress-fill');
            if (miniProgressFill) miniProgressFill.style.width = percent + '%';

            // Sync fullscreen player progress
            var fsProgressFill = document.getElementById('fullscreen-progress-fill');
            var fsProgressHandle = document.getElementById('fullscreen-progress-handle');
            if (fsProgressFill) fsProgressFill.style.width = percent + '%';
            if (fsProgressHandle) fsProgressHandle.style.left = percent + '%';
            var fsCurrent = document.getElementById('fullscreen-current-time');
            var fsTotal = document.getElementById('fullscreen-total-time');
            if (fsCurrent) fsCurrent.textContent = formatTime(player.currentTime);
            if (fsTotal) fsTotal.textContent = formatTime(player.duration);
        }
    }

    player.addEventListener('timeupdate', updateProgress);
    player.addEventListener('loadedmetadata', updateProgress);

    // Load songs, then initialize everything else
    loadSongs(function () {
        // Initialize clusterize
        clusterize = new Clusterize({
            rows: generateRows(filteredSongs),
            scrollId: 'scrollArea',
            contentId: 'contentArea',
            rows_in_block: 50,
            blocks_in_cluster: 4,
            show_no_data_row: true,
            no_data_text: 'No songs found',
            callbacks: {
                clusterChanged: function () {
                    attachTrackClickHandlers();
                }
            }
        });

        // Event listeners
        document.getElementById('search').addEventListener('input', handleSearch);
        document.getElementById('sort-btn').addEventListener('click', toggleSortMenu);
        document.getElementById('settings-btn').addEventListener('click', openSettings);
        document.getElementById('close-settings').addEventListener('click', closeSettings);
        document.getElementById('shuffle-btn').addEventListener('click', toggleShuffle);
        document.getElementById('repeat-btn').addEventListener('click', toggleRepeat);
        document.getElementById('prev-btn').addEventListener('click', playPrevious);
        document.getElementById('next-btn').addEventListener('click', playNext);
        document.getElementById('clear-search').addEventListener('click', clearSearch);
        document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);

        // ---- Mini Player & Fullscreen Player event listeners ----
        document.getElementById('mini-play-pause-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            togglePlayPause();
        });
        document.getElementById('mini-next-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            playNext();
        });
        document.getElementById('mini-player-tap-area').addEventListener('click', function () {
            if (isMobile()) openFullscreenPlayer();
        });
        document.getElementById('fullscreen-collapse-btn').addEventListener('click', closeFullscreenPlayer);

        // Fullscreen player controls
        document.getElementById('fs-play-pause-btn').addEventListener('click', togglePlayPause);
        document.getElementById('fs-prev-btn').addEventListener('click', playPrevious);
        document.getElementById('fs-next-btn').addEventListener('click', playNext);
        document.getElementById('fs-shuffle-btn').addEventListener('click', toggleShuffle);
        document.getElementById('fs-repeat-btn').addEventListener('click', toggleRepeat);

        // Fullscreen lyrics mode selector
        var fsLyricsBtns = document.querySelectorAll('.fullscreen-lyrics-mode-selector .lyrics-mode-btn');
        for (var fi = 0; fi < fsLyricsBtns.length; fi++) {
            fsLyricsBtns[fi].addEventListener('click', function () {
                var mode = this.getAttribute('data-mode');
                setLyricsMode(mode);
            });
        }

        // Fullscreen progress bar interaction (mouse)
        var fsProgressBar = document.getElementById('fullscreen-progress-bar');
        fsProgressBar.addEventListener('mousedown', function (e) {
            isSeeking = true;
            fsProgressBar.classList.add('seeking');
            seekFsBar(e);

            var onMouseMove = function (e) { seekFsBar(e); };
            var onMouseUp = function () {
                isSeeking = false;
                fsProgressBar.classList.remove('seeking');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        fsProgressBar.addEventListener('click', seekFsBar);

        // Fullscreen progress bar interaction (touch)
        fsProgressBar.addEventListener('touchstart', function (e) {
            e.preventDefault();
            isSeeking = true;
            fsProgressBar.classList.add('seeking');
            seekFsBarTouch(e);

            var onTouchMove = function (e) { e.preventDefault(); seekFsBarTouch(e); };
            var onTouchEnd = function () {
                isSeeking = false;
                fsProgressBar.classList.remove('seeking');
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };

            document.addEventListener('touchmove', onTouchMove);
            document.addEventListener('touchend', onTouchEnd);
        });

        function seekFsBar(e) {
            var rect = fsProgressBar.getBoundingClientRect();
            var percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (player.duration) {
                player.currentTime = percent * player.duration;
                updateProgress();
            }
        }

        function seekFsBarTouch(e) {
            var touch = e.touches[0];
            var rect = fsProgressBar.getBoundingClientRect();
            var percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            if (player.duration) {
                player.currentTime = percent * player.duration;
                updateProgress();
            }
        }

        // Lyrics mode selector
        var lyricsBtns = document.querySelectorAll('.lyrics-mode-btn');
        for (var i = 0; i < lyricsBtns.length; i++) {
            lyricsBtns[i].addEventListener('click', function () {
                var mode = this.getAttribute('data-mode');
                setLyricsMode(mode);
            });
        }

        // Sort menu items
        var menuItems = document.querySelectorAll('.menu-item');
        for (var j = 0; j < menuItems.length; j++) {
            menuItems[j].addEventListener('click', function () {
                var sortBy = this.getAttribute('data-sort');
                handleSort(sortBy);
                document.getElementById('sort-menu').style.display = 'none';
            });
        }

        // Close sort menu when clicking outside
        document.addEventListener('click', function (e) {
            var sortMenu = document.getElementById('sort-menu');
            var sortBtn = document.getElementById('sort-btn');
            if (!sortMenu.contains(e.target) && !sortBtn.contains(e.target)) {
                sortMenu.style.display = 'none';
            }
        });

        // Player events
        player.addEventListener('play', function () {
            updatePlayPauseButton(true);
        });

        player.addEventListener('pause', function () {
            updatePlayPauseButton(false);
            clearInterval(lyricsInterval);
        });

        player.addEventListener('ended', function () {
            clearInterval(lyricsInterval);
            if (repeatMode === 'one' && currentSong) {
                playSong(currentSong);
            } else {
                playNext();
            }
        });
    });
});

function loadSongs(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/list');
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                songs = JSON.parse(xhr.responseText);
                filteredSongs = songs.slice();
                updateTrackList();
            } catch (e) {
                console.error('Failed to parse songs:', e);
            }
        } else {
            console.error('Failed to load songs: HTTP ' + xhr.status);
        }
        if (callback) callback();
    };
    xhr.onerror = function () {
        console.error('Failed to load songs: network error');
        if (callback) callback();
    };
    xhr.send();
}

function generateRows(songList) {
    var rows = [];
    for (var i = 0; i < songList.length; i++) {
        var song = songList[i];
        var duration = formatDuration(song.duration);
        rows.push(
            '<div class="track-item" data-index="' + i + '">' +
            '<div class="track-title">' + escapeHtml(song.title) + '</div>' +
            '<div class="track-info">' + escapeHtml(song.artist) + ' \u2022 ' + escapeHtml(song.album) + ' \u2022 ' + duration + '</div>' +
            '</div>'
        );
    }
    return rows;
}

function attachTrackClickHandlers() {
    var items = document.querySelectorAll('.track-item');
    for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function () {
            var index = parseInt(this.getAttribute('data-index'));
            playSong(filteredSongs[index]);

            // Update active state
            var allItems = document.querySelectorAll('.track-item');
            for (var j = 0; j < allItems.length; j++) {
                allItems[j].classList.remove('active');
            }
            this.classList.add('active');
        });
    }
}

function playSong(song) {
    currentSong = song;
    player.src = '/stream/' + song.path;
    player.load();
    player.play();
    updateNowPlaying(song);

    // Clear lyrics when changing songs
    lyrics = [];
    plainLyricsText = '';
    clearInterval(lyricsInterval);

    // Reset lyrics display to off state
    lyricsMode = 'off';
    var selectors = document.querySelectorAll('.lyrics-mode-selector');
    for (var s = 0; s < selectors.length; s++) {
        selectors[s].setAttribute('data-active', 'off');
    }
    var btns = document.querySelectorAll('.lyrics-mode-btn');
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('data-mode') === 'off') {
            btns[i].classList.add('active');
        } else {
            btns[i].classList.remove('active');
        }
    }
    document.getElementById('lyrics-container').innerHTML = '';
    var fsLyricsContainer = document.getElementById('fullscreen-lyrics-container');
    if (fsLyricsContainer) fsLyricsContainer.innerHTML = '';
}

function updateNowPlaying(song) {
    var titleEl = document.getElementById('now-playing-title');
    var artistEl = document.getElementById('now-playing-artist');
    var miniTitleEl = document.getElementById('mini-player-title');
    var miniArtistEl = document.getElementById('mini-player-artist');
    var fsTitleEl = document.getElementById('fullscreen-now-playing-title');
    var fsArtistEl = document.getElementById('fullscreen-now-playing-artist');

    if (song) {
        var artistText = song.artist + (song.album ? ' \u2022 ' + song.album : '');
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

function playNext() {
    if (!currentSong || filteredSongs.length === 0) return;

    if (shuffleEnabled) {
        shuffleIndex++;
        if (shuffleIndex >= filteredSongs.length) {
            if (repeatMode === 'all') {
                shuffleID = Math.floor(Math.random() * 2147483647);
                shuffleIndex = 0;
            } else {
                shuffleIndex--;
                return;
            }
        }
        var mappedIndex = millerShuffleLite(shuffleIndex, shuffleID, filteredSongs.length);
        playSong(filteredSongs[mappedIndex]);
        updateActiveTrack(mappedIndex);
        return;
    }

    var currentIndex = -1;
    for (var i = 0; i < filteredSongs.length; i++) {
        if (filteredSongs[i].id === currentSong.id) {
            currentIndex = i;
            break;
        }
    }

    if (currentIndex < filteredSongs.length - 1) {
        playSong(filteredSongs[currentIndex + 1]);
        updateActiveTrack(currentIndex + 1);
    } else if (repeatMode === 'all') {
        playSong(filteredSongs[0]);
        updateActiveTrack(0);
    }
}

function playPrevious() {
    if (!currentSong || filteredSongs.length === 0) return;

    // If more than 3 seconds into the song, restart it
    if (player.currentTime > 3) {
        player.currentTime = 0;
        return;
    }

    if (shuffleEnabled) {
        if (shuffleIndex > 0) {
            shuffleIndex--;
            var mappedIndex = millerShuffleLite(shuffleIndex, shuffleID, filteredSongs.length);
            playSong(filteredSongs[mappedIndex]);
            updateActiveTrack(mappedIndex);
        }
        return;
    }

    var currentIndex = -1;
    for (var i = 0; i < filteredSongs.length; i++) {
        if (filteredSongs[i].id === currentSong.id) {
            currentIndex = i;
            break;
        }
    }

    if (currentIndex > 0) {
        playSong(filteredSongs[currentIndex - 1]);
        updateActiveTrack(currentIndex - 1);
    } else if (repeatMode === 'all') {
        playSong(filteredSongs[filteredSongs.length - 1]);
        updateActiveTrack(filteredSongs.length - 1);
    }
}

function togglePlayPause() {
    if (player.paused) {
        player.play();
    } else {
        player.pause();
    }
}

function updatePlayPauseButton(isPlaying) {
    var btn = document.getElementById('play-pause-btn');
    var icon = document.getElementById('play-pause-icon');
    var miniIcon = document.getElementById('mini-play-pause-icon');
    var fsIcon = document.getElementById('fs-play-pause-icon');

    var src = isPlaying ? 'pause.svg' : 'play.svg';
    var alt = isPlaying ? 'Pause' : 'Play';

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
        var fsBtn = document.getElementById('fs-play-pause-btn');
        if (fsBtn) fsBtn.title = alt;
    }
}

function toggleShuffle() {
    shuffleEnabled = !shuffleEnabled;
    if (shuffleEnabled) {
        shuffleID = Math.floor(Math.random() * 2147483647);
        shuffleIndex = -1; // will be incremented to 0 on first playNext
    }
    // Sync both desktop and fullscreen buttons
    var title = shuffleEnabled ? 'Shuffle: On' : 'Shuffle: Off';
    var ids = ['shuffle-btn', 'fs-shuffle-btn'];
    for (var i = 0; i < ids.length; i++) {
        var btn = document.getElementById(ids[i]);
        if (btn) {
            if (shuffleEnabled) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            btn.title = title;
        }
    }
}

// Miller Shuffle Algorithm - Lite variant
// Source: https://github.com/RondeSC/Miller_Shuffle_Algo
// Produces a unique shuffled index for each input index (0 to nlim-1)
// without needing to store the shuffled array.
// Uses >>> 0 instead of BigInt for ES5 compatibility.
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

function toggleRepeat() {
    var modes = ['off', 'all', 'one'];
    var labels = { off: 'Repeat: Off', all: 'Repeat: All', one: 'Repeat: One' };
    var icons = { off: 'repeat.svg', all: 'repeat.svg', one: 'repeat-one.svg' };

    var currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];

    // Sync both desktop and fullscreen buttons
    var pairs = [
        { btnId: 'repeat-btn', iconId: 'repeat-icon' },
        { btnId: 'fs-repeat-btn', iconId: 'fs-repeat-icon' }
    ];
    for (var i = 0; i < pairs.length; i++) {
        var btn = document.getElementById(pairs[i].btnId);
        var icon = document.getElementById(pairs[i].iconId);
        if (btn && icon) {
            btn.setAttribute('data-mode', repeatMode);
            btn.title = labels[repeatMode];
            icon.src = icons[repeatMode];
            if (repeatMode !== 'off') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    }
}

function updateActiveTrack(index) {
    var items = document.querySelectorAll('.track-item');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('active');
    }
    var activeItem = document.querySelector('.track-item[data-index="' + index + '"]');
    if (activeItem) {
        activeItem.classList.add('active');
        // scrollIntoView options may not be supported on old browsers — falls back to instant scroll
        try {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            activeItem.scrollIntoView(false);
        }
    }
}

function loadLyrics(song) {
    clearInterval(lyricsInterval);

    // Show loading state
    document.getElementById('lyrics-container').innerHTML = '<div class="lyrics-loading">Loading lyrics...</div>';

    var duration = Math.floor(song.duration / 1000);

    // Attempt 1: exact match with title + artist + duration
    var exactUrl = 'https://lrclib.net/api/get?artist_name=' + encodeURIComponent(song.artist) +
        '&track_name=' + encodeURIComponent(song.title) +
        '&duration=' + duration;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', exactUrl);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.syncedLyrics || data.plainLyrics) {
                    applyLyricsData(data);
                    return;
                }
            } catch (e) { /* parse error, fall through */ }
        }

        // Attempt 2: search with album + artist
        if (song.album) {
            var searchUrl = 'https://lrclib.net/api/search?artist_name=' + encodeURIComponent(song.artist) +
                '&album_name=' + encodeURIComponent(song.album);

            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', searchUrl);
            xhr2.onload = function () {
                if (xhr2.status >= 200 && xhr2.status < 300) {
                    try {
                        var results = JSON.parse(xhr2.responseText);
                        for (var i = 0; i < results.length; i++) {
                            if (results[i].syncedLyrics || results[i].plainLyrics) {
                                applyLyricsData(results[i]);
                                return;
                            }
                        }
                    } catch (e) { /* parse error, fall through */ }
                }
                // No results — show manual search
                showManualLyricsSearch(song);
            };
            xhr2.onerror = function () {
                showManualLyricsSearch(song);
            };
            xhr2.send();
        } else {
            // No album to search — show manual search
            showManualLyricsSearch(song);
        }
    };
    xhr.onerror = function () {
        showManualLyricsSearch(song);
    };
    xhr.send();
}

function applyLyricsData(data) {
    if (data.syncedLyrics) {
        lyrics = parseSyncedLyrics(data.syncedLyrics);
    } else {
        lyrics = [];
    }

    plainLyricsText = data.plainLyrics || '';

    displayLyrics();

    if (lyricsMode === 'synced' && lyrics.length > 0 && !player.paused) {
        startLyricsSync();
    }
}

function showManualLyricsSearch(song) {
    lyrics = [];
    plainLyricsText = '';

    var defaultQuery = song ? song.artist + ' ' + song.title : '';
    var container = document.getElementById('lyrics-container');
    container.innerHTML =
        '<div class="lyrics-manual-search">' +
        '<div class="lyrics-error">No lyrics found</div>' +
        '<div class="lyrics-search-form">' +
        '<input type="text" class="lyrics-search-input" id="lyrics-search-input" placeholder="Search for lyrics...">' +
        '<button class="lyrics-search-btn" id="lyrics-search-btn">Search</button>' +
        '</div>' +
        '</div>';

    var searchInput = document.getElementById('lyrics-search-input');
    var searchBtn = document.getElementById('lyrics-search-btn');
    searchInput.value = defaultQuery;

    searchBtn.addEventListener('click', function () {
        searchLyricsManual(searchInput.value);
    });
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            searchLyricsManual(searchInput.value);
        }
    });
}

function searchLyricsManual(query) {
    var trimmed = query.replace(/^\s+|\s+$/g, '');
    if (!trimmed) return;

    document.getElementById('lyrics-container').innerHTML = '<div class="lyrics-loading">Searching...</div>';

    var url = 'https://lrclib.net/api/search?q=' + encodeURIComponent(trimmed);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var results = JSON.parse(xhr.responseText);
                for (var i = 0; i < results.length; i++) {
                    if (results[i].syncedLyrics || results[i].plainLyrics) {
                        applyLyricsData(results[i]);
                        return;
                    }
                }
            } catch (e) { /* parse error, fall through */ }
        }
        // Still no results — show manual search again
        showManualLyricsSearch(currentSong);
    };
    xhr.onerror = function () {
        showManualLyricsSearch(currentSong);
    };
    xhr.send();
}

function parseSyncedLyrics(lyricsText) {
    if (!lyricsText) return [];

    var lines = lyricsText.split('\n');
    var parsed = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        // Match LRC format: [MM:SS.XX] or [MM:SS.XXX]
        var match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            var minutes = parseInt(match[1]);
            var seconds = parseInt(match[2]);
            var centiseconds = match[3].length === 2 ? parseInt(match[3]) : Math.floor(parseInt(match[3]) / 10);
            var time = minutes * 60 + seconds + centiseconds / 100;
            var text = match[4].replace(/^\s+|\s+$/g, ''); // trim polyfill
            parsed.push({ time: time, text: text });
        }
    }

    return parsed;
}

function displayLyrics() {
    var container = document.getElementById('lyrics-container');
    var fsContainer = document.getElementById('fullscreen-lyrics-container');

    if (lyricsMode === 'off') {
        container.innerHTML = '';
        if (fsContainer) fsContainer.innerHTML = '';
        return;
    }

    var html = '';
    if (lyricsMode === 'synced') {
        if (lyrics.length === 0) {
            if (plainLyricsText) {
                html = '<div class="lyrics-fallback-note">Synced lyrics not available. Showing plain lyrics:</div>' +
                    '<div class="lyrics-plain">' + escapeHtml(plainLyricsText) + '</div>';
            } else {
                html = '<div class="lyrics-error">No synced lyrics available</div>';
            }
        } else {
            for (var i = 0; i < lyrics.length; i++) {
                var lineText = escapeHtml(lyrics[i].text) || '\u266A';
                html += '<div class="lyrics-line" data-index="' + i + '">' + lineText + '</div>';
            }
        }
    } else if (lyricsMode === 'plain') {
        if (!plainLyricsText) {
            html = '<div class="lyrics-error">No plain lyrics available</div>';
        } else {
            html = '<div class="lyrics-plain">' + escapeHtml(plainLyricsText) + '</div>';
        }
    }

    container.innerHTML = html;
    if (fsContainer) fsContainer.innerHTML = html;
}

function startLyricsSync() {
    lyricsInterval = setInterval(function () {
        var currentTime = player.currentTime;
        var activeLine = findActiveLyricLine(currentTime);

        var allLines = document.querySelectorAll('.lyrics-line');
        for (var i = 0; i < allLines.length; i++) {
            allLines[i].classList.remove('active');
        }

        if (activeLine !== -1) {
            var activeEl = document.querySelector('.lyrics-line[data-index="' + activeLine + '"]');
            if (activeEl) {
                activeEl.classList.add('active');
                try {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch (e) {
                    activeEl.scrollIntoView(false);
                }
            }
        }
    }, 100);
}

function findActiveLyricLine(currentTime) {
    for (var i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) {
            return i;
        }
    }
    return -1;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function handleSearch(e) {
    var query = e.target.value.toLowerCase();
    var clearBtn = document.getElementById('clear-search');

    // Show/hide clear button
    clearBtn.style.display = query ? 'flex' : 'none';

    filteredSongs = [];
    for (var i = 0; i < songs.length; i++) {
        var song = songs[i];
        if (song.title.toLowerCase().indexOf(query) !== -1 ||
            song.artist.toLowerCase().indexOf(query) !== -1 ||
            song.album.toLowerCase().indexOf(query) !== -1) {
            filteredSongs.push(song);
        }
    }
    updateTrackList();
}

function clearSearch() {
    var searchInput = document.getElementById('search');
    searchInput.value = '';
    document.getElementById('clear-search').style.display = 'none';
    filteredSongs = songs.slice();
    updateTrackList();
}

function toggleSortMenu() {
    var menu = document.getElementById('sort-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function handleSort(sortBy) {
    // Update active state
    var menuItems = document.querySelectorAll('.menu-item');
    for (var i = 0; i < menuItems.length; i++) {
        if (menuItems[i].getAttribute('data-sort') === sortBy) {
            menuItems[i].classList.add('active');
        } else {
            menuItems[i].classList.remove('active');
        }
    }

    filteredSongs.sort(function (a, b) {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'dateAdded':
                return b.dateAdded - a.dateAdded;
            case 'dateModified':
                return b.dateModified - a.dateModified;
            default:
                return 0;
        }
    });

    updateTrackList();
}

function updateTrackList() {
    if (clusterize) {
        clusterize.update(generateRows(filteredSongs));
        setTimeout(attachTrackClickHandlers, 0);
    }
}

function setLyricsMode(mode) {
    var previousMode = lyricsMode;
    lyricsMode = mode;

    // Update ALL selector states (both desktop and fullscreen)
    var selectors = document.querySelectorAll('.lyrics-mode-selector');
    for (var s = 0; s < selectors.length; s++) {
        selectors[s].setAttribute('data-active', mode);
    }

    // Update ALL button states
    var btns = document.querySelectorAll('.lyrics-mode-btn');
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('data-mode') === mode) {
            btns[i].classList.add('active');
        } else {
            btns[i].classList.remove('active');
        }
    }

    // Clear interval
    clearInterval(lyricsInterval);

    // If switching from off to synced/plain, fetch lyrics
    if (previousMode === 'off' && mode !== 'off' && currentSong) {
        loadLyrics(currentSong);
    } else {
        // Just update display with existing data
        displayLyrics();

        if (mode === 'synced' && lyrics.length > 0 && !player.paused) {
            startLyricsSync();
        }
    }
}

function openSettings() {
    document.getElementById('settings-modal').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

// ---- Fullscreen Player ----
function openFullscreenPlayer() {
    var fsPlayer = document.getElementById('fullscreen-player');
    fsPlayer.classList.add('open');
    document.body.classList.add('fullscreen-player-open');
    fullscreenPlayerOpen = true;
}

function closeFullscreenPlayer() {
    var fsPlayer = document.getElementById('fullscreen-player');
    fsPlayer.classList.remove('open');
    document.body.classList.remove('fullscreen-player-open');
    fullscreenPlayerOpen = false;
}

function formatDuration(ms) {
    var seconds = Math.floor(ms / 1000);
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;
    return minutes + ':' + (remainingSeconds < 10 ? '0' : '') + remainingSeconds;
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
