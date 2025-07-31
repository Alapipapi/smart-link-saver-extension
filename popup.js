document.addEventListener('DOMContentLoaded', function() {
    const currentUrlDiv = document.getElementById('currentUrl');
    const noteInput = document.getElementById('note');
    const saveButton = document.getElementById('saveButton');
    const messageDiv = document.getElementById('message');
    const darkModeToggle = document.getElementById('darkModeToggle');
    // const viewSavedLinksButton = document.getElementById('viewSavedLinks'); // Already an anchor

    // --- Theme Management ---
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

    // --- Core Link Saving Logic ---
    // Get the current tab's URL when the popup opens
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url) {
            currentUrlDiv.textContent = currentTab.url;
        } else {
            currentUrlDiv.textContent = "Could not get current URL.";
        }
    });

    // Function to show messages
    function showMessage(msg, type = 'success') {
        messageDiv.textContent = msg;
        messageDiv.className = 'show'; // Reset classes
        if (type === 'success') {
            messageDiv.classList.add('success');
        } else if (type === 'error') {
            messageDiv.classList.add('error');
        } else {
            messageDiv.style.color = 'orange'; // For warning/info
        }

        // Temporarily hide the message after a few seconds
        setTimeout(() => {
            messageDiv.classList.remove('show');
            messageDiv.textContent = ''; // Clear text
            messageDiv.className = ''; // Remove all classes
        }, 3000); // Clear message after 3 seconds
    }

    // Event listener for the save button
    saveButton.addEventListener('click', function() {
        const urlToSave = currentUrlDiv.textContent;
        const noteToSave = noteInput.value.trim();

        if (urlToSave === "Loading..." || urlToSave === "Could not get current URL.") {
            showMessage("Please wait for the URL to load.", "error");
            return;
        }
        if (!urlToSave || urlToSave.startsWith("chrome://")) {
             showMessage("Cannot save this URL.", "error");
             return;
        }


        // Get existing links from storage, add the new one, and save back
        chrome.storage.local.get({ savedLinks: [] }, function(data) {
            const savedLinks = data.savedLinks;
            const newLink = {
                url: urlToSave,
                note: noteToSave,
                date: new Date().toISOString() // Save current date/time
            };
            savedLinks.unshift(newLink); // Add to the beginning of the array

            chrome.storage.local.set({ savedLinks: savedLinks }, function() {
                if (chrome.runtime.lastError) {
                    showMessage("Error saving link: " + chrome.runtime.lastError.message, "error");
                } else {
                    showMessage("Link saved successfully!", "success");
                    noteInput.value = ''; // Clear the note input after saving
                }
            });
        });
    });
});