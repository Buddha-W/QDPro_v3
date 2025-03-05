// Ensure popups can access their layers for editing features
function enhancePopups() {
  // Override the standard Leaflet popup creation to store layer reference
  const originalOnAdd = L.Popup.prototype.onAdd;
  L.Popup.prototype.onAdd = function(map) {
    // Call the original onAdd method
    originalOnAdd.call(this, map);

    // Store reference to source layer in the popup DOM element
    if (this._source) {
      this._container.__layer = this._source;
    }

    // Add click event listener for edit button after popup is added to the map
    setTimeout(() => {
      const editBtn = this._container.querySelector('.edit-properties-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          if (this._source) {
            openEditPopup(this._source);
          } else {
            console.error('Cannot find layer for editing');
          }
        });
      }
    }, 100);
  };
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', enhancePopups);

// Function to help open popup for a layer
function openPopupForLayer(layer) {
  if (!layer) return;

  const center = layer.getBounds ? layer.getBounds().getCenter() : layer.getLatLng();
  layer.openPopup(center);
}

// Updated openEditPopup function
function openEditPopup(layer) {
  console.log("Opening edit popup for layer:", layer);

  // Ensure the layer has a feature object
  if (!layer.feature) {
    layer.feature = {};
  }

  // Ensure the feature has a properties object
  if (!layer.feature.properties) {
    layer.feature.properties = {};
  }

  // Store reference to active layer being edited
  window.activeEditLayer = layer;

  // Get properties
  const properties = layer.feature.properties || {};

  // Set values for each field
  if (properties.name) document.getElementById('name').value = properties.name || '';
  if (document.getElementById('is_facility')) document.getElementById('is_facility').checked = !!properties.is_facility;
  if (document.getElementById('has_explosive')) document.getElementById('has_explosive').checked = !!properties.has_explosive;
  if (properties.net_explosive_weight) document.getElementById('net_explosive_weight').value = properties.net_explosive_weight || '';
  if (properties.type) document.getElementById('facilityType').value = properties.type || '';
  if (properties.description) document.getElementById('description').value = properties.description || '';

  // Show/hide the NEW field based on has_explosive checkbox
  const showNewSection = properties.has_explosive;
  if (document.getElementById('newSection')) {
    document.getElementById('newSection').style.display = showNewSection ? 'block' : 'none';
  }

  // Show the modal
  document.getElementById('featurePropertiesModal').style.display = 'block';

  // Setup event listener for the has_explosive checkbox
  document.getElementById('has_explosive').addEventListener('change', function() {
    document.getElementById('newSection').style.display = this.checked ? 'block' : 'none';
  });
}