// Patient Dashboard JavaScript
if (typeof firebase !== 'undefined' && typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await loadPatientDashboard(user.uid);
        } else {
            window.location.href = 'index.html';
        }
    });
}

async function loadPatientDashboard(userId) {
    if (typeof db === 'undefined') {
        document.getElementById('stress-history').innerHTML = '<p>Firebase not configured</p>';
        return;
    }
    
    try {
        // Load stress history
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Display stress history
            displayStressHistory(userData.stressHistory || []);
            
            // Display sessions
            await displaySessions(userId);
            
            // Display progress summary
            displayProgressSummary(userData);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayStressHistory(stressHistory) {
    const historyDiv = document.getElementById('stress-history');
    
    if (stressHistory.length === 0) {
        historyDiv.innerHTML = '<p>No stress history available yet. Complete a VR session to see your progress!</p>';
        return;
    }
    
    // Create simple chart
    const maxLevel = 5;
    let html = '<div class="stress-chart">';
    
    stressHistory.slice(-10).forEach((entry, index) => {
        const level = entry.level || 3;
        const percentage = (level / maxLevel) * 100;
        const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString() : 'N/A';
        
        html += `
            <div class="chart-bar-container">
                <div class="chart-bar" style="height: ${percentage}%; background: ${getStressColor(level)}"></div>
                <span class="chart-label">${date}</span>
            </div>
        `;
    });
    
    html += '</div>';
    historyDiv.innerHTML = html;
}

function getStressColor(level) {
    const colors = {
        1: '#87C5A4',
        2: '#A8D5BA',
        3: '#FFC107',
        4: '#FF9800',
        5: '#F44336'
    };
    return colors[level] || '#87C5A4';
}

async function displaySessions(userId) {
    const sessionsList = document.getElementById('sessions-list');
    
    try {
        const sessionsSnapshot = await db.collection('therapySessions')
            .where('userId', '==', userId)
            .orderBy('startTime', 'desc')
            .limit(5)
            .get();
        
        if (sessionsSnapshot.empty) {
            sessionsList.innerHTML = '<p>No sessions yet. Start your first VR therapy session!</p>';
            return;
        }
        
        let html = '<div class="sessions-grid">';
        sessionsSnapshot.forEach(doc => {
            const session = doc.data();
            const date = session.startTime ? new Date(session.startTime.toDate()).toLocaleDateString() : 'N/A';
            const duration = session.duration ? Math.floor(session.duration / 60) : 0;
            
            html += `
                <div class="session-card">
                    <h4>${getEnvironmentName(session.environment)}</h4>
                    <p>Date: ${date}</p>
                    <p>Duration: ${duration} minutes</p>
                </div>
            `;
        });
        html += '</div>';
        sessionsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading sessions:', error);
        sessionsList.innerHTML = '<p>Error loading sessions</p>';
    }
}

function displayProgressSummary(userData) {
    const totalSessions = userData.therapySessions ? userData.therapySessions.length : 0;
    document.getElementById('total-sessions').textContent = totalSessions;
    
    if (userData.stressHistory && userData.stressHistory.length > 0) {
        const avgStress = userData.stressHistory.reduce((sum, entry) => sum + (entry.level || 3), 0) / userData.stressHistory.length;
        document.getElementById('avg-stress').textContent = avgStress.toFixed(1);
        
        // Calculate improvement (comparing first and last entries)
        if (userData.stressHistory.length > 1) {
            const firstEntry = userData.stressHistory[0];
            const lastEntry = userData.stressHistory[userData.stressHistory.length - 1];
            
            // Safe access with null checks
            const first = (firstEntry && firstEntry.level) ? firstEntry.level : 3;
            const last = (lastEntry && lastEntry.level) ? lastEntry.level : 3;
            
            if (first > 0) {
                const improvement = ((first - last) / first) * 100;
                document.getElementById('improvement-rate').textContent = improvement > 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`;
            } else {
                document.getElementById('improvement-rate').textContent = 'N/A';
            }
        }
    }
}