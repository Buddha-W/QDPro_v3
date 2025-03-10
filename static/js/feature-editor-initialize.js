/**
 * Feature Editor Initialization
 * This script ensures that the feature editor is properly set up when the map loads
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize feature editor when map is ready
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);

      // Setup all layer edit handlers (moved to setupFeatureEditHandlers)

      // Setup click event handler for the map (modified to close properties panel)
      window.map.on('draw:created', function(e) {
        const layer = e.layer;

        // Initialize feature properties (partially handled in openEditPopup)
        layer.feature = {
          type: 'Feature',
          properties: {
            name: 'New Feature',
            type: 'Polygon',
            description: ''
          },
          geometry: layer.toGeoJSON().geometry
        };

        // Automatically open feature editor for the new feature (replaced with openEditPopup)
        openEditPopup(layer);
      });

      // Monitor for newly added layers (partially handled in setupFeatureEditHandlers)
      window.map.on('layeradd', function(e) {
        const layer = e.layer;
      });

      console.log("Feature editor initialization complete");
    }
  }, 500);
});

// QDPro Feature Editor Initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('Feature editor initializer loaded');

  // Initialize feature editor components
  initializeFeatureEditor();

  // Set up event handlers for feature editing
  setupFeatureEditHandlers();
});

// Initialize the feature editor
function initializeFeatureEditor() {
  // Create and initialize feature properties panel
  createPropertiesPanel();

  // Set up feature selection functionality
  setupFeatureSelection();
}

// Create properties panel for editing feature attributes
function createPropertiesPanel() {
  // Check if panel already exists
  if (document.getElementById('properties-panel')) return;

  // Create panel container
  const panel = document.createElement('div');
  panel.id = 'properties-panel';
  panel.className = 'properties-panel';
  panel.style.display = 'none';

  // Add header
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = '<h3>Feature Properties</h3>';

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'close-button';
  closeButton.onclick = function() {
    panel.style.display = 'none';
  };
  header.appendChild(closeButton);
  panel.appendChild(header);

  // Add form container
  const formContainer = document.createElement('div');
  formContainer.id = 'properties-form';
  formContainer.className = 'form-container';
  panel.appendChild(formContainer);

  // Add action buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'save-button';
  saveButton.onclick = saveFeatureProperties;
  buttonContainer.appendChild(saveButton);

  panel.appendChild(buttonContainer);

  // Add to document
  document.body.appendChild(panel);
}

// Set up selection functionality for map features
function setupFeatureSelection() {
  if (!window.map) return;

  // Add click handler to map for feature selection
  window.map.on('click', function(e) {
    // Close properties panel when clicking outside features
    const propertiesPanel = document.getElementById('properties-panel');
    if (propertiesPanel) {
      propertiesPanel.style.display = 'none';
    }
  });
}

// Set up event handlers for feature editing
function setupFeatureEditHandlers() {
  if (!window.map) return;

  // Handle created features
  window.map.on(L.Draw.Event.CREATED, function(e) {
    const layer = e.layer;

    // Add layer to drawn items
    if (window.drawnItems) {
      window.drawnItems.addLayer(layer);
    }

    // Open edit popup for the new feature
    openEditPopup(layer);
  });

  // Handle edited features
  window.map.on(L.Draw.Event.EDITED, function(e) {
    const layers = e.layers;

    // Update properties for each edited layer
    layers.eachLayer(function(layer) {
      updateFeatureProperties(layer);
    });
  });
}

// Function to open a popup for editing a shape's properties
function openEditPopup(layer) {
  console.log('Opening edit popup for layer', layer);

  // Get or initialize layer properties
  const properties = layer.feature ? layer.feature.properties : {};

  // Display properties panel
  const panel = document.getElementById('properties-panel');
  const form = document.getElementById('properties-form');

  if (!panel || !form) {
    console.error('Properties panel not found');
    return;
  }

  // Clear existing form
  form.innerHTML = '';

  // Create basic properties inputs
  createPropertyInput(form, 'name', 'Name', properties.name || '');
  createPropertyInput(form, 'description', 'Description', properties.description || '');
  createPropertyInput(form, 'type', 'Type', properties.type || '');

  // Store reference to current layer
  window.currentEditLayer = layer;

  // Show the panel
  panel.style.display = 'block';
}

// Helper to create property input field
function createPropertyInput(form, id, label, value) {
  const div = document.createElement('div');
  div.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  div.appendChild(labelEl);

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.name = id;
  input.value = value;
  div.appendChild(input);

  form.appendChild(div);
}

// Save feature properties from the form
function saveFeatureProperties() {
  if (!window.currentEditLayer) {
    console.error('No layer selected for editing');
    return;
  }

  // Get values from form
  const name = document.getElementById('name').value;
  const description = document.getElementById('description').value;
  const type = document.getElementById('type').value;

  // Initialize feature if not exists
  if (!window.currentEditLayer.feature) {
    window.currentEditLayer.feature = {
      type: 'Feature',
      properties: {}
    };
  }

  // Update properties
  window.currentEditLayer.feature.properties = {
    ...window.currentEditLayer.feature.properties,
    name,
    description,
    type
  };

  // Update popup content if it exists
  if (window.currentEditLayer.getPopup()) {
    window.currentEditLayer.setPopupContent(createPopupContent(window.currentEditLayer.feature.properties));
  } else {
    window.currentEditLayer.bindPopup(createPopupContent(window.currentEditLayer.feature.properties));
  }

  // Hide panel
  const panel = document.getElementById('properties-panel');
  if (panel) {
    panel.style.display = 'none';
  }

  // Clear current layer reference
  window.currentEditLayer = null;

  console.log('Feature properties saved');
}

// Create HTML content for feature popup
function createPopupContent(properties) {
  let content = '<div class="feature-popup">';

  if (properties.name) {
    content += `<h3>${properties.name}</h3>`;
  }

  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }

  if (properties.description) {
    content += `<p>${properties.description}</p>`;
  }

  content += '<button onclick="openEditPopup(this._layer)">Edit</button>';
  content += '</div>';

  return content;
}

// Update feature properties in the database
function updateFeatureProperties(layer) {
  // This function would typically send an AJAX request to save changes
  console.log('Updating feature properties in database', layer);

  // Example AJAX call (commented out)
}

// Make functions available globally
window.openEditPopup = openEditPopup;
window.saveFeatureProperties = saveFeatureProperties;


/**
 * Feature Editor Initialization
 * This script ensures that the feature editor is properly set up when the map loads
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialization script loaded");


  // Wait for map to be ready (partially handled in setupFeatureEditHandlers)
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      console.log("Map is ready, setting up feature editor handlers");

      if (window.map && !window.map._featureEditorInitialized) {
        window.map._featureEditorInitialized = true;
      }
    }
  }, 100);
});

/**
 * Feature Editor Initialization Helper
 * This script ensures that feature editor functions are available globally
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialization helper running");

  console.log("Feature editor initialization helper complete");
});

/**
 * Feature Editor Initialization
 * Sets up the feature editor for the QDPro GIS System
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Feature editor initializer loaded');

  // Initialize feature editor components
  initializeFeatureEditor();

  // Set up UI event handlers (modified to use new handlers)
  setupFeatureEditHandlers();
});

function initializeFeatureEditor() {
  console.log('Initializing feature editor...');

  // Create global feature editor object if it doesn't exist
  if (!window.featureEditor) {
    window.featureEditor = {
      activeLayer: null,
      editMode: false,
      selectedFeatureType: null,
      drawnItems: new L.FeatureGroup()
    };

    // Add the drawn items layer to the map when it's available
    if (window.map) {
      window.featureEditor.drawnItems.addTo(window.map);
    }
  }

  // Initialize draw controls when map is ready (unchanged)
  if (window.map) {
    initializeDrawControls();
  } else {
    // Wait for map to be available (unchanged)
    const checkMapInterval = setInterval(function() {
      if (window.map) {
        initializeDrawControls();
        clearInterval(checkMapInterval);
      }
    }, 500);
  }
}

function initializeDrawControls() {
  // Create Leaflet.Draw controls (unchanged)
  const drawControl = new L.Control.Draw({
    draw: {
      polyline: true,
      polygon: true,
      rectangle: true,
      circle: true,
      marker: true
    },
    edit: {
      featureGroup: window.featureEditor.drawnItems
    }
  });

  // Add draw controls to the map (unchanged)
  window.map.addControl(drawControl);

  // Handle deleted features (unchanged)
  window.map.on('draw:deleted', function(e) {
    // Nothing special needed as the layers are already removed
  });
}

function setupFeatureEditorEvents() {
  // Set up feature type selection (unchanged)
  const featureTypeButtons = document.querySelectorAll('.feature-type-button');
  if (featureTypeButtons) {
    featureTypeButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        // Set the selected feature type
        window.featureEditor.selectedFeatureType = this.dataset.featureType;

        // Update UI to show selected state
        featureTypeButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
      });
    });
  }

  // Set up tool buttons (unchanged)
  const toolButtons = document.querySelectorAll('.tool-button');
  if (toolButtons) {
    toolButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        const action = this.dataset.action;
        if (action) {
          handleToolAction(action);
        }
      });
    });
  }
}

function handleToolAction(action) {
  switch (action) {
    case 'save':
      saveProject();
      break;
    case 'load':
      loadProject();
      break;
    case 'new':
      createNewProject();
      break;
    case 'analyze':
      analyzeFeatures();
      break;
    default:
      console.log('Unknown tool action:', action);
  }
}


// Placeholder functions for project management (unchanged)
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
  fetch('/api/save_project', {
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

function loadProject() {
  console.log('Loading project...');
  fetch('/api/load_project')
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

function createNewProject() {
  console.log('Creating new project...');

  // Clear existing features
  window.featureEditor.drawnItems.clearLayers();

  // Reset map view
  window.map.setView([39.8283, -98.5795], 5);

  showSuccessNotification('New project created');
}

function analyzeFeatures() {
  console.log('Analyzing features...');

  // Collect feature IDs for analysis
  const featureIds = [];
  window.featureEditor.drawnItems.eachLayer(function(layer) {
    if (layer.feature && layer.feature.id) {
      featureIds.push(layer.feature.id);
    }
  });

  // Send data to server for analysis
  fetch('/api/analyze_features', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      featureIds: featureIds
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Analysis results:', data);
    showSuccessNotification('Analysis completed');
  })
  .catch(error => {
    console.error('Error analyzing features:', error);
    showErrorNotification('Failed to analyze features: ' + error.message);
  });
}

// Helper notification functions (unchanged)
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#4CAF50';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '5000';
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(function() {
    notification.remove();
  }, 3000);
}

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#f44336';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '5000';
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(function() {
    notification.remove();
  }, 3000);
}