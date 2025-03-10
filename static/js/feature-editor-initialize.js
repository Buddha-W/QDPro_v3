
/**
 * Feature Editor Initialization
 * This script ensures that the feature editor is properly set up when the map loads
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize feature editor when map is ready
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);
      
      // Setup all layer edit handlers
      if (typeof setupAllLayerEditHandlers === 'function') {
        setupAllLayerEditHandlers();
      }
      
      // Setup click event handler for the map
      window.map.on('draw:created', function(e) {
        const layer = e.layer;
        
        // Initialize feature properties
        layer.feature = {
          type: 'Feature',
          properties: {
            name: 'New Feature',
            type: 'Polygon',
            description: ''
          },
          geometry: layer.toGeoJSON().geometry
        };
        
        // Add layer click handlers
        if (typeof addLayerClickHandlers === 'function') {
          addLayerClickHandlers(layer);
        }
        
        // Automatically open feature editor for the new feature
        if (typeof openFeatureEditor === 'function') {
          openFeatureEditor(layer);
        }
      });
      
      // Monitor for newly added layers
      window.map.on('layeradd', function(e) {
        const layer = e.layer;
        
        // If this is a feature layer, add click handlers
        if (layer.feature) {
          if (typeof addLayerClickHandlers === 'function') {
            addLayerClickHandlers(layer);
          }
        }
        
        // If this is a layer group, process its sub-layers
        if (layer.eachLayer) {
          layer.eachLayer(function(sublayer) {
            if (sublayer.feature) {
              if (typeof addLayerClickHandlers === 'function') {
                addLayerClickHandlers(sublayer);
              }
            }
          });
        }
      });
      
      console.log("Feature editor initialization complete");
    }
  }, 500);
});
/**
 * Feature Editor Initialization
 * This script ensures that the feature editor is properly set up when the map loads
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialization script loaded");
  
  // Check if the modal exists in the DOM
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error("Feature properties modal not found in the DOM, creating it");
    // Create the modal if it doesn't exist
    const modalHTML = `
      <div id="featurePropertiesModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Feature Properties</h2>
            <span id="closeFeaturePropertiesBtn" class="close" onclick="closeFeaturePropertiesModal()">&times;</span>
          </div>
          <div class="modal-body">
            <form id="featurePropertiesForm">
              <div class="form-group">
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" />
              </div>
              <div class="form-group">
                <label for="is_facility">Is Facility:</label>
                <input type="checkbox" id="is_facility" name="is_facility" />
              </div>
              <div class="form-group">
                <label for="has_explosive">Has Explosive:</label>
                <input type="checkbox" id="has_explosive" name="has_explosive" />
              </div>
              <div id="explosiveSection" style="display:none;">
                <div class="form-group">
                  <label for="net_explosive_weight">Net Explosive Weight:</label>
                  <input type="number" id="net_explosive_weight" name="net_explosive_weight" />
                </div>
              </div>
              <div class="form-group">
                <label for="type">Type:</label>
                <select id="type" name="type">
                  <option value="Facility">Facility</option>
                  <option value="Boundary">Boundary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label for="description">Description:</label>
                <textarea id="description" name="description"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" id="savePropertiesBtn" class="btn btn-primary" onclick="saveFeatureProperties()">Save</button>
                <button type="button" class="btn btn-secondary" onclick="closeFeaturePropertiesModal()">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // Append the modal to the body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup event handlers for the new modal
    const closeButton = document.getElementById('closeFeaturePropertiesBtn');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        closeFeaturePropertiesModal();
      });
    }
    
    // Setup has_explosive checkbox handler
    const hasExplosiveCheckbox = document.getElementById('has_explosive');
    if (hasExplosiveCheckbox) {
      hasExplosiveCheckbox.addEventListener('change', function() {
        const explosiveSection = document.getElementById('explosiveSection');
        if (explosiveSection) {
          explosiveSection.style.display = this.checked ? 'block' : 'none';
        }
      });
    }
  }
  
  // Wait for map to be ready
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      console.log("Map is ready, setting up feature editor handlers");
      
      // Ensure global window functions are defined
      if (typeof window.closeFeaturePropertiesModal !== 'function') {
        window.closeFeaturePropertiesModal = function() {
          console.log("Closing feature properties modal from global function");
          const modal = document.getElementById('featurePropertiesModal');
          if (modal) {
            modal.style.display = 'none';
          } else {
            console.warn("Modal element not found when trying to close");
          }
          window.activeEditingLayer = null;
        };
      }
      
      // Setup map click handlers if not already done
      if (window.map && !window.map._featureEditorInitialized) {
        window.map._featureEditorInitialized = true;
        if (typeof setupMapClickHandler === 'function') {
          setupMapClickHandler();
        } else {
          console.warn("setupMapClickHandler is not defined");
          // Define a basic version if missing
          window.setupMapClickHandler = function() {
            console.log("Setting up map click handler (fallback)");
            window.map.on('click', function(e) {
              if (!e.originalEvent.target.closest('.leaflet-interactive')) {
                window.closeFeaturePropertiesModal();
              }
            });
          };
          window.setupMapClickHandler();
        }
        
        if (typeof setupAllLayerEditHandlers === 'function') {
          setupAllLayerEditHandlers();
        } else {
          console.warn("setupAllLayerEditHandlers is not defined");
        }
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
  
  // Ensure the openFeatureEditor function is available globally
  if (typeof window.openFeatureEditor !== 'function') {
    console.warn("openFeatureEditor not found, creating fallback");
    window.openFeatureEditor = function(layerData) {
      console.log("Opening feature editor (fallback) for:", layerData);
      // Implement fallback behavior if needed
      const modal = document.getElementById('featurePropertiesModal');
      if (modal) {
        modal.style.display = 'block';
        
        // Set active editing layer
        window.activeEditingLayer = layerData;
        
        // Populate form fields if available
        const nameField = document.getElementById('feature_name');
        if (nameField && layerData && layerData.feature && layerData.feature.properties) {
          nameField.value = layerData.feature.properties.name || '';
        }
      } else {
        console.error("Feature properties modal not found");
      }
    };
  }
  
  // Ensure the closeFeaturePropertiesModal function is available globally
  if (typeof window.closeFeaturePropertiesModal !== 'function') {
    console.warn("closeFeaturePropertiesModal not found, creating fallback");
    window.closeFeaturePropertiesModal = function() {
      const modal = document.getElementById('featurePropertiesModal');
      if (modal) {
        modal.style.display = 'none';
      }
      window.activeEditingLayer = null;
    };
  }
  
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
  
  // Set up UI event handlers
  setupFeatureEditorEvents();
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
  
  // Initialize draw controls when map is ready
  if (window.map) {
    initializeDrawControls();
  } else {
    // Wait for map to be available
    const checkMapInterval = setInterval(function() {
      if (window.map) {
        initializeDrawControls();
        clearInterval(checkMapInterval);
      }
    }, 500);
  }
}

function initializeDrawControls() {
  // Create Leaflet.Draw controls
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
  
  // Add draw controls to the map
  window.map.addControl(drawControl);
  
  // Set up draw event handlers
  window.map.on('draw:created', function(e) {
    const layer = e.layer;
    
    // Initialize feature properties
    layer.feature = {
      type: 'Feature',
      properties: {
        type: window.featureEditor.selectedFeatureType || 'generic',
        name: 'New Feature',
        description: '',
        createdAt: new Date().toISOString()
      },
      geometry: layer.toGeoJSON().geometry
    };
    
    // Add the layer to the feature group
    window.featureEditor.drawnItems.addLayer(layer);
    
    // Open the edit popup for the new feature
    if (typeof openEditPopup === 'function') {
      openEditPopup(layer);
    }
  });
  
  // Handle edited features
  window.map.on('draw:edited', function(e) {
    const layers = e.layers;
    
    layers.eachLayer(function(layer) {
      // Update the geometry for the edited layer
      if (layer.feature && layer.feature.geometry) {
        layer.feature.geometry = layer.toGeoJSON().geometry;
        layer.feature.properties.updatedAt = new Date().toISOString();
      }
    });
  });
  
  // Handle deleted features
  window.map.on('draw:deleted', function(e) {
    // Nothing special needed as the layers are already removed
  });
}

function setupFeatureEditorEvents() {
  // Set up feature type selection
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
  
  // Set up tool buttons
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

// Function to open a popup for editing a shape's properties
function openEditPopup(layer) {
  console.log('Opening edit popup for layer:', layer);
  
  // Create popup content
  const properties = layer.feature.properties;
  const popupContent = document.createElement('div');
  popupContent.className = 'edit-popup';
  
  // Create form elements
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Name:';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = properties.name || '';
  
  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Type:';
  const typeInput = document.createElement('input');
  typeInput.type = 'text';
  typeInput.value = properties.type || '';
  
  const descLabel = document.createElement('label');
  descLabel.textContent = 'Description:';
  const descInput = document.createElement('textarea');
  descInput.value = properties.description || '';
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', function() {
    // Update feature properties
    properties.name = nameInput.value;
    properties.type = typeInput.value;
    properties.description = descInput.value;
    properties.updatedAt = new Date().toISOString();
    
    // Close the popup
    layer.closePopup();
  });
  
  // Add elements to popup content
  popupContent.appendChild(nameLabel);
  popupContent.appendChild(nameInput);
  popupContent.appendChild(document.createElement('br'));
  popupContent.appendChild(typeLabel);
  popupContent.appendChild(typeInput);
  popupContent.appendChild(document.createElement('br'));
  popupContent.appendChild(descLabel);
  popupContent.appendChild(descInput);
  popupContent.appendChild(document.createElement('br'));
  popupContent.appendChild(saveButton);
  
  // Bind popup to layer
  layer.bindPopup(popupContent).openPopup();
}

// Placeholder functions for project management
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

// Helper notification functions
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
