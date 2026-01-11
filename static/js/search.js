// Search functionality for CodeFryDev
// Supports multiple search instances on the same page

(function() {
    'use strict';

    // Initialize all search instances on the page
    function initializeSearchInstances() {
        if (!window.searchInstances) {
            return;
        }

        Object.keys(window.searchInstances).forEach(searchID => {
            const config = window.searchInstances[searchID];
            initializeSearch(searchID, config);
        });
    }

    // Initialize a single search instance
    function initializeSearch(searchID, config) {
        const searchInput = document.getElementById(searchID + '-searchInput');
        if (!searchInput) {
            return;
        }

        const searchData = config.searchData;
        const baseURL = config.baseURL;

        // Flatten all data into searchable items
        function getAllItems() {
            const items = [];
            
            // From home.yaml
            if (searchData.home && searchData.home.categories) {
                searchData.home.categories.forEach(category => {
                    if (category.items) {
                        category.items.forEach(item => {
                            items.push({
                                name: item.name,
                                url: item.url,
                                category: category.name,
                                type: 'tool',
                                icon: item.icon
                            });
                        });
                    }
                });
            }
            
            // From ai.yaml
            if (searchData.ai && searchData.ai.data) {
                searchData.ai.data.forEach(item => {
                    items.push({
                        name: item.name,
                        url: item.url,
                        category: 'AI Tools',
                        type: 'ai',
                        icon: item.icon
                    });
                });
            }
            
            // From games.yaml
            if (searchData.games && searchData.games.data) {
                searchData.games.data.forEach(item => {
                    items.push({
                        name: item.name,
                        url: item.url,
                        category: 'Games',
                        type: 'game',
                        icon: item.icon
                    });
                });
            }
            
            // From designlab.yaml
            if (searchData.designlab && searchData.designlab.data) {
                searchData.designlab.data.forEach(item => {
                    items.push({
                        name: item.name,
                        url: item.url,
                        category: 'Design Tools',
                        type: 'design',
                        icon: item.icon
                    });
                });
            }
            
            return items;
        }
        
        // Convert URL to absolute
        function getAbsoluteURL(url) {
            if (!url) return '#';
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            if (url.startsWith('/')) {
                return baseURL + url.substring(1);
            }
            return baseURL + url;
        }
        
        // Search function
        function search(query) {
            const queryTrimmed = query.trim();
            const allItems = getAllItems();
            
            const searchResults = document.getElementById(searchID + '-searchResults');
            const noResults = document.getElementById(searchID + '-noResults');
            const searchStats = document.getElementById(searchID + '-searchStats');
            const searchSuggestions = document.getElementById(searchID + '-searchSuggestions');
            
            if (!queryTrimmed || queryTrimmed.length === 0) {
                if (searchResults) searchResults.classList.remove('active');
                if (noResults) noResults.style.display = 'none';
                if (searchStats) searchStats.style.display = 'none';
                if (searchSuggestions) searchSuggestions.classList.remove('active');
                return;
            }
            
            const searchTerm = queryTrimmed.toLowerCase();
            const results = allItems.filter(item => {
                const nameMatch = item.name.toLowerCase().includes(searchTerm);
                const categoryMatch = item.category.toLowerCase().includes(searchTerm);
                return nameMatch || categoryMatch;
            });
            
            // Show suggestions in button format for short queries or when few results
            if (queryTrimmed.length <= 2) {
                // Show top suggestions while typing
                showSuggestions(results.slice(0, 12), queryTrimmed);
                if (searchResults) searchResults.classList.remove('active');
                if (noResults) noResults.style.display = 'none';
                if (searchStats) searchStats.style.display = 'none';
            } else if (results.length > 0 && results.length <= 12) {
                // Show suggestions for small result sets (easier to browse)
                showSuggestions(results, queryTrimmed);
                if (searchResults) searchResults.classList.remove('active');
                if (noResults) noResults.style.display = 'none';
                if (searchStats) searchStats.style.display = 'none';
            } else {
                // Show full results list for larger result sets
                if (searchSuggestions) searchSuggestions.classList.remove('active');
                displayResults(results, queryTrimmed);
            }
        }
        
        // Show search suggestions in button format
        function showSuggestions(suggestions, query) {
            const suggestionsContainer = document.getElementById(searchID + '-suggestionsGrid');
            const suggestionsDiv = document.getElementById(searchID + '-searchSuggestions');
            
            if (!suggestionsContainer || !suggestionsDiv) {
                return;
            }
            
            if (suggestions.length === 0) {
                suggestionsDiv.classList.remove('active');
                return;
            }
            
            suggestionsDiv.classList.add('active');
            suggestionsContainer.innerHTML = '';
            
            suggestions.forEach(item => {
                const button = document.createElement('a');
                button.href = getAbsoluteURL(item.url);
                button.className = 'suggestion-button hapticButton';
                
                // Determine icon path
                let iconPath = '';
                if (item.icon) {
                    if (item.type === 'ai') {
                        iconPath = `/images/ai/${item.icon}.svg`;
                    } else if (item.type === 'game') {
                        iconPath = `/images/games/${item.icon}.svg`;
                    } else if (item.type === 'design') {
                        iconPath = `/images/designlab/${item.icon}.svg`;
                    } else {
                        iconPath = `/images/home/${item.icon}.svg`;
                    }
                }
                
                button.innerHTML = `
                    <div class="suggestion-icon">
                        <img src="${iconPath}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'">
                    </div>
                    <span class="suggestion-name">${highlightMatch(item.name, query)}</span>
                `;
                
                suggestionsContainer.appendChild(button);
            });
        }
        
        // Display search results
        function displayResults(results, query) {
            const resultsContainer = document.getElementById(searchID + '-searchResults');
            const noResultsDiv = document.getElementById(searchID + '-noResults');
            const statsDiv = document.getElementById(searchID + '-searchStats');
            
            if (!resultsContainer || !noResultsDiv || !statsDiv) {
                return;
            }
            
            if (results.length === 0) {
                resultsContainer.classList.remove('active');
                noResultsDiv.style.display = 'block';
                statsDiv.style.display = 'none';
                return;
            }
            
            noResultsDiv.style.display = 'none';
            statsDiv.style.display = 'block';
            statsDiv.innerHTML = `<strong>${results.length}</strong> result${results.length !== 1 ? 's' : ''} found for <strong>"${query}"</strong>`;
            
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('active');
            
            results.forEach(item => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-item';
                resultDiv.onclick = () => {
                    window.location.href = getAbsoluteURL(item.url);
                };
                
                // Determine icon path based on type
                let iconPath = '';
                if (item.icon) {
                    if (item.type === 'ai') {
                        iconPath = `/images/ai/${item.icon}.svg`;
                    } else if (item.type === 'game') {
                        iconPath = `/images/games/${item.icon}.svg`;
                    } else if (item.type === 'design') {
                        iconPath = `/images/designlab/${item.icon}.svg`;
                    } else {
                        iconPath = `/images/home/${item.icon}.svg`;
                    }
                }
                
                const iconHTML = iconPath ? `
                    <div class="result-icon">
                        <img src="${iconPath}" alt="${item.name}" onerror="this.parentElement.style.display='none'">
                    </div>
                ` : '<div class="result-icon" style="display:none;"></div>';
                
                resultDiv.innerHTML = `
                    ${iconHTML}
                    <div class="result-content">
                        <h3>${highlightMatch(item.name, query)}</h3>
                        <div class="result-meta">
                            <span class="result-category">${item.category}</span>
                            <span class="result-badge ${item.type}">${item.type.toUpperCase()}</span>
                        </div>
                    </div>
                `;
                
                resultsContainer.appendChild(resultDiv);
            });
        }
        
        // Highlight matching text
        function highlightMatch(text, query) {
            // Escape special regex characters
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedQuery})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        }
        
        // Handle URL query parameter
        function getQueryParam() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('q') || '';
        }
        
        // Initialize this search instance
        const initialQuery = getQueryParam();
        
        if (initialQuery) {
            searchInput.value = initialQuery;
            search(initialQuery);
        }
        
        // Real-time search
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                search(e.target.value);
                // Update URL without reload
                const url = new URL(window.location);
                if (e.target.value) {
                    url.searchParams.set('q', e.target.value);
                } else {
                    url.searchParams.delete('q');
                }
                window.history.pushState({}, '', url);
            }, 300);
        });
        
        // Handle Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                e.preventDefault();
                const firstResult = document.querySelector('#' + searchID + '-searchResults .result-item');
                if (firstResult) {
                    firstResult.click();
                }
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSearchInstances);
    } else {
        // DOM is already ready
        initializeSearchInstances();
    }
})();
