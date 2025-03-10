// QDPro Map Initialization 
// Handles core map functionality

// Global state from edited code and original code
window.map = null;
window.drawnItems = null;
window.facilitiesLayer = null;
window.arcsLayer = null;
window.featureEditor = {};
window.editMode = false;


// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing map...');
    //Removed initMap() call; map initialization is now handled in the edited code's DOMContentLoaded listener.
    initializeMapErrorHandling();
});

// Initialize the map with base layers and controls (combined from original and edited code)
//This function is largely replaced by the edited code's map initialization logic.
//function initMap() { ... }


// Create popup content with properties and edit button (from edited code)
function createPopupContent(layer) {
    const properties = layer.feature?.properties || {};
    const name = properties.name || 'Unnamed Feature';
    const description = properties.description || '';

    let popupContent = `<div class="feature-popup">
                           <h4>${name}</h4>`;

    if (description) {
        popupContent += `<p>${description}</p>`;
    }

    popupContent += `<button class="btn btn-sm btn-primary edit-feature-btn" 
                       onclick="openFeatureEditor(window.drawnItems.getLayer(${window.drawnItems.getLayerId(layer)}))">
                       Edit Properties
                    </button>
                    </div>`;

    return popupContent;
}

// Open the feature editor for a layer (from edited code)
function openFeatureEditor(layer) {
    console.log('Opening feature editor for layer:', layer);

    // Get properties or set defaults (from edited code)
    const properties = layer.feature?.properties || {};
    const name = properties.name || '';
    const description = properties.description || '';

    // Set values in the form (from edited code)
    document.getElementById('feature-name').value = name;
    document.getElementById('feature-description').value = description;

    // Set the active feature (from edited code)
    window.featureEditor.activeFeature = layer;

    // Show the modal (from edited code)
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Set up custom layer controls (from edited code)
function setupLayerControls(baseLayers) {
    // Add base layer controls to the right panel (from edited code)
    const baseLayersDiv = document.getElementById('base-layers-control');
    baseLayersDiv.innerHTML = '<div class="panel-header">Base Maps</div>';

    for (const [name, layer] of Object.entries(baseLayers)) {
        const layerControl = document.createElement('div');
        layerControl.className = 'form-check';

        const layerInput = document.createElement('input');
        layerInput.className = 'form-check-input';
        layerInput.type = 'radio';
        layerInput.name = 'baseLayerRadio';
        layerInput.id = `baseLayer-${name}`;
        layerInput.checked = (name === 'OpenStreetMap'); // Default selection

        layerInput.addEventListener('change', function() {
            if (this.checked) {
                // Remove all base layers (from edited code)
                for (const baseLayer of Object.values(baseLayers)) {
                    window.map.removeLayer(baseLayer);
                }
                // Add the selected base layer (from edited code)
                window.map.addLayer(layer);
            }
        });

        const layerLabel = document.createElement('label');
        layerLabel.className = 'form-check-label';
        layerLabel.htmlFor = `baseLayer-${name}`;
        layerLabel.textContent = name;

        layerControl.appendChild(layerInput);
        layerControl.appendChild(layerLabel);
        baseLayersDiv.appendChild(layerControl);
    }
}

// Set up custom drawing tools (from edited code)
function setupDrawingTools() {
    // Reference to drawing tool buttons (from edited code)
    const polygonTool = document.getElementById('polygon-tool');
    const rectangleTool = document.getElementById('rectangle-tool');
    const circleTool = document.getElementById('circle-tool');
    const markerTool = document.getElementById('marker-tool');
    const deleteTool = document.getElementById('delete-tool');
    const editTool = document.getElementById('edit-tool');

    // Initialize edit mode flag (from edited code)
    window.editMode = false;

    // Polygon tool click handler (from edited code)
    polygonTool.addEventListener('click', function() {
        resetActiveTools();
        this.classList.add('active');
        new L.Draw.Polygon(window.map).enable();
    });

    // Rectangle tool click handler (from edited code)
    rectangleTool.addEventListener('click', function() {
        resetActiveTools();
        this.classList.add('active');
        new L.Draw.Rectangle(window.map).enable();
    });

    // Circle tool click handler (from edited code)
    circleTool.addEventListener('click', function() {
        resetActiveTools();
        this.classList.add('active');
        new L.Draw.Circle(window.map).enable();
    });

    // Marker tool click handler (from edited code)
    markerTool.addEventListener('click', function() {
        resetActiveTools();
        this.classList.add('active');
        new L.Draw.Marker(window.map).enable();
    });

    // Delete tool click handler (from edited code)
    deleteTool.addEventListener('click', function() {
        resetActiveTools();
        this.classList.add('active');

        // Enter delete mode (from edited code)
        window.drawnItems.eachLayer(function(layer) {
            layer.on('click', deleteFeature);
        });

        // Set cursor to indicate delete mode (from edited code)
        document.getElementById('map').style.cursor = 'crosshair';
    });

    // Edit tool click handler (from edited code)
    editTool.addEventListener('click', function() {
        resetActiveTools();
        this.classList.add('active');

        // Toggle edit mode (from edited code)
        window.editMode = !window.editMode;
        if (window.editMode) {
            this.classList.add('btn-primary');
            this.classList.remove('btn-outline-secondary');
            document.getElementById('map').style.cursor = 'pointer';
        } else {
            this.classList.remove('btn-primary');
            this.classList.add('btn-outline-secondary');
            document.getElementById('map').style.cursor = '';
        }
    });
}

// Reset all active tool buttons (from edited code)
function resetActiveTools() {
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Exit delete mode (from edited code)
    window.drawnItems.eachLayer(function(layer) {
        layer.off('click', deleteFeature);
    });

    // Reset cursor (from edited code)
    document.getElementById('map').style.cursor = '';

    // Reset edit mode (from edited code)
    window.editMode = false;
    const editTool = document.getElementById('edit-tool');
    if (editTool) {
        editTool.classList.remove('btn-primary');
        editTool.classList.add('btn-outline-secondary');
    }
}

// Delete a feature when clicked (from edited code)
function deleteFeature(e) {
    const layer = e.target;
    if (confirm('Are you sure you want to delete this feature?')) {
        window.drawnItems.removeLayer(layer);
    }
}

// Load initial data from the server (from edited code)
function loadInitialData() {
    fetch('/api/db_status')
        .then(response => response.json())
        .then(data => {
            console.log('Database status:', data);
            if (data.status === 'connected') {
                console.log('Database connected, loading project data...');
                loadProject();
            }
        })
        .catch(error => {
            console.error('Error checking database status:', error);
        });
}


// Function from edited code, uses the improved modal
function openFeatureEditor(layer) {
    console.log('Opening feature editor for layer:', layer);

    // Get properties or set defaults
    const properties = layer.feature?.properties || {};
    const name = properties.name || '';
    const description = properties.description || '';

    // Set values in the form
    document.getElementById('feature-name').value = name;
    document.getElementById('feature-description').value = description;

    // Set the active feature for later reference
    window.featureEditor.activeFeature = layer;

    // Show the modal
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Function from edited code
function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Function from edited code, improved error handling
function saveLayers() {
    if (!window.drawnItems) {
        console.error('No drawn items to save');
        return;
    }

    const layers = [];
    window.drawnItems.eachLayer(function(layer) {
        // Convert layer to GeoJSON
        const geoJSON = layer.toGeoJSON();
        layers.push(geoJSON);
    });

    // Prepare data for saving
    const data = {
        layers: layers
    };

    // Send data to server
    fetch('/api/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Save successful:', data);
        alert('Project saved successfully!');
    })
    .catch(error => {
        console.error('Error saving layers:', error);
        alert('Error saving project. See console for details.');
    });
}

// Function from edited code, improved error handling and layer addition
function loadSavedLayers() {
    fetch('/api/load')
    .then(response => response.json())
    .then(data => {
        console.log('Loaded data:', data);

        // Clear existing layers
        if (window.drawnItems) {
            window.drawnItems.clearLayers();
        }

        // Add loaded layers to the map
        if (data.layers && data.layers.length > 0) {
            data.layers.forEach(function(geoJSON) {
                const layer = L.geoJSON(geoJSON);
                layer.eachLayer(function(l) {
                    window.drawnItems.addLayer(l);

                    // Ensure the layer has a feature property
                    if (!l.feature) {
                        l.feature = geoJSON;
                    }

                    // Add click handlers for editing
                    addLayerClickHandlers(l);

                    // Add popup if it has properties
                    if (l.feature.properties) {
                        l.bindPopup(createPopupContent(l));
                    }
                });
            });

            // Fit map to show all layers
            window.map.fitBounds(window.drawnItems.getBounds());
        }
    })
    .catch(error => {
        console.error('Error loading layers:', error);
        alert('Error loading project. See console for details.');
    });
}

// Function from edited code
function addLayerClickHandlers(layer) {
    if (!layer) return;

    layer.on('click', function(e) {
        L.DomEvent.stopPropagation(e);

        // Open the feature editor for this layer
        if (layer.feature && layer.feature.properties) {
            openFeatureEditor(layer.feature.properties, layer);
        } else {
            openFeatureEditor({}, layer);
        }
    });
}

// Function from edited code
function openEditPopup(layerId) {
    // Find the layer by ID
    let targetLayer = null;
    window.drawnItems.eachLayer(function(layer) {
        if (layer._leaflet_id === parseInt(layerId)) {
            targetLayer = layer;
        }
    });

    if (targetLayer) {
        openFeatureEditor(targetLayer.feature.properties, targetLayer);
    } else {
        console.error('Layer not found:', layerId);
    }
}

// Function to handle facility edit popup (from original code, using the improved modal)
function openFacilityEditPopup(layer){
    openFeatureEditor(layer.properties, layer);
}


// Function from edited code, improved error handling
function initializeMapErrorHandling() {
    window.addEventListener('error', function(e) {
        if (e.message.includes('map')) {
            console.error('Map error caught:', e.message);
        }
    });
}

// Make functions available globally (from original code and edited code)
window.saveLayers = saveLayers;
window.loadSavedLayers = loadSavedLayers;
window.openEditPopup = openEditPopup;
window.addLayerClickHandlers = addLayerClickHandlers;
window.openFeatureEditor = openFeatureEditor;
window.closeModal = closeModal;
window.initializeMapErrorHandling = initializeMapErrorHandling;
window.openFacilityEditPopup = openFacilityEditPopup;

// Function to save feature properties (from original code)
function saveFeatureProperties(layerId) {
    // Find the layer by ID
    let targetLayer = null;
    window.drawnItems.eachLayer(function(layer) {
        if (layer._leaflet_id === parseInt(layerId)) {
            targetLayer = layer;
        }
    });

    if (!targetLayer) {
        console.error('Layer not found for editing:', layerId);
        return;
    }

    // Get values from form
    const name = document.getElementById('feature-name').value;
    const description = document.getElementById('feature-description').value;

    // Update layer properties
    targetLayer.feature.properties = {
        name: name,
        description: description
    };

    // Update popup content
    if (targetLayer.getPopup()) {
        targetLayer.setPopupContent(createPopupContent(targetLayer));
    } else {
        targetLayer.bindPopup(createPopupContent(targetLayer));
    }

    // Close the modal
    closeModal();

    console.log('Saved properties for layer:', targetLayer);
}


// Placeholder for loadProject function (implementation needed based on project specifics)
function loadProject() {
    fetch('/api/loadProject')
        .then(response => response.json())
        .then(data => loadProjectData(data))
        .catch(error => {
            console.error('Error loading project:', error);
            alert('Error loading project. See console for details.');
        });
}

// Function to load saved project data (from original code, integrated with edited code's layer handling)
function loadProjectData(data) {
    try {
        console.log('Loading project data:', data);

        // Clear existing layers (from original code)
        window.drawnItems.clearLayers();
        window.facilitiesLayer.clearLayers(); // Retained for backward compatibility
        window.arcsLayer.clearLayers(); // Retained for backward compatibility

        // Load GeoJSON data (from original code)
        if (data.features) {
            L.geoJSON(data, {
                onEachFeature: function(feature, layer) {
                    if (feature.properties && feature.properties.type === 'facility') {
                        window.facilitiesLayer.addLayer(layer);
                    } else {
                        window.drawnItems.addLayer(layer);
                    }

                    // Add properties to layer (from original code)
                    if (feature.properties) {
                        layer.properties = feature.properties;
                    }
                }
            });
        }

        console.log('Project data loaded successfully');
    } catch (err) {
        console.error('Failed to load project data:', err);
        alert('Failed to load project data. Please try again.');
    }
}


//The edited code's map initialization logic.  This largely replaces the original `initMap` function.
// Map initialization script for QDPro
document.addEventListener('DOMContentLoaded', function() {
    console.log('Map initialization script loaded');

    // Initialize the map
    window.map = L.map('map', {
        center: [39.73, -104.99],
        zoom: 10,
        zoomControl: false,
        layers: []
    });

    // Add zoom control to top-right
    L.control.zoom({
        position: 'topright'
    }).addTo(window.map);

    // Base layers
    var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    var topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    });

    // Add base layer to map
    osmLayer.addTo(window.map);

    // Create base layers object for layer control
    var baseLayers = {
        "OpenStreetMap": osmLayer,
        "Satellite": satelliteLayer,
        "Topographic": topoLayer
    };

    // Feature groups for drawn items and ESQD arcs
    window.drawnItems = new L.FeatureGroup();
    window.esqdArcs = new L.FeatureGroup();
    window.map.addLayer(window.drawnItems);
    window.map.addLayer(window.esqdArcs);

    // Object to store all layers with their IDs
    window.layerStore = {};

    // Initialize the layer control
    var overlays = {
        "Drawn Features": window.drawnItems,
        "ESQD Arcs": window.esqdArcs
    };

    // Add layer control to map
    L.control.layers(baseLayers, overlays, {
        position: 'topleft',
        collapsed: false
    }).addTo(window.map);

    // Initialize draw control
    window.drawControl = new L.Control.Draw({
        draw: {
            polyline: {
                shapeOptions: {
                    color: '#f357a1',
                    weight: 10
                }
            },
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Self-intersecting polygons not allowed!</strong>'
                },
                shapeOptions: {
                    color: '#3388ff'
                }
            },
            circle: {
                shapeOptions: {
                    color: '#ff9800'
                }
            },
            rectangle: {
                shapeOptions: {
                    color: '#4caf50'
                }
            },
            marker: true,
            circlemarker: false
        },
        edit: {
            featureGroup: window.drawnItems,
            poly: {
                allowIntersection: false
            }
        }
    });

    // Add draw control to map
    window.map.addControl(window.drawControl);

    // Create a draw to layer select function
    window.updateDrawToLayerSelect = function() {
        var selectElement = document.getElementById('drawToLayerSelect');
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '';

        // Add default option
        var defaultOption = document.createElement('option');
        defaultOption.value = 'drawnItems';
        defaultOption.textContent = 'Default Layer';
        selectElement.appendChild(defaultOption);

        // Add all other feature group layers
        for (var layerName in window.customLayers) {
            if (window.customLayers.hasOwnProperty(layerName)) {
                var option = document.createElement('option');
                option.value = layerName;
                option.textContent = layerName;
                selectElement.appendChild(option);
            }
        }
    };

    // Object to store custom layers
    window.customLayers = {};

    // Event handler for when a shape is created
    window.map.on('draw:created', function(e) {
        var layer = e.layer;
        var type = e.layerType;

        // Set default properties for the layer
        layer.properties = {
            name: type + '_' + new Date().getTime(),
            type: type,
            description: '',
            category: 'Default',
            // Facility-specific properties
            facility_type: '',
            net_explosive_weight: 0,
            hazard_division: '1.1',
            // Add more properties as needed
        };

        // Get selected layer to add the drawn item to
        var selectedLayerName = 'drawnItems';
        var selectElement = document.getElementById('drawToLayerSelect');
        if (selectElement) {
            selectedLayerName = selectElement.value;
        }

        // Add to selected layer
        if (selectedLayerName === 'drawnItems') {
            // Add to default drawn items layer
            window.drawnItems.addLayer(layer);
        } else if (window.customLayers[selectedLayerName]) {
            // Add to custom layer
            window.customLayers[selectedLayerName].addLayer(layer);
        }

        // Store the layer with a unique ID
        var layerId = L.Util.stamp(layer);
        window.layerStore[layerId] = layer;

        // If it's a facility, open the edit popup
        if (type === 'marker' || type === 'polygon' || type === 'rectangle' || type === 'circle') {
            openFacilityEditPopup(layer);
        }
    });

    // Function to open a popup for editing a shape's properties
    window.openEditPopup = function(layer) {
        // Ensure the layer has properties
        if (!layer.properties) {
            layer.properties = {
                name: 'Unnamed',
                description: '',
                category: 'Default'
            };
        }

        // Create popup content
        var content = `
            <div class="edit-popup">
                <h3>Edit Properties</h3>
                <label>Name:</label>
                <input type="text" id="edit-name" value="${layer.properties.name || ''}"><br>
                <label>Description:</label>
                <textarea id="edit-description">${layer.properties.description || ''}</textarea><br>
                <label>Category:</label>
                <input type="text" id="edit-category" value="${layer.properties.category || 'Default'}"><br>
                <button onclick="saveProperties(${L.Util.stamp(layer)})">Save</button>
            </div>
        `;

        // Bind popup to layer
        layer.bindPopup(content).openPopup();
    };

    // Function to open a popup for editing facility details on a drawn shape
    window.openFacilityEditPopup = function(layer) {
        // Ensure the layer has properties
        if (!layer.properties) {
            layer.properties = {
                name: 'Unnamed Facility',
                description: '',
                category: 'Default',
                facility_type: '',
                net_explosive_weight: 0,
                hazard_division: '1.1'
            };
        }

        // Create popup content with facility-specific fields
        var content = `
            <div class="edit-popup">
                <h3>Edit Facility Properties</h3>
                <label>Name:</label>
                <input type="text" id="edit-name" value="${layer.properties.name || ''}"><br>
                <label>Description:</label>
                <textarea id="edit-description">${layer.properties.description || ''}</textarea><br>
                <label>Category:</label>
                <input type="text" id="edit-category" value="${layer.properties.category || 'Default'}"><br>
                <label>Facility Type:</label>
                <select id="edit-facility-type">
                    <option value="PES" ${layer.properties.facility_type === 'PES' ? 'selected' : ''}>PES (Potential Explosion Site)</option>
                    <option value="ES" ${layer.properties.facility_type === 'ES' ? 'selected' : ''}>ES (Exposed Site)</option>
                </select><br>
                <label>Net Explosive Weight (lbs):</label>
                <input type="number" id="edit-new" value="${layer.properties.net_explosive_weight || 0}"><br>
                <label>Hazard Division:</label>
                <select id="edit-hd">
                    <option value="1.1" ${layer.properties.hazard_division === '1.1' ? 'selected' : ''}>1.1 - Mass Explosion</option>
                    <option value="1.2" ${layer.properties.hazard_division === '1.2' ? 'selected' : ''}>1.2 - Projection but not Mass Explosion</option>
                    <option value="1.3" ${layer.properties.hazard_division === '1.3' ? 'selected' : ''}>1.3 - Fire and Minor Blast</option>
                    <option value="1.4" ${layer.properties.hazard_division === '1.4' ? 'selected' : ''}>1.4 - No Significant Hazard</option>
                </select><br>
                <button onclick="saveFacilityProperties(${L.Util.stamp(layer)})">Save</button>
            </div>
        `;

        // Bind popup to layer
        layer.bindPopup(content).openPopup();
    };

    // Save properties function - will be called from the popup
    window.saveProperties = function(layerId) {
        var layer = window.layerStore[layerId];
        if (!layer) return;

        // Update properties from form
        layer.properties.name = document.getElementById('edit-name').value;
        layer.properties.description = document.getElementById('edit-description').value;
        layer.properties.category = document.getElementById('edit-category').value;

        // Close popup
        layer.closePopup();
    };

    // Save facility properties function - will be called from the popup
    window.saveFacilityProperties = function(layerId) {
        var layer = window.layerStore[layerId];
        if (!layer) return;

        // Update properties from form
        layer.properties.name = document.getElementById('edit-name').value;
        layer.properties.description = document.getElementById('edit-description').value;
        layer.properties.category = document.getElementById('edit-category').value;
        layer.properties.facility_type = document.getElementById('edit-facility-type').value;
        layer.properties.net_explosive_weight = parseFloat(document.getElementById('edit-new').value) || 0;
        layer.properties.hazard_division = document.getElementById('edit-hd').value;

        // Close popup
        layer.closePopup();

        // Trigger QD calculations if necessary
        if (typeof calculateQD === 'function') {
            calculateQD();
        }
    };

    // Handle editing events
    window.map.on('draw:edited', function(e) {
        var layers = e.layers;
        layers.eachLayer(function(layer) {
            // Trigger QD calculations if necessary
            if (typeof calculateQD === 'function') {
                calculateQD();
            }
        });
    });

    // Handle deletion events
    window.map.on('draw:deleted', function(e) {
        var layers = e.layers;
        layers.eachLayer(function(layer) {
            // Remove from layerStore
            var layerId = L.Util.stamp(layer);
            delete window.layerStore[layerId];

            // Trigger QD calculations if necessary
            if (typeof calculateQD === 'function') {
                calculateQD();
            }
        });
    });

    console.log('Map initialized successfully');
});

// Function to load saved layers from the server
function loadLayers() {
    console.log('Loading layers from server...');
    fetch('/api/load')
        .then(response => response.json())
        .then(data => {
            console.log('Loaded layers data:', data);
            if (data.layers) {
                // Clear existing layers
                window.drawnItems.clearLayers();
                window.esqdArcs.clearLayers();

                // Recreate custom layers if they exist in the data
                if (data.customLayers) {
                    for (var layerName in data.customLayers) {
                        if (!window.customLayers[layerName]) {
                            window.customLayers[layerName] = new L.FeatureGroup();
                            window.map.addLayer(window.customLayers[layerName]);
                        } else {
                            window.customLayers[layerName].clearLayers();
                        }
                    }
                }

                // Add layers from the data
                data.layers.forEach(layerData => {
                    try {
                        var geoJson = L.geoJSON(layerData.geometry);
                        geoJson.eachLayer(function(layer) {
                            // Set properties
                            layer.properties = layerData.properties;

                            // Add to appropriate layer
                            if (layerData.layerType === 'esqdArc') {
                                window.esqdArcs.addLayer(layer);
                            } else if (layerData.customLayerName && window.customLayers[layerData.customLayerName]) {
                                window.customLayers[layerData.customLayerName].addLayer(layer);
                            } else {
                                window.drawnItems.addLayer(layer);
                            }

                            // Store in layer store
                            var layerId = L.Util.stamp(layer);
                            window.layerStore[layerId] = layer;

                            // Bind popup if it's a facility
                            if (layer.properties.facility_type) {
                                layer.on('click', function() {
                                    openFacilityEditPopup(layer);
                                });
                            }
                        });
                    } catch (e) {
                        console.error('Error processing layer:', e);
                    }
                });

                // Update the draw-to-layer select if it exists
                if (typeof updateDrawToLayerSelect === 'function') {
                    updateDrawToLayerSelect();
                }

                // Trigger QD calculations if necessary
                if (typeof calculateQD === 'function') {
                    calculateQD();
                }
            }
        })
        .catch(error => {
            console.error('Error loading layers:', error);
        });
}

// Function to save layers to the server
function saveLayersToServer() {
    console.log('Saving layers to server...');

    // Collect all layers
    var allLayers = [];

    // Process drawn items
    window.drawnItems.eachLayer(function(layer) {
        if (layer.toGeoJSON) {
            allLayers.push({
                geometry: layer.toGeoJSON().geometry,
                properties: layer.properties || {},
                layerType: 'drawnItems'
            });
        }
    });

    // Process ESQD arcs
    window.esqdArcs.eachLayer(function(layer) {
        if (layer.toGeoJSON) {
            allLayers.push({
                geometry: layer.toGeoJSON().geometry,
                properties: layer.properties || {},
                layerType: 'esqdArc'
            });
        }
    });

    // Process custom layers
    var customLayersData = {};
    for (var layerName in window.customLayers) {
        customLayersData[layerName] = true;
        window.customLayers[layerName].eachLayer(function(layer) {
            if (layer.toGeoJSON) {
                allLayers.push({
                    geometry: layer.toGeoJSON().geometry,
                    properties: layer.properties || {},
                    layerType: 'custom',
                    customLayerName: layerName
                });
            }
        });
    }

    // Send data to server
    fetch('/api/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            layers: allLayers,
            customLayers: customLayersData
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Layers saved successfully:', data);
        if (data.status === 'success') {
            alert('Project saved successfully');
        } else {
            alert('Error saving project: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error saving layers:', error);
        alert('Error saving project: ' + error.message);
    });
}

// Initialize the map when this script loads
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Document already ready, initialize map
} else {
    // Wait for document to be ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialization is handled by the event listener at the top
    });
}

window.saveLayersToServer = saveLayersToServer;
window.loadLayers = loadLayers;
window.loadProjectData = loadProjectData;
window.initMap = initMap; //Added back for backward compatibility.
function initMap(){
    console.log("initMap called");
    loadInitialData();
}