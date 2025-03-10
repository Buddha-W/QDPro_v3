// QDPro Map Initialization 
// Handles core map functionality

// Initialize the map when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initializer loaded');
  initializeMap();

  // Add save button event listener
  const saveButton = document.getElementById('saveButton');
  if (saveButton) {
    saveButton.addEventListener('click', saveLayers);
  }
});

// Map Initialization Script for QDPro
// This script handles setting up the Leaflet map and basic controls

// Initialize map and related components
function initializeMap() {
  console.log('Initializing map...');

  // Initialize the map with a default view
  window.map = L.map('map', {
    center: [39.8283, -98.5795],
    zoom: 5
  });

  // Add the base tile layers
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(window.map);

  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });

  const baseMaps = {
    "OpenStreetMap": osmLayer,
    "Satellite": satelliteLayer
  };

  // Initialize drawn items layer
  window.drawnItems = new L.FeatureGroup();
  window.map.addLayer(window.drawnItems);

  // Initialize the layer control
  L.control.layers(baseMaps, {
    "Drawn Items": window.drawnItems
  }).addTo(window.map);

  // Initialize Leaflet.Draw controls
  const drawControl = new L.Control.Draw({
    edit: {
      featureGroup: window.drawnItems
    },
    draw: {
      polyline: true,
      polygon: true,
      rectangle: true,
      circle: true,
      marker: true
    }
  });

  window.map.addControl(drawControl);

  // Set up event handlers for drawn items
  window.map.on('draw:created', function(e) {
    const layer = e.layer;

    // Initialize feature properties
    layer.feature = {
      type: 'Feature',
      properties: {
        name: 'New Feature',
        type: e.layerType,
        description: ''
      }
    };

    // Add the layer to our feature group
    window.drawnItems.addLayer(layer);

    // Bind popup to the layer
    layer.bindPopup(createPopupContent(layer));
  });

  window.map.on('draw:edited', function(e) {
    console.log('Features edited:', e.layers);
    e.layers.eachLayer(function(layer) {
      if (layer.getPopup()) {
        layer.setPopup(createPopupContent(layer));
      }
    });
  });

  console.log('Map initialized successfully');
  return window.map;
}

function createPopupContent(layer) {
  const properties = layer.feature ? layer.feature.properties : {};
  const type = layer instanceof L.Marker ? 'Marker' :
               layer instanceof L.Polygon ? 'Polygon' :
               layer instanceof L.Polyline ? 'Line' :
               layer instanceof L.Rectangle ? 'Rectangle' :
               layer instanceof L.Circle ? 'Circle' : 'Shape';

  return `<strong>${properties.name || type}</strong><br>
          <button onclick="openEditPopup('${layer._leaflet_id}')">Edit</button>`;
}

// Function to open a popup for editing a shape's properties
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

// Function to load saved layers from the server
function loadSavedLayers() {
  console.log('Loading saved layers...');

  fetch('/api/load')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Saved layers loaded:', data);

      if (data && data.layers) {
        // Clear existing layers
        window.drawnItems.clearLayers();

        // Add each saved layer
        data.layers.forEach(layerData => {
          try {
            const layer = L.geoJSON(layerData, {
              onEachFeature: function(feature, layer) {
                // Add click handler
                addLayerClickHandlers(layer);
              }
            });

            // Add layers to the drawnItems layer group
            layer.eachLayer(function(l) {
              window.drawnItems.addLayer(l);
            });
          } catch (err) {
            console.error('Error adding layer:', err, layerData);
          }
        });
      }
    })
    .catch(error => {
      console.warn('Error loading saved layers:', error);
      // Don't show an alert as this might be the first time using the app
    });
}

// Function to save the current layers to the server
function saveLayers() {
  console.log('Saving layers...');

  // Collect GeoJSON for all layers
  const layers = [];
  window.drawnItems.eachLayer(function(layer) {
    if (layer.toGeoJSON) {
      layers.push(layer.toGeoJSON());
    }
  });

  // Create the data object
  const data = {
    layers: layers
  };

  // Send to the server
  fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('Layers saved successfully:', data);
    alert('Map data saved successfully!');
  })
  .catch(error => {
    console.error('Error saving layers:', error);
    alert('Error saving map data: ' + error.message);
  });
}


// Function to add click handlers to layers for opening the editor
function addLayerClickHandlers(layer) {
  layer.on('click', function() {
    openEditPopup(layer._leaflet_id);
  });
}

// Function to open the feature editor modal
function openFeatureEditor(properties, layer) {
  console.log('Opening feature editor for layer:', layer);

  // Get the modal
  const modal = document.getElementById('featurePropertiesModal');
  const content = document.getElementById('modalContent');

  // Create form content
  content.innerHTML = `
    <h2>Edit Feature Properties</h2>
    <form id="featurePropertiesForm">
      <div class="form-group">
        <label for="featureName">Name:</label>
        <input type="text" id="featureName" value="${properties.name || ''}" class="form-control">
      </div>
      <div class="form-group">
        <label for="featureDescription">Description:</label>
        <textarea id="featureDescription" class="form-control">${properties.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label for="featureType">Type:</label>
        <select id="featureType" class="form-control">
          <option value="PES" ${properties.type === 'PES' ? 'selected' : ''}>PES (Potential Explosion Site)</option>
          <option value="ES" ${properties.type === 'ES' ? 'selected' : ''}>ES (Exposed Site)</option>
          <option value="Other" ${properties.type === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>

      <div class="form-buttons">
        <button type="button" onclick="saveFeatureProperties('${layer._leaflet_id}')">Save</button>
        <button type="button" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;

  // Show the modal
  modal.style.display = 'block';
}

// Function to save feature properties
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
  const name = document.getElementById('featureName').value;
  const description = document.getElementById('featureDescription').value;
  const type = document.getElementById('featureType').value;

  // Update layer properties
  targetLayer.feature.properties = {
    name: name,
    description: description,
    type: type
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

// Function to close the modal
function closeModal() {
  const modal = document.getElementById('featurePropertiesModal');
  modal.style.display = 'none';
}

// Initialize map error handling (retained from original)
function initializeMapErrorHandling() {
  if (L && L.Draw) {
    // Fix for draw handlers
    const checkForDrawErrors = function() {
      const mapInstance = window.map;
      if (!mapInstance) return;

      // Check if there are any phantom drawing modes active
      for (const type in L.Draw.Event) {
        const drawControl = mapInstance._toolbars && mapInstance._toolbars[type.toLowerCase()];
        if (drawControl && drawControl._active) {
          console.warn('Found active drawing mode that might be stuck:', type);

          // Try to deactivate it
          try {
            drawControl.disable();
          } catch (e) {
            console.error('Failed to disable draw control:', e);
          }
        }
      }
    };

    // Run this check periodically
    setInterval(checkForDrawErrors, 30000);
  }
}

// Make functions available globally
window.initializeMap = initializeMap;
window.saveLayers = saveLayers;
window.loadSavedLayers = loadSavedLayers;
window.openEditPopup = openEditPopup;
window.addLayerClickHandlers = addLayerClickHandlers;
window.openFeatureEditor = openFeatureEditor;
window.saveFeatureProperties = saveFeatureProperties;
window.closeModal = closeModal;
window.initializeMapErrorHandling = initializeMapErrorHandling;