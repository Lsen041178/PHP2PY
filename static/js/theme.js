// Theme management for PHP to Python AI Converter
class ThemeManager {
    constructor() {
        this.theme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    init() {
        // Apply initial theme
        this.applyTheme(this.theme);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Listen for system theme changes
        this.watchSystemTheme();
    }

    setupEventListeners() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            console.warn('localStorage not available, using system theme');
            return null;
        }
    }

    storeTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.warn('Cannot store theme preference');
        }
    }

    applyTheme(theme) {
        const html = document.documentElement;
        const body = document.body;
        
        if (theme === 'dark') {
            html.classList.add('dark');
            body.classList.add('dark');
        } else {
            html.classList.remove('dark');
            body.classList.remove('dark');
        }
        
        this.theme = theme;
        this.updateThemeToggleIcon();
        
        // Notify Monaco editors of theme change
        this.notifyMonacoThemeChange();
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme } 
        }));
    }

    updateThemeToggleIcon() {
        const moonIcon = document.querySelector('#theme-toggle .fa-moon');
        const sunIcon = document.querySelector('#theme-toggle .fa-sun');
        
        if (moonIcon && sunIcon) {
            if (this.theme === 'dark') {
                moonIcon.classList.add('hidden');
                sunIcon.classList.remove('hidden');
            } else {
                moonIcon.classList.remove('hidden');
                sunIcon.classList.add('hidden');
            }
        }
    }

    toggleTheme() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.storeTheme(newTheme);
    }

    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    notifyMonacoThemeChange() {
        // This will be called by Monaco configuration when editors are ready
        if (window.monacoEditorsReady) {
            window.updateMonacoTheme(this.theme);
        }
    }

    // Method to get current theme for other components
    getCurrentTheme() {
        return this.theme;
    }

    // Method to check if dark theme is active
    isDark() {
        return this.theme === 'dark';
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Export for use in other scripts
window.ThemeManager = ThemeManager;
