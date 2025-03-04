
// Global UI control initialization function
window.initializeUIControls = function() {
    console.log("UI Controls initialized");
    setupToolButtons();
};

function setupToolButtons() {
    console.log("Setting up tool buttons...");
    if (!window.map || typeof window.map !== 'object') {
        console.warn("Map is not initialized.");
        return;
    }
    
    // Create the toolbar if it doesn't exist
    let toolbar = document.querySelector('.toolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'toolbar';
        document.querySelector('#map-container').appendChild(toolbar);
    }
    
    // Add zoom buttons to the toolbar
    const zoomInButton = document.createElement('button');
    zoomInButton.className = 'tool-button';
    zoomInButton.innerHTML = '<i class="fa fa-plus"></i>';
    zoomInButton.title = 'Zoom In';
    zoomInButton.onclick = function() {
        if (window.map) {
            window.map.zoomIn();
        }
    };
    
    const zoomOutButton = document.createElement('button');
    zoomOutButton.className = 'tool-button';
    zoomOutButton.innerHTML = '<i class="fa fa-minus"></i>';
    zoomOutButton.title = 'Zoom Out';
    zoomOutButton.onclick = function() {
        if (window.map) {
            window.map.zoomOut();
        }
    };
    
    // Add zoom buttons to the toolbar
    toolbar.appendChild(zoomInButton);
    toolbar.appendChild(zoomOutButton);
    
    // Check if drawnItems layer is already added to the map
    if (window.drawnItems && window.map) {
        try {
            // Safer check for hasLayer method
            if (window.map.hasLayer && typeof window.map.hasLayer === 'function') {
                if (!window.map.hasLayer(window.drawnItems)) {
                    window.map.addLayer(window.drawnItems);
                }
            } else {
                // Fallback if hasLayer is not available
                console.log("hasLayer function not available, trying direct addLayer");
                try {
                    window.map.addLayer(window.drawnItems);
                } catch (layerError) {
                    console.error("Could not add drawnItems layer:", layerError);
                }
            }
                window.map.addLayer(window.drawnItems);
            }
        } catch (e) {
            console.error("Error adding drawnItems layer:", e);
        }
    }
}

// Add event listener to initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.map) {
        console.log("Map already loaded, initializing UI immediately");
        setupToolButtons();
    } else {
        console.log("Map not loaded yet, waiting for initialization");
    }
});
