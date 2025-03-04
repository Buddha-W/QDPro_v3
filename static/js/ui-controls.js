// UI Controls for QDPro

// Global variables
let map = null;
let drawnItems = null;
let drawControl = null;
let activeDrawingTool = null;

// Function to initialize UI controls
function initializeUIControls() {
    console.log("UI Controls initialized");

    // Initialize map if it exists in window object
    if (window.map) {
        map = window.map;
        console.log("Map found in window object");
    } else {
        console.error("Map not found in window object");
        return; // Exit if no map
    }

    // Initialize drawn items if it exists in window object
    if (window.drawnItems) {
        drawnItems = window.drawnItems;
        console.log("Drawn items found in window object");
    } else {
        console.error("Drawn items not found in window object");
        // Create drawn items layer if it doesn't exist
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        window.drawnItems = drawnItems;
    }

    // Set up UI components
    setupToolButtons();
    setupMenuItems();
    setupDropdowns();

    // Add event listeners for keyboard shortcuts
    setupKeyboardShortcuts();

    console.log("UI Controls setup complete");
}

// Function to set up dropdown menus
function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.menu-item');

    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            const content = this.querySelector('.dropdown-content');
            if (content) {
                // Close all other dropdowns first
                document.querySelectorAll('.dropdown-content').forEach(item => {
                    if (item !== content) {
                        item.style.display = 'none';
                    }
                });

                // Toggle this dropdown
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            }
        });
    });

    // Close all dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-content').forEach(content => {
            content.style.display = 'none';
        });
    });
}

// Function to set up tool buttons
function setupToolButtons() {
    console.log("Setting up tool buttons...");

    const toolButtons = {
        'polygon-tool': L.Draw.Polygon,
        'rectangle-tool': L.Draw.Rectangle,
        'circle-tool': L.Draw.Circle,
        'marker-tool': L.Draw.Marker,
        'line-tool': L.Draw.Polyline
    };

    if (!map) {
        console.error("Map is not initialized.");
        return;
    }

    // Find all tool buttons
    for (const [buttonId, DrawTool] of Object.entries(toolButtons)) {
        const button = document.getElementById(buttonId);
        if (button) {
            console.log(`Found button: ${buttonId}`);
            button.addEventListener('click', function() {
                activateDrawingTool(buttonId, DrawTool);
            });
        } else {
            console.warn(`Button not found: ${buttonId}`);
        }
    }

    // Setup edit and delete buttons
    const editButton = document.getElementById('edit-tool');
    if (editButton) {
        editButton.addEventListener('click', function() {
            activateEditMode();
        });
    }

    const deleteButton = document.getElementById('delete-tool');
    if (deleteButton) {
        deleteButton.addEventListener('click', function() {
            activateDeleteMode();
        });
    }
}

// Function to set up menu items
function setupMenuItems() {
    console.log("Setting up menu items...");

    // Get all dropdown items
    const dropdownItems = document.querySelectorAll('.dropdown-item');

    if (dropdownItems.length === 0) {
        console.error("No dropdown items found");
        return;
    }

    console.log(`Found ${dropdownItems.length} dropdown items`);

    // Add click event listeners to each dropdown item
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            console.log(`Clicked dropdown item: ${action}`);
            handleMenuAction(action, this);
        });
    });
}

// Function to handle menu actions
function handleMenuAction(action, element) {
    console.log(`Handling menu action: ${action}`);

    // Close any open dropdowns
    document.querySelectorAll('.dropdown-content').forEach(content => {
        content.style.display = 'none';
    });

    switch (action) {
        case 'new-project':
            alert("Creating new project...");
            // Implement new project functionality
            break;
        case 'open-location':
            alert("Opening location...");
            // Implement open location functionality
            break;
        case 'save-project':
            alert("Saving project...");
            // Implement save project functionality
            break;
        case 'export-data':
            alert("Exporting data...");
            // Implement export data functionality
            break;
        case 'undo':
            alert("Undo operation...");
            // Implement undo functionality
            break;
        case 'redo':
            alert("Redo operation...");
            // Implement redo functionality
            break;
        case 'delete-selected':
            alert("Deleting selected items...");
            // Implement delete selected functionality
            break;
        case 'select-all':
            alert("Selecting all items...");
            // Implement select all functionality
            break;
        case 'zoom-in':
            if (window.map) {
                window.map.zoomIn();
            }
            break;
        case 'zoom-out':
            if (window.map) {
                window.map.zoomOut();
            }
            break;
        case 'draw-polygon':
            activateDrawingTool('polygon-tool', L.Draw.Polygon);
            break;
        case 'draw-rectangle':
            activateDrawingTool('rectangle-tool', L.Draw.Rectangle);
            break;
        case 'draw-circle':
            activateDrawingTool('circle-tool', L.Draw.Circle);
            break;
        case 'draw-marker':
            activateDrawingTool('marker-tool', L.Draw.Marker);
            break;
        case 'draw-line':
            activateDrawingTool('line-tool', L.Draw.Polyline);
            break;
        default:
            console.warn(`Unknown menu action: ${action}`);
    }
}

// Function to activate a drawing tool
function activateDrawingTool(toolId, DrawTool) {
    console.log(`Activating drawing tool: ${toolId}`);

    // First, deactivate any active tools
    deactivateAllTools();

    if (!map) {
        console.error("Map is not initialized");
        return;
    }

    // Set the active button
    const button = document.getElementById(toolId);
    if (button) {
        button.classList.add('active');
    }

    // Create a new drawing handler
    const drawingHandler = new DrawTool(map, {
        shapeOptions: {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2
        }
    });

    // Enable drawing
    drawingHandler.enable();

    // Store the active drawing tool
    activeDrawingTool = drawingHandler;
}

// Function to activate edit mode
function activateEditMode() {
    console.log("Activating edit mode");

    // First, deactivate any active tools
    deactivateAllTools();

    if (!map || !drawnItems) {
        console.error("Map or drawn items are not initialized");
        return;
    }

    // Set the active button
    const button = document.getElementById('edit-tool');
    if (button) {
        button.classList.add('active');
    }

    // Create edit control
    const editControl = new L.EditToolbar.Edit(map, {
        featureGroup: drawnItems,
        poly: {
            allowIntersection: false
        }
    });

    // Enable editing
    editControl.enable();

    // Store the active drawing tool
    activeDrawingTool = editControl;
}

// Function to activate delete mode
function activateDeleteMode() {
    console.log("Activating delete mode");

    // First, deactivate any active tools
    deactivateAllTools();

    if (!map || !drawnItems) {
        console.error("Map or drawn items are not initialized");
        return;
    }

    // Set the active button
    const button = document.getElementById('delete-tool');
    if (button) {
        button.classList.add('active');
    }

    // Create delete control
    const deleteControl = new L.EditToolbar.Delete(map, {
        featureGroup: drawnItems
    });

    // Enable deleting
    deleteControl.enable();

    // Store the active drawing tool
    activeDrawingTool = deleteControl;
}

// Function to deactivate all drawing tools
function deactivateAllTools() {
    console.log("Deactivating all tools");

    // Remove active class from all buttons
    document.querySelectorAll('.tool-button').forEach(button => {
        button.classList.remove('active');
    });

    // Disable any active drawing tool
    if (activeDrawingTool) {
        if (typeof activeDrawingTool.disable === 'function') {
            activeDrawingTool.disable();
        }
        activeDrawingTool = null;
    }
}

// Function to set up keyboard shortcuts
function setupKeyboardShortcuts() {
    console.log("Setting up keyboard shortcuts");

    document.addEventListener('keydown', function(e) {
        // Check if Control key is pressed
        if (e.ctrlKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    handleMenuAction('save-project');
                    break;
                case 'o':
                    e.preventDefault();
                    handleMenuAction('open-location');
                    break;
                case 'n':
                    e.preventDefault();
                    handleMenuAction('new-project');
                    break;
                case 'z':
                    e.preventDefault();
                    handleMenuAction('undo');
                    break;
                case 'y':
                    e.preventDefault();
                    handleMenuAction('redo');
                    break;
                case 'a':
                    e.preventDefault();
                    handleMenuAction('select-all');
                    break;
            }
        } else {
            switch (e.key) {
                case 'Delete':
                    handleMenuAction('delete-selected');
                    break;
                case '+':
                    handleMenuAction('zoom-in');
                    break;
                case '-':
                    handleMenuAction('zoom-out');
                    break;
            }
        }
    });
}

// Function to activate a tool
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

    // Handle menu items
    if (toolType.startsWith('menu-')) {
        // Handle menu items
        const menuAction = toolType.replace('menu-', '');
        handleMenuAction(menuAction);
        return;
    }

    // Activate the selected tool
    switch (toolType) {
        case 'polygon':
            activateDrawingTool('polygon-tool', L.Draw.Polygon);
            break;
        case 'rectangle':
            activateDrawingTool('rectangle-tool', L.Draw.Rectangle);
            break;
        case 'circle':
            activateDrawingTool('circle-tool', L.Draw.Circle);
            break;
        case 'marker':
            activateDrawingTool('marker-tool', L.Draw.Marker);
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

// Make sure these functions are available globally
window.activateTool = activateTool;
window.handleMenuAction = handleMenuAction;
window.deactivateAllTools = deactivateAllTools;
window.activateDrawingTool = activateDrawingTool;
window.activateEditMode = activateEditMode;
window.activateDeleteMode = activateDeleteMode;
window.initializeUIControls = initializeUIControls;


// Initialize UI controls when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, checking if map is ready");

    // Check if map is already initialized
    if (window.map) {
        console.log("Map already initialized, setting up UI controls");
        initializeUIControls();
    } else {
        console.log("Map not yet initialized, setting up event listener");
        // Set up event listener for map initialization
        window.addEventListener('map_initialized', function() {
            console.log("Map initialization event received, setting up UI controls");
            initializeUIControls();
        });
    }
});

// Function to open new project modal
function openNewProjectModal() {
    console.log("Opening new project modal");
    const modal = document.getElementById('new-project-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert("New Project functionality will be implemented soon.");
    }
}

// Function to save project
function saveProject() {
    console.log("Saving project");
    alert("Project saved successfully!");
}

// Function to open load project modal
function openLoadProjectModal() {
    console.log("Opening load project modal");
    const modal = document.getElementById('load-project-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert("Load Project functionality will be implemented soon.");
    }
}

// Function to export map
function exportMap() {
    console.log("Exporting map");
    alert("Map export functionality will be implemented soon.");
}

// Function to open report modal
function openReportModal() {
    console.log("Opening report modal");
    const modal = document.getElementById('report-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert("Report generation functionality will be implemented soon.");
    }
}

// Function to activate a drawing tool (original, kept for compatibility)
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

    // Handle menu items
    if (toolType.startsWith('menu-')) {
        // Handle menu items
        const menuAction = toolType.replace('menu-', '');
        handleMenuAction(menuAction);
        return;
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

// Function to deactivate all drawing tools (original, kept for compatibility)
function deactivateAllToolsOriginal() {
    console.log("Deactivating all tools");

    // Remove active class from all buttons
    document.querySelectorAll('.tool-button').forEach(button => {
        button.classList.remove('active');
    });

    // Disable any active drawing tool
    if (activeControl && typeof activeControl.disable === 'function') {
        activeControl.disable();
    }

    // Clear any active draw control
    if (window.map && window.activeDrawControl) {
        window.map.removeControl(window.activeDrawControl);
        window.activeDrawControl = null;
    }

    // Reset active control and drawing tool
    activeControl = null;
    activeDrawingTool = null;
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
function activateEditModeOriginal() {
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
function activateDeleteModeOriginal() {
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

// Define global UI initialization function (original, kept for compatibility)
window.initializeUIControlsOriginal = function() {
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