
function initFeatureEditor() {
  // Add event listener for the feature properties form
  document.addEventListener('submit', function(e) {
    if (e.target.id === 'featurePropertiesForm' && window.activeEditLayer) {
      handleFeatureFormSubmit(e, window.activeEditLayer);
    }
  });
  
  // Add event listener for has_explosive checkbox
  document.addEventListener('change', function(e) {
    if (e.target.id === 'has_explosive') {
      const newSection = document.getElementById('newSection');
      if (newSection) {
        newSection.style.display = e.target.checked ? 'block' : 'none';
      }
    }
  });
}

function handleFeatureFormSubmit(e, layer) {
  e.preventDefault();
  
  // Ensure the layer has a feature and properties objects
  if (!layer.feature) {
    layer.feature = {};
  }
  if (!layer.feature.properties) {
    layer.feature.properties = {};
  }
  
  // Get form values
  const name = document.getElementById('name').value;
  const isFacility = document.getElementById('is_facility').checked;
  const hasExplosive = document.getElementById('has_explosive').checked;
  const netExplosiveWeight = document.getElementById('net_explosive_weight').value;
  const type = document.getElementById('facilityType').value;
  const description = document.getElementById('description').value;
  
  // Update the feature properties
  layer.feature.properties.name = name;
  layer.feature.properties.is_facility = isFacility;
  layer.feature.properties.has_explosive = hasExplosive;
  layer.feature.properties.net_explosive_weight = netExplosiveWeight;
  layer.feature.properties.type = type;
  layer.feature.properties.description = description;
  
  // Update popup content
  const popupContent = createPopupContent(layer.feature.properties);
  layer.setPopupContent(popupContent);
  
  // Update layer style based on type
  updateLayerStyle(layer, type);
  
  // Close the modal
  const modal = document.querySelector('.feature-edit-modal');
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }
  
  console.log("Feature properties updated:", layer.feature.properties);
}

function openFeaturePropertiesModal(layer) {
  console.log("Opening feature properties modal for", layer);
  
  // Ensure the layer has a feature and properties objects
  if (!layer.feature) {
    layer.feature = {};
  }
  if (!layer.feature.properties) {
    layer.feature.properties = {};
  }
  
  // Get properties
  const properties = layer.feature.properties;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'feature-edit-modal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.zIndex = '1000';
  modal.style.backgroundColor = 'white';
  modal.style.padding = '20px';
  modal.style.borderRadius = '5px';
  modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
  modal.style.maxWidth = '400px';
  modal.style.width = '90%';
  modal.style.maxHeight = '80vh';
  modal.style.overflow = 'auto';
  
  // Create form
  const form = document.createElement('form');
  form.id = 'featurePropertiesForm';
  
  form.innerHTML = `
    <h3>Edit Feature Properties</h3>
    <div style="margin-bottom: 10px;">
      <label for="name">Name:</label>
      <input type="text" id="name" style="width: 100%; padding: 5px;" value="${properties.name || ''}">
    </div>
    <div style="margin-bottom: 10px;">
      <label>
        <input type="checkbox" id="is_facility" ${properties.is_facility ? 'checked' : ''}>
        Is Facility
      </label>
    </div>
    <div style="margin-bottom: 10px;">
      <label>
        <input type="checkbox" id="has_explosive" ${properties.has_explosive ? 'checked' : ''}>
        Contains Explosives
      </label>
    </div>
    <div id="newSection" style="margin-bottom: 10px; display: ${properties.has_explosive ? 'block' : 'none'};">
      <label for="net_explosive_weight">Net Explosive Weight (lbs):</label>
      <input type="number" id="net_explosive_weight" style="width: 100%; padding: 5px;" value="${properties.net_explosive_weight || ''}">
    </div>
    <div style="margin-bottom: 10px;">
      <label for="facilityType">Facility Type:</label>
      <select id="facilityType" style="width: 100%; padding: 5px;">
        <option value="Bunker" ${properties.type === 'Bunker' ? 'selected' : ''}>Bunker</option>
        <option value="Open Storage" ${properties.type === 'Open Storage' ? 'selected' : ''}>Open Storage</option>
        <option value="Processing" ${properties.type === 'Processing' ? 'selected' : ''}>Processing</option>
        <option value="Admin" ${properties.type === 'Admin' ? 'selected' : ''}>Admin</option>
        <option value="Housing" ${properties.type === 'Housing' ? 'selected' : ''}>Housing</option>
      </select>
    </div>
    <div style="margin-bottom: 10px;">
      <label for="description">Description:</label>
      <textarea id="description" style="width: 100%; padding: 5px; height: 80px;">${properties.description || ''}</textarea>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <button type="button" id="cancelPropertiesBtn" style="padding: 8px 15px;">Cancel</button>
      <button type="submit" style="padding: 8px 15px; background-color: #4CAF50; color: white; border: none;">Save</button>
    </div>
  `;
  
  modal.appendChild(form);
  document.body.appendChild(modal);
  
  // Setup event listeners
  document.getElementById('has_explosive').addEventListener('change', function() {
    document.getElementById('newSection').style.display = this.checked ? 'block' : 'none';
  });
  
  document.getElementById('cancelPropertiesBtn').addEventListener('click', function() {
    document.body.removeChild(modal);
  });
  
  // Store reference to active layer being edited
  window.activeEditLayer = layer;
}

function createPopupContent(properties) {
  const displayName = properties.name || 'Unnamed Feature';
  const type = properties.type || 'Unknown';
  const description = properties.description || 'N/A';
  const hasExplosive = properties.has_explosive || false;
  const netExplosiveWeight = properties.net_explosive_weight;
  
  return `
    <div>
      <h3>${displayName}</h3>
      <p>Type: ${type}</p>
      ${netExplosiveWeight ? `<p>NEW: ${netExplosiveWeight} lbs</p>` : ''}
      <p>Description: ${description}</p>
      <p>Contains Explosives: ${hasExplosive ? 'Yes' : 'No'}</p>
      <button class="edit-properties-btn">Edit Properties</button>
    </div>
  `;
}

function updateLayerStyle(layer, type) {
  if (!layer) return;
  
  let style = {};
  
  switch(type) {
    case 'Bunker':
      style = { color: '#8B4513', weight: 2, fillColor: '#CD853F', fillOpacity: 0.5 };
      break;
    case 'Open Storage':
      style = { color: '#FF8C00', weight: 2, fillColor: '#FFA500', fillOpacity: 0.5 };
      break;
    case 'Processing':
      style = { color: '#6B8E23', weight: 2, fillColor: '#9ACD32', fillOpacity: 0.5 };
      break;
    case 'Admin':
      style = { color: '#4682B4', weight: 2, fillColor: '#87CEEB', fillOpacity: 0.5 };
      break;
    case 'Housing':
      style = { color: '#8B008B', weight: 2, fillColor: '#DA70D6', fillOpacity: 0.5 };
      break;
    default:
      style = { color: '#696969', weight: 2, fillColor: '#A9A9A9', fillOpacity: 0.5 };
  }
  
  layer.setStyle(style);
}

// Call init when DOM is loaded
document.addEventListener('DOMContentLoaded', initFeatureEditor);
