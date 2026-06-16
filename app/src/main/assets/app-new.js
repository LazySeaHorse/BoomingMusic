/**
 * Mooseek - Music Streaming Player
 * Main entry point for the modular application
 */

import { initPlayer } from './modules/player.js';
import { initializeEventListeners } from './modules/events.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize player
    initPlayer();

    // Initialize all event listeners and load data
    await initializeEventListeners();
});
