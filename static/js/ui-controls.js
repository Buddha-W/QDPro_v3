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

    // Set up the UI
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

    // Get all tool buttons
    const toolButtons = document.querySelectorAll('.tool-button');

    if (toolButtons.length === 0) {
        console.error("No tool buttons found");
        return;
    }

    console.log(`Found ${toolButtons.length} tool buttons`);

    // Add click event listeners to each button
    toolButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tool = this.getAttribute('data-tool');
            console.log(`Tool button clicked: ${tool}`);

            // Handle the tool activation
            switch(tool) {
                case 'polygon':
                    activateDrawingTool('polygon');
                    break;
                case 'rectangle':
                    activateDrawingTool('rectangle');
                    break;
                case 'marker':
                    activateDrawingTool('marker');
                    break;
                case 'circle':
                    activateDrawingTool('circle');
                    break;
                case 'edit':
                    activateEditMode();
                    break;
                case 'delete':
                    activateDeleteMode();
                    break;
                case 'layers':
                    // Already handled by direct event listener in HTML
                    break;
                default:
                    console.warn(`Unknown tool: ${tool}`);
            }
        });
    });

    // Set up direct click handlers for buttons with IDs
    setupDirectButtonHandlers();
}

// Setup direct button handlers for specific buttons
function setupDirectButtonHandlers() {
    console.log("Setting up direct button handlers...");

    // Basic map control buttons
    const zoomInBtn = document.getElementById('zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            console.log("Zoom in clicked");
            if (map) map.zoomIn();
        });
    }

    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            console.log("Zoom out clicked");
            if (map) map.zoomOut();
        });
    }

    const resetViewBtn = document.getElementById('reset-view');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function() {
            console.log("Reset view clicked");
            if (map) map.setView([39.8283, -98.5795], 4);
        });
    }

    const measureDistanceBtn = document.getElementById('measure-distance');
    if (measureDistanceBtn) {
        measureDistanceBtn.addEventListener('click', function() {
            console.log("Measure distance clicked");
            alert("Measuring distance is currently under development");
        });
    }

    const calculateQdBtn = document.getElementById('calculate-qd');
    if (calculateQdBtn) {
        calculateQdBtn.addEventListener('click', function() {
            console.log("Calculate QD clicked");
            alert("Calculating QD is currently under development");
        });
    }

    const generateReportBtn = document.getElementById('generate-report');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', function() {
            console.log("Generate report clicked");
            alert("Generating reports is currently under development");
        });
    }

    const userGuideBtn = document.getElementById('user-guide');
    if (userGuideBtn) {
        userGuideBtn.addEventListener('click', function() {
            console.log("User guide clicked");
            alert("User guide is currently under development");
        });
    }

    const aboutBtn = document.getElementById('about');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', function() {
            console.log("About clicked");
            alert("About section is currently under development");
        });
    }
}

// Function to set up menu items
function setupMenuItems() {
    console.log("Setting up menu items...");

    // Get all menu items
    const menuItems = document.querySelectorAll('.menu-item');

    if (menuItems.length === 0) {
        console.error("No menu items found");
        return;
    }

    console.log(`Found ${menuItems.length} menu items`);

    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Toggle dropdown
            const dropdown = this.querySelector('.dropdown-content');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    });

    // Handle dropdown item clicks
    const dropdownItems = document.querySelectorAll('.dropdown-item');

    if (dropdownItems.length === 0) {
        console.error("No dropdown items found");
    } else {
        console.log(`Found ${dropdownItems.length} dropdown items`);

        dropdownItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const action = this.getAttribute('data-action');
                console.log(`Dropdown item clicked: ${action}`);

                // Handle the action
                handleMenuAction(action, this);
            });
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-item')) {
            const dropdownContents = document.querySelectorAll('.dropdown-content');
            dropdownContents.forEach(content => {
                content.style.display = 'none';
            });
        }
    });
}

// Function to handle menu actions
function handleMenuAction(action, element) {
    console.log(`Handling menu action: ${action}`);

    switch (action) {
        case 'new-project':
            alert("Creating new project...");
            clearMap();
            break;

        case 'open-location':
            alert("Opening location...");
            // Implementation for opening location
            break;

        case 'save-project':
            alert("Saving project...");
            saveProject();
            break;

        case 'export-data':
            alert("Exporting data...");
            exportData();
            break;

        case 'undo':
            alert("Undo operation...");
            if (window.undoManager) window.undoManager.undo();
            break;

        case 'redo':
            alert("Redo operation...");
            if (window.undoManager) window.undoManager.redo();
            break;

        case 'delete-selected':
            alert("Deleting selected items...");
            deleteSelected();
            break;

        case 'select-all':
            alert("Selecting all items...");
            selectAll();
            break;

        case 'zoom-in':
            if (map) map.zoomIn();
            break;

        case 'zoom-out':
            if (map) map.zoomOut();
            break;

        default:
            console.warn(`Unknown menu action: ${action}`);
            alert(`Action "${action}" is currently under development`);
    }
}

// Function to set up side panel toggle
function setupSidePanelToggle() {
    console.log("Setting up side panel toggle...");

    const sidePanelToggle = document.getElementById('toggle-side-panel');
    if (sidePanelToggle) {
        sidePanelToggle.addEventListener('click', function() {
            const sidePanel = document.querySelector('.side-panel');
            if (sidePanel) {
                sidePanel.classList.toggle('visible');
                this.classList.toggle('active');
            }
        });
    }
}

// Function to activate drawing tool
function activateDrawingTool(toolType) {
    console.log(`Activating drawing tool: ${toolType}`);

    if (!map) {
        console.error("Map is not initialized");
        return;
    }

    // Deactivate any active tools first
    deactivateAllTools();

    // Create and enable the appropriate drawing control
    try {
        let drawOptions = {
            shapeOptions: {
                color: '#3388ff',
                weight: 4
            }
        };

        switch(toolType) {
            case 'polygon':
                activeDrawingTool = new L.Draw.Polygon(map, drawOptions);
                break;
            case 'rectangle':
                activeDrawingTool = new L.Draw.Rectangle(map, drawOptions);
                break;
            case 'marker':
                activeDrawingTool = new L.Draw.Marker(map);
                break;
            case 'circle':
                activeDrawingTool = new L.Draw.Circle(map, drawOptions);
                break;
            default:
                console.warn(`Unknown drawing tool type: ${toolType}`);
                return;
        }

        activeDrawingTool.enable();
        updateButtonStates(toolType);

    } catch (error) {
        console.error(`Error creating drawing tool: ${error.message}`);
        alert(`Drawing tool "${toolType}" could not be initialized. Make sure Leaflet.draw is properly loaded.`);
    }
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
    try {
        const editHandler = new L.EditToolbar.Edit(map, {
            featureGroup: drawnItems,
            selectedPathOptions: {
                maintainColor: true,
                dashArray: '10, 10'
            }
        });

        editHandler.enable();
        activeDrawingTool = editHandler;
        updateButtonStates('edit');

    } catch (error) {
        console.error(`Error creating edit tool: ${error.message}`);
        alert("Edit functionality is being set up. Make sure Leaflet.draw is properly loaded.");
    }
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
    try {
        const deleteHandler = new L.EditToolbar.Delete(map, {
            featureGroup: drawnItems
        });

        deleteHandler.enable();
        activeDrawingTool = deleteHandler;
        updateButtonStates('delete');

    } catch (error) {
        console.error(`Error creating delete tool: ${error.message}`);
        alert("Delete functionality is being set up. Make sure Leaflet.draw is properly loaded.");
    }
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

// Function to update button states based on active tool
function updateButtonStates(activeTool = null) {
    console.log(`Updating button states, active tool: ${activeTool}`);

    // Reset all buttons first
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Set active button if any
    if (activeTool) {
        const activeButton = document.querySelector(`.tool-button[data-tool="${activeTool}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}

// Function to clear the map
function clearMap() {
    console.log("Clearing the map");

    if (!drawnItems) {
        console.error("Drawn items not initialized");
        return;
    }

    // Remove all layers from drawn items
    drawnItems.clearLayers();

    // Reset any active tools
    deactivateAllTools();

    console.log("Map cleared");
}

// Function to save the current project
function saveProject() {
    console.log("Saving project");
    alert("Save project functionality is currently under development");
    // Implementation for saving project data
}

// Function to export data
function exportData() {
    console.log("Exporting data");
    alert("Export data functionality is currently under development");
    // Implementation for exporting data
}

// Function to delete selected items
function deleteSelected() {
    console.log("Deleting selected items");

    if (!drawnItems) {
        console.error("Drawn items not initialized");
        return;
    }

    // Implementation depends on how selection is handled
    // For now, just showing an alert
    alert("Delete selected functionality is currently under development");
}

// Function to select all items
function selectAll() {
    console.log("Selecting all items");

    if (!drawnItems) {
        console.error("Drawn items not initialized");
        return;
    }

    // Implementation depends on how selection is handled
    // For now, just showing an alert
    alert("Select all functionality is currently under development");
}

// Register the function to be called when the window is loaded
window.addEventListener('load', function() {
    console.log("Window loaded, initializing UI controls");
    if (typeof window.initializeUIControls === 'function') {
        window.initializeUIControls();
    }
});

// Make functions available globally
window.initializeUIControls = initializeUIControls;
window.handleMenuAction = handleMenuAction;
window.activateDrawingTool = activateDrawingTool;
window.activateEditMode = activateEditMode;
window.activateDeleteMode = activateDeleteMode;
window.deactivateAllTools = deactivateAllTools;
window.clearMap = clearMap;
window.setupUI = setupUI; // Added setupUI to global scope


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
window.setupToolButtons = setupToolButtons;
window.setupMenuItems = setupMenuItems;
window.setupSidePanelToggle = setupSidePanelToggle;
window.setupDirectButtonHandlers = setupDirectButtonHandlers;
window.saveProject = saveProject;
window.exportData = exportData;
window.deleteSelected = deleteSelected;
window.selectAll = selectAll;
window.openNewProjectModal = openNewProjectModal;
window.openLoadProjectModal = openLoadProjectModal;
window.exportMap = exportMap;
window.openReportModal = openReportModal;
window.createNewProject = createNewProject;
window.openProject = openProject;
window.exportToPDF = exportToPDF;
window.exportToShapefile = exportToShapefile;
window.openEditPopup = openEditPopup;
window.updateLayerStyle = updateLayerStyle;