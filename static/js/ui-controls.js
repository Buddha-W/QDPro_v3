// UI Control Functions
// Function to update location display
function updateLocationDisplay(locationName) {
    const displayElement = document.getElementById('current-location-display');

// Function to remove all Leaflet Draw toolbar buttons and elements
function removeLeafletDrawButtons() {
    // Comprehensive list of selectors to target all Leaflet Draw UI elements
    const selectors = [
        '.leaflet-draw-draw-polygon',
        '.leaflet-draw-draw-rectangle',
        '.leaflet-draw-draw-marker',
        '.leaflet-draw-draw-circle',
        '.leaflet-draw-draw-circlemarker',
        '.leaflet-draw-draw-polyline',
        '.leaflet-draw-toolbar',
        '.leaflet-draw-toolbar-top',
        '.leaflet-draw-toolbar-button',
        '.leaflet-draw-actions',
        '.leaflet-draw-section',
        '.leaflet-draw',
        '.leaflet-draw-tooltip',
        '.leaflet-draw-guide-dash'
    ];
    
    // Combined selector for efficiency
    const allLeafletDrawElements = document.querySelectorAll(selectors.join(', '));
    
    // Remove all elements
    allLeafletDrawElements.forEach(function(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    // Also clean up any draw controls from the map container
    const mapContainers = document.querySelectorAll('.leaflet-container');
    mapContainers.forEach(function(container) {
        const drawControls = container.querySelectorAll('.leaflet-draw');
        drawControls.forEach(function(control) {
            if (control && control.parentNode) {
                control.parentNode.removeChild(control);
            }
        });
    });
    
    // Remove any dynamically added draw styles
    const drawStyles = document.querySelectorAll('style[class*="leaflet-draw"]');
    drawStyles.forEach(function(style) {
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
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

// Ensure that Leaflet Draw toolbars don't appear
window.addEventListener('DOMContentLoaded', function() {
    // Completely disable Leaflet.Draw UI creation
    if (L && L.Draw) {
        // Override the toolbar prototype to prevent creation
        if (L.Draw.Toolbar) {
            L.Draw.Toolbar.prototype.initialize = function() {};
            L.Draw.Toolbar.prototype.addToolbar = function() { return this; };
            L.Draw.Toolbar.prototype._createButton = function() { return null; };
        }

        // Override actions bar creation
        if (L.DrawToolbar) {
            L.DrawToolbar.prototype._createActions = function() { return null; };
        }

        // Override each handler to suppress UI
        ['Polygon', 'Rectangle', 'Marker', 'Circle', 'CircleMarker'].forEach(function(type) {
            if (L.Draw[type]) {
                const originalEnable = L.Draw[type].prototype.enable;
                L.Draw[type].prototype.enable = function() {
                    // Remove any UI before enabling
                    removeLeafletDrawButtons();
                    if (originalEnable) originalEnable.call(this);
                    // Remove any UI after enabling
                    removeLeafletDrawButtons();
                };
            }
        });
    }

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
    // Define all tool buttons
    const toolButtons = {
        polygon: document.getElementById('draw-polygon-btn'),
        rectangle: document.getElementById('draw-rectangle-btn'),
        marker: document.getElementById('draw-marker-btn'),
        edit: document.getElementById('edit-layers-btn'),
        delete: document.getElementById('delete-layers-btn')
    };
    
    let activeTool = null;
    
    // Helper function to disable all active tools
    function disableAllTools() {
        // Reset all button states
        Object.values(toolButtons).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        // Disable active draw handler
        if (window.activeDrawHandler) {
            window.activeDrawHandler.disable();
            window.activeDrawHandler = null;
        }
        
        // Disable edit control
        if (window.editControl && window.editControl.enabled()) {
            window.editControl.disable();
        }
        
        // Disable delete handler
        if (window.deleteHandler && window.deleteHandler.enabled()) {
            window.deleteHandler.disable();
            window.deleteHandler = null;
        }
        
        // Set active tool to null
        activeTool = null;
        
        // Remove any Leaflet Draw buttons that might exist
        removeLeafletDrawButtons();
    }
    
    // Function to toggle a drawing tool
    function toggleDrawingTool(toolType, options = {}) {
        // If this tool is already active, disable it
        if (activeTool === toolType) {
            disableAllTools();
            return;
        }
        
        // Disable any active tools first
        disableAllTools();
        
        // Set active tool and activate button
        activeTool = toolType;
        if (toolButtons[toolType]) {
            toolButtons[toolType].classList.add('active');
        }
        
        // Handle different tool types
        if (window.map) {
            switch (toolType) {
                case 'polygon':
                    window.activeDrawHandler = new L.Draw.Polygon(window.map, {
                        showDrawingTools: false,
                        shapeOptions: { 
                            color: '#662d91',
                            showAttribution: false
                        },
                        ...options
                    });
                    break;
                    
                case 'rectangle':
                    window.activeDrawHandler = new L.Draw.Rectangle(window.map, {
                        showDrawingTools: false,
                        shapeOptions: { 
                            color: '#228B22',
                            showAttribution: false
                        },
                        ...options
                    });
                    break;
                    
                case 'marker':
                    window.activeDrawHandler = new L.Draw.Marker(window.map, {
                        showDrawingTools: false,
                        icon: L.icon({
                            iconUrl: window.markerIconUrl || 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41]
                        }),
                        ...options
                    });
                    break;
                    
                case 'edit':
                    if (window.editControl) {
                        window.editControl.enable();
                    } else if (window.drawnItems) {
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
                    }
                    break;
                    
                case 'delete':
                    window.deleteHandler = {
                        enabled: function() { return true; },
                        disable: function() { window.deleteHandler = null; }
                    };
                    
                    // Setup click to delete functionality
                    window.map.once('click', function() {
                        if (window.drawnItems) {
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
                        
                        // Auto-disable after one use
                        disableAllTools();
                    });
                    break;
            }
            
            // Enable drawing if a draw handler was created
            if (window.activeDrawHandler) {
                // Remove any existing toolbars before enabling
                if (window.map._toolbars) {
                    window.map._toolbars = {};
                }
                
                // Enable the drawing handler
                window.activeDrawHandler.enable();
                
                // Remove any toolbar buttons that might get created
                setTimeout(removeLeafletDrawButtons, 0);
                setTimeout(removeLeafletDrawButtons, 50);
            }
        }
    }
    
    // Attach event listeners to all tool buttons
    Object.keys(toolButtons).forEach(toolType => {
        const btn = toolButtons[toolType];
        if (btn) {
            btn.addEventListener('click', function() {
                toggleDrawingTool(toolType);
            });
        }
    });
    
    // Handle map events
    if (window.map) {
        // When a shape is created, automatically deactivate the drawing tool
        window.map.on('draw:created', function(e) {
            disableAllTools();
            
            // Here you can add any code to handle the new shape
            // For example, adding it to the drawnItems layer
            if (window.drawnItems && e.layer) {
                window.drawnItems.addLayer(e.layer);
            }
        });
        
        // Map click handler to deactivate tools when clicking elsewhere
        window.map.on('click', function(e) {
            // Only do this if the click wasn't handled by another tool
            // and only if we have an active drawing tool
            if (L.DomEvent._skipped(e)) {
                return;
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