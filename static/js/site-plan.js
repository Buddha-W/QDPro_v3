
// This file contains site-specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // Prevent form submissions from reloading the page
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            // Any form submissions will be handled by other event listeners
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(function(modal) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Load locations for the Open Project modal
    document.getElementById('open-project-btn').addEventListener('click', async function() {
        const modal = document.getElementById('open-project-modal');
        const projectsList = document.getElementById('projects-list');
        
        try {
            // Try to load locations from API if available
            const response = await fetch('/api/locations');
            const data = await response.json();
            
            projectsList.innerHTML = '';
            
            if (data.locations && data.locations.length > 0) {
                data.locations.forEach(location => {
                    const div = document.createElement('div');
                    div.className = 'project-item';
                    div.textContent = location.name;
                    div.dataset.id = location.id;
                    div.addEventListener('click', function() {
                        switchToLocation(location.id);
                        modal.style.display = 'none';
                    });
                    projectsList.appendChild(div);
                });
            } else {
                projectsList.innerHTML = '<div class="no-projects">No saved projects found</div>';
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            projectsList.innerHTML = '<div class="error">Failed to load projects</div>';
        }
        
        modal.style.display = 'block';
    });
    
    // New Project button
    document.getElementById('new-project-btn').addEventListener('click', function() {
        document.getElementById('new-project-modal').style.display = 'block';
    });
    
    // Handle new project form submission
    document.getElementById('new-project-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const projectName = document.getElementById('new-project-name').value;
        
        try {
            const response = await fetch('/api/create_location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ location_name: projectName }),
            });
            
            if (response.ok) {
                const data = await response.json();
                // Clear all layers
                Object.values(window.featureGroups).forEach(group => group.clearLayers());
                document.getElementById('new-project-modal').style.display = 'none';
                alert(`New project "${projectName}" created successfully`);
            } else {
                alert('Failed to create new project');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('An error occurred while creating the project');
        }
    });
    
    // Function to switch to a different location/project
    async function switchToLocation(locationId) {
        try {
            const response = await fetch(`/api/load_location/${locationId}`);
            const data = await response.json();
            
            // Clear existing layers
            Object.values(window.featureGroups).forEach(group => group.clearLayers());
            
            // Load facilities and other features
            if (data.facilities && data.facilities.length > 0) {
                data.facilities.forEach(facility => {
                    const layer = L.geoJSON(facility);
                    window.featureGroups.facilities.addLayer(layer);
                });
            }
            
            if (data.qdArcs && data.qdArcs.length > 0) {
                data.qdArcs.forEach(arc => {
                    const layer = L.geoJSON(arc);
                    window.featureGroups.safetyArcs.addLayer(layer);
                });
            }
            
            if (data.analysis && data.analysis.length > 0) {
                data.analysis.forEach(result => {
                    const layer = L.geoJSON(result);
                    window.featureGroups.pesLocations.addLayer(layer);
                });
            }
            
            console.log(`Switched to location: ${data.location_name}`);
        } catch (error) {
            console.error('Error switching location:', error);
            alert('Failed to load the selected project');
        }
    }
});
