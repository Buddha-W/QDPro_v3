
// Popup handler for QDPro
// This file handles property popups for map features

// Function to create a popup for editing facility properties
function createFeaturePropertiesPopup(feature) {
  const properties = feature.properties || {};
  
  // Create popup content with form
  let html = `
    <div id="featurePropertiesPopup">
      <h3>Edit Feature Properties</h3>
      <form id="featurePropertiesForm">
        <div>
          <label for="name">Display Name:</label>
          <input type="text" id="name" name="name" value="${properties.name || ''}" style="width: 100%;">
        </div>
        <div style="margin-top: 10px;">
          <label>
            <input type="checkbox" id="is_facility" name="is_facility" ${properties.is_facility ? 'checked' : ''}>
            Facility
          </label>
        </div>
        <div style="margin-top: 10px;">
          <label>
            <input type="checkbox" id="has_explosive" name="has_explosive" ${properties.has_explosive ? 'checked' : ''}>
            Contains Explosives (NEW)
          </label>
        </div>
        <div id="newSection" style="margin-top: 10px; display: ${properties.has_explosive ? 'block' : 'none'};">
          <label for="net_explosive_weight">Net Explosive Weight (lb):</label>
          <input type="number" id="net_explosive_weight" name="net_explosive_weight" value="${properties.net_explosive_weight || ''}" min="0" style="width: 100%;">
        </div>
        <div style="margin-top: 10px;">
          <label for="type">Facility Type:</label>
          <select id="type" name="type" style="width: 100%;">
            <option value="Facility" ${properties.type === 'Facility' ? 'selected' : ''}>Facility</option>
            <option value="Storage" ${properties.type === 'Storage' ? 'selected' : ''}>Storage</option>
            <option value="Administrative" ${properties.type === 'Administrative' ? 'selected' : ''}>Administrative</option>
            <option value="Other" ${properties.type === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div style="margin-top: 10px;">
          <label for="description">Description:</label>
          <textarea id="description" name="description" style="width: 100%; height: 60px;">${properties.description || ''}</textarea>
        </div>
        <div style="margin-top: 15px; text-align: right;">
          <button type="submit" class="popup-save-btn">Save</button>
          <button type="button" class="popup-cancel-btn" onclick="closeFeaturePopup()">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  return html;
}

// Function to close the feature popup
function closeFeaturePopup() {
  if (window.activePopup) {
    window.activePopup.close();
    window.activePopup = null;
  }
}

// Function to save feature properties from popup form
function saveFeatureProperties(form, layer) {
  // Get form data
  const formData = new FormData(form);
  const properties = { ...layer.feature.properties } || {};
  
  // Update properties from form
  properties.name = formData.get('name') || '';
  properties.is_facility = form.querySelector('#is_facility').checked;
  properties.has_explosive = form.querySelector('#has_explosive').checked;
  properties.type = formData.get('type') || 'Facility';
  properties.description = formData.get('description') || '';
  
  // Only set NEW if the checkbox is checked
  if (properties.has_explosive) {
    const newValue = formData.get('net_explosive_weight');
    properties.net_explosive_weight = newValue ? parseFloat(newValue) : 0;
  } else {
    properties.net_explosive_weight = 0;
  }
  
  // Update layer properties
  if (!layer.feature) {
    layer.feature = { properties: {} };
  }
  layer.feature.properties = properties;
  
  // Update popup content
  if (layer.getPopup()) {
    layer.setPopupContent(createPopupContent(properties));
  }
  
  // Try to save to server if function exists
  if (typeof saveFeatureToServer === 'function') {
    saveFeatureToServer(layer.feature);
  }
  
  // Close popup
  closeFeaturePopup();
  
  return properties;
}

// Function to create popup content for viewing
function createPopupContent(properties) {
  let content = `<div class="feature-popup">`;
  
  if (properties.name) {
    content += `<h4>${properties.name}</h4>`;
  }
  
  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }
  
  if (properties.has_explosive && properties.net_explosive_weight) {
    content += `<p><strong>Net Explosive Weight:</strong> ${properties.net_explosive_weight} lbs</p>`;
  }
  
  if (properties.description) {
    content += `<p>${properties.description}</p>`;
  }
  
  content += `<button class="popup-edit-btn" onclick="editFeature(this)">Edit Properties</button>`;
  content += `</div>`;
  
  return content;
}

// Function to edit a feature from popup
function editFeature(button) {
  const popup = button.closest('.leaflet-popup');
  const layer = popup.__layer || window.QDPro.currentEditLayer;
  
  if (!layer) {
    console.error('Cannot find layer for editing');
    return;
  }
  
  // Store reference to active layer being edited
  window.QDPro.currentEditLayer = layer;
  
  // Replace popup content with edit form
  const popupContent = createFeaturePropertiesPopup(layer.feature || { properties: {} });
  layer.setPopupContent(popupContent);
  
  // Add event listeners
  setTimeout(() => {
    const form = document.getElementById('featurePropertiesForm');
    if (form) {
      // Toggle NET section visibility
      const hasExplosiveCheckbox = document.getElementById('has_explosive');
      const newSection = document.getElementById('newSection');
      
      if (hasExplosiveCheckbox && newSection) {
        hasExplosiveCheckbox.addEventListener('change', function() {
          newSection.style.display = this.checked ? 'block' : 'none';
        });
      }
      
      // Handle form submission
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveFeatureProperties(form, layer);
      });
    }
  }, 100);
}

// Function to initialize popup for a layer
function initializeLayerPopup(layer) {
  if (!layer.feature) {
    layer.feature = { properties: {} };
  }
  
  const properties = layer.feature.properties;
  const popupContent = createPopupContent(properties);
  
  layer.bindPopup(popupContent);
  
  // Store layer reference in the popup for later access
  layer.on('popupopen', function(e) {
    e.popup.__layer = layer;
    window.activePopup = e.popup;
  });
}

// Helper function to save feature to server
function saveFeatureToServer(feature) {
  if (!feature || !feature.id) {
    console.warn('Cannot save feature without ID');
    return Promise.resolve(false);
  }
  
  return fetch('/api/update-feature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      feature_id: feature.id,
      properties: feature.properties
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      console.log('Feature saved successfully');
      return true;
    } else {
      console.error('Error saving feature:', data.error);
      return false;
    }
  })
  .catch(error => {
    console.error('Error saving feature:', error);
    return false;
  });
}
