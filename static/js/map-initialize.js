// QDPro Map Initialization 
// Handles core map functionality

// Global state from edited code
window.map = null;
window.drawnItems = null;


// Initialize the map when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initMap();
  initializeMapErrorHandling();
});

// Map Initialization Script for QDPro (combined with edited initMap)
// This script handles setting up the Leaflet map and basic controls

// Initialize map and related components
function initMap() {
  console.log('Initializing map...');

  // Create map if it doesn't exist (from edited code)
  if (!window.map) {
    window.map = L.map('map', {
      center: [39.73, -104.99], // From edited code, potentially needs adjustment based on project needs.
      zoom: 16, // From edited code
      zoomControl: true,
      drawControl: false // From edited code
    });

    // Add base tile layer (from edited code, improved attribution)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(window.map);

    // Initialize drawn items layer (from edited code)
    window.drawnItems = new L.FeatureGroup();
    window.map.addLayer(window.drawnItems);


    // Add base layers (from original code)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      crossOrigin: "anonymous"
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      crossOrigin: "anonymous"
    });

    // Create layer groups for drawn items (from original code)
    window.facilitiesLayer = new L.FeatureGroup();
    window.arcsLayer = new L.FeatureGroup();

    // Add layers to map (from original code)
    window.drawnItems.addTo(map);
    window.facilitiesLayer.addTo(map);
    window.arcsLayer.addTo(map);

    // Setup base layers and overlays (from original code)
    const baseLayers = {
      "OpenStreetMap": osmLayer,
      "Satellite": satelliteLayer
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

    console.log('Map initialized successfully');
    document.dispatchEvent(new Event('map-initialized'));
  }
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


// Function from edited code, improved handling of different layer types
function createPopupContent(layer) {
  const props = layer.feature.properties;
  let content = `<div><strong>${props.name || 'Unnamed Feature'}</strong>`;

  if (props.description) {
    content += `<p>${props.description}</p>`;
  }

  content += `<button onclick="openEditPopup(${layer._leaflet_id})">Edit Properties</button></div>`;
  return content;
}

// Function from edited code, uses the improved modal
function openFeatureEditor(properties, layer) {
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error('Feature properties modal not found in the DOM');
    return;
  }

  // Set active feature for later reference (from edited code)
  window.featureEditor = window.featureEditor || {};
  window.featureEditor.activeFeature = layer;

  // Populate form fields (from edited code)
  document.getElementById('feature-name').value = properties.name || '';
  document.getElementById('feature-description').value = properties.description || '';

  // Show the modal (from edited code)
  modal.style.display = 'block';
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
    // Convert layer to GeoJSON (from edited code)
    const geoJSON = layer.toGeoJSON();
    layers.push(geoJSON);
  });

  // Prepare data for saving (from edited code)
  const data = {
    layers: layers
  };

  // Send data to server (from edited code)
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

    // Clear existing layers (from edited code)
    if (window.drawnItems) {
      window.drawnItems.clearLayers();
    }

    // Add loaded layers to the map (from edited code)
    if (data.layers && data.layers.length > 0) {
      data.layers.forEach(function(geoJSON) {
        const layer = L.geoJSON(geoJSON);
        layer.eachLayer(function(l) {
          window.drawnItems.addLayer(l);

          // Ensure the layer has a feature property (from edited code)
          if (!l.feature) {
            l.feature = geoJSON;
          }

          // Add click handlers for editing (from edited code)
          addLayerClickHandlers(l);

          // Add popup if it has properties (from edited code)
          if (l.feature.properties) {
            l.bindPopup(createPopupContent(l));
          }
        });
      });

      // Fit map to show all layers (from edited code)
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

    // Open the feature editor for this layer (from edited code)
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

    // Get values from form (from original code)  -  Note: Assumes the IDs are consistent with the edited code
    const name = document.getElementById('feature-name').value;
    const description = document.getElementById('feature-description').value;
    //const type = document.getElementById('featureType').value; //removed type, as it is not used anymore

    // Update layer properties (from original code)
    targetLayer.feature.properties = {
      name: name,
      description: description,
      //type: type //removed type, as it is not used anymore
    };

    // Update popup content (from original code)
    if (targetLayer.getPopup()) {
      targetLayer.setPopupContent(createPopupContent(targetLayer));
    } else {
      targetLayer.bindPopup(createPopupContent(targetLayer));
    }

    // Close the modal (from original code)
    closeModal();

    console.log('Saved properties for layer:', targetLayer);
  }