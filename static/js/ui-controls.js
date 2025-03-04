// UI Control Functions
// Close dropdown menus when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.matches('.menu-item') && !e.target.closest('.dropdown-content')) {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
            if (dropdown.style.display === 'block') {
                dropdown.style.display = 'none';
            }
        });
    }
});

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


// UI Controls for QDPro Site Plan
let activeTool = null;
let activeToolButton = null;

// Initialize UI controls
window.initializeUIControls = function() {
    console.log("Initializing UI Controls...");

    if (!window.map) {
        console.error("Map not available for UI controls initialization");
        return;
    }

    // Add zoom control to toolbar instead of default corner
    const zoomControl = L.control.zoom({
        position: 'topright',
        zoomInTitle: 'Zoom In',
        zoomOutTitle: 'Zoom Out'
    });
    window.map.addControl(zoomControl);

    // Setup toolbar with drawing tools
    setupToolbar();

    // Setup menu handlers
    setupMenuHandlers();

    // Initialize file menu functionality
    initializeFileMenu();

    console.log("UI Controls initialized");
};

// Setup the drawing toolbar
function setupToolbar() {
    if (!window.map) {
        console.error("Map not available for toolbar setup");
        return;
    }

    // Setup the drawing controls but don't add them directly to the map
    window.drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polyline: {
                shapeOptions: {
                    color: '#f357a1',
                    weight: 3
                }
            },
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Error:</strong> Shapes cannot intersect!'
                },
                shapeOptions: {
                    color: '#3388ff'
                }
            },
            circle: {
                shapeOptions: {
                    color: '#662d91'
                }
            },
            rectangle: {
                shapeOptions: {
                    color: '#ffd400'
                }
            },
            marker: true
        },
        edit: {
            featureGroup: window.drawnItems
        }
    });

    // Do not add the control directly to the map
    // window.map.addControl(drawControl);

    // Disable the default toolbar
    if (L.Draw.Control) {
        L.Draw.Control.prototype._addToolbar = function() { return; };
        L.Draw.Control.prototype.addToolbar = function() { return; };
    }

    if (L.DrawToolbar) {
        L.DrawToolbar.prototype.addToolbar = function() { return; };
    }

    // Setup custom tool buttons
    setupToolButtons();
}

// Setup the tool buttons
function setupToolButtons() {
    if (!window.map) {
        console.log("Map is not initialized.");
        return;
    }

    // Get toolbar container
    const toolbarContainer = document.getElementById('toolbar-container');
    if (!toolbarContainer) {
        console.error("Toolbar container not found");
        return;
    }

    // Create buttons for each draw handler
    const toolButtons = {
        polygon: { title: 'Draw Facility Boundary', icon: 'fa-draw-polygon' },
        rectangle: { title: 'Draw Building', icon: 'fa-square' },
        circle: { title: 'Draw Safety Zone', icon: 'fa-circle' },
        marker: { title: 'Place Point of Interest', icon: 'fa-map-marker-alt' },
        polyline: { title: 'Draw Path', icon: 'fa-route' },
        pan: { title: 'Pan Map', icon: 'fa-hand-paper' }
    };

    // Clear existing content
    toolbarContainer.innerHTML = '';

    // Create the button elements
    Object.keys(toolButtons).forEach(toolType => {
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('data-tool', toolType);
        button.className = 'toolbar-button';
        button.title = toolButtons[toolType].title;

        const icon = document.createElement('i');
        icon.className = `fas ${toolButtons[toolType].icon}`;
        button.appendChild(icon);

        // Add click handler
        button.addEventListener('click', function() {
            activateTool(toolType, button);
        });

        toolbarContainer.appendChild(button);
    });

    // Activate pan tool by default
    const panButton = toolbarContainer.querySelector('[data-tool="pan"]');
    if (panButton) {
        activateTool('pan', panButton);
    }

    console.log("Tool buttons set up successfully");
}

// Activate a selected tool
function activateTool(toolType, button) {
    // Deactivate current tool if any
    if (activeTool) {
        deactivateCurrentTool();
    }

    // Update active tool reference
    activeTool = toolType;
    activeToolButton = button;

    // Add active class to button
    if (button) {
        button.classList.add('active');
    }

    // Handle specific tool activation
    if (toolType === 'pan') {
        // Enable panning
        window.map.dragging.enable();
        // Change cursor to hand
        document.getElementById('map').style.cursor = 'grab';
    } else if (window.drawControl && window.drawControl.options.draw[toolType]) {
        // Disable panning if using a drawing tool
        window.map.dragging.disable();
        // Change cursor to crosshair for drawing tools
        document.getElementById('map').style.cursor = 'crosshair';

        // Create the appropriate handler
        const Handler = L.Draw[toolType.charAt(0).toUpperCase() + toolType.slice(1)];
        if (Handler) {
            const options = window.drawControl.options.draw[toolType];
            activeTool = new Handler(window.map, options);
            activeTool.enable();
        }
    }

    console.log(`Activated tool: ${toolType}`);
}

// Deactivate the current tool
function deactivateCurrentTool() {
    if (!activeTool) return;

    // Remove active class from button
    if (activeToolButton) {
        activeToolButton.classList.remove('active');
    }

    // Disable the current tool
    if (typeof activeTool === 'object' && activeTool.disable) {
        activeTool.disable();
    }

    // Enable map dragging (pan)
    window.map.dragging.enable();

    // Reset cursor
    document.getElementById('map').style.cursor = '';

    // Clear references
    activeTool = null;
    activeToolButton = null;
}

// Setup menu handlers
function setupMenuHandlers() {
    // Add event listener for creating a new site plan
    document.getElementById('new-site-plan').addEventListener('click', function() {
        showNewSitePlanModal();
    });

    // Add event listener for opening an existing site plan
    document.getElementById('open-site-plan').addEventListener('click', function() {
        showOpenSitePlanModal();
    });

    // Add event listener for saving the current site plan
    document.getElementById('save-site-plan').addEventListener('click', function() {
        showSaveSitePlanModal();
    });

    // Add event listener for exporting the site plan
    document.getElementById('export-site-plan').addEventListener('click', function() {
        exportSitePlan();
    });
}

// Initialize file menu functionality
function initializeFileMenu() {
    const fileMenuBtn = document.getElementById('file-menu-btn');
    const fileMenuDropdown = document.getElementById('file-menu-dropdown');

    if (fileMenuBtn && fileMenuDropdown) {
        fileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            fileMenuDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#file-menu-btn') && !e.target.closest('#file-menu-dropdown')) {
                fileMenuDropdown.classList.remove('show');
            }
        });
    }
}

// Show modal for creating a new site plan
function showNewSitePlanModal() {
    const modal = document.getElementById('new-site-plan-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert('Create a new site plan functionality coming soon!');
    }
}

// Show modal for opening an existing site plan
function showOpenSitePlanModal() {
    const modal = document.getElementById('open-site-plan-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert('Open site plan functionality coming soon!');
    }
}

// Show modal for saving the current site plan
function showSaveSitePlanModal() {
    const modal = document.getElementById('save-site-plan-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert('Save site plan functionality coming soon!');
    }
}

// Export the site plan
function exportSitePlan() {
    alert('Export functionality coming soon!');
}

// Function to be called when a shape is drawn
window.map.on('draw:created', function(e) {
    const layer = e.layer;
    window.drawnItems.addLayer(layer);

    // Open popup for editing properties
    openEditPopup(layer);
});

// Function to open a popup for editing a shape's properties
function openEditPopup(layer) {
    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
        <h4>Facility Properties</h4>
        <form id="facility-form">
            <div class="form-group">
                <label for="facility-name">Name:</label>
                <input type="text" id="facility-name" placeholder="Enter facility name">
            </div>
            <div class="form-group">
                <label for="facility-type">Type:</label>
                <select id="facility-type">
                    <option value="storage">Storage</option>
                    <option value="processing">Processing</option>
                    <option value="admin">Administrative</option>
                    <option value="housing">Housing</option>
                </select>
            </div>
            <div class="form-group">
                <label for="facility-notes">Notes:</label>
                <textarea id="facility-notes" rows="3" placeholder="Additional information"></textarea>
            </div>
            <button type="submit" class="btn-primary">Save</button>
        </form>
    `;

    // Add event listener to form submission
    const form = popupContent.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form values
        const name = document.getElementById('facility-name').value;
        const type = document.getElementById('facility-type').value;
        const notes = document.getElementById('facility-notes').value;

        // Store properties with the layer
        layer.properties = {
            name: name,
            type: type,
            notes: notes
        };

        // Close popup
        layer.closePopup();
    });

    // Bind popup to layer
    layer.bindPopup(popupContent).openPopup();
}

// Function to be called when a shape is edited
window.map.on('draw:edited', function(e) {
    const layers = e.layers;
    layers.eachLayer(function(layer) {
        // Re-open edit popup if needed
        if (layer.properties) {
            openEditPopup(layer);
        }
    });
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