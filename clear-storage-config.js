// Script to clear stored host access configuration
// Run this in the browser console to reset the configuration

chrome.storage.local.remove("hostAccessConfig", function() {
    console.log("✅ Host access configuration cleared from storage");
    console.log("🔄 The system will now use the configuration from host-access-config.json");

    // Verify it's cleared
    chrome.storage.local.get("hostAccessConfig", function(result) {
        console.log("🔍 Current storage state:", result);
    });
});