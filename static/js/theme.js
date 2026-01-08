/**
 * Theme Management Script
 * Handles dark/light theme switching with localStorage persistence
 */

(function() {
    'use strict';

    const THEME_STORAGE_KEY = 'theme-preference';
    const THEME_ATTRIBUTE = 'data-theme';
    
    // Get saved theme or default to light
    function getInitialTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
            return savedTheme;
        }
        
        // Default to light theme
        return 'light';
    }

    // Apply theme to document
    function applyTheme(theme) {
        document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
        
        // Update theme-color meta tag
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', theme === 'dark' ? '#1a1d29' : '#e5e9f4');
        }
        
        // Save to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        
        // Update toggle button icon
        updateToggleButton(theme);
    }

    // Toggle between themes
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute(THEME_ATTRIBUTE) || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    // Update toggle button icon and aria-label
    function updateToggleButton(theme) {
        const toggleButton = document.getElementById('theme-toggle');
        if (!toggleButton) return;
        
        const icon = toggleButton.querySelector('.theme-icon');
        const isDark = theme === 'dark';
        
        if (icon) {
            // Update SVG icon
            if (isDark) {
                icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
            } else {
                icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
            }
        }
        
        toggleButton.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        toggleButton.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }

    // Initialize theme on page load
    function initTheme() {
        const initialTheme = getInitialTheme();
        applyTheme(initialTheme);
        
        // Set up toggle button event listener
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleTheme);
        }
        
        // Note: System preference detection removed - default is always light theme
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
})();

