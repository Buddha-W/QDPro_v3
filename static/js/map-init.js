
// Ensures the map is properly initialized before other scripts try to access it
window.mapInitialized = false;

function checkMapInitialization() {
    if (!window.map) {
        console.warn("Map not initialized yet!");
        return false;
    }
    
    // Make sure map has all necessary methods
    if (typeof window.map.addLayer !== 'function') {
        console.warn("Map initialized but missing methods!");
        return false;
    }
    
    window.mapInitialized = true;
    console.log("Map initialization verified");
    return true;
}

// Execute this after map is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Try to verify map initialization
    const initCheck = setInterval(function() {
        if (window.map) {
            if (checkMapInitialization()) {
                clearInterval(initCheck);
                // Initialize UI controls after map is fully loaded
                if (window.initializeUIControls && typeof window.initializeUIControls === 'function') {
                    window.initializeUIControls();
                }
            }
        }
    }, 500);
    
    // Timeout after 10 seconds if map doesn't initialize
    setTimeout(function() {
        if (!window.mapInitialized) {
            console.error("Map failed to initialize within timeout period");
            clearInterval(initCheck);
        }
    }, 10000);
});

