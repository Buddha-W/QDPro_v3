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
    }

    // Initialize drawn items if it exists in window object
    if (window.drawnItems) {
        drawnItems = window.drawnItems;
        console.log("Drawn items found in window object");
    } else {
        console.error("Drawn items not found in window object");
    }

    // Set up UI components
    setupToolButtons();
    setupMenuItems();

    // Add event listeners for keyboard shortcuts
    setupKeyboardShortcuts();
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

// Function to activate a drawing tool
function activateDrawingTool(toolId, DrawTool) {
    console.log(`Activating drawing tool: ${toolId}`);

    // Deactivate any active tool
    deactivateAllTools();

    // Highlight the selected tool button
    document.getElementById(toolId).classList.add('active');

    // Create new drawing handler if needed
    if (!drawControl) {
        drawControl = new DrawTool(map);
    } else {
        // If the drawing control exists but is of different type, create a new one
        if (!(drawControl instanceof DrawTool)) {
            drawControl.disable();
            drawControl = new DrawTool(map);
        }
    }

    // Enable the drawing control
    drawControl.enable();

    // Set active drawing tool
    activeDrawingTool = toolId;

    // Update status message
    updateStatusMessage(`Drawing tool activated: ${toolId}`);
}

// Function to deactivate all tools
function deactivateAllTools() {
    console.log("Deactivating all tools");

    // Remove active class from all tool buttons
    document.querySelectorAll('.tool-button').forEach(button => {
        button.classList.remove('active');
    });

    // Disable drawing control if it exists
    if (drawControl) {
        drawControl.disable();
    }

    // Reset active drawing tool
    activeDrawingTool = null;

    // Disable edit mode
    if (map && map.editTools) {
        map.editTools.stopDrawing();
    }

    // Update status message
    updateStatusMessage("No tool selected");
}

// Function to activate edit mode
function activateEditMode() {
    console.log("Activating edit mode");

    // Deactivate all tools first
    deactivateAllTools();

    // Highlight the edit button
    const editButton = document.getElementById('edit-tool');
    if (editButton) {
        editButton.classList.add('active');
    }

    // Enable edit mode for all layers
    if (drawnItems) {
        drawnItems.eachLayer(function(layer) {
            if (layer.editing) {
                layer.editing.enable();
            }
        });
    }

    // Update status message
    updateStatusMessage("Edit mode activated");
}

// Function to activate delete mode
function activateDeleteMode() {
    console.log("Activating delete mode");

    // Deactivate all tools first
    deactivateAllTools();

    // Highlight the delete button
    const deleteButton = document.getElementById('delete-tool');
    if (deleteButton) {
        deleteButton.classList.add('active');
    }

    // Enable delete mode for all layers
    if (map && drawnItems) {
        map.on('click', function deleteLayer(e) {
            drawnItems.eachLayer(function(layer) {
                if (layer instanceof L.Path && layer.getBounds().contains(e.latlng)) {
                    drawnItems.removeLayer(layer);
                } else if (layer instanceof L.Marker && layer.getLatLng().equals(e.latlng)) {
                    drawnItems.removeLayer(layer);
                }
            });
        });

        // Update status message
        updateStatusMessage("Delete mode activated. Click on a shape to delete it.");
    }
}

// Function to update status message
function updateStatusMessage(message) {
    console.log(`Status: ${message}`);

    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Function to set up keyboard shortcuts
function setupKeyboardShortcuts() {
    console.log("Setting up keyboard shortcuts...");

    document.addEventListener('keydown', function(e) {
        // Escape key deactivates all tools
        if (e.key === 'Escape') {
            deactivateAllTools();
        }

        // Ctrl+Z for undo
        if (e.ctrlKey && e.key === 'z') {
            handleMenuAction('undo');
        }

        // Ctrl+Y for redo
        if (e.ctrlKey && e.key === 'y') {
            handleMenuAction('redo');
        }
    });
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

    // Set up dropdown toggle behavior
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const dropdownContent = this.querySelector('.dropdown-content');
            if (dropdownContent) {
                dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-item')) {
            const dropdownContents = document.querySelectorAll('.dropdown-content');
            dropdownContents.forEach(content => {
                content.style.display = 'none';
            });
        }
    });

    // Setup specific menu buttons
    setupFileMenuButtons();
    setupEditMenuButtons();
    setupViewMenuButtons();
    setupToolsMenuButtons();
    setupHelpMenuButtons();
}

// Function to set up file menu buttons
function setupFileMenuButtons() {
    const newBtn = document.getElementById('file-new');
    if (newBtn) {
        newBtn.addEventListener('click', function() {
            handleMenuAction('new-project');
        });
    }

    const openBtn = document.getElementById('file-open');
    if (openBtn) {
        openBtn.addEventListener('click', function() {
            handleMenuAction('open-location');
        });
    }

    const saveBtn = document.getElementById('file-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            handleMenuAction('save-project');
        });
    }

    const exportBtn = document.getElementById('file-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            handleMenuAction('export-data');
        });
    }
}

// Function to set up edit menu buttons
function setupEditMenuButtons() {
    const undoBtn = document.getElementById('edit-undo');
    if (undoBtn) {
        undoBtn.addEventListener('click', function() {
            handleMenuAction('undo');
        });
    }

    const redoBtn = document.getElementById('edit-redo');
    if (redoBtn) {
        redoBtn.addEventListener('click', function() {
            handleMenuAction('redo');
        });
    }

    const deleteBtn = document.getElementById('edit-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            handleMenuAction('delete-selected');
        });
    }

    const selectAllBtn = document.getElementById('edit-select-all');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            handleMenuAction('select-all');
        });
    }
}

// Function to set up view menu buttons
function setupViewMenuButtons() {
    const zoomInBtn = document.getElementById('view-zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            handleMenuAction('zoom-in');
        });
    }

    const zoomOutBtn = document.getElementById('view-zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            handleMenuAction('zoom-out');
        });
    }
}

// Function to set up tools menu buttons
function setupToolsMenuButtons() {
    const calcQDBtn = document.getElementById('tools-qd');
    if (calcQDBtn) {
        calcQDBtn.addEventListener('click', function() {
            handleMenuAction('calculate-qd');
        });
    }

    const measureBtn = document.getElementById('tools-measure');
    if (measureBtn) {
        measureBtn.addEventListener('click', function() {
            handleMenuAction('measure-distance');
        });
    }
}

// Function to set up help menu buttons
function setupHelpMenuButtons() {
    const userGuideBtn = document.getElementById('help-guide');
    if (userGuideBtn) {
        userGuideBtn.addEventListener('click', function() {
            handleMenuAction('user-guide');
        });
    }

    const aboutBtn = document.getElementById('help-about');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', function() {
            handleMenuAction('about');
        });
    }
}

// Function to handle menu actions
function handleMenuAction(action, element) {
    console.log(`Handling menu action: ${action}`);

    switch (action) {
        case 'new-project':
            alert("Creating new project...");
            // Implement or call your new project function here
            break;
        case 'open-location':
            alert("Opening location...");
            // Implement or call your open location function here
            break;
        case 'save-project':
            alert("Saving project...");
            // Implement or call your save project function here
            break;
        case 'export-data':
            alert("Exporting data...");
            // Implement or call your export data function here
            break;
        case 'undo':
            alert("Undo operation...");
            // Implement undo functionality here
            break;
        case 'redo':
            alert("Redo operation...");
            // Implement redo functionality here
            break;
        case 'delete-selected':
            alert("Deleting selected items...");
            // Implement delete selected functionality here
            break;
        case 'select-all':
            alert("Selecting all items...");
            // Implement select all functionality here
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
        case 'calculate-qd':
            alert("Calculating QD is currently under development");
            break;
        case 'measure-distance':
            alert("Measuring distance is currently under development");
            break;
        case 'user-guide':
            alert("User guide is currently under development");
            break;
        case 'about':
            alert("QDPro - Explosive Safety Siting System\nVersion 1.0");
            break;
        default:
            console.warn(`Unknown menu action: ${action}`);
            alert(`Action '${action}' is not implemented yet.`);
    }
}

// Export functions to window object for global access
window.initializeUIControls = initializeUIControls;
window.handleMenuAction = handleMenuAction;
window.activateDrawingTool = activateDrawingTool;
window.deactivateAllTools = deactivateAllTools;
window.activateEditMode = activateEditMode;
window.activateDeleteMode = activateDeleteMode;


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