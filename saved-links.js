document.addEventListener('DOMContentLoaded', function() {
    const linksContainer = document.getElementById('linksContainer');
    const searchInput = document.getElementById('searchInput');
    const tagFilterInput = document.getElementById('tagFilterInput'); // NEW: Get the tag filter input
    const exportButton = document.getElementById('exportButton'); // NEW: Get the export button
    const noLinksMessage = document.getElementById('noLinksMessage');
    const noSearchResultsMessage = document.getElementById('noSearchResultsMessage');
    const darkModeToggle = document.getElementById('darkModeToggle');

    let allSavedLinks = []; // Store all links for searching and filtering

    // --- Theme Management (Copied from popup.js) ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
        }
    }

    // Load saved theme preference
    chrome.storage.local.get('theme', function(data) {
        const savedTheme = data.theme || 'light'; // Default to light
        applyTheme(savedTheme);
    });

    // Listen for theme toggle changes
    darkModeToggle.addEventListener('change', function() {
        const newTheme = darkModeToggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
    });

    // --- Core Link Display and Management Logic ---
    // Function to load and display links with both search and tag filters
    function loadAndDisplayLinks(searchTerm = '', tagFilterTerm = '') {
        chrome.storage.local.get({ savedLinks: [] }, function(data) {
            allSavedLinks = data.savedLinks;
            linksContainer.innerHTML = '';
            noLinksMessage.style.display = 'none';
            noSearchResultsMessage.style.display = 'none';

            if (allSavedLinks.length === 0) {
                noLinksMessage.style.display = 'block';
                return;
            }

            const lowerSearchTerm = searchTerm.toLowerCase();
            const lowerTagFilterTerm = tagFilterTerm.toLowerCase().trim();

            const filteredLinks = allSavedLinks.filter(link => {
                // Main search filter (URL or note)
                const matchesSearch = link.url.toLowerCase().includes(lowerSearchTerm) ||
                                      (link.note && link.note.toLowerCase().includes(lowerSearchTerm));

                // NEW: Tag filter
                const matchesTag = !lowerTagFilterTerm || 
                                   (link.tags && link.tags.some(tag => tag.toLowerCase().includes(lowerTagFilterTerm)));

                return matchesSearch && matchesTag;
            });

            if (filteredLinks.length === 0 && (searchTerm !== '' || tagFilterTerm !== '')) {
                noSearchResultsMessage.style.display = 'block';
                return;
            }

            filteredLinks.forEach((link) => {
                const linkItem = document.createElement('div');
                linkItem.classList.add('link-item');

                const titleElement = document.createElement('h3');
                const linkAnchor = document.createElement('a');
                linkAnchor.href = link.url;
                linkAnchor.textContent = link.url;
                linkAnchor.target = "_blank";
                linkAnchor.rel = "noopener noreferrer";
                titleElement.appendChild(linkAnchor);
                linkItem.appendChild(titleElement);

                if (link.note && link.note.trim() !== '') {
                    const noteElement = document.createElement('p');
                    noteElement.textContent = link.note;
                    linkItem.appendChild(noteElement);
                }
                
                // NEW: Display tags
                if (link.tags && link.tags.length > 0) {
                    const tagsContainer = document.createElement('div');
                    tagsContainer.classList.add('tags-container');
                    link.tags.forEach(tagText => {
                        const tagElement = document.createElement('span');
                        tagElement.classList.add('tag');
                        tagElement.textContent = tagText;
                        tagsContainer.appendChild(tagElement);
                    });
                    linkItem.appendChild(tagsContainer);
                }

                const dateElement = document.createElement('p');
                const date = new Date(link.date);
                dateElement.classList.add('date');
                dateElement.textContent = `Saved on: ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                linkItem.appendChild(dateElement);

                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-button');
                deleteButton.textContent = 'Delete';
                deleteButton.dataset.url = link.url;
                deleteButton.dataset.date = link.date;
                deleteButton.addEventListener('click', function() {
                    deleteLink(this.dataset.url, this.dataset.date);
                });
                linkItem.appendChild(deleteButton);

                linksContainer.appendChild(linkItem);
            });
        });
    }

    // Function to delete a link
    function deleteLink(urlToDelete, dateToDelete) {
        chrome.storage.local.get({ savedLinks: [] }, function(data) {
            let savedLinks = data.savedLinks;
            const updatedLinks = savedLinks.filter(link => !(link.url === urlToDelete && link.date === dateToDelete));

            chrome.storage.local.set({ savedLinks: updatedLinks }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error deleting link:", chrome.runtime.lastError.message);
                } else {
                    console.log("Link deleted successfully.");
                    // Reload links with current search and tag filter terms
                    loadAndDisplayLinks(searchInput.value, tagFilterInput.value);
                }
            });
        });
    }

    // NEW: Function to export all saved links
    function exportLinks() {
        chrome.storage.local.get({ savedLinks: [] }, function(data) {
            const savedLinks = data.savedLinks;
            const dataStr = JSON.stringify(savedLinks, null, 2); // Pretty-print the JSON
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create a temporary anchor element to trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'smart-link-saver-export.json';
            a.click();
            
            // Clean up by revoking the URL object
            URL.revokeObjectURL(url);
        });
    }

    // Event listener for search input
    searchInput.addEventListener('input', function() {
        loadAndDisplayLinks(searchInput.value, tagFilterInput.value);
    });

    // NEW: Event listener for tag filter input
    tagFilterInput.addEventListener('input', function() {
        loadAndDisplayLinks(searchInput.value, tagFilterInput.value);
    });

    // NEW: Event listener for the export button
    exportButton.addEventListener('click', exportLinks);

    // Initial load of links when the page opens
    loadAndDisplayLinks();
});