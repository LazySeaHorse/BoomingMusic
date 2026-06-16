/**
 * Theme module - Material You color palette cycling
 * Cycles through 5 preset Material Design 3 color palettes
 */

// Material You color palettes
const themes = [
    // 0: Purple (original theme)
    {
        name: 'purple',
        colors: {
            '--md-sys-color-primary': '#6750A4',
            '--md-sys-color-on-primary': '#FFFFFF',
            '--md-sys-color-primary-container': '#EADDFF',
            '--md-sys-color-on-primary-container': '#21005D',
            
            '--md-sys-color-secondary': '#625B71',
            '--md-sys-color-on-secondary': '#FFFFFF',
            '--md-sys-color-secondary-container': '#E8DEF8',
            '--md-sys-color-on-secondary-container': '#1D192B',
            
            '--md-sys-color-surface': '#FFFBFE',
            '--md-sys-color-surface-dim': '#DED8E1',
            '--md-sys-color-surface-bright': '#FFFBFE',
            '--md-sys-color-surface-container-lowest': '#FFFFFF',
            '--md-sys-color-surface-container-low': '#F7F2FA',
            '--md-sys-color-surface-container': '#F3EDF7',
            '--md-sys-color-surface-container-high': '#ECE6F0',
            '--md-sys-color-surface-container-highest': '#E6E0E9',
            '--md-sys-color-surface-variant': '#E7E0EC',
            '--md-sys-color-on-surface': '#1C1B1F',
            '--md-sys-color-on-surface-variant': '#49454F',
            
            '--md-sys-color-background': '#FFFBFE',
            '--md-sys-color-on-background': '#1C1B1F',
            
            '--md-sys-color-outline': '#79747E',
            '--md-sys-color-outline-variant': '#CAC4D0'
        }
    },
    
    // 1: Green
    {
        name: 'green',
        colors: {
            '--md-sys-color-primary': '#2D6A4F',
            '--md-sys-color-on-primary': '#FFFFFF',
            '--md-sys-color-primary-container': '#B7E4C7',
            '--md-sys-color-on-primary-container': '#0A3622',
            
            '--md-sys-color-secondary': '#52B788',
            '--md-sys-color-on-secondary': '#FFFFFF',
            '--md-sys-color-secondary-container': '#D8F3DC',
            '--md-sys-color-on-secondary-container': '#1B4332',
            
            '--md-sys-color-surface': '#F8FFF9',
            '--md-sys-color-surface-dim': '#D5E8DC',
            '--md-sys-color-surface-bright': '#F8FFF9',
            '--md-sys-color-surface-container-lowest': '#FFFFFF',
            '--md-sys-color-surface-container-low': '#EDF7F0',
            '--md-sys-color-surface-container': '#E7F3EA',
            '--md-sys-color-surface-container-high': '#DFEEE4',
            '--md-sys-color-surface-container-highest': '#D9E9DE',
            '--md-sys-color-surface-variant': '#DDE9E1',
            '--md-sys-color-on-surface': '#191C1A',
            '--md-sys-color-on-surface-variant': '#3F4945',
            
            '--md-sys-color-background': '#F8FFF9',
            '--md-sys-color-on-background': '#191C1A',
            
            '--md-sys-color-outline': '#6F7972',
            '--md-sys-color-outline-variant': '#BFC9C2'
        }
    },
    
    // 2: Blue
    {
        name: 'blue',
        colors: {
            '--md-sys-color-primary': '#0077B6',
            '--md-sys-color-on-primary': '#FFFFFF',
            '--md-sys-color-primary-container': '#CAF0F8',
            '--md-sys-color-on-primary-container': '#003D5B',
            
            '--md-sys-color-secondary': '#00B4D8',
            '--md-sys-color-on-secondary': '#FFFFFF',
            '--md-sys-color-secondary-container': '#ADE8F4',
            '--md-sys-color-on-secondary-container': '#005F73',
            
            '--md-sys-color-surface': '#F8FCFF',
            '--md-sys-color-surface-dim': '#D3E5ED',
            '--md-sys-color-surface-bright': '#F8FCFF',
            '--md-sys-color-surface-container-lowest': '#FFFFFF',
            '--md-sys-color-surface-container-low': '#EDF6FA',
            '--md-sys-color-surface-container': '#E7F2F7',
            '--md-sys-color-surface-container-high': '#DFEDF3',
            '--md-sys-color-surface-container-highest': '#D9E8EE',
            '--md-sys-color-surface-variant': '#DDE8ED',
            '--md-sys-color-on-surface': '#191C1E',
            '--md-sys-color-on-surface-variant': '#3F484C',
            
            '--md-sys-color-background': '#F8FCFF',
            '--md-sys-color-on-background': '#191C1E',
            
            '--md-sys-color-outline': '#6F787D',
            '--md-sys-color-outline-variant': '#BFC8CD'
        }
    },
    
    // 3: Yellow/Orange
    {
        name: 'yellow',
        colors: {
            '--md-sys-color-primary': '#F77F00',
            '--md-sys-color-on-primary': '#FFFFFF',
            '--md-sys-color-primary-container': '#FFE5B4',
            '--md-sys-color-on-primary-container': '#5C3000',
            
            '--md-sys-color-secondary': '#FCBF49',
            '--md-sys-color-on-secondary': '#3D2800',
            '--md-sys-color-secondary-container': '#FFF3D6',
            '--md-sys-color-on-secondary-container': '#4A3300',
            
            '--md-sys-color-surface': '#FFFCF8',
            '--md-sys-color-surface-dim': '#E8E0D5',
            '--md-sys-color-surface-bright': '#FFFCF8',
            '--md-sys-color-surface-container-lowest': '#FFFFFF',
            '--md-sys-color-surface-container-low': '#FFF7ED',
            '--md-sys-color-surface-container': '#FFF3E7',
            '--md-sys-color-surface-container-high': '#FAEEDE',
            '--md-sys-color-surface-container-highest': '#F4E9D8',
            '--md-sys-color-surface-variant': '#F0E5D9',
            '--md-sys-color-on-surface': '#1E1B16',
            '--md-sys-color-on-surface-variant': '#4D4639',
            
            '--md-sys-color-background': '#FFFCF8',
            '--md-sys-color-on-background': '#1E1B16',
            
            '--md-sys-color-outline': '#7E7667',
            '--md-sys-color-outline-variant': '#D0C4B4'
        }
    },
    
    // 4: Red
    {
        name: 'red',
        colors: {
            '--md-sys-color-primary': '#D62828',
            '--md-sys-color-on-primary': '#FFFFFF',
            '--md-sys-color-primary-container': '#FFDAD6',
            '--md-sys-color-on-primary-container': '#5F0000',
            
            '--md-sys-color-secondary': '#F77F00',
            '--md-sys-color-on-secondary': '#FFFFFF',
            '--md-sys-color-secondary-container': '#FFE5B4',
            '--md-sys-color-on-secondary-container': '#5C3000',
            
            '--md-sys-color-surface': '#FFFBF9',
            '--md-sys-color-surface-dim': '#E8D8D5',
            '--md-sys-color-surface-bright': '#FFFBF9',
            '--md-sys-color-surface-container-lowest': '#FFFFFF',
            '--md-sys-color-surface-container-low': '#FFF2ED',
            '--md-sys-color-surface-container': '#FFEDE7',
            '--md-sys-color-surface-container-high': '#FAE8E1',
            '--md-sys-color-surface-container-highest': '#F4E2DB',
            '--md-sys-color-surface-variant': '#F0DDD6',
            '--md-sys-color-on-surface': '#1E1B19',
            '--md-sys-color-on-surface-variant': '#4D4340',
            
            '--md-sys-color-background': '#FFFBF9',
            '--md-sys-color-on-background': '#1E1B19',
            
            '--md-sys-color-outline': '#7E736F',
            '--md-sys-color-outline-variant': '#D0C3BF'
        }
    },
    
    // 5: Pink
    {
        name: 'pink',
        colors: {
            '--md-sys-color-primary': '#D946A6',
            '--md-sys-color-on-primary': '#FFFFFF',
            '--md-sys-color-primary-container': '#FFD8F0',
            '--md-sys-color-on-primary-container': '#5C0042',
            
            '--md-sys-color-secondary': '#EC4899',
            '--md-sys-color-on-secondary': '#FFFFFF',
            '--md-sys-color-secondary-container': '#FFE5F3',
            '--md-sys-color-on-secondary-container': '#5F0037',
            
            '--md-sys-color-surface': '#FFFBFD',
            '--md-sys-color-surface-dim': '#E8D8E3',
            '--md-sys-color-surface-bright': '#FFFBFD',
            '--md-sys-color-surface-container-lowest': '#FFFFFF',
            '--md-sys-color-surface-container-low': '#FFF2F8',
            '--md-sys-color-surface-container': '#FFEDF5',
            '--md-sys-color-surface-container-high': '#FAE8EF',
            '--md-sys-color-surface-container-highest': '#F4E2E9',
            '--md-sys-color-surface-variant': '#F0DDEA',
            '--md-sys-color-on-surface': '#1E1B1D',
            '--md-sys-color-on-surface-variant': '#4D434A',
            
            '--md-sys-color-background': '#FFFBFD',
            '--md-sys-color-on-background': '#1E1B1D',
            
            '--md-sys-color-outline': '#7E7379',
            '--md-sys-color-outline-variant': '#D0C3CA'
        }
    }
];

let currentThemeIndex = 0;

/**
 * Apply a theme by index
 * @param {number} index - Theme index (0-4)
 */
export function applyTheme(index) {
    if (index < 0 || index >= themes.length) {
        console.warn(`Invalid theme index: ${index}. Using 0.`);
        index = 0;
    }
    
    const theme = themes[index];
    const root = document.documentElement;
    
    // Apply all color tokens
    Object.entries(theme.colors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
    
    currentThemeIndex = index;
}

/**
 * Get the next theme index in the cycle
 * @returns {number} Next theme index
 */
export function getNextThemeIndex() {
    return (currentThemeIndex + 1) % themes.length;
}

/**
 * Apply the next theme in the cycle
 */
export function cycleTheme() {
    const nextIndex = getNextThemeIndex();
    applyTheme(nextIndex);
    return nextIndex;
}

/**
 * Get current theme index
 * @returns {number} Current theme index
 */
export function getCurrentThemeIndex() {
    return currentThemeIndex;
}

/**
 * Get theme name by index
 * @param {number} index - Theme index
 * @returns {string} Theme name
 */
export function getThemeName(index) {
    return themes[index]?.name || 'unknown';
}
