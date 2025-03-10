
/**
 * Feature Editor Initialization Module
 * Handles drawing tools and feature property editing
 */

// Feature editor state
window.featureEditor = {
  activeFeature: null,
  drawnItems: null
};

/**
 * Initialize the feature editor when the map is ready
 */
function initializeFeatureEditor() {
  console.log('Initializing feature editor...');

  if (!window.map) {
    console.error('Map is not initialized');
    return;
  }

  // Initialize drawn items layer if not already done
  if (!window.featureEditor.drawnItems) {
    window.featureEditor.drawnItems = new L.FeatureGroup();
    window.map.addLayer(window.featureEditor.drawnItems);
  }

  // Set up Leaflet.Draw controls
  const drawControl = new L.Control.Draw({
    edit: {
      featureGroup: window.featureEditor.drawnItems
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

  // Handle newly created features
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
    window.featureEditor.drawnItems.addLayer(layer);

    // Add click handler for editing properties
    addLayerClickHandlers(layer);

    // Open properties editor for the new feature
    openFeatureEditor(layer.feature.properties, layer);
  });

  // Set up edit handlers for features
  window.map.on('draw:edited', function(e) {
    console.log('Features edited:', e.layers);
  });

  window.map.on('draw:deleted', function(e) {
    console.log('Features deleted:', e.layers);
  });

  console.log('Feature editor initialized');
}

/**
 * Add click handlers to a layer for property editing
 */
function addLayerClickHandlers(layer) {
  layer.on('click', function(e) {
    // Stop propagation to prevent map click
    L.DomEvent.stopPropagation(e);
    
    // Check if layer has feature properties
    if (layer.feature && layer.feature.properties) {
      openFeatureEditor(layer.feature.properties, layer);
    } else {
      // Create default properties if none exist
      layer.feature = {
        type: 'Feature',
        properties: {
          name: 'Unnamed Feature',
          type: 'Generic',
          description: ''
        }
      };
      openFeatureEditor(layer.feature.properties, layer);
    }
  });
}

/**
 * Set up click handlers for all layers in all feature groups
 */
function setupAllLayerEditHandlers() {
  console.log('Setting up click handlers for all layers...');
  
  // Handle drawn items
  if (window.drawnItems) {
    window.drawnItems.eachLayer(function(layer) {
      addLayerClickHandlers(layer);
    });
  }
  
  // You can add more feature groups here if needed
}

/**
 * Open the feature properties editor
 */
function openFeatureEditor(properties, layer) {
  console.log('Opening feature editor for:', properties);
  
  // Store the active feature for later use
  window.featureEditor.activeFeature = layer;
  
  // Populate the form with the feature properties
  document.getElementById('featureName').value = properties.name || '';
  document.getElementById('featureType').value = properties.type || 'Generic';
  document.getElementById('featureDescription').value = properties.description || '';
  
  // Show/hide explosive properties section
  toggleExplosiveSection(properties.type);
  
  // Populate explosive properties if they exist
  if (properties.explosiveHD) {
    document.getElementById('explosiveHD').value = properties.explosiveHD;
  }
  
  if (properties.explosiveWeight) {
    document.getElementById('explosiveWeight').value = properties.explosiveWeight;
  }
  
  if (properties.newqd_type) {
    document.getElementById('explosive_newqd_type').value = properties.newqd_type;
  }
  
  // Show the modal
  document.getElementById('featurePropertiesModal').style.display = 'block';
}

/**
 * Toggle the explosive properties section based on feature type
 */
function toggleExplosiveSection(featureType) {
  const explosiveSection = document.getElementById('explosiveProperties');
  const explosiveTypes = ['ExplosiveSite', 'ESQD'];
  
  if (explosiveTypes.includes(featureType)) {
    explosiveSection.style.display = 'block';
  } else {
    explosiveSection.style.display = 'none';
  }
}

/**
 * Close the feature properties modal
 */
function closeFeaturePropertiesModal() {
  document.getElementById('featurePropertiesModal').style.display = 'none';
  window.featureEditor.activeFeature = null;
}

/**
 * Save the feature properties from the form
 */
function saveFeatureProperties() {
  if (!window.featureEditor.activeFeature) {
    console.error('No active feature to save properties for');
    return;
  }
  
  // Get values from the form
  const name = document.getElementById('featureName').value;
  const type = document.getElementById('featureType').value;
  const description = document.getElementById('featureDescription').value;
  
  // Get the feature
  const feature = window.featureEditor.activeFeature.feature;
  
  // Update properties
  feature.properties.name = name;
  feature.properties.type = type;
  feature.properties.description = description;
  
  // Handle explosive properties if applicable
  const explosiveTypes = ['ExplosiveSite', 'ESQD'];
  if (explosiveTypes.includes(type)) {
    feature.properties.explosiveHD = document.getElementById('explosiveHD').value;
    feature.properties.explosiveWeight = document.getElementById('explosiveWeight').value;
    feature.properties.newqd_type = document.getElementById('explosive_newqd_type').value;
  }
  
  console.log('Saved properties:', feature.properties);
  
  // Close the modal
  closeFeaturePropertiesModal();
}

/**
 * Function to save the current project
 */
function saveProject() {
  console.log('Saving project...');
  
  // Get all layers and their data
  const layerData = {
    layers: {
      "Drawn Items": {
        properties: {
          isQDAnalyzed: false
        },
        features: []
      }
    }
  };
  
  // Get all features from drawn items
  if (window.drawnItems) {
    window.drawnItems.eachLayer(function(layer) {
      if (layer.feature) {
        layerData.layers["Drawn Items"].features.push(layer.feature);
      } else {
        // Convert to GeoJSON if no feature property exists
        const geoJson = layer.toGeoJSON();
        if (!geoJson.properties) {
          geoJson.properties = {
            name: 'Unnamed Feature',
            type: 'Unknown',
            description: ''
          };
        }
        layerData.layers["Drawn Items"].features.push(geoJson);
      }
    });
  }
  
  // Convert to JSON
  const jsonData = JSON.stringify(layerData, null, 2);
  console.log('Project data:', jsonData);
  
  // Send data to server
  fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: jsonData
  })
  .then(response => response.json())
  .then(data => {
    console.log('Project saved:', data);
    alert('Project saved successfully!');
  })
  .catch(error => {
    console.error('Error saving project:', error);
    alert('Error saving project: ' + error.message);
  });
}

function loadProject() {
  console.log('Loading project...');
  fetch('/api/load')
  .then(response => response.json())
  .then(data => {
    console.log('Project loaded:', data);
    
    // Clear existing layers
    if (window.drawnItems) {
      window.drawnItems.clearLayers();
    }
    
    // Process and add layers
    if (data.layers && data.layers["Drawn Items"] && data.layers["Drawn Items"].features) {
      const features = data.layers["Drawn Items"].features;
      
      features.forEach(feature => {
        let layer;
        
        // Create appropriate layer based on geometry type
        if (feature.geometry) {
          switch (feature.geometry.type) {
            case 'Point':
              const coords = feature.geometry.coordinates;
              layer = L.marker([coords[1], coords[0]]);
              break;
            case 'LineString':
              const points = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
              layer = L.polyline(points);
              break;
            case 'Polygon':
              const polygonPoints = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
              layer = L.polygon(polygonPoints);
              break;
            case 'Circle':
              // Circles are complex in GeoJSON - we would need radius stored in properties
              if (feature.properties && feature.properties.radius) {
                const center = feature.geometry.coordinates;
                layer = L.circle([center[1], center[0]], {radius: feature.properties.radius});
              }
              break;
            default:
              console.warn('Unsupported geometry type:', feature.geometry.type);
              return;
          }
          
          // Add properties to the layer
          layer.feature = feature;
          
          // Add to the drawn items layer
          window.drawnItems.addLayer(layer);
          
          // Add click handler
          addLayerClickHandlers(layer);
        }
      });
    }
  })
  .catch(error => {
    console.error('Error loading project:', error);
    // Don't alert here as it might be annoying on first load
  });
}

// Make functions available globally
window.initializeFeatureEditor = initializeFeatureEditor;
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.toggleExplosiveSection = toggleExplosiveSection;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.loadProject = loadProject;
window.saveProject = saveProject;
