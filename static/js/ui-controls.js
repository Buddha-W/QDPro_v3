
// UI Control Functions
// Function to update location display
function updateLocationDisplay(locationName) {
    const displayElement = document.getElementById('current-location-display');
    if (displayElement) {
        displayElement.textContent = `Location: ${locationName || 'None'}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Update location from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    const locationParam = urlParams.get('location');
    if (locationParam) {
        updateLocationDisplay(locationParam);
    }
    
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
            } else if (window.map && window.drawnItems) {
                // Create edit control if it doesn't exist
                const editOptions = {
                    featureGroup: window.drawnItems,
                    edit: {
                        selectedPathOptions: {
                            maintainColor: true,
                            opacity: 0.8
                        }
                    }
                };
                
                window.editControl = new L.EditToolbar.Edit(window.map, editOptions);
                window.editControl.enable();
            } else {
                console.warn('Map or drawn items not initialized for edit operation');
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
/**
 * UI Controls for QDPro application
 * Handles user interface interactions, toolbar functionality,
 * and layer management
 */

// Document ready handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('UI Controls initialized');
    
    // Handle window resize
    window.addEventListener('resize', function() {
        adjustUILayout();
    });
    
    // Initial UI adjustment
    adjustUILayout();
});

/**
 * Adjusts UI layout based on window size
 */
function adjustUILayout() {
    const windowHeight = window.innerHeight;
    const menuBarHeight = document.querySelector('.menu-bar').offsetHeight;
    const toolbarHeight = document.querySelector('.toolbar').offsetHeight;
    const statusBarHeight = document.querySelector('.status-bar')?.offsetHeight || 0;
    
    // Adjust map container height
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.style.height = `${windowHeight - menuBarHeight - toolbarHeight - statusBarHeight}px`;
        mapContainer.style.top = `${menuBarHeight + toolbarHeight}px`;
    }
    
    // Adjust layers panel height
    const layersPanel = document.querySelector('.layers-panel');
    if (layersPanel) {
        layersPanel.style.top = `${menuBarHeight + toolbarHeight}px`;
        layersPanel.style.height = `${windowHeight - menuBarHeight - toolbarHeight - statusBarHeight}px`;
    }
}

/**
 * Resets active tool buttons
 */
function resetActiveTools() {
    document.querySelectorAll('.tool-button').forEach(button => {
        button.classList.remove('active');
    });
}

/**
 * Shows notification to user
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set message and type
    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
