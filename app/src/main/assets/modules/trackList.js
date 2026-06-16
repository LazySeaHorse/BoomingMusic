/**
 * Track List module - handles song loading, searching, sorting, and filtering
 */

import { formatDuration, escapeHtml } from './utils.js';
import { playSong } from './player.js';
import { updateNowPlaying, updateActiveTrack } from './ui.js';

export const trackListState = {
    songs: [],
    filteredSongs: [],
    clusterize: null
};

export async function loadSongs() {
    try {
        const response = await fetch('/list');
        trackListState.songs = await response.json();
        trackListState.filteredSongs = [...trackListState.songs];
        updateTrackList();
    } catch (error) {
        console.error('Failed to load songs:', error);
        console.log('Loading dummy songs for debugging...');
        loadDummySongs();
    }
}

function loadDummySongs() {
    const dummySongs = [
        { id: 1, title: 'Midnight Dreams', artist: 'Luna Echo', album: 'Nocturne', path: 'dummy1.mp3', duration: 243000, dateAdded: Date.now(), dateModified: Date.now() },
        { id: 2, title: 'Electric Sunrise', artist: 'Neon Pulse', album: 'Dawn', path: 'dummy2.mp3', duration: 267000, dateAdded: Date.now() - 86400000, dateModified: Date.now() - 86400000 },
        { id: 3, title: 'Ocean Waves', artist: 'Coastal Vibes', album: 'Serenity', path: 'dummy3.mp3', duration: 289000, dateAdded: Date.now() - 172800000, dateModified: Date.now() - 172800000 },
        { id: 4, title: 'Mountain Echo', artist: 'Alpine Sound', album: 'Heights', path: 'dummy4.mp3', duration: 256000, dateAdded: Date.now() - 259200000, dateModified: Date.now() - 259200000 },
        { id: 5, title: 'Forest Rain', artist: 'Nature Sounds', album: 'Elements', path: 'dummy5.mp3', duration: 312000, dateAdded: Date.now() - 345600000, dateModified: Date.now() - 345600000 },
        { id: 6, title: 'Urban Rhythm', artist: 'City Beats', album: 'Metropolis', path: 'dummy6.mp3', duration: 234000, dateAdded: Date.now() - 432000000, dateModified: Date.now() - 432000000 },
        { id: 7, title: 'Starlight', artist: 'Cosmic Journey', album: 'Universe', path: 'dummy7.mp3', duration: 278000, dateAdded: Date.now() - 518400000, dateModified: Date.now() - 518400000 },
        { id: 8, title: 'Desert Wind', artist: 'Sahara Dreams', album: 'Dunes', path: 'dummy8.mp3', duration: 245000, dateAdded: Date.now() - 604800000, dateModified: Date.now() - 604800000 },
        { id: 9, title: 'Jazz Nights', artist: 'Blue Notes', album: 'Smooth', path: 'dummy9.mp3', duration: 301000, dateAdded: Date.now() - 691200000, dateModified: Date.now() - 691200000 },
        { id: 10, title: 'Summer Breeze', artist: 'Tropical Vibes', album: 'Paradise', path: 'dummy10.mp3', duration: 267000, dateAdded: Date.now() - 777600000, dateModified: Date.now() - 777600000 },
        { id: 11, title: 'Winter Frost', artist: 'Frozen Tones', album: 'Ice', path: 'dummy11.mp3', duration: 289000, dateAdded: Date.now() - 864000000, dateModified: Date.now() - 864000000 },
        { id: 12, title: 'Spring Bloom', artist: 'Garden Melodies', album: 'Flowers', path: 'dummy12.mp3', duration: 256000, dateAdded: Date.now() - 950400000, dateModified: Date.now() - 950400000 },
        { id: 13, title: 'Autumn Leaves', artist: 'Fall Colors', album: 'Seasons', path: 'dummy13.mp3', duration: 234000, dateAdded: Date.now() - 1036800000, dateModified: Date.now() - 1036800000 },
        { id: 14, title: 'Neon Lights', artist: 'Synth Wave', album: 'Retro Future', path: 'dummy14.mp3', duration: 312000, dateAdded: Date.now() - 1123200000, dateModified: Date.now() - 1123200000 },
        { id: 15, title: 'Acoustic Soul', artist: 'Unplugged', album: 'Raw', path: 'dummy15.mp3', duration: 278000, dateAdded: Date.now() - 1209600000, dateModified: Date.now() - 1209600000 },
        { id: 16, title: 'Electronic Pulse', artist: 'Digital Dreams', album: 'Synthetic', path: 'dummy16.mp3', duration: 245000, dateAdded: Date.now() - 1296000000, dateModified: Date.now() - 1296000000 },
        { id: 17, title: 'Vocal Harmony', artist: 'Choir Voices', album: 'Harmony', path: 'dummy17.mp3', duration: 301000, dateAdded: Date.now() - 1382400000, dateModified: Date.now() - 1382400000 },
        { id: 18, title: 'Rock Anthem', artist: 'Thunder Road', album: 'Power', path: 'dummy18.mp3', duration: 267000, dateAdded: Date.now() - 1468800000, dateModified: Date.now() - 1468800000 },
        { id: 19, title: 'Pop Sensation', artist: 'Chart Toppers', album: 'Hits', path: 'dummy19.mp3', duration: 289000, dateAdded: Date.now() - 1555200000, dateModified: Date.now() - 1555200000 },
        { id: 20, title: 'Hip Hop Flow', artist: 'Beat Makers', album: 'Rhythm', path: 'dummy20.mp3', duration: 256000, dateAdded: Date.now() - 1641600000, dateModified: Date.now() - 1641600000 }
    ];
    
    trackListState.songs = dummySongs;
    trackListState.filteredSongs = [...dummySongs];
    updateTrackList();
}

export function generateRows(songList) {
    return songList.map((song, index) => {
        const duration = formatDuration(song.duration);
        return `<div class="track-item" data-index="${index}">
            <div class="track-title">${escapeHtml(song.title)}</div>
            <div class="track-info">${escapeHtml(song.artist)} • ${escapeHtml(song.album)} • ${duration}</div>
        </div>`;
    });
}

export function attachTrackClickHandlers() {
    document.querySelectorAll('.track-item').forEach(item => {
        item.addEventListener('click', function () {
            const index = parseInt(this.dataset.index);
            const song = trackListState.filteredSongs[index];
            playSong(song, trackListState.filteredSongs);
            updateNowPlaying(song);

            // Update active state
            document.querySelectorAll('.track-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

export function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const clearBtn = document.getElementById('clear-search');

    clearBtn.style.display = query ? 'flex' : 'none';

    trackListState.filteredSongs = trackListState.songs.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.album.toLowerCase().includes(query)
    );
    updateTrackList();
}

export function clearSearch() {
    const searchInput = document.getElementById('search');
    searchInput.value = '';
    document.getElementById('clear-search').style.display = 'none';
    trackListState.filteredSongs = [...trackListState.songs];
    updateTrackList();
}

export function handleSort(sortBy) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.sort === sortBy);
    });

    trackListState.filteredSongs.sort((a, b) => {
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

export function updateTrackList() {
    if (trackListState.clusterize) {
        trackListState.clusterize.update(generateRows(trackListState.filteredSongs));
        setTimeout(attachTrackClickHandlers, 0);
    }
}

export function initClusterize() {
    trackListState.clusterize = new Clusterize({
        rows: generateRows(trackListState.filteredSongs),
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
}
