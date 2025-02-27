// UI Control Functions
// Function to update location display
function updateLocationDisplay(locationName) {
    const displayElement = document.getElementById('current-location-display');

// Function to remove all Leaflet Draw toolbar buttons
function removeLeafletDrawButtons() {
    // Remove all Leaflet Draw toolbar buttons
    const drawButtons = document.querySelectorAll('.leaflet-draw-draw-polygon, .leaflet-draw-draw-rectangle, .leaflet-draw-draw-marker, .leaflet-draw-toolbar, .leaflet-draw-toolbar-top, .leaflet-draw-toolbar-button');
    drawButtons.forEach(function(button) {
        if (button && button.parentNode) {
            button.parentNode.removeChild(button);
        }
    });

    // Also remove any leftovers at the document level
    const toolbars = document.querySelectorAll('.leaflet-draw-toolbar');
    toolbars.forEach(function(toolbar) {
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.removeChild(toolbar);
        }
    });
}

// Completely disable the Leaflet.Draw toolbar functionality
if (L && L.DrawToolbar) {
    // Override the toolbar initialization
    L.DrawToolbar.prototype.initialize = function() {
        // Do nothing
    };

    // Override the addToolbar method
    L.DrawToolbar.prototype.addToolbar = function() {
        return this;
    };

    // Ensure no buttons are added
    L.DrawToolbar.prototype._createButton = function() {
        return null;
    };
}

// Run this on page load and set an interval to continuously check for and remove draw buttons
window.addEventListener('DOMContentLoaded', function() {
    // Initial removal
    removeLeafletDrawButtons();

    // Set interval to keep checking and removing any buttons that might appear
    setInterval(removeLeafletDrawButtons, 50);

    // Also check for and remove toolbars after any drawing handler is enabled
    const originalDrawEnable = L.Draw.Feature.prototype.enable;
    if (originalDrawEnable) {
        L.Draw.Feature.prototype.enable = function() {
            originalDrawEnable.call(this);
            setTimeout(removeLeafletDrawButtons, 0);
            setTimeout(removeLeafletDrawButtons, 50);
        };
    }

    // Override Leaflet.Draw handlers to prevent toolbars
    if (L && L.Draw) {
        // Override each draw handler's enable method
        const drawHandlers = ['Polygon', 'Rectangle', 'Marker', 'Circle', 'CircleMarker', 'Polyline'];

        drawHandlers.forEach(function(handlerType) {
            if (L.Draw[handlerType]) {
                // Save the original enable method
                const originalEnable = L.Draw[handlerType].prototype.enable;

                // Override the enable method
                L.Draw[handlerType].prototype.enable = function() {
                    // Call the original method but prevent toolbar creation
                    this._map._toolbars = {};  // Clear any toolbars before enabling
                    this._map._toolbarDisabled = true;  // Flag to prevent toolbar creation

                    // Remove any existing Draw Control hooks
                    if (this._map._controlCorners) {
                        const topLeft = this._map._controlCorners.topleft;
                        if (topLeft) {
                            const drawControls = topLeft.querySelectorAll('.leaflet-draw');
                            drawControls.forEach(control => {
                                if (control && control.parentNode) {
                                    control.parentNode.removeChild(control);
                                }
                            });
                        }
                    }

                    // Now call the original enable
                    originalEnable.call(this);

                    // Force remove any toolbar buttons that might have been created
                    setTimeout(removeLeafletDrawButtons, 0);
                    setTimeout(removeLeafletDrawButtons, 10);
                    setTimeout(removeLeafletDrawButtons, 50);
                };
            }
        });

        // Completely disable the toolbar creation
        if (L.Draw.Control) {
            L.Draw.Control.prototype._addToolbar = function() { return; };
            L.Draw.Control.prototype.addToolbar = function() { return; };
        }

        // Prevent toolbar elements from being added to the map
        if (L.DrawToolbar) {
            L.DrawToolbar.prototype.addToolbar = function() { return; };
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

                // Force remove any Leaflet Draw buttons that might appear
                setTimeout(removeLeafletDrawButtons, 10);
                setTimeout(removeLeafletDrawButtons, 50);
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

                // Force remove any Leaflet Draw buttons that might appear
                setTimeout(removeLeafletDrawButtons, 10);
                setTimeout(removeLeafletDrawButtons, 50);
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

                // Force remove any Leaflet Draw buttons that might appear
                setTimeout(removeLeafletDrawButtons, 10);
                setTimeout(removeLeafletDrawButtons, 50);
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