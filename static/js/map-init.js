
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking for map...");
    
    // Try to find the map if it's initialized in site_plan.html
    if (typeof L !== 'undefined' && document.getElementById('map')) {
        console.log("Leaflet is loaded and map element exists");
        // Check if map was already created in site_plan.html
        if (!window.map && typeof L.map === 'function') {
            console.log("Creating map fallback instance");
            try {
                window.map = L.map('map', {
                    center: [39.8282, -98.5795],
                    zoom: 4,
                    zoomControl: false // Disable default zoom controls as we'll add custom ones
                });
                
                console.log("Map created:", window.map);
                console.log("Map has hasLayer:", typeof window.map.hasLayer === 'function');
                
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
    
    // Make sure map is actually initialized before calling UI functions
    if (window.map) {
        console.log("Map is initialized, now handling UI setup");
        
        // Create drawnItems if it doesn't exist
        if (!window.drawnItems) {
            window.drawnItems = new L.FeatureGroup();
            try {
                window.map.addLayer(window.drawnItems);
                console.log("Added drawnItems layer to map");
            } catch (err) {
                console.error("Error adding drawnItems layer:", err);
            }
        }
        
        // Initialize UI after a short delay to ensure map is fully loaded
        setTimeout(function() {
            // Check if UI controls initialization function exists
            if (typeof initializeUIControls === 'function') {
                console.log("Found UI controls initialization function, calling it now");
                initializeUIControls();
                console.log("UI controls initialized via callback");
                
                // Ensure Leaflet Draw is properly initialized
                if (window.L && window.L.Control && window.L.Control.Draw && window.drawnItems) {
                    console.log("Setting up Leaflet Draw controls");
                    
                    // Make sure we don't add duplicate draw controls
                    const existingDrawControls = document.querySelectorAll('.leaflet-draw');
                    if (existingDrawControls.length === 0) {
                        const drawControl = new L.Control.Draw({
                            draw: {
                                polyline: true,
                                polygon: true,
                                rectangle: true,
                                circle: true,
                                marker: true
                            },
                            edit: {
                                featureGroup: window.drawnItems
                            }
                        });
                        window.map.addControl(drawControl);
                    }
                    
                    // Make sure draw event handlers are set up
                    if (!window.drawEventsInitialized) {
                        window.map.on('draw:created', function(e) {
                            const layer = e.layer;
                            window.drawnItems.addLayer(layer);
                            console.log("Shape created:", e.layerType);
                        });
                        
                        window.map.on('draw:edited', function(e) {
                            const layers = e.layers;
                            console.log("Shapes edited");
                        });
                        
                        window.map.on('draw:deleted', function(e) {
                            const layers = e.layers;
                            console.log("Shapes deleted");
                        });
                        
                        window.drawEventsInitialized = true;
                    }
                }
            } else if (typeof setupToolButtons === 'function') {
                console.log("Found setupToolButtons function, calling it directly");
                setupToolButtons();
            } else {
                console.error("No UI initialization function found");
            }
        }, 500);
    } else {
        console.error("Map is not initialized properly, cannot setup UI controls");
    }
});
