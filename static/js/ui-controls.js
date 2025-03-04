// Define global variables
let activeControl = null;
let activeDrawingTool = null;

// Function to set up tool buttons
function setupToolButtons() {
    console.log("Setting up tool buttons...");

    // Wait until map is fully initialized
    if (!window.map) {
        console.error("Map is not initialized.");
        setTimeout(setupToolButtons, 500); // Try again in 500ms
        return;
    }

    // Get all tool buttons
    const toolButtons = document.querySelectorAll('.tool-button');

    if (toolButtons.length === 0) {
        console.error("No tool buttons found");
        return;
    }

    console.log(`Found ${toolButtons.length} tool buttons`);

    // Add click event listeners to each button
    toolButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const toolType = this.getAttribute('data-tool');
            activateTool(toolType, this);
        });
        console.log(`Added listener to button: ${button.getAttribute('data-tool')}`);
    });

    // Set up menu items
    setupMenuItems();
}

// Function to set up menu items
function setupMenuItems() {
    console.log("Setting up menu items...");

    // File menu items
    const fileMenuItems = document.querySelectorAll('.dropdown-content a');

    if (fileMenuItems.length === 0) {
        console.error("No file menu items found");
    } else {
        console.log(`Found ${fileMenuItems.length} file menu items`);

        fileMenuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const action = this.getAttribute('data-action');
                handleMenuAction(action);
            });
            console.log(`Added listener to menu item: ${item.getAttribute('data-action') || 'unknown'}`);
        });
    }

    // Dropdown toggle
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('.dropbtn');
        const content = dropdown.querySelector('.dropdown-content');

        if (button && content) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                content.classList.toggle('show');
            });
        }
    });

    // Close dropdowns when clicking outside
    window.addEventListener('click', function(e) {
        if (!e.target.matches('.dropbtn')) {
            const dropdowns = document.querySelectorAll('.dropdown-content');
            dropdowns.forEach(dropdown => {
                if (dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            });
        }
    });
}

// Function to handle menu actions
function handleMenuAction(action) {
    console.log(`Menu action: ${action}`);

    switch (action) {
        case 'new-project':
            createNewProject();
            break;
        case 'open-project':
            openProject();
            break;
        case 'save-project':
            saveProject();
            break;
        case 'export-pdf':
            exportToPDF();
            break;
        case 'export-shapefile':
            exportToShapefile();
            break;
        default:
            console.warn(`Unknown menu action: ${action}`);
    }
}

// Function to create a new project
function createNewProject() {
    console.log("Creating new project");
    if (window.confirm("Create a new project? All unsaved changes will be lost.")) {
        // Clear the map
        if (window.drawnItems) {
            window.drawnItems.clearLayers();
        }
        // Reset any project-specific data
        document.getElementById('project-title').innerText = 'New Project';

        // Show success message
        alert("New project created successfully");
    }
}

// Function to open a project
function openProject() {
    console.log("Opening project");
    // This would typically open a modal with a list of saved projects
    alert("Open Project functionality will be implemented in a future update");
}

// Function to save the current project
function saveProject() {
    console.log("Saving project");
    // This would typically save the current state to a database
    alert("Project saved successfully");
}

// Function to export to PDF
function exportToPDF() {
    console.log("Exporting to PDF");
    alert("Export to PDF functionality will be implemented in a future update");
}

// Function to export to Shapefile
function exportToShapefile() {
    console.log("Exporting to Shapefile");
    alert("Export to Shapefile functionality will be implemented in a future update");
}

// Function to activate a drawing tool
function activateTool(toolType, button) {
    console.log(`Activating tool: ${toolType}`);

    // First, deactivate any active tool
    deactivateAllTools();

    if (!window.map) {
        console.error("Map is not initialized");
        return;
    }

    // Set the active button
    if (button) {
        button.classList.add('active');
    }

    // Activate the selected tool
    switch (toolType) {
        case 'polygon':
            activatePolygonDrawing();
            break;
        case 'rectangle':
            activateRectangleDrawing();
            break;
        case 'circle':
            activateCircleDrawing();
            break;
        case 'marker':
            activateMarkerDrawing();
            break;
        case 'edit':
            activateEditMode();
            break;
        case 'delete':
            activateDeleteMode();
            break;
        default:
            console.warn(`Unknown tool type: ${toolType}`);
    }
}

// Function to deactivate all drawing tools
function deactivateAllTools() {
    console.log("Deactivating all tools");

    // Remove active class from all tool buttons
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Disable any active drawing control
    if (activeControl) {
        if (window.map && typeof window.map.removeControl === 'function') {
            window.map.removeControl(activeControl);
        }
        activeControl = null;
    }

    // Reset active drawing tool
    activeDrawingTool = null;

    // Disable draw event handlers
    if (window.map) {
        window.map.off('click');
        window.map.off('draw:created');
        window.map.off('draw:edited');
        window.map.off('draw:deleted');
    }
}

// Function to activate polygon drawing
function activatePolygonDrawing() {
    console.log("Activating polygon drawing");

    if (!window.map || !L) {
        console.error("Map or Leaflet not initialized");
        return;
    }

    // Create a new polygon draw control
    activeControl = new L.Draw.Polygon(window.map);
    activeDrawingTool = 'polygon';

    // Enable the drawing tool
    activeControl.enable();

    // Set up the draw:created event handler
    window.map.on('draw:created', function(e) {
        const layer = e.layer;
        if (window.drawnItems) {
            window.drawnItems.addLayer(layer);
        }
        // Open a popup to edit properties
        openEditPopup(layer);
    });
}

// Function to activate rectangle drawing
function activateRectangleDrawing() {
    console.log("Activating rectangle drawing");

    if (!window.map || !L) {
        console.error("Map or Leaflet not initialized");
        return;
    }

    // Create a new rectangle draw control
    activeControl = new L.Draw.Rectangle(window.map);
    activeDrawingTool = 'rectangle';

    // Enable the drawing tool
    activeControl.enable();

    // Set up the draw:created event handler
    window.map.on('draw:created', function(e) {
        const layer = e.layer;
        if (window.drawnItems) {
            window.drawnItems.addLayer(layer);
        }
        // Open a popup to edit properties
        openEditPopup(layer);
    });
}

// Function to activate circle drawing
function activateCircleDrawing() {
    console.log("Activating circle drawing");

    if (!window.map || !L) {
        console.error("Map or Leaflet not initialized");
        return;
    }

    // Create a new circle draw control
    activeControl = new L.Draw.Circle(window.map);
    activeDrawingTool = 'circle';

    // Enable the drawing tool
    activeControl.enable();

    // Set up the draw:created event handler
    window.map.on('draw:created', function(e) {
        const layer = e.layer;
        if (window.drawnItems) {
            window.drawnItems.addLayer(layer);
        }
        // Open a popup to edit properties
        openEditPopup(layer);
    });
}

// Function to activate marker drawing
function activateMarkerDrawing() {
    console.log("Activating marker drawing");

    if (!window.map || !L) {
        console.error("Map or Leaflet not initialized");
        return;
    }

    // Create a new marker draw control
    activeControl = new L.Draw.Marker(window.map);
    activeDrawingTool = 'marker';

    // Enable the drawing tool
    activeControl.enable();

    // Set up the draw:created event handler
    window.map.on('draw:created', function(e) {
        const layer = e.layer;
        if (window.drawnItems) {
            window.drawnItems.addLayer(layer);
        }
        // Open a popup to edit properties
        openEditPopup(layer);
    });
}

// Function to activate edit mode
function activateEditMode() {
    console.log("Activating edit mode");

    if (!window.map || !L) {
        console.error("Map or Leaflet not initialized");
        return;
    }

    if (!window.drawnItems) {
        console.error("Drawn items layer not initialized");
        return;
    }

    // Create a new edit control
    activeControl = new L.EditToolbar.Edit(window.map, {
        featureGroup: window.drawnItems
    });
    activeDrawingTool = 'edit';

    // Enable the edit tool
    activeControl.enable();

    // Set up the draw:edited event handler
    window.map.on('draw:edited', function(e) {
        const layers = e.layers;
        // Handle edited layers
        console.log("Layers edited:", layers);
    });
}

// Function to activate delete mode
function activateDeleteMode() {
    console.log("Activating delete mode");

    if (!window.map || !L) {
        console.error("Map or Leaflet not initialized");
        return;
    }

    if (!window.drawnItems) {
        console.error("Drawn items layer not initialized");
        return;
    }

    // Create a new delete control
    activeControl = new L.EditToolbar.Delete(window.map, {
        featureGroup: window.drawnItems
    });
    activeDrawingTool = 'delete';

    // Enable the delete tool
    activeControl.enable();

    // Set up the draw:deleted event handler
    window.map.on('draw:deleted', function(e) {
        const layers = e.layers;
        // Handle deleted layers
        console.log("Layers deleted:", layers);
    });
}

// Function to open an edit popup for a given shape layer
function openEditPopup(layer) {
    console.log("Opening edit popup for layer");

    // Create popup content with a form
    const popupContent = `
        <div class="edit-popup">
            <h3>Feature Properties</h3>
            <form id="feature-form">
                <div class="form-group">
                    <label for="name">Name:</label>
                    <input type="text" id="name" name="name" value="${layer.name || ''}">
                </div>
                <div class="form-group">
                    <label for="type">Type:</label>
                    <select id="type" name="type">
                        <option value="facility" ${layer.type === 'facility' ? 'selected' : ''}>Facility</option>
                        <option value="explosive-site" ${layer.type === 'explosive-site' ? 'selected' : ''}>Explosive Site</option>
                        <option value="boundary" ${layer.type === 'boundary' ? 'selected' : ''}>Boundary</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="description">Description:</label>
                    <textarea id="description" name="description">${layer.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;

    // Bind popup to the layer
    layer.bindPopup(popupContent).openPopup();

    // Handle form submission
    layer.on('popupopen', function() {
        const form = document.getElementById('feature-form');
        const cancelBtn = document.getElementById('cancel-btn');

        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();

                // Get form values
                const name = document.getElementById('name').value;
                const type = document.getElementById('type').value;
                const description = document.getElementById('description').value;

                // Save values to the layer
                layer.name = name;
                layer.type = type;
                layer.description = description;

                // Update layer style based on type
                updateLayerStyle(layer, type);

                // Close the popup
                layer.closePopup();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                layer.closePopup();
            });
        }
    });
}

// Function to update layer style based on type
function updateLayerStyle(layer, type) {
    // Define styles for different types
    const styles = {
        'facility': {
            color: '#3388ff',
            weight: 3,
            fillColor: '#3388ff',
            fillOpacity: 0.2
        },
        'explosive-site': {
            color: '#ff3333',
            weight: 3,
            fillColor: '#ff3333',
            fillOpacity: 0.2
        },
        'boundary': {
            color: '#33ff33',
            weight: 3,
            fillColor: '#33ff33',
            fillOpacity: 0.2
        }
    };

    // Apply the appropriate style
    if (styles[type]) {
        layer.setStyle(styles[type]);
    }
}

// Define global UI initialization function
window.initializeUIControls = function() {
    console.log("UI Controls initialization started...");
    setupToolButtons();
    console.log("UI Controls initialized");
};

// When document is loaded, check if we need to initialize UI
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded, checking for UI initialization");

    // If map is already initialized, set up UI controls
    if (window.map) {
        console.log("Map is already initialized, setting up UI controls");
        window.initializeUIControls();
    } else {
        console.log("Map not yet initialized, waiting for map init");
    }
});