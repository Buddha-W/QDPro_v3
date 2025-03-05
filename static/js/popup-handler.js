
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
  };
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', enhancePopups);
