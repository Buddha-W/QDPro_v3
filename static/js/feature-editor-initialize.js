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
  if (!layer) return;

  layer.on('click', function(e) {
    // Stop propagation to prevent map click from closing the modal
    L.DomEvent.stopPropagation(e);

    // Open feature properties editor
    openFeatureEditor(layer.feature.properties, layer);

    // Set active feature
    window.featureEditor.activeFeature = layer;
  });

  // Make function globally available
  window.addLayerClickHandlers = addLayerClickHandlers;
}

/**
 * Open the feature properties editor modal
 */
function openFeatureEditor(properties, layer) {
  console.log('Opening feature editor with properties:', properties);

  // Get modal and form elements
  const modal = document.getElementById('featurePropertiesModal');
  const form = document.getElementById('featurePropertiesForm');
  const nameInput = document.getElementById('featureName');
  const typeSelect = document.getElementById('featureType');
  const descriptionTextarea = document.getElementById('featureDescription');

  // Fill the form with properties
  nameInput.value = properties.name || '';
  if (typeSelect && properties.type) {
    typeSelect.value = properties.type;
  }
  descriptionTextarea.value = properties.description || '';

  // Show the modal
  modal.style.display = 'block';

  // Handle form submission
  form.onsubmit = function(e) {
    e.preventDefault();

    // Update feature properties
    const updatedProperties = {
      name: nameInput.value,
      type: typeSelect ? typeSelect.value : properties.type,
      description: descriptionTextarea.value
    };

    // Update the layer properties if layer is provided
    if (layer && layer.feature) {
      layer.feature.properties = updatedProperties;
    }

    // Update active feature if no specific layer was provided
    if (!layer && window.featureEditor.activeFeature) {
      window.featureEditor.activeFeature.feature.properties = updatedProperties;
    }

    // Close the modal
    modal.style.display = 'none';
    console.log('Feature properties updated:', updatedProperties);
  };

  // Make function globally available
  window.openFeatureEditor = openFeatureEditor;
}

/**
 * Save the current project to the server
 */
function saveProject() {
  console.log('Saving project...');
  // Collect all feature data
  const featureData = [];
  window.featureEditor.drawnItems.eachLayer(function(layer) {
    if (layer.feature) {
      featureData.push(layer.feature);
    }
  });

  // Send data to server
  fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      features: featureData
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Project saved:', data);
    showSuccessNotification('Project saved successfully');
  })
  .catch(error => {
    console.error('Error saving project:', error);
    showErrorNotification('Failed to save project: ' + error.message);
  });
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

    // Clear existing features
    window.featureEditor.drawnItems.clearLayers();

    // Add loaded features to the map
    if (data.features && data.features.length > 0) {
      data.features.forEach(function(feature) {
        const layer = L.geoJSON(feature).getLayers()[0];
        window.featureEditor.drawnItems.addLayer(layer);
        addLayerClickHandlers(layer);
      });

      // Fit map to show all features
      window.map.fitBounds(window.featureEditor.drawnItems.getBounds());
    }

    showSuccessNotification('Project loaded successfully');
  })
  .catch(error => {
    console.error('Error loading project:', error);
    showErrorNotification('Failed to load project: ' + error.message);
  });
}

/**
 * Create a new project
 */
function createNewProject() {
  console.log('Creating new project...');

  // Clear existing features
  window.featureEditor.drawnItems.clearLayers();

  // Reset map view
  window.map.setView([39.8283, -98.5795], 5);

  showSuccessNotification('New project created');
}

/**
 * Show a success notification
 */
function showSuccessNotification(message) {
  console.log(message);
  if (typeof window.showNotification === 'function') {
    window.showNotification('success', message);
  } else {
    alert(message);
  }
}

/**
 * Show an error notification
 */
function showErrorNotification(message) {
  console.error(message);
  if (typeof window.showNotification === 'function') {
    window.showNotification('error', message);
  } else {
    alert(message);
  }
}

// Initialize the feature editor when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Feature editor initializer loaded');

  // Wait for map to be initialized before initializing feature editor
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      initializeFeatureEditor();

      // Set up UI event handlers
      setupUIEventHandlers();
    }
  }, 100);
});

/**
 * Set up event handlers for UI controls
 */
function setupUIEventHandlers() {
  // File menu button
  const fileMenuButton = document.getElementById('fileMenuButton');
  const fileModal = document.getElementById('fileModal');
  const closeFileModal = document.getElementById('closeFileModal');

  if (fileMenuButton) {
    fileMenuButton.addEventListener('click', function() {
      fileModal.style.display = 'block';
    });
  }

  if (closeFileModal) {
    closeFileModal.addEventListener('click', function() {
      fileModal.style.display = 'none';
    });
  }

  // Feature properties modal close button
  const closeFeaturePropertiesModal = document.getElementById('closeFeaturePropertiesModal');
  const featurePropertiesModal = document.getElementById('featurePropertiesModal');

  if (closeFeaturePropertiesModal) {
    closeFeaturePropertiesModal.addEventListener('click', function() {
      featurePropertiesModal.style.display = 'none';
    });
  }

  // Project operation buttons
  const newProjectButton = document.getElementById('newProjectButton');
  const saveProjectButton = document.getElementById('saveProjectButton');
  const loadProjectButton = document.getElementById('loadProjectButton');

  if (newProjectButton) {
    newProjectButton.addEventListener('click', function() {
      createNewProject();
      fileModal.style.display = 'none';
    });
  }

  if (saveProjectButton) {
    saveProjectButton.addEventListener('click', function() {
      saveProject();
      fileModal.style.display = 'none';
    });
  }

  if (loadProjectButton) {
    loadProjectButton.addEventListener('click', function() {
      loadProject();
      fileModal.style.display = 'none';
    });
  }

  // Close modals when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === fileModal) {
      fileModal.style.display = 'none';
    }
    if (event.target === featurePropertiesModal) {
      featurePropertiesModal.style.display = 'none';
    }
  });
}