// UI Controls for QDPro

// Global variables to track active tools and states
let activeDrawingTool = null;
let isEditMode = false;
let isDeleteMode = false;
let map = null;
let drawnItems = null;

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

    setupUI();

    console.log("UI Controls setup complete");
}


// Main UI setup function
function setupUI() {
    console.log("Setting up UI with map:", map);
    if (!map) {
        console.error("Map is not initialized yet");
        return;
    }

    setupToolButtons();
    setupMenuItems();
    setupSidePanelToggle();

    // Log success
    console.log("UI setup complete");
}

// Function to set up tool buttons
function setupToolButtons() {
    console.log("Setting up tool buttons...");

    // Define drawing tool types
    const toolButtons = {
        'polygon-tool': 'polygon',
        'rectangle-tool': 'rectangle',
        'circle-tool': 'circle',
        'marker-tool': 'marker',
        'line-tool': 'polyline'
    };

    // Set up drawing tool buttons
    for (const [buttonId, toolType] of Object.entries(toolButtons)) {
        const button = document.getElementById(buttonId);
        if (button) {
            console.log(`Found button: ${buttonId}`);
            button.addEventListener('click', function(e) {
                e.preventDefault();
                console.log(`Clicked ${buttonId}`);
                activateTool(toolType, button);
            });
        }
    }

    // Set up edit and delete buttons
    const editButton = document.getElementById('edit-tool');
    if (editButton) {
        editButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Clicked edit tool");
            activateTool('edit', editButton);
        });
    } else {
        console.warn("Edit button not found");
    }

    const deleteButton = document.getElementById('delete-tool');
    if (deleteButton) {
        deleteButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Clicked delete tool");
            activateTool('delete', deleteButton);
        });
    } else {
        console.warn("Delete button not found");
    }
}

// Function to set up menu items
function setupMenuItems() {
    console.log("Setting up menu items...");

    // Get all dropdown items
    const dropdownItems = document.querySelectorAll('.dropdown-item');

    if (dropdownItems.length === 0) {
        console.error("No dropdown items found");
    } else {
        console.log(`Found ${dropdownItems.length} dropdown items`);
    }

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

    // Direct button handlers for important functions
    const fileNewBtn = document.getElementById('file-new');
    if (fileNewBtn) {
        fileNewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("File > New clicked directly");
            if (confirm("Create new location? Current work will be lost if unsaved.")) {
                // Clear the current layers
                clearMap();
            }
        });
    }

    const openLocationBtn = document.getElementById('open-location');
    if (openLocationBtn) {
        openLocationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Open Location clicked directly");
            alert("Open location functionality is being set up.");
        });
    }

    const saveProjectBtn = document.getElementById('save-project');
    if (saveProjectBtn) {
        saveProjectBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Save Project clicked directly");
            alert("Save project functionality is being set up.");
        });
    }
}

// Handle menu actions
function handleMenuAction(action, element) {
    console.log(`Handling menu action: ${action}`);

    switch (action) {
        case 'new-project':
            alert("Creating new project...");
            clearMap();
            break;
        case 'open-location':
            alert("Opening location...");
            break;
        case 'save-project':
            alert("Saving project...");
            break;
        case 'export-data':
            alert("Exporting data...");
            break;
        case 'undo':
            alert("Undo operation...");
            break;
        case 'redo':
            alert("Redo operation...");
            break;
        case 'delete-selected':
            alert("Deleting selected items...");
            break;
        case 'select-all':
            alert("Selecting all items...");
            break;
        case 'zoom-in':
            if (map) {
                map.zoomIn();
            }
            break;
        case 'zoom-out':
            if (map) {
                map.zoomOut();
            }
            break;
        default:
            console.warn(`Unknown menu action: ${action}`);
    }

    // Close the dropdown after action
    const dropdownContent = element.closest('.dropdown-content');
    if (dropdownContent) {
        dropdownContent.style.display = 'none';
    }
}

// Function to set up side panel toggle
function setupSidePanelToggle() {
    const layersPanelToggle = document.getElementById('layers-panel-toggle');
    const layersPanel = document.querySelector('.layers-panel');

    if (layersPanelToggle && layersPanel) {
        layersPanelToggle.addEventListener('click', function() {
            layersPanel.classList.toggle('visible');
        });
    }
}

// Function to clear the map
function clearMap() {
    console.log("Clearing map...");
    if (drawnItems) {
        drawnItems.clearLayers();
    } else if (map) {
        // Fallback if drawnItems isn't available
        map.eachLayer(function(layer) {
            if (layer instanceof L.Path || layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
    }
}

// Function to activate a tool
function activateTool(toolType, button) {
    console.log(`Activating tool: ${toolType}`);

    // First, deactivate any active tool
    deactivateAllTools();

    if (!map) {
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
            activateDrawingTool(L.Draw.Polygon);
            break;
        case 'rectangle':
            activateDrawingTool(L.Draw.Rectangle);
            break;
        case 'circle':
            activateDrawingTool(L.Draw.Circle);
            break;
        case 'marker':
            activateDrawingTool(L.Draw.Marker);
            break;
        case 'polyline':
            activateDrawingTool(L.Draw.Polyline);
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

// Function to activate a specific drawing tool
function activateDrawingTool(DrawTool) {
    console.log(`Activating drawing tool: ${DrawTool.name}`);

    if (!map) {
        console.error("Map is not initialized");
        return;
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

    if (!map || !drawnItems) {
        console.error("Map or drawn items are not initialized");
        return;
    }

    isEditMode = true;
    isDeleteMode = false;

    // Create edit control
    if (typeof L.EditToolbar !== 'undefined' && typeof L.EditToolbar.Edit !== 'undefined') {
        const editControl = new L.EditToolbar.Edit(map, {
            featureGroup: drawnItems
        });
        editControl.enable();
        activeDrawingTool = editControl;
    } else {
        console.error("L.EditToolbar.Edit is not defined");
        alert("Edit functionality is being set up.");
    }

    updateButtonStates();
}

// Function to activate delete mode
function activateDeleteMode() {
    console.log("Activating delete mode");

    if (!map || !drawnItems) {
        console.error("Map or drawn items are not initialized");
        return;
    }

    isDeleteMode = true;
    isEditMode = false;

    // Create delete control
    if (typeof L.EditToolbar !== 'undefined' && typeof L.EditToolbar.Delete !== 'undefined') {
        const deleteControl = new L.EditToolbar.Delete(map, {
            featureGroup: drawnItems
        });
        deleteControl.enable();
        activeDrawingTool = deleteControl;
    } else {
        console.error("L.EditToolbar.Delete is not defined");
        alert("Delete functionality is being set up.");
    }

    updateButtonStates();
}

// Function to deactivate all drawing tools
function deactivateAllTools() {
    console.log("Deactivating all tools");

    // Disable any active drawing tool
    if (activeDrawingTool && typeof activeDrawingTool.disable === 'function') {
        activeDrawingTool.disable();
    }
    activeDrawingTool = null;

    // Reset mode flags
    isEditMode = false;
    isDeleteMode = false;

    // Reset button states
    updateButtonStates();
}

// Update the styles of toolbar buttons based on active states
function updateButtonStates() {
    const toolButtons = document.querySelectorAll('.toolbar .tool-button');
    toolButtons.forEach(button => {
        button.classList.remove('active');
    });

    if (isEditMode) {
        const editButton = document.getElementById('edit-tool');
        if (editButton) editButton.classList.add('active');
    } else if (isDeleteMode) {
        const deleteButton = document.getElementById('delete-tool');
        if (deleteButton) deleteButton.classList.add('active');
    }
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


// Make sure these functions are available globally
window.activateTool = activateTool;
window.handleMenuAction = handleMenuAction;
window.deactivateAllTools = deactivateAllTools;
window.activateDrawingTool = activateDrawingTool;
window.activateEditMode = activateEditMode;
window.activateDeleteMode = activateDeleteMode;
window.initializeUIControls = initializeUIControls;
window.clearMap = clearMap; // Added clearMap to global scope
window.setupUI = setupUI; // Added setupUI to global scope


// Wait for document to fully load
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded, setting up UI controls...");

    // Store references to map and drawn items when available
    window.addEventListener('map_initialized', function() {
        console.log("Map initialized event received");
        map = window.map;
        drawnItems = window.drawnItems;
        setupUI();
    });

    // Initialize UI controls (this function will be called from map-init.js)
    window.initializeUIControls = function() {
        console.log("initializeUIControls called");
        map = window.map;
        drawnItems = window.drawnItems;
        setupUI();
    };
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