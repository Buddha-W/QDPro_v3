
// UI Control Functions
document.addEventListener('DOMContentLoaded', function() {
    // Toggle layers panel
    const toggleLayersBtn = document.getElementById('toggle-layers-btn');
    const layersPanel = document.getElementById('layers-panel');
    
    if (toggleLayersBtn && layersPanel) {
        toggleLayersBtn.addEventListener('click', function() {
            layersPanel.classList.toggle('visible');
        });
    }
    
    // Handle dropdown z-index issues
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('mouseenter', function() {
            // Ensure dropdown content appears above all other elements
            const content = this.querySelector('.dropdown-content');
            if (content) {
                content.style.zIndex = '1050';
            }
        });
    });
    
    // Initialize tool buttons functionality
    setupToolButtons();
});

function setupToolButtons() {
    const drawPolygonBtn = document.getElementById('draw-polygon-btn');
    const editLayersBtn = document.getElementById('edit-layers-btn');
    const deleteLayersBtn = document.getElementById('delete-layers-btn');
    
    if (drawPolygonBtn) {
        drawPolygonBtn.addEventListener('click', function() {
            // If map and draw controls are available
            if (window.map && window.drawControl) {
                // Activate polygon drawing
                new L.Draw.Polygon(window.map).enable();
            }
        });
    }
    
    if (editLayersBtn) {
        editLayersBtn.addEventListener('click', function() {
            // If edit control exists
            if (window.editControl) {
                window.editControl.enable();
            }
        });
    }
    
    if (deleteLayersBtn) {
        deleteLayersBtn.addEventListener('click', function() {
            // If delete control exists
            if (window.deleteControl) {
                window.deleteControl.enable();
            } else if (window.map && window.drawnItems) {
                // Alternative: remove selected items
                const selectedLayers = [];
                window.drawnItems.eachLayer(function(layer) {
                    if (layer.selected) {
                        selectedLayers.push(layer);
                    }
                });
                
                selectedLayers.forEach(function(layer) {
                    window.drawnItems.removeLayer(layer);
                });
            }
        });
    }
}

// Update the layers list
function updateLayersList() {
    const layersList = document.getElementById('layers-list');
    if (!layersList || !window.drawnItems) return;
    
    // Clear current list
    layersList.innerHTML = '';
    
    // Add each layer to the list
    window.drawnItems.eachLayer(function(layer) {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        
        // Get name from properties or use default
        const name = layer.properties ? (layer.properties.name || 'Unnamed Layer') : 'Unnamed Layer';
        
        layerItem.innerHTML = `
            <input type="checkbox" checked>
            <span>${name}</span>
        `;
        
        const checkbox = layerItem.querySelector('input');
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (!window.map.hasLayer(layer)) {
                    window.drawnItems.addLayer(layer);
                }
            } else {
                window.drawnItems.removeLayer(layer);
            }
        });
        
        layerItem.addEventListener('click', function(e) {
            if (e.target !== checkbox) {
                // Select this layer
                window.drawnItems.eachLayer(l => {
                    l.selected = (l === layer);
                    if (l.selected && l.getBounds) {
                        window.map.fitBounds(l.getBounds());
                    }
                });
                
                // Update UI to show selection
                document.querySelectorAll('.layer-item').forEach(item => {
                    item.classList.remove('selected');
                });
                layerItem.classList.add('selected');
            }
        });
        
        layersList.appendChild(layerItem);
    });
}

// Expose functions to global scope
window.updateLayersList = updateLayersList;
