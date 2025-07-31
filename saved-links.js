document.addEventListener('DOMContentLoaded', function() {
    const linksContainer = document.getElementById('linksContainer');
    const searchInput = document.getElementById('searchInput');
    const noLinksMessage = document.getElementById('noLinksMessage');
    const noSearchResultsMessage = document.getElementById('noSearchResultsMessage'); // New element
    const darkModeToggle = document.getElementById('darkModeToggle'); // New element

    let allSavedLinks = []; // Store all links for searching

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
    // Function to load and display links
    function loadAndDisplayLinks(searchTerm = '') {
        chrome.storage.local.get({ savedLinks: [] }, function(data) {
            allSavedLinks = data.savedLinks;
            linksContainer.innerHTML = ''; // Clear existing links
            noLinksMessage.style.display = 'none'; // Hide by default
            noSearchResultsMessage.style.display = 'none'; // Hide by default

            if (allSavedLinks.length === 0) {
                noLinksMessage.style.display = 'block'; // Show message if no links at all
                return;
            }

            const lowerSearchTerm = searchTerm.toLowerCase();
            const filteredLinks = allSavedLinks.filter(link => {
                return link.url.toLowerCase().includes(lowerSearchTerm) ||
                       (link.note && link.note.toLowerCase().includes(lowerSearchTerm));
            });

            if (filteredLinks.length === 0 && searchTerm !== '') {
                noSearchResultsMessage.style.display = 'block'; // Show no results if filtered
                return;
            }

            filteredLinks.forEach((link) => { // Removed index as we're now deleting by URL/Date
                const linkItem = document.createElement('div');
                linkItem.classList.add('link-item');

                const titleElement = document.createElement('h3');
                const linkAnchor = document.createElement('a');
                linkAnchor.href = link.url;
                linkAnchor.textContent = link.url;
                linkAnchor.target = "_blank"; // Open in new tab
                linkAnchor.rel = "noopener noreferrer"; // Security best practice
                titleElement.appendChild(linkAnchor);
                linkItem.appendChild(titleElement);

                if (link.note && link.note.trim() !== '') { // Only add note if it exists and isn't just whitespace
                    const noteElement = document.createElement('p');
                    noteElement.textContent = link.note;
                    linkItem.appendChild(noteElement);
                }

                const dateElement = document.createElement('p');
                // Format date for better readability
                const date = new Date(link.date);
                dateElement.classList.add('date');
                // Use options for locale-aware date/time string
                dateElement.textContent = `Saved on: ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                linkItem.appendChild(dateElement);

                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-button');
                deleteButton.textContent = 'Delete';
                // Store unique identifiers for deletion
                deleteButton.dataset.url = link.url;
                deleteButton.dataset.date = link.date;
                deleteButton.addEventListener('click', function() {
                    // Pass URL and date for precise deletion
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
            // Filter out the link that matches both URL and date (to handle duplicate URLs)
            const updatedLinks = savedLinks.filter(link => !(link.url === urlToDelete && link.date === dateToDelete));

            chrome.storage.local.set({ savedLinks: updatedLinks }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error deleting link:", chrome.runtime.lastError.message);
                    // Could add a visual error message on the page here
                } else {
                    console.log("Link deleted successfully.");
                    loadAndDisplayLinks(searchInput.value); // Reload links with current search term
                }
            });
        });
    }

    // Event listener for search input
    searchInput.addEventListener('input', function() {
        loadAndDisplayLinks(searchInput.value);
    });

    // Initial load of links when the page opens
    loadAndDisplayLinks();
});