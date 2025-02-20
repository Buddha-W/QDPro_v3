
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
