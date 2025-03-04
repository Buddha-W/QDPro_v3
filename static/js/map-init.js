// Map initialization script
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking for map...");

    if (typeof L !== 'undefined' && document.getElementById('map')) {
        console.log("Leaflet is loaded and map element exists");

        try {
            // Initialize map if not already initialized
            if (!window.map) {
                console.log("Creating map instance");

                // Initialize map
                window.map = L.map('map', {
                    center: [39.8283, -98.5795],
                    zoom: 5
                });

                console.log("Map created:", window.map);
                console.log("Map has hasLayer:", typeof window.map.hasLayer === 'function');

                // Add tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(window.map);

                // Initialize drawn items layer
                if (!window.drawnItems) {
                    window.drawnItems = new L.FeatureGroup();
                    window.map.addLayer(window.drawnItems);
                }

                console.log("Map initialization verified successfully");

                // Initialize UI after a short delay to ensure map is fully loaded
                setTimeout(function() {
                    // Check if UI controls initialization function exists
                    if (typeof window.initializeUIControls === 'function') {
                        console.log("Found UI controls initialization function, calling it now");
                        window.initializeUIControls();
                        console.log("UI controls initialized via callback");
                    } else {
                        console.error("UI initialization function not found");
                    }
                }, 500);
            }
        } catch (error) {
            console.error("Error initializing map:", error);
        }
    } else {
        console.error("Leaflet not loaded or map element not found");
    }
});

// Function to fetch facilities from the API
window.fetchFacilities = async function() {
    try {
        const response = await fetch('/reports/facilities');
        const facilities = await response.json();

        console.log("Facilities fetched:", facilities);

        // Add facilities to the map
        if (window.map && facilities && Array.isArray(facilities)) {
            facilities.forEach(facility => {
                const marker = L.marker([facility.lat, facility.lng])
                    .bindPopup(`<b>${facility.name}</b>`)
                    .addTo(window.map);

                // Store facility data in marker
                marker.facilityData = facility;
            });
        }
    } catch (error) {
        console.error("Error fetching facilities:", error);
    }
};

// Function to save the current map state
window.saveMapState = async function() {
    try {
        if (!window.drawnItems) {
            console.error("No drawn items to save");
            return;
        }

        // Convert drawn items to GeoJSON
        const geoJSON = window.drawnItems.toGeoJSON();

        // Add custom properties to each feature
        geoJSON.features.forEach(feature => {
            const layer = window.drawnItems.getLayers().find(layer => {
                // Try to match the layer with the feature
                if (layer.getLatLng && feature.geometry.type === 'Point') {
                    const coords = feature.geometry.coordinates;
                    const latlng = layer.getLatLng();
                    return Math.abs(latlng.lng - coords[0]) < 0.0001 && 
                           Math.abs(latlng.lat - coords[1]) < 0.0001;
                }
                return false;
            });

            if (layer) {
                // Copy custom properties from the layer
                feature.properties.name = layer.name || '';
                feature.properties.type = layer.type || '';
                feature.properties.description = layer.description || '';
            }
        });

        // Send to server
        const response = await fetch('/api/save-map', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(geoJSON)
        });

        const result = await response.json();
        console.log("Map state saved:", result);

        return result;
    } catch (error) {
        console.error("Error saving map state:", error);
        return { success: false, error: error.message };
    }
};

// Function to load the map state
window.loadMapState = async function() {
    try {
        const response = await fetch('/api/load-map');
        const geoJSON = await response.json();

        console.log("Map state loaded:", geoJSON);

        if (!window.drawnItems) {
            console.error("Drawn items layer not initialized");
            return { success: false, error: "Drawn items layer not initialized" };
        }

        // Clear existing layers
        window.drawnItems.clearLayers();

        // Add GeoJSON to the map
        const layers = L.geoJSON(geoJSON, {
            onEachFeature: function(feature, layer) {
                // Copy properties from GeoJSON to the layer
                if (feature.properties) {
                    layer.name = feature.properties.name || '';
                    layer.type = feature.properties.type || '';
                    layer.description = feature.properties.description || '';

                    // Update layer style based on type
                    if (layer.setStyle && layer.type) {
                        updateLayerStyle(layer, layer.type);
                    }
                }

                // Add to drawn items
                window.drawnItems.addLayer(layer);
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error loading map state:", error);
        return { success: false, error: error.message };
    }
};

// Custom control to add a zoom control at the top-right corner
L.Control.CustomZoom = L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar');
        const zoomInButton = L.DomUtil.create('a', 'leaflet-control-zoom-in', container);
        const zoomOutButton = L.DomUtil.create('a', 'leaflet-control-zoom-out', container);

        zoomInButton.innerHTML = '+';
        zoomInButton.href = '#';
        zoomInButton.title = 'Zoom in';

        zoomOutButton.innerHTML = '−';
        zoomOutButton.href = '#';
        zoomOutButton.title = 'Zoom out';

        L.DomEvent.on(zoomInButton, 'click', L.DomEvent.stop)
            .on(zoomInButton, 'click', function() {
                map.zoomIn();
            });

        L.DomEvent.on(zoomOutButton, 'click', L.DomEvent.stop)
            .on(zoomOutButton, 'click', function() {
                map.zoomOut();
            });

        return container;
    }
});