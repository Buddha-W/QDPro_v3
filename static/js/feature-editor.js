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
    return data.status === 'success';
  } catch (error) {
    console.warn("Local feature only, will be used for analysis", error);
    return false; // Indicate failure for server errors
  }
}

// Function to add click handlers to layers for editing
function addLayerClickHandlers(layer) {
  if (!layer) return;

  // Add a simple popup if none exists
  if (layer.bindPopup && !layer.getPopup()) {
    let properties = layer.feature ? layer.feature.properties || {} : {};
    let content = `<div>
      <h4>${properties.name || 'Unnamed Feature'}</h4>
      <button onclick="openFeatureEditor(this._layer)">Edit Properties</button>
    </div>`;

    layer.bindPopup(content);

    // Store reference to the layer in the button when popup opens
    layer.on('popupopen', function(e) {
      setTimeout(() => {
        const buttons = document.querySelectorAll('.leaflet-popup button');
        buttons.forEach(button => {
          button._layer = layer;
        });
      }, 10);
    });
  }

  // Add a click handler for the layer itself
  layer.on('click', function(e) {
    // Store the clicked layer for potential editing
    window.lastClickedLayer = layer;
  });
}