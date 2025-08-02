document.addEventListener('DOMContentLoaded', function() {
    const currentUrlDiv = document.getElementById('currentUrl');
    const noteInput = document.getElementById('note');
    const tagsInput = document.getElementById('tagsInput');
    const saveButton = document.getElementById('saveButton');
    const messageDiv = document.getElementById('message');
    const messageText = messageDiv.querySelector('.text');
    const successIcon = messageDiv.querySelector('.success-icon');
    const errorIcon = messageDiv.querySelector('.error-icon');
    const darkModeToggle = document.getElementById('darkModeToggle');

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
        const savedTheme = data.theme || 'light';
        applyTheme(savedTheme);
    });

    // Listen for theme toggle changes
    darkModeToggle.addEventListener('change', function() {
        const newTheme = darkModeToggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
    });

    // --- Core Link Saving Logic ---
    // Get the current tab's URL and title when the popup opens
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url) {
            currentUrlDiv.textContent = currentTab.url;
            // Automatically suggest the page title as the note
            if (currentTab.title) {
                noteInput.value = currentTab.title;
            }
        } else {
            currentUrlDiv.textContent = "Could not get current URL.";
        }
    });

    // Function to show messages
    function showMessage(msg, type = 'success') {
        // Hide all icons and clear classes first
        messageDiv.classList.remove('success', 'error');
        successIcon.style.display = 'none';
        errorIcon.style.display = 'none';
        messageText.textContent = msg;

        // Apply correct classes and show the right icon
        messageDiv.classList.add('show', type);
        if (type === 'success') {
            successIcon.style.display = 'flex';
        } else if (type === 'error') {
            errorIcon.style.display = 'flex';
        }

        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 3000);
    }

    // Event listener for the save button
    saveButton.addEventListener('click', function() {
        const urlToSave = currentUrlDiv.textContent;
        const noteToSave = noteInput.value.trim();
        const tagsToSave = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

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
                tags: tagsToSave,
                date: new Date().toISOString()
            };
            savedLinks.unshift(newLink);

            chrome.storage.local.set({ savedLinks: savedLinks }, function() {
                if (chrome.runtime.lastError) {
                    showMessage("Error saving link: " + chrome.runtime.lastError.message, "error");
                } else {
                    showMessage("Link saved successfully!", "success");
                    noteInput.value = '';
                    tagsInput.value = '';
                }
            });
        });
    });
});