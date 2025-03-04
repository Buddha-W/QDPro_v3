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

    try {
        // Create a map instance
        const mapOptions = {
            center: [39.8283, -98.5795], // Center of the US
            zoom: 5,
            zoomControl: true,
            attributionControl: true
        };

        // Initialize the map
        window.map = L.map('map', mapOptions);

        // Initialize feature groups for different types of layers
        window.drawnItems = new L.FeatureGroup();
        window.map.addLayer(window.drawnItems);

        window.featureGroups = {
            facilities: new L.FeatureGroup(),
            safetyArcs: new L.FeatureGroup(),
            pesLocations: new L.FeatureGroup(),
            esLocations: new L.FeatureGroup()
        };

        // Add feature groups to the map
        for (const groupName in window.featureGroups) {
            window.map.addLayer(window.featureGroups[groupName]);
            window.drawnItems.addLayer(window.featureGroups[groupName]);
        }

        // Add base layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
            maxZoom: 19
        });

        const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
            maxZoom: 17
        });

        // Add the OSM layer to the map by default
        osmLayer.addTo(window.map);

        // Create a layer control
        const baseLayers = {
            "Standard": osmLayer,
            "Satellite": satelliteLayer,
            "Topographic": topoLayer
        };

        L.control.layers(baseLayers, null, {
            position: 'topright',
            collapsed: true
        }).addTo(window.map);

        // Set up draw controls
        const drawControls = new L.Control.Draw({
            position: 'topleft',
            draw: {
                polyline: false,
                polygon: false,
                circle: false,
                rectangle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: window.drawnItems,
                edit: false,
                remove: false
            }
        });

        window.map.addControl(drawControls);

        // Initialize UI
        initUI();

        console.log("Map initialized successfully");

    } catch (error) {
        console.error("Error initializing map:", error);
    }
}

// Initialize UI
function initUI() {
    console.log("Initializing UI...");

    // Initialize UI after a short delay to ensure map is fully loaded
    setTimeout(function() {
        // Make sure map and drawnItems are properly initialized
        if (!window.drawnItems) {
            window.drawnItems = new L.FeatureGroup();
            window.map.addLayer(window.drawnItems);
        }

        // Add draw:created event listener to the map
        window.map.on('draw:created', function(e) {
            console.log("Layer created:", e.layerType);
            window.drawnItems.addLayer(e.layer);
        });

        // Make sure the map object has all needed functions
        if (!window.map.hasLayer) {
            console.warn("Map missing hasLayer function, adding compatibility");
            window.map.hasLayer = function(layer) {
                return this._layers && Object.values(this._layers).includes(layer);
            };
        }

        // Check if UI controls initialization function exists
        if (typeof window.initializeUIControls === 'function') {
            console.log("Found UI controls initialization function, calling it now");
            try {
                window.initializeUIControls();
                console.log("UI controls initialized via direct call");
            } catch (error) {
                console.error("Error initializing UI controls:", error);
            }
        } else {
            console.error("UI initialization function not found");
            // Load UI controls script if it doesn't exist
            const script = document.createElement('script');
            script.src = '/static/js/ui-controls.js';
            script.onload = function() {
                console.log("UI controls script loaded dynamically");
                if (typeof window.initializeUIControls === 'function') {
                    window.initializeUIControls();
                }
            };
            document.head.appendChild(script);
        }
    }, 1000);
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