
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
            openFeaturePropertiesModal(this._source);
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
