// Map initialization script for QDPro

// Global variables
let map = null;
let drawnItems = null;

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded, initializing map...");
    initMap();
});

// Function to initialize the map
function initMap() {
    console.log("Initializing map...");

    // Check if map has already been initialized
    if (window.map) {
        console.log("Map already initialized, returning existing instance");
        return window.map;
    }

    // Create map instance centered on a default location
    const map = L.map('map', {
        center: [33.7490, -84.3880], // Default to Atlanta
        zoom: 13,
        zoomControl: true,
        doubleClickZoom: false
    });

    // Make the map accessible globally
    window.map = map;

    return map;
}

// Initialize UI components
function initUI() {
    console.log("Initializing UI...");

    // Ensure map is initialized first
    if (!window.map) {
        console.log("Map not initialized, initializing now");
        initMap();
    }

    // Call UI initialization function if available
    if (typeof window.initializeUIControls === 'function') {
        console.log("Found UI controls initialization function, calling it now");
        window.initializeUIControls();
    } else {
        console.log("Fallback UI initialization running...");
        // Fallback initialization if UI controls not loaded
    }
}

// Add event handlers for map created items
window.addEventListener('map_initialized', function() {
    if (window.map) {
        // Handle drawing created event
        window.map.on('draw:edited', function(e) {
            console.log("Layers edited:", e.layers);
        });

        window.map.on('draw:deleted', function(e) {
            console.log("Layers deleted:", e.layers);
        });
    }
});


// Function to initialize base layers
function initBaseLayers() {
    console.log("Initializing base layers...");

    // OpenStreetMap layer
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    });

    // ESRI World Imagery
    const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // USGS Topo
    const usgsTopo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
    });

    // Add default layer to map
    osmLayer.addTo(map);

    // Create base layers object for layer control
    const baseLayers = {
        'OpenStreetMap': osmLayer,
        'ESRI Imagery': esriImagery,
        'USGS Topo': usgsTopo
    };

    // Add layer control to map
    L.control.layers(baseLayers, null, {
        position: 'topright',
        collapsed: true
    }).addTo(map);
}

// Function to initialize drawn items layer
function initDrawnItems() {
    console.log("Initializing drawn items layer...");

    // Create drawn items layer
    drawnItems = new L.FeatureGroup();

    // Add drawn items layer to map
    map.addLayer(drawnItems);

    // Make drawn items layer available globally
    window.drawnItems = drawnItems;
}

// Function to set up map controls (fallback)
function setupMapControls() {
    console.log("Setting up map controls (fallback)...");

    // Add zoom control to map
    L.control.zoom({
        position: 'topleft'
    }).addTo(map);

    // Add scale control to map
    L.control.scale({
        position: 'bottomleft',
        imperial: true,
        metric: true
    }).addTo(map);
}

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

// Placeholder for updateLayerStyle function (implementation needed elsewhere)
function updateLayerStyle(layer, type) {
    //Implementation needed
}

// Export functions to window object for global access
window.initMap = initMap;
window.initBaseLayers = initBaseLayers;
window.initDrawnItems = initDrawnItems;
window.initUI = initUI;
// Only define activateTool if it's not already defined
if (typeof window.activateTool !== 'function') {
    window.activateTool = function(toolName) {
        console.log(`Global activateTool called for: ${toolName}`);
        return null;
    };
}