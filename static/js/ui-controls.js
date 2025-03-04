// UI Control Functions
// Close dropdown menus when clicking outside
document.addEventListener('click', function(e) {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    dropdowns.forEach(dropdown => {
        if (!e.target.closest('.menu-item') && dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
        }
    });
});

// Function to update location display
function updateLocationDisplay(locationName) {
    const displayElement = document.getElementById('current-location-display');
    if (displayElement) {
        displayElement.textContent = `Location: ${locationName || 'None'}`;
    }
}

// Function to toggle dropdown menus
function toggleDropdown(menuId) {
    const dropdown = document.querySelector(`#${menuId} .dropdown-content`);
    if (dropdown) {
        // Close all other dropdowns first
        document.querySelectorAll('.dropdown-content').forEach(d => {
            if (d !== dropdown && d.style.display === 'block') {
                d.style.display = 'none';
            }
        });
        // Toggle this dropdown
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        return false; // Prevent default action
    }
    return true;
}

// Setup menu functionality
function setupMenus() {
    // File menu
    const fileMenu = document.getElementById('file-menu');
    if (fileMenu) {
        fileMenu.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            return toggleDropdown('file-menu');
        };
    }

    // File > New
    const fileNewBtn = document.getElementById('file-new');
    if (fileNewBtn) {
        fileNewBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm("Create new location? Current work will be lost if unsaved.")) {
                // Clear the current layers
                if (window.drawnItems) {
                    window.drawnItems.clearLayers();
                }
                // Reset any form or status displays
                updateLocationDisplay('New (Unsaved)');
                // Close dropdown
                const dropdown = document.querySelector('#file-menu .dropdown-content');
                if (dropdown) dropdown.style.display = 'none';
            }
        };
    }

    // Other menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('disabled');
    });
}

function removeLeafletDrawButtons() {
    const leafletBar = document.querySelector('.leaflet-draw.leaflet-control');
    if (leafletBar) {
        leafletBar.remove();
    }
}

function setupToolButtons() {
    console.log("Setting up tool buttons...");
    if (!window.map) {
        console.warn("Map is not initialized.");
        return;
    }

    // First clean any existing buttons
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.onclick = null;
    });

    // Get the tools container
    const toolsContainer = document.querySelector('.tools-container');
    if (!toolsContainer) {
        console.error("Tools container not found");
        return;
    }

    // Setup polygon tool
    const polygonBtn = document.getElementById('polygon-tool');
    if (polygonBtn) {
        polygonBtn.onclick = function() {
            activateDrawingTool('polygon');
            setActiveButton(this);
        };
    }

    // Setup rectangle tool
    const rectangleBtn = document.getElementById('rectangle-tool');
    if (rectangleBtn) {
        rectangleBtn.onclick = function() {
            activateDrawingTool('rectangle');
            setActiveButton(this);
        };
    }

    // Setup marker tool
    const markerBtn = document.getElementById('marker-tool');
    if (markerBtn) {
        markerBtn.onclick = function() {
            activateDrawingTool('marker');
            setActiveButton(this);
        };
    }

    // Setup edit tool
    const editBtn = document.getElementById('edit-tool');
    if (editBtn) {
        editBtn.onclick = function() {
            activateEditTool();
            setActiveButton(this);
        };
    }

    // Setup delete tool
    const deleteBtn = document.getElementById('delete-tool');
    if (deleteBtn) {
        deleteBtn.onclick = function() {
            activateDeleteTool();
            setActiveButton(this);
        };
    }

    console.log("Tool buttons setup completed");
}

// Helper function to set active button
function setActiveButton(button) {
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
}

// Function to activate drawing tools
function activateDrawingTool(toolType) {
    console.log(`Activating ${toolType} tool`);
    // Disable any active tools first
    if (window.activeDrawHandler) {
        window.activeDrawHandler.disable();
        window.activeDrawHandler = null;
    }

    // Create new draw handler based on tool type
    if (toolType === 'polygon') {
        window.activeDrawHandler = new L.Draw.Polygon(window.map);
    } else if (toolType === 'rectangle') {
        window.activeDrawHandler = new L.Draw.Rectangle(window.map);
    } else if (toolType === 'marker') {
        window.activeDrawHandler = new L.Draw.Marker(window.map);
    }

    // Enable the new handler
    if (window.activeDrawHandler) {
        window.activeDrawHandler.enable();
    }
}

// Function to activate edit tool
function activateEditTool() {
    console.log("Activating edit tool");
    // Disable any active drawing tools
    if (window.activeDrawHandler) {
        window.activeDrawHandler.disable();
        window.activeDrawHandler = null;
    }

    // Enable edit control
    if (window.editControl) {
        window.editControl.enable();
    }
}

// Function to activate delete tool
function activateDeleteTool() {
    console.log("Activating delete tool");
    // Disable any active drawing tools
    if (window.activeDrawHandler) {
        window.activeDrawHandler.disable();
        window.activeDrawHandler = null;
    }

    // Enable delete handler
    if (window.deleteHandler) {
        window.deleteHandler.enable();
    }
}

function setupAfterMapInit() {
    setupToolButtons();
    setupMenus();

    // Add top toolbar map controls
    if (window.map) {
        // Get or create top toolbar
        let topToolbar = document.getElementById('top-toolbar');
        if (!topToolbar) {
            topToolbar = document.createElement('div');
            topToolbar.id = 'top-toolbar';
            topToolbar.className = 'toolbar top-toolbar';
            document.querySelector('.map-container').insertBefore(topToolbar, document.querySelector('.map-container').firstChild);
        }

        // Clear existing buttons
        topToolbar.innerHTML = '';

        // Create pan control
        const panButton = document.createElement('button');
        panButton.className = 'tool-button';
        panButton.id = 'pan-tool';
        panButton.innerHTML = '<i class="fas fa-hand-paper"></i> Pan';
        panButton.title = "Pan the map";
        panButton.onclick = function() {
            // Disable any active drawing tools
            if (window.activeDrawHandler) {
                window.activeDrawHandler.disable();
                window.activeDrawHandler = null;
            }
            // Disable edit/delete tools
            if (window.editControl && window.editControl.enabled()) {
                window.editControl.disable();
            }
            if (window.deleteHandler && window.deleteHandler.enabled()) {
                window.deleteHandler.disable();
            }
            // Set tool as active
            setActiveButton(this);
        };
        topToolbar.appendChild(panButton);

        // Create zoom in control
        const zoomInButton = document.createElement('button');
        zoomInButton.className = 'tool-button';
        zoomInButton.id = 'zoom-in-tool';
        zoomInButton.innerHTML = '<i class="fas fa-search-plus"></i> Zoom In';
        zoomInButton.title = "Zoom in";
        zoomInButton.onclick = function() {
            window.map.zoomIn();
        };
        topToolbar.appendChild(zoomInButton);

        // Create zoom out control
        const zoomOutButton = document.createElement('button');
        zoomOutButton.className = 'tool-button';
        zoomOutButton.id = 'zoom-out-tool';
        zoomOutButton.innerHTML = '<i class="fas fa-search-minus"></i> Zoom Out';
        zoomOutButton.title = "Zoom out";
        zoomOutButton.onclick = function() {
            window.map.zoomOut();
        };
        topToolbar.appendChild(zoomOutButton);

        // Activate pan by default
        panButton.click();
    }

    // Add a map click handler to cancel drawing when clicking on the map with no tool active
    if (window.map && typeof window.map.on === 'function') {
        window.map.on('click', function(e) {
            // Only handle clicks if no tool is active
            if (!window.activeDrawHandler && 
                !(window.editControl && window.editControl.enabled()) && 
                !(window.deleteHandler && window.deleteHandler.enabled())) {
                console.log("Map click - no active tool");
            }
        });
    }
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

    // Override Leaflet.Draw UI
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

// Add an additional DOMContentLoaded event to ensure UI is set up
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - setting up UI");

    // Initialize menus without waiting for the map
    setupMenus();

    // If map is already loaded, setup the rest
    if (window.map) {
        setupAfterMapInit();
    }
});


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