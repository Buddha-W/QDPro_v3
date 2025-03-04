function setupToolButtons() {
    console.log("Setting up tool buttons...");
    if (!window.map || typeof window.map !== 'object') {
        console.warn("Map is not initialized.");
        return;
    }

    // Check if drawnItems layer is already added to the map
    if (window.drawnItems && typeof window.map.hasLayer === 'function') {
        if (!window.map.hasLayer(window.drawnItems)) {
            window.map.addLayer(window.drawnItems);
        }
    } else if (window.drawnItems) {
        try {
            window.map.addLayer(window.drawnItems);
        } catch (e) {
            console.error("Error adding drawnItems layer:", e);
        }
    }
}