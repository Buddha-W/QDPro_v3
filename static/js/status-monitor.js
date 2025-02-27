
async function updateStatus() {
    try {
        const response = await fetch('/api/system/status');
        const data = await response.json();
        
        updateStatusCard('database-status', data.database);
        updateStatusCard('security-status', data.security);
        updateStatusCard('compliance-status', data.compliance);
        updateMetrics('performance-status', data.performance);
    } catch (error) {
        console.error('Status update failed:', error);
    }
}

function updateStatusCard(id, status) {
    const card = document.getElementById(id);
    const indicator = card.querySelector('.status-indicator');
    indicator.className = `status-indicator ${status ? 'healthy' : 'warning'}`;
}

function updateMetrics(id, metrics) {
    const display = document.getElementById(id).querySelector('.metrics-display');
    display.innerHTML = `
        CPU: ${metrics.cpu_usage}%<br>
        Memory: ${metrics.memory_usage}%<br>
        Disk: ${metrics.disk_usage}%
    `;
}

setInterval(updateStatus, 30000);
updateStatus();
document.addEventListener('DOMContentLoaded', function() {
    // Function to update status indicators
    function updateStatus() {
        // Fetch status from server
        fetch('/api/system_status')
            .then(response => response.json())
            .then(data => {
                // Update database status
                const dbStatus = document.querySelector('#database-status .status-indicator');
                dbStatus.className = 'status-indicator ' + data.database.status;
                
                // Update security status
                const securityStatus = document.querySelector('#security-status .status-indicator');
                securityStatus.className = 'status-indicator ' + data.security.status;
                
                // Update compliance status
                const complianceStatus = document.querySelector('#compliance-status .status-indicator');
                complianceStatus.className = 'status-indicator ' + data.compliance.status;
                
                // Update performance metrics
                const metricsDisplay = document.querySelector('.metrics-display');
                metricsDisplay.innerHTML = `
                    <p>Response Time: ${data.performance.responseTime}ms</p>
                    <p>Memory Usage: ${data.performance.memoryUsage}MB</p>
                    <p>Active Sessions: ${data.performance.activeSessions}</p>
                `;
            })
            .catch(error => {
                console.error('Error fetching system status:', error);
            });
    }
    
    // Initialize status
    updateStatus();
    
    // Update status every 30 seconds
    setInterval(updateStatus, 30000);
});
