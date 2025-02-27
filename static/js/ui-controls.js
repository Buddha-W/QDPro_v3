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
    document.querySelectorAll(".leaflet-draw-toolbar, .leaflet-draw-actions").forEach(el => {
        el.remove();
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

        // Override _showActionsToolbar to prevent toolbar display
        if (L.Draw.Feature && L.Draw.Feature.prototype._showActionsToolbar) {
            L.Draw.Feature.prototype._showActionsToolbar = function() {
                // Do nothing instead of showing toolbar
                return;
            };
        }

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

    // Initial removal
    removeLeafletDrawButtons();

    // Set interval to keep checking and removing any buttons that might appear
    setInterval(removeLeafletDrawButtons, 50);

    //Setup the tool buttons from the edited code.
    document.addEventListener("DOMContentLoaded", function () {
        if (!window.map) {
            console.error("Map is not initialized.");
            return;
        }

        const toolButtons = {
            polygon: document.getElementById("draw-polygon-btn"),
            rectangle: document.getElementById("draw-rectangle-btn"),
            marker: document.getElementById("draw-marker-btn"),
        };

        let activeDrawHandler = null;
        let activeTool = null;

        // Create a drawn items group if not already present
        window.drawnItems = window.drawnItems || new L.FeatureGroup();
        if (!window.map.hasLayer(window.drawnItems)) {
            window.map.addLayer(window.drawnItems);
        }

        function disableAllTools() {
            Object.values(toolButtons).forEach((btn) => btn.classList.remove("active"));

            if (activeDrawHandler) {
                activeDrawHandler.disable();
                activeDrawHandler = null;
            }

            activeTool = null;

            // Remove any lingering UI
            setTimeout(() => {
                document.querySelectorAll(".leaflet-draw-toolbar, .leaflet-draw-actions, .leaflet-draw-tooltip").forEach(el => el.remove());
            }, 10);
        }

        function toggleDrawing(toolType) {
            if (!window.map) {
                console.error("Map is not initialized.");
                return;
            }

            if (activeTool === toolType) {
                disableAllTools();
                return;
            }

            disableAllTools();
            toolButtons[toolType]?.classList.add("active");
            activeTool = toolType;

            switch (toolType) {
                case "polygon":
                    activeDrawHandler = new L.Draw.Polygon(window.map, {
                        shapeOptions: { color: "#662d91" },
                    });
                    break;
                case "rectangle":
                    activeDrawHandler = new L.Draw.Rectangle(window.map, {
                        shapeOptions: { color: "#228B22" },
                    });
                    break;
                case "marker":
                    activeDrawHandler = new L.Draw.Marker(window.map, {
                        icon: L.icon({
                            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                        }),
                    });
                    break;
            }

            if (activeDrawHandler) {
                console.log(`Activating tool: ${toolType}`);
                activeDrawHandler.enable();
            }
        }

        // Attach event listeners to buttons
        Object.keys(toolButtons).forEach((toolType) => {
            if (toolButtons[toolType]) {
                toolButtons[toolType].addEventListener("click", function () {
                    toggleDrawing(toolType);
                });
            }
        });

        // Edit button functionality
        const editButton = document.getElementById("edit-layer-btn");
        if (editButton) {
            editButton.addEventListener("click", function() {
                disableAllTools();

                // Toggle the active state of the edit button
                editButton.classList.toggle("active");

                if (editButton.classList.contains("active")) {
                    // Enable the edit mode on all feature groups
                    window.editControl = new L.EditToolbar.Edit(window.map, {
                        featureGroup: new L.FeatureGroup([
                            window.featureGroups.facilities,
                            window.featureGroups.safetyArcs,
                            window.featureGroups.pesLocations,
                            window.featureGroups.esLocations,
                            window.drawnItems
                        ])
                    });
                    window.editControl.enable();
                } else if (window.editControl) {
                    window.editControl.disable();
                    window.editControl = null;
                }

                // Remove any Leaflet Draw UI elements
                setTimeout(() => {
                    document.querySelectorAll(".leaflet-draw-toolbar, .leaflet-draw-actions, .leaflet-draw-tooltip").forEach(el => el.remove());
                }, 10);
            });
        }

        // Delete button functionality
        const deleteButton = document.getElementById("delete-layer-btn");
        if (deleteButton) {
            deleteButton.addEventListener("click", function() {
                disableAllTools();

                // Toggle the active state of the delete button
                deleteButton.classList.toggle("active");

                if (deleteButton.classList.contains("active")) {
                    // Enable the delete mode on all feature groups
                    window.deleteHandler = new L.EditToolbar.Delete(window.map, {
                        featureGroup: new L.FeatureGroup([
                            window.featureGroups.facilities,
                            window.featureGroups.safetyArcs,
                            window.featureGroups.pesLocations,
                            window.featureGroups.esLocations,
                            window.drawnItems
                        ])
                    });
                    window.deleteHandler.enable();
                } else if (window.deleteHandler) {
                    window.deleteHandler.disable();
                    window.deleteHandler = null;
                }

                // Remove any Leaflet Draw UI elements
                setTimeout(() => {
                    document.querySelectorAll(".leaflet-draw-toolbar, .leaflet-draw-actions, .leaflet-draw-tooltip").forEach(el => el.remove());
                }, 10);
            });
        }

        // Clicking on the map disables drawing tools
        window.map.on("click", function () {
            disableAllTools();
        });

        // 🔥 Remove sub-buttons permanently
        setTimeout(() => {
            document.querySelectorAll(".leaflet-draw-toolbar, .leaflet-draw-actions, .leaflet-draw-tooltip").forEach(el => el.remove());
        }, 500);

        // Toggle layers panel
        const toggleLayersBtn = document.getElementById("toggle-layers-btn");
        if (toggleLayersBtn) {
            toggleLayersBtn.addEventListener("click", function() {
                const layersPanel = document.getElementById("layers-panel");
                if (layersPanel) {
                    layersPanel.classList.toggle("visible");
                }
            });
        }

        // Zoom controls
        const zoomInBtn = document.getElementById("zoom-in-btn");
        const zoomOutBtn = document.getElementById("zoom-out-btn");

        if (zoomInBtn) {
            zoomInBtn.addEventListener("click", function() {
                window.map.zoomIn();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener("click", function() {
                window.map.zoomOut();
            });
        }

        // Update layers list
        function updateLayersList() {
            const layersList = document.querySelector(".layers-list");
            if (!layersList) return;

            // Clear current list
            layersList.innerHTML = "";

            // Add layers from feature groups
            Object.entries(window.featureGroups).forEach(([groupName, featureGroup]) => {
                let count = 0;
                featureGroup.eachLayer(() => { count++; });

                if (count > 0) {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <span class="layer-name">${formatLayerName(groupName)} (${count})</span>
                        <div class="layer-controls">
                            <button class="toggle-visibility" title="Toggle Visibility"><i class="fas fa-eye"></i></button>
                        </div>
                    `;
                    layersList.appendChild(li);

                    // Add event listener for visibility toggle
                    li.querySelector(".toggle-visibility").addEventListener("click", function() {
                        if (window.map.hasLayer(featureGroup)) {
                            window.map.removeLayer(featureGroup);
                            this.innerHTML = '<i class="fas fa-eye-slash"></i>';
                        } else {
                            window.map.addLayer(featureGroup);
                            this.innerHTML = '<i class="fas fa-eye"></i>';
                        }
                    });
                }
            });
        }

        // Helper function to format layer names
        function formatLayerName(name) {
            return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
        }

        // Call updateLayersList whenever layers change
        window.map.on("layeradd layerremove", updateLayersList);

        // Initial layers list update
        setTimeout(updateLayersList, 1000);
    });

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