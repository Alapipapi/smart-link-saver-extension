// background.js

// This service worker currently doesn't need to do much for our simple link saver.
// Most of the logic for saving is handled directly in popup.js.

// However, a service worker is required by Manifest V3.
// It could be used for more complex features later, such as:
// - Handling keyboard shortcuts (chrome.commands)
// - Responding to browser navigation events
// - Performing tasks even when the popup is closed
// - Managing alarms or notifications

// For now, we'll just log a message to indicate it's active.
console.log("Smart Link Saver background service worker active.");

// Example of a minimal listener if you wanted to do something
// when the extension is first installed or updated:
chrome.runtime.onInstalled.addListener(() => {
    console.log("Smart Link Saver extension installed or updated.");
});


// --- NEW: Keyboard Shortcut Listener ---
// Listen for the command to be triggered
chrome.commands.onCommand.addListener(async (command) => {
    // Check if the triggered command is "_execute_action"
    if (command === "_execute_action") {
        // This is a minimal way to open the popup from the background script
        chrome.action.openPopup();
    }
});