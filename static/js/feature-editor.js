
/**
 * Feature Editor for QDPro application
 * Handles editing of GeoJSON features on the map
 */

// Function to open a feature editor popup for a given layer
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);
  
  // Get existing properties or initialize empty object
  const properties = layer.feature ? layer.feature.properties || {} : {};
  
  // Create popup content
  const popupContent = document.createElement('div');
  popupContent.innerHTML = `
    <h3>Edit Feature Properties</h3>
    <form id="feature-properties-form">
      <div class="form-group">
        <label for="feature-name">Name:</label>
        <input type="text" id="feature-name" value="${properties.name || ''}" class="form-control">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="feature-is-facility" ${properties.is_facility ? 'checked' : ''}>
          Facility
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="feature-has-explosive" ${properties.has_explosive ? 'checked' : ''}>
          Contains Explosives (NEW)
        </label>
      </div>
      <div id="explosive-details" style="display: ${properties.has_explosive ? 'block' : 'none'}">
        <div class="form-group">
          <label for="feature-net-explosive-weight">Net Explosive Weight:</label>
          <input type="number" id="feature-net-explosive-weight" value="${properties.net_explosive_weight || '0'}" min="0" step="0.1" class="form-control">
        </div>
        <div class="form-group">
          <label for="feature-new-unit">Unit:</label>
          <select id="feature-new-unit" class="form-control">
            <option value="lb" ${(properties.unit || 'lb') === 'lb' ? 'selected' : ''}>Pounds (lb)</option>
            <option value="kg" ${(properties.unit || 'lb') === 'kg' ? 'selected' : ''}>Kilograms (kg)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="feature-type">Type:</label>
        <select id="feature-type" class="form-control">
          <option value="Standard" ${(properties.type || 'Standard') === 'Standard' ? 'selected' : ''}>Standard</option>
          <option value="Storage" ${(properties.type || 'Standard') === 'Storage' ? 'selected' : ''}>Storage</option>
          <option value="Processing" ${(properties.type || 'Standard') === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Admin" ${(properties.type || 'Standard') === 'Admin' ? 'selected' : ''}>Administrative</option>
          <option value="Other" ${(properties.type || 'Standard') === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="feature-description">Description:</label>
        <textarea id="feature-description" class="form-control">${properties.description || ''}</textarea>
      </div>
      <div class="form-group" style="text-align: right;">
        <button type="button" id="save-properties-btn" class="btn btn-primary">Save</button>
        <button type="button" id="cancel-properties-btn" class="btn btn-secondary">Cancel</button>
      </div>
    </form>
  `;
  
  // If layer has a popup, close it and then set new content
  if (layer.getPopup()) {
    layer.closePopup();
  }
  
  // Create new popup and open it
  layer.bindPopup(popupContent, { 
    maxWidth: 500,
    className: 'feature-editor-popup'
  }).openPopup();
  
  // Add event listeners after popup is opened
  setTimeout(() => {
    // Toggle explosive details visibility
    const hasExplosiveCheckbox = document.getElementById('feature-has-explosive');
    const explosiveDetails = document.getElementById('explosive-details');
    
    if (hasExplosiveCheckbox && explosiveDetails) {
      hasExplosiveCheckbox.addEventListener('change', function() {
        explosiveDetails.style.display = this.checked ? 'block' : 'none';
      });
    }
    
    // Save button handler
    const saveButton = document.getElementById('save-properties-btn');
    if (saveButton) {
      saveButton.addEventListener('click', function() {
        saveFeatureProperties(layer);
      });
    }
    
    // Cancel button handler
    const cancelButton = document.getElementById('cancel-properties-btn');
    if (cancelButton) {
      cancelButton.addEventListener('click', function() {
        layer.closePopup();
      });
    }
  }, 100);
}

// Function to save the feature properties
function saveFeatureProperties(layer) {
  try {
    // Get values from form
    const name = document.getElementById('feature-name').value;
    const isFacility = document.getElementById('feature-is-facility').checked;
    const hasExplosive = document.getElementById('feature-has-explosive').checked;
    const netExplosiveWeight = hasExplosive ? parseFloat(document.getElementById('feature-net-explosive-weight').value) : 0;
    const unit = document.getElementById('feature-new-unit').value;
    const type = document.getElementById('feature-type').value;
    const description = document.getElementById('feature-description').value;
    
    // Initialize feature if it doesn't exist
    if (!layer.feature) {
      layer.feature = {
        type: 'Feature',
        properties: {}
      };
    }
    
    if (!layer.feature.properties) {
      layer.feature.properties = {};
    }
    
    // Update properties
    layer.feature.properties.name = name;
    layer.feature.properties.is_facility = isFacility;
    layer.feature.properties.has_explosive = hasExplosive;
    layer.feature.properties.net_explosive_weight = netExplosiveWeight;
    layer.feature.properties.unit = unit;
    layer.feature.properties.type = type;
    layer.feature.properties.description = description;
    
    // Close popup
    layer.closePopup();
    
    // Create a new popup with the updated information
    const popupContent = `
      <div>
        <h3>${name || 'Unnamed Feature'}</h3>
        <p><strong>Type:</strong> ${type}</p>
        ${hasExplosive ? `<p><strong>NET:</strong> ${netExplosiveWeight} ${unit}</p>` : ''}
        ${description ? `<p>${description}</p>` : ''}
        <button class="edit-feature-btn">Edit</button>
      </div>
    `;
    
    layer.bindPopup(popupContent);
    
    // Add click handler to the edit button in the new popup
    layer.on('popupopen', function() {
      setTimeout(() => {
        const editBtn = document.querySelector('.edit-feature-btn');
        if (editBtn) {
          editBtn.addEventListener('click', function() {
            openFeatureEditor(layer);
          });
        }
      }, 100);
    });
    
    // Try to save to the server if available
    try {
      const featureData = {
        id: layer.feature.id || layer._leaflet_id,
        properties: layer.feature.properties,
        geometry: layer.toGeoJSON().geometry
      };
      
      fetch('/api/update-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(featureData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Feature saved successfully:', data);
      })
      .catch(error => {
        console.error('Failed to save feature properties:', error);
        // Continue anyway - changes are saved to the layer object
      });
    } catch (e) {
      console.error('Failed to save feature properties:', e);
      // Continue anyway - changes are saved to the layer object locally
    }
    
    // Save the overall project state
    if (window.QDPro && typeof window.QDPro.saveProject === 'function') {
      window.QDPro.saveProject();
    }
    
  } catch (error) {
    console.error('Error saving feature properties:', error);
    alert('An error occurred while saving feature properties. See console for details.');
  }
}

// Function to initialize feature editor on a map
function initFeatureEditor(map) {
  console.log('Feature editor initialized for map:', map);
  
  // Set up click handler for features
  map.on('click', function(e) {
    console.log('Map clicked at:', e.latlng);
  });
}

// Feature editing functionality for QDPro

// Store reference to the layer being edited
let editingLayer = null; // Added global variable to store the editing layer
window.activeEditLayer = null;

// Initialize feature editor functionality
document.addEventListener('DOMContentLoaded', function() {
  // Set up event listeners for the feature properties form
  const featureForm = document.getElementById('featurePropertiesForm');
  if (featureForm) {
    featureForm.addEventListener('submit', handleFeatureFormSubmit);

    // Toggle NEW section visibility based on explosive checkbox
    const hasExplosiveCheckbox = document.getElementById('has_explosive');
    if (hasExplosiveCheckbox) {
      hasExplosiveCheckbox.addEventListener('change', function() {
        document.getElementById('newSection').style.display = this.checked ? 'block' : 'none';
      });
    }
  }
});

// Open the feature editor modal
function openFeatureEditor(layer) {
  // Store reference to active layer being edited
  window.activeEditLayer = layer;
  editingLayer = layer; // Update the editingLayer variable

  // Get properties from the layer
  const properties = layer.feature ? layer.feature.properties || {} : {};

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

  // Show the modal
  document.getElementById('featurePropertiesModal').style.display = 'block';
}

// Handle form submission when editing feature properties
function handleFeatureFormSubmit(e) {
  e.preventDefault();

  if (!window.activeEditLayer) {
    console.error('No active layer to edit');
    return;
  }

  // Get the layer
  const layer = window.activeEditLayer;

  // Ensure layer has feature and properties
  if (!layer.feature) {
    layer.feature = { properties: {} };
  }
  if (!layer.feature.properties) {
    layer.feature.properties = {};
  }

  // Get form data
  const form = document.getElementById('featurePropertiesForm');
  const properties = { ...layer.feature.properties };

  // Update properties from form
  properties.name = document.getElementById('name').value;
  properties.is_facility = document.getElementById('is_facility').checked;
  properties.has_explosive = document.getElementById('has_explosive').checked;
  properties.type = document.getElementById('type').value;
  properties.description = document.getElementById('description').value;

  // Only set NEW if the checkbox is checked
  if (properties.has_explosive) {
    const newValue = document.getElementById('net_explosive_weight').value;
    properties.net_explosive_weight = newValue ? parseFloat(newValue) : 0;
  } else {
    properties.net_explosive_weight = 0;
  }

  // Update layer properties
  layer.feature.properties = properties;

  // Update popup content if the layer has a popup
  if (layer.getPopup) {
    if (layer.getPopup()) {
      // Use popup-handler.js function if available
      if (typeof createPopupContent === 'function') {
        layer.setPopupContent(createPopupContent(properties));
      } else {
        // Simple fallback content
        let content = `<div>
          <h4>${properties.name || 'Unnamed Feature'}</h4>
          <p><strong>Type:</strong> ${properties.type || 'Unknown'}</p>
          ${properties.has_explosive ? `<p><strong>NEW:</strong> ${properties.net_explosive_weight} lbs</p>` : ''}
          ${properties.description ? `<p>${properties.description}</p>` : ''}
          <button onclick="openFeatureEditor(window.activeEditLayer)">Edit</button>
        </div>`;
        layer.setPopupContent(content);
      }
    } else {
      // Create popup if it doesn't exist
      if (typeof createPopupContent === 'function') {
        layer.bindPopup(createPopupContent(properties));
      }
    }
  }

  // Save to server if possible
  saveFeatureProperties(layer.feature.id, properties)
    .then(success => {
      if (success) {
        console.log('Feature properties saved successfully');
      } else {
        console.warn('Failed to save feature properties');
      }
    });

  // Close the modal
  document.getElementById('featurePropertiesModal').style.display = 'none';

  // Clear active edit layer
  window.activeEditLayer = null;
  editingLayer = null; //Clear editingLayer
}

// Save feature properties to server
async function saveFeatureProperties(featureId, properties) {
  if (!featureId && editingLayer && editingLayer._leaflet_id) {
    // Use Leaflet's internal ID if no feature ID is available
    featureId = editingLayer._leaflet_id;
  } else if (!featureId) {
    console.error("Cannot save feature without ID");
    return false;
  }

  // For temporary IDs (starting with 'temp_'), just log and return success
  if (featureId.toString().startsWith('temp_')) {
    console.log("Using temporary feature for analysis, no server save required");
    return true; // Indicate success for temporary IDs
  }

  try {
    const response = await fetch('/api/update-feature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feature_id: featureId,
        properties: properties
      }),
    });

    const data = await response.json();
    if (data.status === 'success') {
      // Refresh edit handlers to ensure all features are editable
      setTimeout(function() {
        refreshAllLayerEditHandlers();
      }, 300);
    }
    return data.status === 'success';
  } catch (error) {
    console.warn("Local feature only, will be used for analysis", error);
    return false; // Indicate failure for server errors
  }
}

// Function to add click handlers to layers for editing
function addLayerClickHandlers(layer) {
  if (!layer) return;

  // Skip if already has handlers attached (check with a custom property)
  if (layer._hasClickHandlers) {
    return;
  }
  
  // Mark as having handlers
  layer._hasClickHandlers = true;

  // Add a simple popup if none exists
  if (layer.bindPopup && !layer.getPopup()) {
    let properties = layer.feature ? layer.feature.properties || {} : {};
    let content = `<div>
      <h4>${properties.name || 'Unnamed Feature'}</h4>
      <button class="edit-feature-btn">Edit Properties</button>
    </div>`;

    layer.bindPopup(content);

    // Store reference to the layer in the button when popup opens
    layer.on('popupopen', function(e) {
      setTimeout(() => {
        const buttons = document.querySelectorAll('.leaflet-popup .edit-feature-btn');
        buttons.forEach(button => {
          button._layer = layer;
          button.onclick = function() {
            openFeatureEditor(this._layer);
          };
        });
      }, 10);
    });
  }

  // Add a click handler for the layer itself
  layer.on('click', function(e) {
    // Store the clicked layer for potential editing
    window.lastClickedLayer = layer;
    console.log("Layer clicked:", layer, "in layer:", layer.options ? layer.options.name : "unknown");
  });
}
// Function to ensure all features in all layers have edit capabilities
function setupAllLayerEditHandlers() {
  if (!window.map) {
    console.warn("Map not available, cannot set up layer edit handlers");
    return;
  }
  
  // Process all layer groups in the map
  window.map.eachLayer(function(layer) {
    // Check if it's a feature group or has features
    if (layer.eachLayer) {
      layer.eachLayer(function(sublayer) {
        if (sublayer.feature) {
          addLayerClickHandlers(sublayer);
        }
      });
    } else if (layer.feature) {
      addLayerClickHandlers(layer);
    }
  });
  
  console.log("Edit handlers set up for all layers");
}

// Call this function after map initialization and whenever layers change
document.addEventListener('DOMContentLoaded', function() {
  // Wait for map to be ready
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);
      setupAllLayerEditHandlers();
    }
  }, 500);
});
// Function to ensure specific layers have editable features
function ensureLayerFeaturesEditable(layerNames) {
  if (!window.map) return;
  
  // Process all layers in the map
  window.map.eachLayer(function(layer) {
    // Check if this is one of our target layers
    if (layer.options && layer.options.name && 
        (layerNames.includes(layer.options.name) || layerNames.length === 0)) {
      console.log("Setting up edit handlers for layer:", layer.options.name);
      
      // Apply edit handlers to all features in this layer
      if (layer.eachLayer) {
        layer.eachLayer(function(feature) {
          addLayerClickHandlers(feature);
        });
      }
    }
  });
}

// Call this when the page loads and after any layer changes
document.addEventListener('layersLoaded', function() {
  console.log("Layers loaded event detected");
  setTimeout(function() {
    // Make sure both ES and PES layers are editable, as well as any others
    ensureLayerFeaturesEditable(['ES', 'PES']);
    setupAllLayerEditHandlers();
  }, 500);
});

// Call when layers are added or modified
function refreshAllLayerEditHandlers() {
  console.log("Refreshing edit handlers for all layers");
  setupAllLayerEditHandlers();
  ensureLayerFeaturesEditable([]);  // Empty array means all layers
}
