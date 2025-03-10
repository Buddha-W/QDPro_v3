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
    initMap();
    initializeMapErrorHandling();
});

// Initialize the map with base layers and controls (combined from original and edited code)
function initMap() {
    // Create the map centered at a default location (adjust as needed)
    window.map = L.map('map', {
        center: [39.8283, -98.5795], // Center of the US, can be adjusted
        zoom: 4
    });

    // Add OpenStreetMap base layer (from edited code, improved attribution)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // Add satellite imagery base layer (from edited code)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Add topographic base layer (from edited code)
    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    });

    // Define base layers (from edited code)
    const baseLayers = {
        "OpenStreetMap": osmLayer,
        "Satellite": satelliteLayer,
        "Topographic": topoLayer
    };

    // Add drawn items layer group (from edited and original code)
    window.drawnItems = new L.FeatureGroup();
    window.map.addLayer(window.drawnItems);

    window.facilitiesLayer = new L.FeatureGroup();
    window.facilitiesLayer.addTo(map);
    window.arcsLayer = new L.FeatureGroup();
    window.arcsLayer.addTo(map);


    // Initialize the draw control (from edited code)
    const drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
            polyline: false,
            polygon: true,
            circle: true,
            rectangle: true,
            marker: true,
            circlemarker: false
        },
        edit: {
            featureGroup: window.drawnItems
        }
    });

    // Add the draw control to the map (from edited code)
    window.map.addControl(drawControl);

    // Handle the created event when a shape is drawn (from edited code)
    window.map.on('draw:created', function(e) {
        const layer = e.layer;

        // Create a GeoJSON feature (from edited code)
        layer.feature = {
            type: 'Feature',
            properties: {
                name: 'New Feature',
                description: ''
            }
        };

        // Add to the drawn items layer (from edited code)
        window.drawnItems.addLayer(layer);

        // Bind popup with edit button (from edited code)
        layer.bindPopup(createPopupContent(layer));

        // Add click event for editing when in edit mode (from edited code)
        layer.on('click', function() {
            if (window.editMode) {
                openFeatureEditor(layer);
            }
        });

        // Open the feature editor for the new shape (from edited code)
        openFeatureEditor(layer);
    });

    // Handle edited shapes (from edited code)
    window.map.on('draw:edited', function(e) {
        const layers = e.layers;
        layers.eachLayer(function(layer) {
            // Update popup after edit (from edited code)
            if (layer.getPopup()) {
                layer.setPopup(createPopupContent(layer));
            }
        });
    });

    // Set up custom layer controls (from edited code)
    setupLayerControls(baseLayers);

    // Set up custom drawing tools (from edited code)
    setupDrawingTools();

    console.log('Map initialized successfully');
    document.dispatchEvent(new Event('map-initialized'));

     // Setup base layers and overlays (from original code)
    const baseLayers = {
      "OpenStreetMap": osmLayer,
      "Satellite": satelliteLayer,
      "Topographic": topoLayer
    };
    
    const overlays = {
      "Drawn Items": window.drawnItems,
      "Facilities": window.facilitiesLayer,
      "Arcs": window.arcsLayer
    };
    
    // Add layer control (from original code)
    L.control.layers(baseLayers, overlays).addTo(map);
    
    // Initialize draw controls (from original code)
    initializeDrawControls();
    
    // Setup layer click handlers (from original code)
    setupLayerClickHandlers();

    // Load initial data (from edited code)
    loadInitialData();
}

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


function initializeDrawControls() {
  // Setup draw controls (from original code)
  const drawControl = new L.Control.Draw({
    draw: {
      polyline: true,
      polygon: true,
      circle: true,
      rectangle: true,
      marker: true
    },
    edit: {
      featureGroup: window.drawnItems
    }
  });

  map.addControl(drawControl);

  // Handle draw created event (from original code)
  map.on('draw:created', function(e) {
    const layer = e.layer;
    window.drawnItems.addLayer(layer);
    openFacilityEditPopup(layer);
  });

  // Handle edit events (from original code)
  map.on('draw:edited', function(e) {
    const layers = e.layers;
    console.log('Layers edited:', layers);
  });

  map.on('draw:deleted', function(e) {
    const layers = e.layers;
    console.log('Layers deleted:', layers);
  });
}

function setupLayerClickHandlers() {
  // Setup click handler for facilities (from original code)
  window.facilitiesLayer.on('click', function(e) {
    const layer = e.layer;
    openFacilityEditPopup(layer);
  });

  // Setup click handler for drawn items (from original code)
  window.drawnItems.on('click', function(e) {
    const layer = e.layer;
    openFacilityEditPopup(layer);
  });
}

// Function to load saved project data (from original code)
function loadProjectData(data) {
  try {
    console.log('Loading project data:', data);

    // Clear existing layers (from original code)
    window.drawnItems.clearLayers();
    window.facilitiesLayer.clearLayers();
    window.arcsLayer.clearLayers();

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
window.initMap = initMap;
window.saveLayers = saveLayers;
window.loadSavedLayers = loadSavedLayers;
window.openEditPopup = openEditPopup;
window.addLayerClickHandlers = addLayerClickHandlers;
window.openFeatureEditor = openFeatureEditor;
window.saveFeatureProperties = saveFeatureProperties; // Retained from original
window.closeModal = closeModal;
window.initializeMapErrorHandling = initializeMapErrorHandling;
window.loadProjectData = loadProjectData;
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