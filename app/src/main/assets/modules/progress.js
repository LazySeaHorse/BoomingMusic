/**
 * Progress module - handles progress bar seeking and time updates
 */

import { formatTime } from './utils.js';
import { playerState } from './player.js';

export const progressState = {
    isSeeking: false
};

export function initProgress() {
    const progressBar = document.getElementById('progress-bar');
    const fsProgressBar = document.getElementById('fullscreen-progress-bar');

    // Desktop progress bar
    progressBar.addEventListener('mousedown', startSeeking);
    progressBar.addEventListener('click', seek);

    // Fullscreen progress bar (mouse)
    fsProgressBar.addEventListener('mousedown', (e) => {
        progressState.isSeeking = true;
        fsProgressBar.classList.add('seeking');
        seekFullscreen(e);

        const onMouseMove = (e) => seekFullscreen(e);
        const onMouseUp = () => {
            progressState.isSeeking = false;
            fsProgressBar.classList.remove('seeking');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    fsProgressBar.addEventListener('click', seekFullscreen);

    // Fullscreen progress bar (touch)
    fsProgressBar.addEventListener('touchstart', (e) => {
        e.preventDefault();
        progressState.isSeeking = true;
        fsProgressBar.classList.add('seeking');
        seekFullscreenTouch(e);

        const onTouchMove = (e) => { e.preventDefault(); seekFullscreenTouch(e); };
        const onTouchEnd = () => {
            progressState.isSeeking = false;
            fsProgressBar.classList.remove('seeking');
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    });

    // Player time update
    playerState.player.addEventListener('timeupdate', updateProgress);
    playerState.player.addEventListener('loadedmetadata', updateProgress);
}

function startSeeking(e) {
    const progressBar = document.getElementById('progress-bar');
    progressState.isSeeking = true;
    progressBar.classList.add('seeking');
    seek(e);

    const onMouseMove = (e) => seek(e);
    const onMouseUp = () => {
        progressState.isSeeking = false;
        progressBar.classList.remove('seeking');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function seek(e) {
    const progressBar = document.getElementById('progress-bar');
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (playerState.player.duration) {
        playerState.player.currentTime = percent * playerState.player.duration;
        updateProgress();
    }
}

function seekFullscreen(e) {
    const fsProgressBar = document.getElementById('fullscreen-progress-bar');
    const rect = fsProgressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (playerState.player.duration) {
        playerState.player.currentTime = percent * playerState.player.duration;
        updateProgress();
    }
}

function seekFullscreenTouch(e) {
    const fsProgressBar = document.getElementById('fullscreen-progress-bar');
    const touch = e.touches[0];
    const rect = fsProgressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    if (playerState.player.duration) {
        playerState.player.currentTime = percent * playerState.player.duration;
        updateProgress();
    }
}

export function updateProgress() {
    if (!progressState.isSeeking && playerState.player.duration) {
        const percent = (playerState.player.currentTime / playerState.player.duration) * 100;
        const progressFill = document.getElementById('progress-fill');
        const progressHandle = document.getElementById('progress-handle');
        
        progressFill.style.width = percent + '%';
        progressHandle.style.left = percent + '%';

        document.getElementById('current-time').textContent = formatTime(playerState.player.currentTime);
        document.getElementById('total-time').textContent = formatTime(playerState.player.duration);

        // Sync mini player progress
        const miniProgressFill = document.getElementById('mini-progress-fill');
        if (miniProgressFill) miniProgressFill.style.width = percent + '%';

        // Sync fullscreen player progress
        const fsProgressFill = document.getElementById('fullscreen-progress-fill');
        const fsProgressHandle = document.getElementById('fullscreen-progress-handle');
        if (fsProgressFill) fsProgressFill.style.width = percent + '%';
        if (fsProgressHandle) fsProgressHandle.style.left = percent + '%';
        const fsCurrent = document.getElementById('fullscreen-current-time');
        const fsTotal = document.getElementById('fullscreen-total-time');
        if (fsCurrent) fsCurrent.textContent = formatTime(playerState.player.currentTime);
        if (fsTotal) fsTotal.textContent = formatTime(playerState.player.duration);
    }
}
