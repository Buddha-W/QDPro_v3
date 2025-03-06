/**
 * Feature Editor for QDPro application
 * Handles editing of GeoJSON features on the map
 */

// Global variables
let editingLayer = null;

// Close any open popups and modals on the map
function closeAllPopups() {
  // Close Leaflet popups
  if (window.map) {
    window.map.eachLayer(function(layer) {
      if (layer.closePopup) {
        layer.closePopup();
      }
    });
  }
}

// Function to close the modal and reset editing state
function closeFeaturePropertiesModal() {
  const featurePropertiesModal = document.getElementById('featurePropertiesModal');
  if (featurePropertiesModal) {
    featurePropertiesModal.style.display = 'none';
  }

  // Reset active editing layer
  window.activeEditLayer = null;
  editingLayer = null;
}

// Add a global document click event to track clicks that aren't on polygons
document.addEventListener('click', function(e) {
  // Don't close the modal if the click is inside the modal
  if (e.target.closest('#featurePropertiesModal')) {
    return;
  }

  // Don't close the modal if the click is on a Leaflet marker or polygon
  if (e.target.closest('.leaflet-marker-icon') || e.target.closest('.leaflet-interactive')) {
    return;
  }

  // Otherwise, close the modal
  closeFeaturePropertiesModal();
});

// Open the feature editor modal for a given layer
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);

  // First, set the global active editing layer
  window.activeEditLayer = layer;

  // Store the active layer
  editingLayer = layer;

  // Get existing properties or initialize empty object
  const properties = layer.feature ? layer.feature.properties || {} : {};

  // Make sure the feature properties modal exists
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error("Feature properties modal not found in the DOM");
    return;
  }

  // Always close any existing popups before showing the modal
  closeAllPopups();

  // Display the modal
  modal.style.display = 'block';

  // Create popup content
  const popupContent = document.createElement('div');
  popupContent.className = 'feature-editor-popup';

  // Fill the form with current properties
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Feature properties form not found");
    return;
  }

  // Reset form
  form.reset();

  // Set values for each field
  if (properties.name) document.getElementById('name').value = properties.name || '';
  if (properties.type) document.getElementById('type').value = properties.type || '';
  if (properties.description) document.getElementById('description').value = properties.description || '';

  // Handle has_explosive checkbox and related fields
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  const netWeightField = document.getElementById('net_explosive_weight');
  const unitField = document.getElementById('unit');

  if (hasExplosiveCheckbox) {
    const hasExplosive = properties.has_explosive === true;
    hasExplosiveCheckbox.checked = hasExplosive;

    // Show/hide NET weight section
    const netSection = document.getElementById('netSection');
    if (netSection) {
      netSection.style.display = hasExplosive ? 'block' : 'none';
    }

    // Set NET values if applicable
    if (netWeightField && properties.net_explosive_weight) {
      netWeightField.value = properties.net_explosive_weight;
    }

    if (unitField && properties.unit) {
      unitField.value = properties.unit;
    }

    // Add event listener to the checkbox
    hasExplosiveCheckbox.addEventListener('change', function() {
      if (netSection) {
        netSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }

  // Setup save button
  const saveButton = document.getElementById('saveFeatureProperties');
  if (saveButton) {
    saveButton.onclick = function() {
      saveFeatureProperties();
    };
  }

  // Setup close button (X in the corner)
  const closeButton = modal.querySelector('.close');
  if (closeButton) {
    closeButton.onclick = function() {
      closeAllPopups();
    };
  }
}

// Function to save properties from the form to the feature
function saveFeatureProperties() {
  if (!editingLayer || !editingLayer.feature) {
    console.error("No active layer to save properties to");
    return;
  }

  // Get form values
  const name = document.getElementById('name').value;
  const type = document.getElementById('type').value;
  const description = document.getElementById('description').value;

  // Get explosive-related values if they exist
  let hasExplosive = false;
  let netExplosiveWeight = 0;
  let unit = 'kg';

  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosive = hasExplosiveCheckbox.checked;
  }

  if (hasExplosive) {
    const netWeightField = document.getElementById('net_explosive_weight');
    const unitField = document.getElementById('unit');

    if (netWeightField) netExplosiveWeight = parseFloat(netWeightField.value) || 0;
    if (unitField) unit = unitField.value;
  }

  // Initialize properties if they don't exist
  if (!editingLayer.feature.properties) {
    editingLayer.feature.properties = {};
  }

  // Update the feature properties
  editingLayer.feature.properties.name = name;
  editingLayer.feature.properties.type = type;
  editingLayer.feature.properties.description = description;
  editingLayer.feature.properties.has_explosive = hasExplosive;

  if (hasExplosive) {
    editingLayer.feature.properties.net_explosive_weight = netExplosiveWeight;
    editingLayer.feature.properties.unit = unit;
  }

  // Create a new popup with the updated information
  const popupContent = `
    <div>
      <h3>${name || 'Unnamed Feature'}</h3>
      <p><strong>Type:</strong> ${type}</p>
      ${hasExplosive ? `<p><strong>NET:</strong> ${netExplosiveWeight} ${unit}</p>` : ''}
      ${description ? `<p>${description}</p>` : ''}
    </div>
  `;

  editingLayer.setPopupContent(popupContent);

  // Save to server if available
  try {
    const featureData = {
      id: editingLayer.feature.id || editingLayer._leaflet_id,
      properties: editingLayer.feature.properties,
      geometry: editingLayer.toGeoJSON().geometry
    };

    if (typeof saveGeometryToServer === 'function') {
      saveGeometryToServer(featureData);
    }
  } catch (error) {
    console.error("Error saving feature data:", error);
  }

  // Close the modal
  closeAllPopups();

  // Clear the editing layer reference
  editingLayer = null;
  window.activeEditLayer = null;
}

// Function to add click handlers to layers
function addLayerClickHandlers(layer) {
  if (!layer) return;

  // Store the parent layer name if available
  if (layer._parentLayerName) {
    console.log(`Layer ${layer._leaflet_id} is in parent layer ${layer._parentLayerName}`);
  }

  // Remove any existing click handlers to prevent duplicates
  layer.off('click');

  // Add a direct click handler to the layer
  layer.on('click', function(e) {
    console.log("Layer clicked:", layer);

    // Stop propagation to prevent map click
    L.DomEvent.stopPropagation(e);

    // Always open the feature editor for this layer
    // This will handle switching between polygons automatically
    openFeatureEditor(layer);

    return false;
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

// Setup event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, setting up feature editor");

  // Close modal when clicking on close button or outside the modal content
  window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let i = 0; i < modals.length; i++) {
      if (event.target === modals[i]) {
        modals[i].style.display = "none";
      }
    }
  };

  // Wait for map to be ready
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);
      setupAllLayerEditHandlers();
      console.log("Feature editor initialized");
    }
  }, 500);
});

// When new features are created or loaded, ensure they have click handlers
function ensureLayerHasClickHandlers(layer) {
  if (!layer) return;

  if (layer.eachLayer) {
    layer.eachLayer(function(sublayer) {
      if (sublayer.feature) {
        addLayerClickHandlers(sublayer);
      }
    });
  } else if (layer.feature) {
    addLayerClickHandlers(layer);
  }
}

// Function to use when new layers are created or added to the map
function refreshLayerHandlers() {
  setupAllLayerEditHandlers();
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

  // Don't close the modal here - this allows users to click directly on another polygon
  // to edit without closing/reopening the modal

  // Only reset if user explicitly closes with X button
  // We'll keep the modal open so they can click on another polygon
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

        // If we were editing a specific layer, make sure its features are editable
        if (editingLayer && editingLayer._parentLayerName) {
          ensureLayerFeaturesEditable([editingLayer._parentLayerName]);
        }
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
  // Skip if layer doesn't have a feature
  if (!layer) {
    return;
  }

  // Remove existing handlers to avoid duplicates
  if (layer._events && layer._events.click) {
    layer.off('click');
    layer._hasClickHandlers = false;
  }

  // Mark as having handlers
  layer._hasClickHandlers = true;

  // Save the layer group's name if available
  if (layer._map && layer._map._layers) {
    // Try to find parent layer group
    for (const id in layer._map._layers) {
      const mapLayer = layer._map._layers[id];
      if (mapLayer.eachLayer && mapLayer.options && mapLayer.options.name) {
        // Check if this layer contains our feature
        let isParent = false;
        mapLayer.eachLayer(function(childLayer) {
          if (childLayer === layer) {
            isParent = true;
          }
        });

        if (isParent) {
          layer._parentLayerName = mapLayer.options.name;
          console.log("Feature belongs to layer:", mapLayer.options.name);
          break;
        }
      }
    }
  }

  // Direct click handler - this will always fire first, before the popup opens
  layer.on('click', function(e) {
    // Close all existing popups first
    closeAllPopups();

    // Store the clicked layer for potential editing
    window.lastClickedLayer = layer;
    console.log("Layer clicked:", layer, "in layer:", layer._parentLayerName || "unknown");

    // Open the feature editor directly without a popup
    openFeatureEditor(layer);

    // Stop propagation to prevent map click
    L.DomEvent.stopPropagation(e);

    // Prevent the default popup from opening
    return false;
  });

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
    // For all feature groups and feature layers
    if (layer.eachLayer) {
      // If this is a specific named layer we're targeting, or if we're targeting all layers
      if (!layerNames.length ||
          (layer.options && layer.options.name && layerNames.includes(layer.options.name))) {
        console.log("Setting up edit handlers for layer:", layer.options ? layer.options.name : "unnamed layer");

        // Apply edit handlers to all features in this layer
        layer.eachLayer(function(feature) {
          // Remove any existing handlers to prevent duplicates
          if (feature._events && feature._events.click) {
            feature.off('click');
            feature._hasClickHandlers = false;
          }
          // Add new handlers
          addLayerClickHandlers(feature);
        });
      }
    } else if (layer.feature) {
      // Handle individual features not in a layer group
      addLayerClickHandlers(layer);
    }
  });
}

// Call this when the page loads and after any layer changes
document.addEventListener('layersLoaded', function() {
  console.log("Layers loaded event detected");
  setTimeout(function() {
    // Make all layers editable
    refreshAllLayerEditHandlers();
  }, 500);
});

// Call when layers are added or modified
function refreshAllLayerEditHandlers() {
  console.log("Refreshing edit handlers for all layers");

  // First, try to clear any existing handlers to prevent duplicates
  if (window.map) {
    window.map.eachLayer(function(layer) {
      if (layer.eachLayer) {
        layer.eachLayer(function(feature) {
          if (feature._events && feature._events.click) {
            feature.off('click');
            feature._hasClickHandlers = false;
          }
        });
      }
    });
  }

  // Then set up all handlers again
  setupAllLayerEditHandlers();
  ensureLayerFeaturesEditable([]);  // Empty array means all layers

  // Dispatch custom event when editing handlers are refreshed
  document.dispatchEvent(new CustomEvent('editHandlersRefreshed'));
}

// Add event listener to re-enable editing when layers are toggled
document.addEventListener('DOMContentLoaded', function() {
  // Set a check interval to monitor for layer control changes
  setInterval(function() {
    if (window.map) {
      const layerControls = document.querySelectorAll('.layer-control-item input[type="checkbox"]');
      layerControls.forEach(function(control) {
        if (!control._hasToggleListener) {
          control._hasToggleListener = true;
          control.addEventListener('change', function() {
            // When a layer is toggled, refresh edit handlers after a short delay
            setTimeout(refreshAllLayerEditHandlers, 200);
          });
        }
      });
    }
  }, 1000);
});

// Function to submit the feature properties form
function submitFeatureProperties() {
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Cannot find feature properties form");
    return;
  }

  // Get form data
  const name = document.getElementById('name').value || 'Unnamed Feature';
  const type = document.getElementById('type').value || '';
  const description = document.getElementById('description').value || '';

  // Create properties object
  const properties = {
    name: name,
    type: type,
    description: description,
  };

  // Only proceed if we have an editing layer
  if (!editingLayer) {
    console.error("No active editing layer found");
    alert("Error: No feature selected for editing.");
    return;
  }

  // Store the current editingLayer to a local variable in case it changes during async operations
  const currentEditingLayer = editingLayer;

  // Update the feature properties
  if (!currentEditingLayer.feature) {
    currentEditingLayer.feature = {
      type: 'Feature',
      properties: properties,
      geometry: currentEditingLayer.toGeoJSON().geometry
    };
  } else {
    currentEditingLayer.feature.properties = properties;
  }

  // Update the layer style based on type if needed
  if (typeof updateLayerStyle === 'function') {
    updateLayerStyle(currentEditingLayer, type);
  }

  // If saving to server is needed
  const featureId = currentEditingLayer.feature.id || currentEditingLayer._leaflet_id;
}