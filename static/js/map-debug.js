// Debug script to ensure map is loading properly
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, checking map initialization...');

  // Check if map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container element not found!');
    return;
  }

  console.log('Map container found, dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);

  // Check if Leaflet is loaded
  if (!window.L) {
    console.error('Leaflet library not loaded!');
    return;
  }

  console.log('Leaflet library loaded correctly');

  // Check if map object exists
  if (!window.map) {
    console.log('Map object not initialized yet, this might be normal if initialization happens after this script');
  } else {
    console.log('Map object exists');
  }

  // Listen for map initialization
  const checkMapInterval = setInterval(function() {
    if (window.map && window.map instanceof L.Map) {
      console.log('Map successfully initialized');
      clearInterval(checkMapInterval);

      // Setup QD analysis debugging
      setupQDDebugging();
    }
  }, 500);

  // Timeout after 10 seconds
  setTimeout(function() {
    clearInterval(checkMapInterval);
    if (!window.map || !(window.map instanceof L.Map)) {
      console.error('Map failed to initialize within timeout period');
    }
  }, 10000);
});

// Add QD Analysis debugging helpers
function setupQDDebugging() {
  // Monkey patch the runQDAnalysis function to add logging
  if (window.runQDAnalysis) {
    const originalRunQDAnalysis = window.runQDAnalysis;
    window.runQDAnalysis = function(...args) {
      console.log('QD Analysis called with:', args);
      const selectedFeatures = args[0];

      // Debug the features being analyzed
      selectedFeatures.forEach((feature, index) => {
        console.log(`Feature ${index+1}:`, {
          id: feature.id,
          type: feature.geometry.type,
          properties: feature.properties,
          has_explosive: feature.properties?.has_explosive,
          net_explosive_weight: feature.properties?.net_explosive_weight,
          unit: feature.properties?.unit
        });
      });

      return originalRunQDAnalysis.apply(this, args);
    };

    console.log('QD Analysis debugging enabled');
  }

  // Add helper to calculate distance between two features
  window.calculateDistance = function(feature1, feature2) {
    try {
      // Simple centroid-based distance for demonstration
      const getCentroid = (geometry) => {
        if (geometry.type === 'Point') {
          return geometry.coordinates;
        }

        // For polygons, calculate average of all points
        if (geometry.type === 'Polygon') {
          const coords = geometry.coordinates[0]; // Outer ring
          const sumX = coords.reduce((sum, p) => sum + p[0], 0);
          const sumY = coords.reduce((sum, p) => sum + p[1], 0);
          return [sumX / coords.length, sumY / coords.length];
        }

        return [0, 0]; // Default
      };

      const centroid1 = getCentroid(feature1.geometry);
      const centroid2 = getCentroid(feature2.geometry);

      // Calculate Euclidean distance (this is simplified - real-world would use geodesic distance)
      const dx = centroid1[0] - centroid2[0];
      const dy = centroid1[1] - centroid2[1];
      const distance = Math.sqrt(dx*dx + dy*dy);

      // Convert to approximate meters (very rough approximation)
      const distanceMeters = distance * 111000; // roughly 111km per degree

      console.log(`Distance between features: ${distanceMeters.toFixed(2)} meters`);
      return distanceMeters;
    } catch (e) {
      console.error('Error calculating distance:', e);
      return Infinity;
    }
  };
}