/**
 * Mooseek - Music Streaming Player
 * Main entry point for the modular application
 */

import { initPlayer } from './modules/player.js';
import { initializeEventListeners } from './modules/events.js';
import { initRemote, setupLocalPlayerEventBroadcasts } from './modules/remote.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize player
    initPlayer();

    // Initialize remote capabilities
    initRemote();
    setupLocalPlayerEventBroadcasts();

    // Initialize all event listeners and load data
    await initializeEventListeners();
});
