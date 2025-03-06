
// Feature Editor for QDPro
// Provides functionality for editing feature properties

let editingLayer = null;

// Function to open feature editor for a specific layer
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);

  // Store the active layer
  editingLayer = layer;
  window.activeEditLayer = layer;

  // Get existing properties or initialize empty object
  const properties = layer.feature ? layer.feature.properties || {} : {};
  
  // Create and show the feature properties modal directly on the map
  showFeaturePropertiesModal(properties, layer);
}

// Create and display feature properties modal
function showFeaturePropertiesModal(properties, layer) {
  // Create modal if it doesn't exist, or reset if it does
  let modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'featurePropertiesModal';
    modal.className = 'feature-properties-modal';
    document.body.appendChild(modal);
  }
  
  // Position the modal (adjust as needed)
  if (layer && layer.getCenter) {
    const center = layer.getCenter();
    const point = window.map.latLngToContainerPoint(center);
    modal.style.left = (point.x + 20) + 'px'; // Offset to not cover feature
    modal.style.top = (point.y - 100) + 'px';
  } else {
    // Default position in the center of the screen
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
  }

  // Create form content
  modal.innerHTML = `
    <div class="modal-header">
      <h3>Edit Properties</h3>
      <button id="closeFeaturePropertiesBtn" type="button" class="close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="featurePropertiesForm">
        <div class="form-group">
          <label for="name">Name:</label>
          <input type="text" id="name" name="name" value="${properties.name || ''}">
        </div>
        <div class="form-group">
          <label for="type">Type:</label>
          <select id="type" name="type">
            <option value="Facility" ${properties.type === 'Facility' ? 'selected' : ''}>Facility</option>
            <option value="Bunker" ${properties.type === 'Bunker' ? 'selected' : ''}>Bunker</option>
            <option value="Magazine" ${properties.type === 'Magazine' ? 'selected' : ''}>Magazine</option>
            <option value="Barricade" ${properties.type === 'Barricade' ? 'selected' : ''}>Barricade</option>
            <option value="Boundary" ${properties.type === 'Boundary' ? 'selected' : ''}>Boundary</option>
          </select>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="is_facility" name="is_facility" ${properties.is_facility ? 'checked' : ''}>
            Is Facility
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="has_explosive" name="has_explosive" ${properties.has_explosive ? 'checked' : ''}>
            Contains Explosives
          </label>
        </div>
        <div id="newSection" class="form-group" style="display: ${properties.has_explosive ? 'block' : 'none'};">
          <label for="net_explosive_weight">Net Explosive Weight:</label>
          <input type="number" id="net_explosive_weight" name="net_explosive_weight" value="${properties.net_explosive_weight || 0}" min="0">
          
          <label for="hazard_division">Hazard Division:</label>
          <select id="hazard_division" name="hazard_division" ${!properties.has_explosive ? 'disabled' : ''}>
            <option value="1.1" ${properties.hazard_division === '1.1' ? 'selected' : ''}>1.1</option>
            <option value="1.2" ${properties.hazard_division === '1.2' ? 'selected' : ''}>1.2</option>
            <option value="1.3" ${properties.hazard_division === '1.3' ? 'selected' : ''}>1.3</option>
            <option value="1.4" ${properties.hazard_division === '1.4' ? 'selected' : ''}>1.4</option>
          </select>
          
          <label for="unit">Unit:</label>
          <select id="unit" name="unit" ${!properties.has_explosive ? 'disabled' : ''}>
            <option value="kg" ${properties.unit === 'kg' ? 'selected' : ''}>kg</option>
            <option value="lbs" ${(properties.unit === 'lbs' || !properties.unit) ? 'selected' : ''}>lbs</option>
          </select>
        </div>
        <div class="form-group">
          <label for="description">Description:</label>
          <textarea id="description" name="description">${properties.description || ''}</textarea>
        </div>
        <div class="button-group">
          <button type="button" id="saveFeaturePropertiesBtn" class="save-btn">Save</button>
        </div>
      </form>
    </div>
  `;

  // Show the modal
  modal.style.display = 'block';
  
  // Set up event listeners after rendering
  setTimeout(() => {
    // Set up has_explosive checkbox to toggle NEW section
    const hasExplosiveCheckbox = document.getElementById('has_explosive');
    const newSection = document.getElementById('newSection');
    const hazardDivisionSelect = document.getElementById('hazard_division');
    const unitSelect = document.getElementById('unit');
    
    if (hasExplosiveCheckbox && newSection) {
      hasExplosiveCheckbox.addEventListener('change', function() {
        newSection.style.display = this.checked ? 'block' : 'none';
        hazardDivisionSelect.disabled = !this.checked;
        unitSelect.disabled = !this.checked;
      });
    }
    
    // Set up close button
    const closeBtn = document.getElementById('closeFeaturePropertiesBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeFeaturePropertiesModal);
    }
    
    // Set up save button
    const saveBtn = document.getElementById('saveFeaturePropertiesBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        saveFeatureProperties();
      });
    }
  }, 10);
}

// Save feature properties
function saveFeatureProperties() {
  if (!editingLayer || !editingLayer.feature) {
    console.error('No layer currently being edited');
    return;
  }
  
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error('Feature properties form not found');
    return;
  }
  
  // Get form data
  const formData = new FormData(form);
  
  // Update layer properties
  if (!editingLayer.feature.properties) {
    editingLayer.feature.properties = {};
  }
  
  const properties = editingLayer.feature.properties;
  
  // Set basic properties
  properties.name = formData.get('name') || '';
  properties.type = formData.get('type') || 'Facility';
  properties.description = formData.get('description') || '';
  properties.is_facility = document.getElementById('is_facility').checked;
  properties.has_explosive = document.getElementById('has_explosive').checked;
  
  // Handle explosive properties
  if (properties.has_explosive) {
    const newValue = formData.get('net_explosive_weight');
    properties.net_explosive_weight = newValue ? parseFloat(newValue) : 0;
    properties.hazard_division = formData.get('hazard_division');
    properties.unit = formData.get('unit') || 'lbs';
  } else {
    properties.net_explosive_weight = 0;
    delete properties.hazard_division;
    delete properties.unit;
  }
  
  // Update layer popup if it has one
  if (editingLayer.getPopup && typeof editingLayer.getPopup === 'function') {
    const popup = editingLayer.getPopup();
    if (popup) {
      // Create updated popup content using the popup-handler.js function if available
      let content = '';
      if (typeof window.createPopupContent === 'function') {
        content = window.createPopupContent(properties);
      } else {
        content = createBasicPopupContent(properties);
      }
      
      popup.setContent(content);
      popup.update();
    }
  }
  
  // Store layer ID in properties for later reference
  properties.id = properties.id || editingLayer._leaflet_id;
  
  console.log("Feature properties saved:", properties);
  
  // Try to save to server if function exists
  if (typeof saveFeatureToServer === 'function') {
    saveFeatureToServer(editingLayer.feature);
  }
  
  // Close modal
  closeFeaturePropertiesModal();
}

// Create basic popup content as fallback
function createBasicPopupContent(properties) {
  let content = `<div class="feature-popup">`;
  
  if (properties.name) {
    content += `<h4>${properties.name}</h4>`;
  }
  
  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }
  
  if (properties.has_explosive && properties.net_explosive_weight) {
    content += `<p><strong>NEW:</strong> ${properties.net_explosive_weight} ${properties.unit || 'lbs'}</p>`;
    if (properties.hazard_division) {
      content += `<p><strong>HD:</strong> ${properties.hazard_division}</p>`;
    }
  }
  
  if (properties.description) {
    content += `<p>${properties.description}</p>`;
  }
  
  content += `<button class="popup-edit-btn" onclick="openFeatureEditor(this.closest('.leaflet-popup')._source)">Edit Properties</button>`;
  content += `</div>`;
  
  return content;
}

// Close the feature properties modal
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Reset editing state
  window.activeEditLayer = null;
  editingLayer = null;
}

// Initialize click handlers for map layers
function initFeatureEditor() {
  if (!window.map) {
    console.error('Map not initialized for feature editor');
    return;
  }
  
  // Add map click handler to close popup when clicking elsewhere
  window.map.on('click', function(e) {
    // Only close if we're not clicking on a layer or the modal itself
    if (!e.originalEvent.target.closest('.leaflet-interactive') && 
        !e.originalEvent.target.closest('#featurePropertiesModal')) {
      closeFeaturePropertiesModal();
    }
  });
  
  // Add global document click handler for clicks outside map
  document.addEventListener('click', function(e) {
    // Don't close if clicking on map, modal, or leaflet elements
    if (e.target.closest('.leaflet-container') || 
        e.target.closest('#featurePropertiesModal') ||
        e.target.closest('.leaflet-marker-icon') || 
        e.target.closest('.leaflet-interactive')) {
      return;
    }
    
    closeFeaturePropertiesModal();
  });
}

// Add CSS for modal styling
function addModalStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .feature-properties-modal {
      position: absolute;
      z-index: 1000;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      width: 300px;
      display: none;
    }
    
    .modal-header {
      padding: 10px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-body {
      padding: 10px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }
    
    .form-group {
      margin-bottom: 10px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 5px;
    }
    
    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 5px;
      border: 1px solid #ddd;
      border-radius: 3px;
    }
    
    .form-group textarea {
      height: 60px;
    }
    
    .button-group {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
    
    .save-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
    }
    
    .save-btn:hover {
      background: #45a049;
    }
  `;
  document.head.appendChild(styleElement);
}

// Initialize everything when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialized");
  
  // Add modal styles
  addModalStyles();
  
  // Setup feature editor after a short delay to ensure map is loaded
  setTimeout(initFeatureEditor, 500);
});
