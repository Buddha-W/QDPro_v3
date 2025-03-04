function setupToolButtons() {
    console.log("Setting up tool buttons...");
    const toolButtons = document.querySelectorAll('.toolbar-button[data-tool]');
    console.log(`Found ${toolButtons.length} tool buttons`);

    toolButtons.forEach(button => {
        button.addEventListener('click', function() {
            const toolName = this.getAttribute('data-tool');
            if (typeof window.activateTool === 'function') {
                window.activateTool(toolName);
            } else {
                console.warn(`Tool activation function not available for: ${toolName}`);
            }

            // Deactivate all buttons first
            toolButtons.forEach(btn => btn.classList.remove('active'));

            // Then activate the clicked one
            this.classList.add('active');
        });
    });
}

function initializeUIControls() {
    console.log("initializeUIControls called");

    if (!ensureMapInitialized()) {
        console.error("Map initialization failed, aborting UI controls setup");
        return;
    }

    console.log("Setting up UI with map:", window.map);
    setupToolButtons();


    // ... (rest of initializeUIControls function, if any) ...

    const layerControlButtons = document.querySelectorAll('.layer-control-button');
    layerControlButtons.forEach(button => {
        const layerId = button.getAttribute('data-layer');
        let layer = window.getLayer(layerId); //Assumed function exists

        // Check if map exists and the layer is already added to map
        if (window.map && typeof window.map.hasLayer === 'function' && window.map.hasLayer(layer)) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            if (window.map) {
                if (window.map.hasLayer(layer)) {
                    window.map.removeLayer(layer);
                    button.classList.remove('active');
                } else {
                    window.map.addLayer(layer);
                    button.classList.add('active');
                }
            } else {
                console.error("Map not initialized. Cannot add/remove layer.");
            }
        });
    });
}


// Placeholder for ensureMapInitialized -  replace with actual implementation
function ensureMapInitialized() {
    // Add your map initialization logic here.  This should ensure window.map is properly set.
    // Example:  Check if map is already initialized, or initialize it if not
    if (window.map) return true; //map already exists

    //Attempt to initialize the map
    try{
        //Your map initialization code here
        window.map = L.map('map').setView([51.505, -0.09], 13); //Example
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(window.map);

        return true;

    } catch(e){
        console.error("Map initialization failed:",e);
        return false;
    }
}