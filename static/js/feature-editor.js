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

  // Get the feature ID
  const featureId = layer.feature.id;

  // Gather all form field values
  const form = document.getElementById('featurePropertiesForm');
  const formData = new FormData(form);

  // Ensure layer has a feature and properties object
  if (!layer.feature) {
    layer.feature = {};
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