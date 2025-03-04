
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking for map...");
    
    // Try to find the map if it's initialized in site_plan.html
    if (typeof L !== 'undefined' && document.getElementById('map')) {
        // Check if map was already created in site_plan.html
        if (!window.map && typeof L.map === 'function') {
            console.log("Creating map fallback instance");
            try {
                window.map = L.map('map', {
                    center: [39.8282, -98.5795],
                    zoom: 4,
                    zoomControl: false // Disable default zoom controls as we'll add custom ones
                });
                
                // Add a default base layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(window.map);
                
                // Initialize drawn items layer
                window.drawnItems = new L.FeatureGroup();
                window.map.addLayer(window.drawnItems);
                
                console.log("Map initialization verified successfully");
                console.log("Added drawn items layer during initialization check");
            } catch (e) {
                console.error("Error creating map:", e);
            }
        }
    } else {
        console.error("Leaflet not loaded or map element not found");
    }
    
    // Check if UI controls initialization function exists
    if (typeof initializeUIControls === 'function') {
        console.log("Found UI controls initialization function, calling it now");
        initializeUIControls();
        console.log("UI controls initialized via callback");
    }
});
