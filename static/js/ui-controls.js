// UI Control Functions
// Function to update location display
function updateLocationDisplay(locationName) {
    const displayElement = document.getElementById('current-location-display');
    if (displayElement) {
        displayElement.textContent = `Location: ${locationName || 'None'}`;
    }
}

// Function to remove all Leaflet Draw toolbar buttons and elements
function removeLeafletDrawButtons() {
    const leafletBar = document.querySelector('.leaflet-draw.leaflet-control');
    if (leafletBar) {
        leafletBar.remove();
    }
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

// UI Controls for QDPro
// Define the initializeUIControls function globally
window.initializeUIControls = function() {
    console.log("Initializing UI controls...");

    // Check if map is available first
    if (!window.map) {
        console.error("Map not available for UI controls initialization");
        // Retry after a short delay
        setTimeout(window.initializeUIControls, 500);
        return;
    }

    // Remove any existing Leaflet draw buttons
    removeLeafletDrawButtons();

    // Override _updateFinishHandler to avoid additional UI
    if (L.Draw.Feature && L.Draw.Feature.prototype._updateFinishHandler) {
        L.Draw.Feature.prototype._updateFinishHandler = function() {
            // Call the original _fireCreatedEvent method if not already done
            if (this._shape && !this._shape._eventFired) {
                this._fireCreatedEvent();
                this._shape._eventFired = true;
            }
        };
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

                    // Prevent any additional UI creation
                    if (this._map && this._map._toolbars) {
                        this._map._toolbars = {};
                    }
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

        // Setup tool buttons after the map is initialized
        setupAfterMapInit();

        console.log("UI Controls initialized");
    };

function setupToolButtons() {
    console.log("Setting up tool buttons...");
    if (!window.map) {
        console.warn("Map is not initialized.");
        return; // Exit if map isn't available yet
    }

    // First, check if map is properly initialized
    if (!window.map) {
        console.error("Map not yet initialized when setting up tool buttons");
        return; // Exit early, will try again later when map is ready
    }

    // Create a drawn items group if not already present
    window.drawnItems = window.drawnItems || new L.FeatureGroup();

    // Safely add the layer to the map if it's not already there
    try {
        // Check if layer is already on the map - don't use hasLayer
        let layerAlreadyAdded = false;
        if (window.drawnItems._map && window.drawnItems._map === window.map) {
            layerAlreadyAdded = true;
        }

        if (!layerAlreadyAdded && typeof window.map.addLayer === 'function') {
            window.map.addLayer(window.drawnItems);
            console.log("Added drawn items layer to map");
        }
    } catch (e) {
        console.error("Error adding drawn items layer:", e);
    }

    const toolButtons = {
        polygon: document.getElementById("draw-polygon-btn"),
        rectangle: document.getElementById("draw-rectangle-btn"),
        marker: document.getElementById("draw-marker-btn"),
    };

    let activeDrawHandler = null;
    let activeTool = null;

    function disableAllTools() {
        Object.values(toolButtons).forEach((btn) => {
            if (btn) btn.classList.remove("active");
        });

        if (activeDrawHandler) {
            activeDrawHandler.disable();
            activeDrawHandler = null;
        }
    }

    // Attach event listeners to buttons
    Object.keys(toolButtons).forEach((toolType) => {
        if (toolButtons[toolType]) {
            toolButtons[toolType].addEventListener("click", function() {
                if (activeTool === toolType) {
                    // Clicking the active tool should disable it
                    disableAllTools();
                    activeTool = null;
                } else {
                    // Disable any active tool first
                    disableAllTools();

                    // Set the new active tool
                    activeTool = toolType;
                    this.classList.add("active");

                    // Create and enable the appropriate draw handler
                    switch (toolType) {
                        case "polygon":
                            activeDrawHandler = new L.Draw.Polygon(window.map);
                            break;
                        case "rectangle":
                            activeDrawHandler = new L.Draw.Rectangle(window.map);
                            break;
                        case "marker":
                            activeDrawHandler = new L.Draw.Marker(window.map);
                            break;
                    }

                    if (activeDrawHandler) {
                        activeDrawHandler.enable();
                    }
                }
            });
        }
    });

    console.log("Tool buttons setup complete");
}

function setupAfterMapInit() {
    console.log("Setting up after map initialization...");

    // Setup tool buttons
    setupToolButtons();

    // Add a map click handler to cancel drawing when clicking on the map with no tool active
    if (window.map && typeof window.map.on === 'function') {
        window.map.on('click', function(e) {
            // This will only fire if the click wasn't handled by another handler
            console.log("Map clicked, checking for active tools to cancel");
        });
    } else {
        console.warn("Cannot add map click handler - map or on method not available");
    }

    // Listen for draw:created events to handle new shapes
    if (window.map) {
        window.map.on('draw:created', function(e) {
            const layer = e.layer;
            console.log("Shape created:", e.layerType);

            // Add the layer to the feature group
            window.drawnItems.addLayer(layer);
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

function setupAfterMapInit() {
    setupToolButtons();

    // Add a map click handler to cancel drawing when clicking on the map with no tool active
    if (window.map && typeof window.map.on === 'function') {
        window.map.on('click', function(e) {
            // This will only fire if the click wasn't handled by another handler
            if (window.activeDrawHandler || 
                (window.editControl && window.editControl.enabled()) || 
                (window.deleteHandler && window.deleteHandler.enabled())) {
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
}