<script>
// =====================
// GLOBAL VARIABLES
// =====================
let map = null;
let drawnItems = null;
let drawControl = null;

// =====================
// MAIN MAP INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, initializing map...");
  initMap();
});

/**
 * initMap: Creates the Leaflet map if it does not exist yet,
 * sets up base layers, feature groups, and basic event handlers.
 */
function initMap() {
  if (map) {
    console.log("Map already initialized");
    return map;
  }

  // Create the map instance
  map = L.map('map', {
    center: [39.8282, -98.5795], // Center of USA
    zoom: 5,
    zoomControl: false,
    attributionControl: true
  });

  // Add zoom control to bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Base layers
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  });
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  });
  const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
  });

  // Default layer
  osmLayer.addTo(map);

  // Layer control for base layers only
  const baseLayers = {
    "OpenStreetMap": osmLayer,
    "Satellite": satelliteLayer,
    "Topographic": topoLayer
  };
  L.control.layers(baseLayers, null, {
    position: 'bottomleft',
    collapsed: false
  }).addTo(map);

  // Create or reuse a global FeatureGroup for drawn items
  if (!window.drawnItems) {
    window.drawnItems = new L.FeatureGroup();
  }
  drawnItems = window.drawnItems;
  map.addLayer(drawnItems);

  // (Optionally) create a draw control
  drawControl = new L.Control.Draw({
    position: 'topright',
    draw: {
      polyline: false,
      polygon: {
        allowIntersection: false,
        drawError: {
          color: '#e1e100',
          message: '<strong>Drawing error!</strong> Polygons cannot intersect.'
        },
        shapeOptions: { color: '#3388ff' }
      },
      circle: { shapeOptions: { color: '#3388ff' } },
      rectangle: { shapeOptions: { color: '#3388ff' } }
    },
    edit: {
      featureGroup: drawnItems,
      remove: true
    }
  });
  // If you want the default Leaflet draw toolbar, uncomment:
  // map.addControl(drawControl);

  // Setup event handlers for draw events
  map.on('draw:created', function(e) {
    const layer = e.layer;
    layer.feature = {
      type: 'Feature',
      properties: {
        name: 'New Feature',
        type: 'Other',
        description: 'Feature description'
      },
      geometry: layer.toGeoJSON().geometry
    };
    drawnItems.addLayer(layer);

    // Simple popup content
    layer.bindPopup(createPopupContent(layer.feature.properties)).openPopup();
  });

  // Event handlers for edited features
  map.on('draw:edited', function(e) {
    const layers = e.layers;
    layers.eachLayer(function(layer) {
      if (layer.feature && layer.feature.geometry) {
        layer.feature.geometry = layer.toGeoJSON().geometry;
      }
    });
  });

  console.log("Map initialized successfully");
  initUI();
  return map;
}

// =====================
// BASIC UI INITIALIZATION
// =====================
function initUI() {
  console.log("Initializing UI...");

  // If there's a custom UI setup, call it
  if (typeof initializeUIControls === 'function') {
    initializeUIControls();
  } else {
    console.log("Fallback UI initialization");
    // If you have .draw-tool buttons, link them here
    document.querySelectorAll('.draw-tool').forEach(button => {
      button.addEventListener('click', function() {
        const toolType = this.getAttribute('data-tool');
        activateDrawTool(toolType);
      });
    });
  }
}

/**
 * Fallback for activating a draw tool if no custom logic is provided.
 */
if (typeof window.activateTool !== 'function') {
  window.activateTool = function(toolName) {
    console.log(`Global activateTool called for: ${toolName}`);
    return null;
  };
}

// =====================
// FUNCTION: loadMapState (OPEN DATABASE)
// =====================
/**
 * Load (open) a saved map state from the server. Optionally pass a dbName or location
 * so the server knows which database to load from.
 * 
 * @param {string} [dbName] - Optional database or location name
 */
window.loadMapState = async function(dbName) {
  try {
    // Build the request URL with an optional query parameter
    let url = '/api/load-map';
    if (dbName) {
      url += '?dbName=' + encodeURIComponent(dbName);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const geoJSON = await response.json();
    console.log("Map state loaded:", geoJSON);

    if (!drawnItems) {
      console.error("Drawn items layer not initialized");
      return { success: false, error: "Drawn items layer not initialized" };
    }

    // Clear existing layers
    drawnItems.clearLayers();

    // Convert GeoJSON to Leaflet layers
    L.geoJSON(geoJSON, {
      onEachFeature: function(feature, layer) {
        // Copy properties from the feature
        if (feature.properties) {
          layer.name = feature.properties.name || '';
          layer.type = feature.properties.type || '';
          layer.description = feature.properties.description || '';

          // If needed, update style
          if (layer.setStyle && layer.type) {
            updateLayerStyle(layer, layer.type);
          }

          // Bind popup
          layer.bindPopup(createPopupContent(feature.properties));
        }

        // Add to the drawn items FeatureGroup
        drawnItems.addLayer(layer);
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error loading map state:", error);
    return { success: false, error: error.message };
  }
};

// =====================
// STYLE/POPUP HELPERS
// =====================
function updateLayerStyle(layer, type) {
  // Your style logic here
  // e.g. if (type === 'Bunker') { layer.setStyle({ color: 'red' }); }
}

function createPopupContent(properties) {
  if (typeof window.createPopupContent === 'function') {
    return window.createPopupContent(properties);
  }
  let content = '<div class="feature-popup">';
  if (properties.name) {
    content += `<h4>${properties.name}</h4>`;
  }
  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }
  if (properties.description) {
    content += `<p>${properties.description}</p>`;
  }
  content += `<button class="popup-edit-btn" onclick="openFeatureEditor(this)">Edit</button>`;
  content += '</div>';
  return content;
}

function openFeatureEditor(button) {
  // Get the layer associated with this popup
  const popup = button.closest('.leaflet-popup');
  const layer = popup.__layer;
  
  if (!layer || !layer.feature) {
    console.error('Cannot find layer for editing');
    return;
  }
  
  // Store reference to active layer being edited
  window.activeEditLayer = layer;
  
  // Get properties
  const properties = layer.feature.properties || {};
  
  // Fill the form with current properties
  const form = document.getElementById('featurePropertiesForm');
  
  // Reset form
  form.reset();
  
  // Set values for each field
  if (properties.name) document.getElementById('name').value = properties.name;
  if (properties.is_facility !== undefined) document.getElementById('is_facility').checked = properties.is_facility;
  if (properties.has_explosive !== undefined) document.getElementById('has_explosive').checked = properties.has_explosive;
  if (properties.net_explosive_weight) document.getElementById('net_explosive_weight').value = properties.net_explosive_weight;
  if (properties.type) document.getElementById('type').value = properties.type;
  if (properties.description) document.getElementById('description').value = properties.description;
  
  // Show/hide the NEW field based on has_explosive checkbox
  const showNewSection = properties.has_explosive;
  document.getElementById('newSection').style.display = showNewSection ? 'block' : 'none';
  
  // Setup event listener for the has_explosive checkbox
  document.getElementById('has_explosive').addEventListener('change', function() {
    document.getElementById('newSection').style.display = this.checked ? 'block' : 'none';
  });
  
  // Show the modal
  document.getElementById('featurePropertiesModal').style.display = 'block';
}

// Add this function to your map-init.js file if it doesn't exist already

// Setup click handlers for all layers in the map
function setupLayerClickHandlers() {
  if (!window.map) return;
  
  console.log("Setting up layer click handlers");
  
  window.map.eachLayer(function(layer) {
    // Only add click handlers to feature layers
    if (layer.feature && typeof layer.on === 'function') {
      // Remove any existing click handlers to prevent duplicates
      layer.off('click');
      
      // Add new click handler with direct reference to handleLayerClick
      layer.on('click', function(e) {
        // Prevent the click from propagating to the map
        L.DomEvent.stopPropagation(e);
        
        // Use the new global handler function
        if (typeof window.handleLayerClick === 'function') {
          window.handleLayerClick(layer);
        } else {
          console.error("handleLayerClick function not available");
        }
      });
    }
  });
  
  // Add this call whenever a new layer is added to the map
  if (window.map.on) {
    // Handle newly added layers
    window.map.on('layeradd', function(e) {
      if (e.layer && e.layer.feature && typeof e.layer.on === 'function') {
        e.layer.off('click');
        e.layer.on('click', function(evt) {
          L.DomEvent.stopPropagation(evt);
          if (typeof window.handleLayerClick === 'function') {
            window.handleLayerClick(e.layer);
          }
        });
      }
    });
  }
}

// Call this function when new layers are added to the map
// You might already have code that adds layers - add this call there

</script>