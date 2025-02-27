// UI Control Functions
// Function to update location display
function updateLocationDisplay(locationName) {
    const displayElement = document.getElementById('current-location-display');

// Ensure that Leaflet Draw toolbars don't appear
window.addEventListener('DOMContentLoaded', function() {
    // Override Leaflet.Draw handlers to prevent additional toolbars/buttons
    if (L && L.Draw) {
        // Override the enable methods for all draw handlers to prevent buttons
        const drawHandlers = ['Polygon', 'Rectangle', 'Marker', 'Circle', 'CircleMarker', 'Polyline'];
        
        drawHandlers.forEach(function(handlerType) {
            if (L.Draw[handlerType]) {
                // Save the original enable method
                const originalEnable = L.Draw[handlerType].prototype.enable;
                
                // Override the enable method
                L.Draw[handlerType].prototype.enable = function() {
                    // Call the original method
                    originalEnable.call(this);
                    
                    // Remove any toolbar buttons that might have been added
                    if (this._map && this._map._container) {
                        const buttons = this._map._container.querySelectorAll('.leaflet-draw-draw-polygon, .leaflet-draw-draw-rectangle, .leaflet-draw-draw-marker');
                        buttons.forEach(function(button) {
                            if (button.parentNode) {
                                button.parentNode.removeChild(button);
                            }
                        });
                    }
                };
            }
        });
        
        // Prevent any toolbars from being added
        if (L.Draw.Control) {
            const originalAddToolbar = L.Draw.Control.prototype._addToolbar;
            L.Draw.Control.prototype._addToolbar = function() {
                // Don't call the original method
                return;
            };
        }
    }
});

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

    // Add a map click handler to cancel drawing when clicking on the map with no tool active
    if (window.map) {
        window.map.on('click', function(e) {
            // This will only fire if the click wasn't handled by another handler
            // (like drawing tools), effectively cancelling drawing mode on map click
            if (window.activeDrawHandler || 
                (window.editControl && window.editControl.enabled()) || 
                (window.deleteHandler && window.deleteHandler.enabled())) {
                // Cancel active tools on map click
                const toolButtons = document.querySelectorAll('.tool-button');
                toolButtons.forEach(btn => btn.classList.remove('active'));

                if (window.activeDrawHandler) {
                    window.activeDrawHandler.disable();
                    window.activeDrawHandler = null;
                }
                if (window.editControl && window.editControl.enabled()) {
                    window.editControl.disable();
                }
                if (window.deleteHandler && window.deleteHandler.enabled()) {
                    window.deleteHandler.disable();
                }
            }
        });
    }
});

function setupToolButtons() {
    const drawPolygonBtn = document.getElementById('draw-polygon-btn');
    const drawRectangleBtn = document.getElementById('draw-rectangle-btn');
    const drawMarkerBtn = document.getElementById('draw-marker-btn');
    const editLayersBtn = document.getElementById('edit-layers-btn');
    const deleteLayersBtn = document.getElementById('delete-layers-btn');

    // Helper function to disable all active tools
    function disableAllTools() {
        // Deactivate all buttons
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(btn => btn.classList.remove('active'));

        // Disable active draw handler if any
        if (window.activeDrawHandler) {
            window.activeDrawHandler.disable();
            window.activeDrawHandler = null;
        }

        // Disable edit control if active
        if (window.editControl && window.editControl.enabled()) {
            window.editControl.disable();
        }

        // Disable delete handler if active
        if (window.deleteHandler && window.deleteHandler.enabled()) {
            window.deleteHandler.disable();
        }
    }

    // Setup polygon drawing
    if (drawPolygonBtn) {
        drawPolygonBtn.addEventListener('click', function() {
            // If this button is already active, disable it
            if (this.classList.contains('active')) {
                disableAllTools();
                return;
            }

            // Otherwise, disable other tools and enable this one
            disableAllTools();

            // Activate this button
            this.classList.add('active');

            // Enable polygon drawing
            if (window.map) {
                window.activeDrawHandler = new L.Draw.Polygon(window.map, {
                    showDrawingTools: false,
                    shapeOptions: {
                        showAttribution: false
                    }
                });
                
                // Prevent the Leaflet Draw toolbar from appearing
                if (window.activeDrawHandler._map && window.activeDrawHandler._map._toolbars) {
                    window.activeDrawHandler._map._toolbars = {};
                }
                
                window.activeDrawHandler.enable();
            }
        });
    }

    // Setup rectangle drawing
    if (drawRectangleBtn) {
        drawRectangleBtn.addEventListener('click', function() {
            // If this button is already active, disable it
            if (this.classList.contains('active')) {
                disableAllTools();
                return;
            }

            // Otherwise, disable other tools and enable this one
            disableAllTools();

            // Activate this button
            this.classList.add('active');

            // Enable rectangle drawing
            if (window.map) {
                window.activeDrawHandler = new L.Draw.Rectangle(window.map, {
                    showDrawingTools: false,
                    shapeOptions: {
                        showAttribution: false
                    }
                });
                
                // Prevent the Leaflet Draw toolbar from appearing
                if (window.activeDrawHandler._map && window.activeDrawHandler._map._toolbars) {
                    window.activeDrawHandler._map._toolbars = {};
                }
                
                window.activeDrawHandler.enable();
            }
        });
    }

    // Setup marker drawing
    if (drawMarkerBtn) {
        drawMarkerBtn.addEventListener('click', function() {
            // If this button is already active, disable it
            if (this.classList.contains('active')) {
                disableAllTools();
                return;
            }

            // Otherwise, disable other tools and enable this one
            disableAllTools();

            // Activate this button
            this.classList.add('active');

            // Enable marker drawing
            if (window.map) {
                window.activeDrawHandler = new L.Draw.Marker(window.map, {
                    showDrawingTools: false,
                    icon: L.icon({
                        iconUrl: window.markerIconUrl || 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41]
                    })
                });
                
                // Prevent the Leaflet Draw toolbar from appearing
                if (window.activeDrawHandler._map && window.activeDrawHandler._map._toolbars) {
                    window.activeDrawHandler._map._toolbars = {};
                }
                
                window.activeDrawHandler.enable();
            }
        });
    }

    // Setup edit layers
    if (editLayersBtn) {
        editLayersBtn.addEventListener('click', function() {
            // If this button is already active, disable it
            if (this.classList.contains('active')) {
                disableAllTools();
                return;
            }

            // Otherwise, disable other tools and enable this one
            disableAllTools();

            // Activate this button
            this.classList.add('active');

            // Enable edit mode
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
                    },
                    showDrawingTools: false
                };

                window.editControl = new L.EditToolbar.Edit(window.map, editOptions);
                window.editControl.enable();
            } else {
                console.warn('Map or drawn items not initialized for edit operation');
            }
        });
    }

    // Setup delete layers
    if (deleteLayersBtn) {
        deleteLayersBtn.addEventListener('click', function() {
            // If this button is already active, disable it
            if (this.classList.contains('active')) {
                disableAllTools();
                return;
            }

            // Otherwise, disable other tools and enable this one
            disableAllTools();

            // Activate this button
            this.classList.add('active');

            // Enable delete mode
            if (window.deleteControl) {
                window.deleteControl.enable();
            } else if (window.map && window.drawnItems) {
                // Alternative: enable a custom delete handler
                window.deleteHandler = {
                    enabled: function() { return true; },
                    disable: function() {
                        // Custom cleanup if needed
                        window.deleteHandler = null;
                    }
                };

                // Set up map to select layers for deletion
                window.map.once('click', function() {
                    // This will handle deletion on next map click
                    const selectedLayers = [];
                    if (window.drawnItems) {
                        window.drawnItems.eachLayer(function(layer) {
                            if (layer.selected) {
                                selectedLayers.push(layer);
                            }
                        });

                        selectedLayers.forEach(function(layer) {
                            window.drawnItems.removeLayer(layer);
                        });
                    }

                    // Auto-disable after use
                    disableAllTools();
                });
            }
        });
    }

    // Listen for map clicks to handle completed drawings
    if (window.map) {
        window.map.on('draw:created', function() {
            // Automatically deactivate the drawing tool when a shape is created
            disableAllTools();
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