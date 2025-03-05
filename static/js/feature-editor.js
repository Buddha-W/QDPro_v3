// Feature editor functions
async function saveFeatureProperties(featureId, properties) {
  try {
    const response = await fetch('/api/update-feature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        feature_id: featureId,
        properties: properties
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Feature properties saved:', data);
      return true;
    } else {
      console.error('Error saving feature properties:', data);
      return false;
    }
  } catch (error) {
    console.error('Error saving feature properties:', error);
    return false;
  }
}

// Function to handle form submission when editing feature properties
function handleFeatureFormSubmit(e, layer) {
  e.preventDefault();
  console.log("Form submitted for layer:", layer);

  // Get the form data
  const form = document.getElementById('featurePropertiesForm');
  const formData = new FormData(form);

  // Ensure layer has a feature and properties object
  if (!layer.feature) {
    layer.feature = { type: "Feature" };
  }
  if (!layer.feature.properties) {
    layer.feature.properties = {};
  }

  // Update the feature properties
  const properties = { ...layer.feature.properties };

  // Handle checkbox fields separately (they won't be in formData if unchecked)
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    properties[checkbox.id] = checkbox.checked;
  });

  // Add all other form fields
  for (let [key, value] of formData.entries()) {
    properties[key] = value;
  }

  // Ensure NET value is properly handled
  if (properties.has_explosive && formData.get('net_explosive_weight')) {
    properties.net_explosive_weight = parseFloat(formData.get('net_explosive_weight'));
  }

  // Update the layer's feature properties
  layer.feature.properties = properties;

  // Get the feature ID or generate one if not exists
  const featureId = properties.id || generateUniqueId();
  properties.id = featureId;

  console.log("Saving properties:", properties);

  // Save to server
  saveFeatureProperties(featureId, properties)
    .then(success => {
      if (success) {
        // Close the modal
        const modal = document.getElementById('featurePropertiesModal');
        if (modal) {
          modal.style.display = 'none';
          console.log("Modal closed");
        } else {
          console.error("Modal element not found when closing");
        }

        // Update the popup content if needed
        if (layer.getPopup()) {
          layer.setPopupContent(createPopupContent(properties));
        }

        // If it's a facility with NEW value, maybe update styling
        if (properties.type === 'Facility' && properties.new) {
          updateLayerStyle(layer, 'Facility');
        }
      } else {
        alert('Failed to save feature properties. Please try again.');
      }
    });
}

// Initialize feature editor event listeners
function initFeatureEditor() {
  // Add event listener for the feature properties form
  document.addEventListener('submit', function(e) {
    if (e.target.id === 'featurePropertiesForm' && window.activeEditLayer) {
      handleFeatureFormSubmit(e, window.activeEditLayer);
    }
  });
}

function openFeaturePropertiesModal(layer) {
  console.log("Opening feature properties modal for", layer);
}

// Call init when DOM is loaded
document.addEventListener('DOMContentLoaded', initFeatureEditor);

function generateUniqueId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Placeholder functions -  replace with your actual implementations
function createPopupContent(properties) {
  // Implement your popup content generation logic here.  This should return HTML.
  return "<p>Popup Content</p>";
}

function updateLayerStyle(layer, type) {
  // Implement your layer styling update logic here
  console.log("Updating style for layer:", layer, "type:", type);
}