/**
 * Feature Editor Initialization Module
 * Handles drawing tools and feature property editing
 */

// Feature editor state
window.featureEditor = {
  activeFeature: null
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
  if (!window.drawnItems) {
    window.drawnItems = new L.FeatureGroup();
    window.map.addLayer(window.drawnItems);
  }

  // Set up Leaflet.Draw controls (restored from original)
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


  // Handle newly created features (from original code)
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

/**
 * Open feature editor modal with properties
 */
function openFeatureEditor(properties, layer) {
  console.log('Opening feature editor for:', properties);

  // Store the active layer for later reference
  window.featureEditor.activeFeature = layer;

  // Get the modal
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error('Feature properties modal not found');
    return;
  }

  // Set up form fields
  document.getElementById('feature-name').value = properties.name || '';
  document.getElementById('feature-description').value = properties.description || '';

  // Display the modal
  modal.style.display = 'block';
}

/**
 * Save feature properties from the modal
 */
function saveFeatureProperties() {
  const layer = window.featureEditor.activeFeature;
  if (!layer) {
    console.error('No active feature to save');
    return;
  }

  // Initialize feature and properties if they don't exist
  if (!layer.feature) {
    layer.feature = { type: 'Feature', properties: {} };
  }

  // Get values from form
  const name = document.getElementById('feature-name').value;
  const description = document.getElementById('feature-description').value;

  // Update feature properties
  layer.feature.properties.name = name;
  layer.feature.properties.description = description;

  // Update popup if it exists
  if (layer.getPopup()) {
    layer.setPopup(createPopupContent(layer));
  } else {
    layer.bindPopup(createPopupContent(layer));
  }

  // Close the modal
  closeFeatureEditor();

  console.log('Feature properties saved:', layer.feature.properties);
}

/**
 * Close the feature editor modal
 */
function closeFeatureEditor() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.featureEditor.activeFeature = null;
}

/**
 * Load project data from the server
 */
function loadProject() {
  console.log('Loading project...');
  fetch('/api/load')
  .then(response => response.json())
  .then(data => {
    console.log('Project loaded:', data);

    // Clear existing layers
    window.drawnItems.clearLayers();

    // Add loaded features to the map
    if (data.layers && data.layers.features) {
      data.layers.features.forEach(feature => {
        const layer = L.geoJSON(feature).addTo(window.drawnItems);
        // Add click handlers
        layer.eachLayer(addLayerClickHandlers);
      });
    }
  })
  .catch(error => {
    console.error('Error loading project:', error);
  });
}

/**
 * Save project data to the server
 */
function saveProject() {
  console.log('Saving project...');

  // Collect all features from drawn items
  const features = [];
  window.drawnItems.eachLayer(layer => {
    if (layer.feature) {
      features.push(layer.toGeoJSON());
    }
  });

  // Create GeoJSON feature collection
  const featureCollection = {
    type: 'FeatureCollection',
    features: features
  };

  // Send data to server
  fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ layers: featureCollection })
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
  console.log('Opening feature editor for properties:', properties);

  // Get the modal
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error('Feature properties modal not found');
    return;
  }

  // Get the content container
  const content = document.getElementById('featureModalContent');
  if (!content) {
    console.error('Feature modal content container not found');
    return;
  }

  // Determine the feature type
  let featureType = 'Generic';
  if (layer instanceof L.Marker) featureType = 'Marker';
  else if (layer instanceof L.Polygon) featureType = 'Polygon';
  else if (layer instanceof L.Polyline) featureType = 'Polyline';
  else if (layer instanceof L.Rectangle) featureType = 'Rectangle';
  else if (layer instanceof L.Circle) featureType = 'Circle';

  // Create form content
  content.innerHTML = `
    <h2>Edit Feature Properties</h2>
    <form id="featurePropertiesForm">
      <div class="form-group">
        <label for="featureName">Name:</label>
        <input type="text" id="featureName" value="${properties.name || ''}" class="form-control">
      </div>

      <div class="form-group">
        <label for="featureType">Type:</label>
        <select id="featureType" class="form-control">
          <option value="Generic" ${properties.type === 'Generic' ? 'selected' : ''}>Generic</option>
          <option value="Building" ${properties.type === 'Building' ? 'selected' : ''}>Building</option>
          <option value="Road" ${properties.type === 'Road' ? 'selected' : ''}>Road</option>
          <option value="Boundary" ${properties.type === 'Boundary' ? 'selected' : ''}>Boundary</option>
          <option value="Facility" ${properties.type === 'Facility' ? 'selected' : ''}>Facility</option>
          <option value="PES" ${properties.type === 'PES' ? 'selected' : ''}>PES (Potential Explosion Site)</option>
          <option value="ES" ${properties.type === 'ES' ? 'selected' : ''}>ES (Exposed Site)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="featureDescription">Description:</label>
        <textarea id="featureDescription" class="form-control">${properties.description || ''}</textarea>
      </div>

      <div id="explosiveProperties" style="display: ${properties.type === 'PES' || properties.type === 'ES' ? 'block' : 'none'}">
        <h3>Explosive Properties</h3>

        <div class="form-group">
          <label for="netExplosiveWeight">Net Explosive Weight (kg):</label>
          <input type="number" id="netExplosiveWeight" value="${properties.netExplosiveWeight || 0}" class="form-control">
        </div>

        <div class="form-group">
          <label for="hazardDivision">Hazard Division:</label>
          <select id="hazardDivision" class="form-control">
            <option value="1.1" ${properties.hazardDivision === '1.1' ? 'selected' : ''}>1.1 - Mass Explosion</option>
            <option value="1.2" ${properties.hazardDivision === '1.2' ? 'selected' : ''}>1.2 - Projection</option>
            <option value="1.3" ${properties.hazardDivision === '1.3' ? 'selected' : ''}>1.3 - Fire & Minor Blast</option>
            <option value="1.4" ${properties.hazardDivision === '1.4' ? 'selected' : ''}>1.4 - Moderate Fire</option>
          </select>
        </div>
      </div>

      <div class="button-group">
        <button type="button" id="saveFeatureProperties" class="btn btn-primary">Save</button>
        <button type="button" id="cancelFeatureProperties" class="btn btn-secondary">Cancel</button>
      </div>
    </form>
  `;

  // Show the modal
  modal.style.display = 'block';

  // Set up event handlers
  document.getElementById('featureType').addEventListener('change', toggleExplosiveSection);
  document.getElementById('saveFeatureProperties').addEventListener('click', saveFeatureProperties);
  document.getElementById('cancelFeatureProperties').addEventListener('click', closeFeaturePropertiesModal);

  // Close modal when clicking on the X or outside the modal
  const closeBtn = modal.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeFeaturePropertiesModal);
  }

  window.onclick = function(event) {
    if (event.target === modal) {
      closeFeaturePropertiesModal();
    }
  };
}


/**
 * Toggle the explosive properties section based on feature type
 */
function toggleExplosiveSection() {
  const featureType = document.getElementById('featureType').value;
  const explosiveProperties = document.getElementById('explosiveProperties');

  if (featureType === 'PES' || featureType === 'ES') {
    explosiveProperties.style.display = 'block';
  } else {
    explosiveProperties.style.display = 'none';
  }
}

/**
 * Save the feature properties from the form
 */
function saveFeatureProperties() {
  console.log('Saving feature properties for layer:', window.featureEditor.activeFeature);

  // Get values from form
  const name = document.getElementById('featureName').value;
  const type = document.getElementById('featureType').value;
  const description = document.getElementById('featureDescription').value;

  // Update the layer's feature properties
  const layer = window.featureEditor.activeFeature;
  if (!layer.feature) {
    layer.feature = { type: 'Feature', properties: {} };
  }

  layer.feature.properties.name = name;
  layer.feature.properties.type = type;
  layer.feature.properties.description = description;

  // Add explosive properties if applicable
  if (type === 'PES' || type === 'ES') {
    layer.feature.properties.netExplosiveWeight = document.getElementById('netExplosiveWeight').value;
    layer.feature.properties.hazardDivision = document.getElementById('hazardDivision').value;
  }

  // Update the layer's popup if it has one
  if (layer.getPopup()) {
    layer.setPopupContent(createPopupContent(layer));
    layer.getPopup().update();
  }

  // Close the modal
  closeFeaturePropertiesModal();
}

/**
 * Close the feature properties modal
 */
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Load a project from the server
 */
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

    // Add the loaded layers to the map
    if (data.layers && Array.isArray(data.layers)) {
      data.layers.forEach(layerData => {
        try {
          const layer = L.geoJSON(layerData, {
            onEachFeature: function(feature, layer) {
              // Add click handler
              addLayerClickHandlers(layer);
            }
          });

          // Add the layer to drawnItems
          layer.eachLayer(function(l) {
            window.drawnItems.addLayer(l);
          });
        } catch (error) {
          console.error('Error adding layer:', error, layerData);
        }
      });
    }
  })
  .catch(error => {
    console.error('Error loading project:', error);
    // Don't alert here as it might be annoying on first load
  });
}

/**
 * Save the current project to the server
 */
function saveProject() {
  console.log('Saving project...');

  // Collect GeoJSON for all layers
  const layers = [];

  if (window.drawnItems) {
    window.drawnItems.eachLayer(function(layer) {
      if (layer.toGeoJSON) {
        layers.push(layer.toGeoJSON());
      }
    });
  }

  // Create data object
  const data = {
    layers: layers,
    metadata: {
      name: 'My Project',
      created: new Date().toISOString(),
      version: '1.0'
    }
  };

  // Send data to server
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
  .then(result => {
    console.log('Project saved:', result);
    alert('Project saved successfully!');
  })
  .catch(error => {
    console.error('Error saving project:', error);
    alert('Error saving project: ' + error.message);
  });
}

/**
 * Function to handle facility type selection
 */
function handleFacilityTypeChange() {
  const facilityType = document.getElementById('facilityType').value;
  const pesFieldsContainer = document.getElementById('pesFields');
  const esFieldsContainer = document.getElementById('esFields');

  if (facilityType === 'PES') {
    pesFieldsContainer.style.display = 'block';
    esFieldsContainer.style.display = 'none';
  } else if (facilityType === 'ES') {
    pesFieldsContainer.style.display = 'none';
    esFieldsContainer.style.display = 'block';
  } else {
    pesFieldsContainer.style.display = 'none';
    esFieldsContainer.style.display = 'none';
  }
}

/**
 * Function to open facility edit popup for a specific layer
 */
function openFacilityEditPopup(layer) {
  console.log('Opening facility edit popup for layer:', layer);

  // Get existing properties or initialize empty object
  const properties = layer.properties || {};

  // Get the modal
  const modal = document.getElementById('facilityPropertiesModal');
  if (!modal) {
    console.error('Facility properties modal not found');
    return;
  }

  const content = document.getElementById('facilityModalContent');
  if (!content) {
    console.error('Facility modal content container not found');
    return;
  }

  // Create form content based on current properties
  content.innerHTML = `
    <h2>Edit Facility Properties</h2>
    <form id="facilityPropertiesForm">
      <div class="form-group">
        <label for="facilityName">Facility Name:</label>
        <input type="text" id="facilityName" value="${properties.name || ''}" class="form-control">
      </div>

      <div class="form-group">
        <label for="facilityType">Facility Type:</label>
        <select id="facilityType" class="form-control" onchange="handleFacilityTypeChange()">
          <option value="Other" ${properties.type !== 'PES' && properties.type !== 'ES' ? 'selected' : ''}>Other</option>
          <option value="PES" ${properties.type === 'PES' ? 'selected' : ''}>PES (Potential Explosion Site)</option>
          <option value="ES" ${properties.type === 'ES' ? 'selected' : ''}>ES (Exposed Site)</option>
        </select>
      </div>

      <div id="pesFields" style="display: ${properties.type === 'PES' ? 'block' : 'none'}">
        <h3>PES Details</h3>
        <div class="form-group">
          <label for="newWeight">Net Explosive Weight:</label>
          <input type="number" id="newWeight" value="${properties.newWeight || ''}" class="form-control">
        </div>
        <div class="form-group">
          <label for="hazardDivision">Hazard Division:</label>
          <select id="hazardDivision" class="form-control">
            <option value="1.1" ${properties.hazardDivision === '1.1' ? 'selected' : ''}>1.1 - Mass Detonation</option>
            <option value="1.2" ${properties.hazardDivision === '1.2' ? 'selected' : ''}>1.2 - Fragment Producing</option>
            <option value="1.3" ${properties.hazardDivision === '1.3' ? 'selected' : ''}>1.3 - Mass Fire</option>
            <option value="1.4" ${properties.hazardDivision === '1.4' ? 'selected' : ''}>1.4 - Moderate Fire</option>
          </select>
        </div>
      </div>

      <div id="esFields" style="display: ${properties.type === 'ES' ? 'block' : 'none'}">
        <h3>ES Details</h3>
        <div class="form-group">
          <label for="esType">ES Type:</label>
          <select id="esType" class="form-control">
            <option value="IB" ${properties.esType === 'IB' ? 'selected' : ''}>IB - Inhabited Building</option>
            <option value="PTR" ${properties.esType === 'PTR' ? 'selected' : ''}>PTR - Public Traffic Route</option>
            <option value="AGM" ${properties.esType === 'AGM' ? 'selected' : ''}>AGM - Above Ground Magazine</option>
          </select>
        </div>
        <div class="form-group">
          <label for="personnelCount">Personnel Count:</label>
          <input type="number" id="personnelCount" value="${properties.personnelCount || ''}" class="form-control">
        </div>
      </div>

      <div class="form-group">
        <label for="facilityDescription">Description:</label>
        <textarea id="facilityDescription" class="form-control">${properties.description || ''}</textarea>
      </div>

      <div class="form-buttons">
        <button type="button" onclick="saveFacilityProperties('${layer.id}')">Save</button>
        <button type="button" onclick="closeFacilityModal()">Cancel</button>
      </div>
    </form>
  `;

  // Store the current layer being edited
  window.currentFacilityLayer = layer;

  // Show the modal
  modal.style.display = 'block';
}

/**
 * Function to save facility properties
 */
function saveFacilityProperties(layerId) {
  const layer = window.currentFacilityLayer;
  if (!layer) {
    console.error('No layer found for editing facility properties');
    return;
  }

  // Get values from form
  const name = document.getElementById('facilityName').value;
  const type = document.getElementById('facilityType').value;
  const description = document.getElementById('facilityDescription').value;

  // Create properties object
  const properties = {
    name: name,
    type: type,
    description: description
  };

  // Add type-specific properties
  if (type === 'PES') {
    properties.newWeight = document.getElementById('newWeight').value;
    properties.hazardDivision = document.getElementById('hazardDivision').value;
  } else if (type === 'ES') {
    properties.esType = document.getElementById('esType').value;
    properties.personnelCount = document.getElementById('personnelCount').value;
  }

  // Store properties on the layer
  layer.properties = properties;

  // Update popup content
  //  Assuming createPopupContent function exists elsewhere to update the popup
  if (typeof createPopupContent === 'function') {
    if (layer.getPopup()) {
      layer.setPopupContent(createPopupContent(layer));
    } else {
      layer.bindPopup(createPopupContent(layer));
    }
  }


  // Close the modal
  closeFacilityModal();

  console.log('Saved facility properties for layer:', layer);
}

/**
 * Function to close the facility modal
 */
function closeFacilityModal() {
  const modal = document.getElementById('facilityPropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.currentFacilityLayer = null;
}


// QDPro Feature Editor Initialization
// Handles feature editing, properties, and related UI

document.addEventListener('DOMContentLoaded', function() {
  console.log('Feature editor initializer loaded');

  // Wait for map to be initialized
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      initializeFeatureEditor();
      setupAllLayerEditHandlers(); //Call this after map is initialized
    }
  }, 100);

  // Set up event listeners for the feature editor
  setupFeatureEditorListeners();
});

/**
 * Set up event listeners for the feature editor UI
 */
function setupFeatureEditorListeners() {
  console.log('Setting up feature editor listeners');

  // Listen for the load project button
  const loadProjectButton = document.getElementById('loadProjectButton');
  if (loadProjectButton) {
    loadProjectButton.addEventListener('click', loadProject);
  }

  // Listen for the save project button
  const saveProjectButton = document.getElementById('saveProjectButton');
  if (saveProjectButton) {
    saveProjectButton.addEventListener('click', saveProject);
  }
}


// Make functions available globally
window.initializeFeatureEditor = initializeFeatureEditor;
window.openFeatureEditor = openFeatureEditor;
window.saveFeatureProperties = saveFeatureProperties;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.toggleExplosiveSection = toggleExplosiveSection;
window.loadProject = loadProject;
window.saveProject = saveProject;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.openFacilityEditPopup = openFacilityEditPopup;
window.handleFacilityTypeChange = handleFacilityTypeChange;
window.closeFacilityModal = closeFacilityModal;
window.saveFacilityProperties = saveFacilityProperties;
window.setupFeatureEditorListeners = setupFeatureEditorListeners;
window.closeFeatureEditor = closeFeatureEditor;