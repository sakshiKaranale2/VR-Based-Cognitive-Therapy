// Doctor Dashboard JavaScript - Use existing auth and db variables from main script

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Doctor Dashboard: Initializing...');
    initializeDoctorDashboard();
});

// Initialize Doctor Dashboard
// Initialize Doctor Dashboard
function initializeDoctorDashboard() {
    // Wait for main script to initialize Firebase
    if (!window.getFirebaseInstances) {
        console.log('Doctor Dashboard: Waiting for main script to initialize Firebase...');
        setTimeout(initializeDoctorDashboard, 500);
        return;
    }
    
    // Get Firebase instances from main script
    const instances = window.getFirebaseInstances();
    const auth = instances.auth;
    const db = instances.db;
    
    if (!auth || !db) {
        console.warn('Doctor Dashboard: Firebase instances not ready, retrying...');
        setTimeout(initializeDoctorDashboard, 500);
        return;
    }
    
    console.log('Doctor Dashboard: Using shared Firebase instances');
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Verify user is a doctor
                const userDoc = await db.collection('users').doc(user.uid).get();
                const docExists = userDoc.exists;
                
                if (docExists && userDoc.data().role === 'doctor') {
                    await loadDoctorDashboard(auth, db);
                    setupDashboardEventListeners();
                } else {
                    alert('Access denied. Doctor access only.');
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Doctor Dashboard: Error verifying user:', error);
                showDashboardError('Error verifying user access. Please try again.');
            }
        } else {
            window.location.href = 'index.html';
        }
    });
}

// Show dashboard error
function showDashboardError(message) {
    const patientsTableBody = document.getElementById('patients-table-body');
    if (patientsTableBody) {
        patientsTableBody.innerHTML = `<tr><td colspan="7">${message}</td></tr>`;
    }
}

// Set up dashboard event listeners
function setupDashboardEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshDashboard();
        });
    }
    
    // Start VR Therapy button
    const startVrBtn = document.getElementById('start-vr-therapy-btn');
    if (startVrBtn) {
        startVrBtn.addEventListener('click', startDoctorVRFlow);
    }
}

// Load Doctor Dashboard Data
async function loadDoctorDashboard(auth, db) {
    if (!db || !auth || !auth.currentUser) {
        showDashboardError('Firebase not configured. Please refresh the page.');
        return;
    }
    
    try {
        const currentDoctorId = auth.currentUser.uid;
        
        // Get all therapy sessions for this doctor
        const doctorSessionsSnapshot = await db.collection('therapySessions')
            .where('doctorId', '==', currentDoctorId)
            .get();
        
        // Sort sessions by timestamp in memory
        const sortedSessions = doctorSessionsSnapshot.docs.sort((a, b) => {
            const timeA = a.data().timestamp ? a.data().timestamp.toDate().getTime() : 0;
            const timeB = b.data().timestamp ? b.data().timestamp.toDate().getTime() : 0;
            return timeB - timeA;
        });
        
        const patientsTableBody = document.getElementById('patients-table-body');
        const recentSessionsList = document.getElementById('recent-sessions-list');
        
        if (!patientsTableBody || !recentSessionsList) {
            console.error('Required DOM elements not found');
            return;
        }
        
        if (sortedSessions.length === 0) {
            patientsTableBody.innerHTML = '<tr><td colspan="7">No patients found. Start treating patients to see them here.</td></tr>';
            recentSessionsList.innerHTML = '<p>No recent sessions</p>';
            updateAnalytics(0, 0, '-', '0%');
            return;
        }
        
        // Process sessions and update UI
        await processSessionsAndUpdateUI(sortedSessions, recentSessionsList, patientsTableBody, auth, db);
        
    } catch (error) {
        console.error('Error loading doctor dashboard:', error);
        showDashboardError('Error loading patients. Please try refreshing.');
    }
}

// Process sessions and update UI
async function processSessionsAndUpdateUI(sortedSessions, recentSessionsList, patientsTableBody, auth, db) {
    const currentDoctorId = auth.currentUser.uid;
    
    // Extract unique patient emails/names
    const patientEmails = new Set();
    const patientNames = new Set();
    sortedSessions.forEach(doc => {
        const sessionData = doc.data();
        if (sessionData.patientEmail) {
            patientEmails.add(sessionData.patientEmail.toLowerCase());
        }
        if (sessionData.patientName) {
            patientNames.add(sessionData.patientName);
        }
    });
    
    // Get recent sessions for this doctor only
    const recentSessions = sortedSessions.slice(0, 10);
    updateRecentSessions(recentSessionsList, recentSessions);
    
    // Group sessions by patient
    const patientSessionsMap = new Map();
    sortedSessions.forEach(doc => {
        const sessionData = doc.data();
        const patientKey = sessionData.patientEmail || sessionData.patientName;
        if (!patientKey) return;
        
        if (!patientSessionsMap.has(patientKey)) {
            patientSessionsMap.set(patientKey, {
                patientName: sessionData.patientName,
                patientEmail: sessionData.patientEmail,
                patientAge: sessionData.patientAge,
                sessions: []
            });
        }
        patientSessionsMap.get(patientKey).sessions.push(sessionData);
    });
    
    // Load patient records
    const patientRecords = await loadPatientRecords(patientSessionsMap, db);
    
    // Update patients table and analytics
    updatePatientsTable(patientsTableBody, patientRecords);
    updateDashboardAnalytics(patientRecords, sortedSessions.length);
}

// Update recent sessions display
function updateRecentSessions(recentSessionsList, recentSessions) {
    let recentSessionsHtml = '';
    if (recentSessions.length > 0) {
        recentSessions.forEach(sessionDoc => {
            const sessionData = sessionDoc.data();
            const sessionDate = sessionData.timestamp ? 
                new Date(sessionData.timestamp.toDate()).toLocaleDateString() : 'N/A';
            const duration = sessionData.duration ? 
                Math.floor(sessionData.duration / 60) + ' min ' + (sessionData.duration % 60) + ' sec' : 'N/A';
            
            recentSessionsHtml += `
                <div class="session-card">
                    <div class="session-header">
                        <h4>${sessionData.patientName || 'Unknown Patient'}</h4>
                        <span class="session-date">${sessionDate}</span>
                    </div>
                    <div class="session-details">
                        <p><strong>Environment:</strong> ${getEnvironmentName(sessionData.environment)}</p>
                        <p><strong>Duration:</strong> ${duration}</p>
                        <p><strong>Stress Level After:</strong> ${sessionData.stressRatingAfter || 'N/A'}/5</p>
                        <p><strong>Recovery Status:</strong> <span class="recovery-badge ${sessionData.recoveryStatus || 'no_change'}">${getRecoveryStatusText(sessionData.recoveryStatus)}</span></p>
                    </div>
                </div>
            `;
        });
    } else {
        recentSessionsHtml = '<p>No recent sessions</p>';
    }
    recentSessionsList.innerHTML = recentSessionsHtml;
}

// Load patient records
async function loadPatientRecords(patientSessionsMap, db) {
    const patientPromises = Array.from(patientSessionsMap.keys()).map(async (patientKey) => {
        const patientInfo = patientSessionsMap.get(patientKey);
        let patientDocId;
        
        if (patientInfo.patientEmail) {
            patientDocId = patientInfo.patientEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        } else if (patientInfo.patientName) {
            patientDocId = patientInfo.patientName.toLowerCase().replace(/\s+/g, '_');
        } else {
            return null;
        }
        
        try {
            const patientDoc = await db.collection('patients').doc(patientDocId).get();
            const docExists = patientDoc.exists;
            
            if (docExists) {
                const patientData = patientDoc.data();
                const doctorSessions = patientInfo.sessions;
                return {
                    ...patientData,
                    doctorSessions: doctorSessions,
                    totalDoctorSessions: doctorSessions.length
                };
            } else {
                return {
                    patientName: patientInfo.patientName,
                    patientEmail: patientInfo.patientEmail,
                    patientAge: patientInfo.patientAge,
                    doctorSessions: patientInfo.sessions,
                    totalDoctorSessions: patientInfo.sessions.length,
                    sessions: []
                };
            }
        } catch (error) {
            console.error('Error loading patient:', error);
            return null;
        }
    });
    
    return (await Promise.all(patientPromises)).filter(p => p !== null);
}

// Update patients table
function updatePatientsTable(patientsTableBody, patientRecords) {
    let html = '';
    patientRecords.forEach(patientData => {
        const patientName = patientData.patientName || 'Unknown';
        const patientAge = patientData.patientAge || 'N/A';
        const doctorSessions = patientData.doctorSessions || [];
        const totalSessions = doctorSessions.length;
        
        const latestSession = doctorSessions.length > 0 
            ? doctorSessions.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
                const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
                return timeB - timeA;
            })[0]
            : null;
        
        let latestStress = patientData.latestStressLevel || 'N/A';
        let recoveryStatus = 'No sessions';
        let recoveryClass = 'no_change';
        let lastSessionDate = 'N/A';
        
        if (latestSession) {
            if (latestSession.stressRatingAfter !== undefined) {
                latestStress = latestSession.stressRatingAfter;
            } else if (latestSession.stressRating !== undefined) {
                latestStress = latestSession.stressRating;
            }
            
            recoveryStatus = getRecoveryStatusText(latestSession.recoveryStatus);
            recoveryClass = latestSession.recoveryStatus || 'no_change';
            
            if (latestSession.timestamp) {
                lastSessionDate = new Date(latestSession.timestamp.toDate()).toLocaleDateString();
            }
        } else if (patientData.lastSession) {
            lastSessionDate = new Date(patientData.lastSession.toDate()).toLocaleDateString();
        }
        
        html += `
            <tr>
                <td><strong>${patientName}</strong></td>
                <td>${patientAge}</td>
                <td>${totalSessions}</td>
                <td>${latestStress}/5</td>
                <td><span class="recovery-badge ${recoveryClass}">${recoveryStatus}</span></td>
                <td>${lastSessionDate}</td>
                <td><button class="view-details-btn" onclick="viewPatientDetails('${patientName}', '${patientData.patientEmail || ''}')">View Details</button></td>
            </tr>
        `;
    });
    
    patientsTableBody.innerHTML = html;
}

// Update dashboard analytics
function updateDashboardAnalytics(patientRecords, totalSessionsCount) {
    const totalPatients = patientRecords.length;
    const activePatients = patientRecords.filter(p => (p.doctorSessions || []).length > 0).length;
    
    let totalRating = 0;
    let ratingCount = 0;
    let totalImprovedSessions = 0;
    
    patientRecords.forEach(patientData => {
        const doctorSessions = patientData.doctorSessions || [];
        const sessionsWithRating = doctorSessions.filter(s => s.stressRatingAfter !== undefined || s.stressRating !== undefined);
        
        if (sessionsWithRating.length > 0) {
            const sum = sessionsWithRating.reduce((acc, s) => acc + (s.stressRatingAfter || s.stressRating || 0), 0);
            const avgRating = (sum / sessionsWithRating.length).toFixed(1);
            totalRating += parseFloat(avgRating);
            ratingCount++;
        } else if (patientData.averageScore !== undefined) {
            totalRating += patientData.averageScore;
            ratingCount++;
        }
        
        // Count improved sessions
        doctorSessions.forEach(session => {
            if (session.recoveryStatus === 'improved' || session.recoveryStatus === 'slightly_improved') {
                totalImprovedSessions++;
            }
        });
    });
    
    const avgRatingValue = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '-';
    const successRate = totalSessionsCount > 0 ? ((totalImprovedSessions / totalSessionsCount) * 100).toFixed(0) : '0';
    
    updateAnalytics(totalPatients, activePatients, avgRatingValue, successRate + '%');
}

// Update analytics display
function updateAnalytics(totalPatients, activePatients, avgRating, successRate) {
    const totalPatientsEl = document.getElementById('total-patients');
    const activePatientsEl = document.getElementById('active-patients');
    const avgRatingEl = document.getElementById('avg-rating');
    const successRateEl = document.getElementById('success-rate');
    
    if (totalPatientsEl) totalPatientsEl.textContent = totalPatients;
    if (activePatientsEl) activePatientsEl.textContent = activePatients;
    if (avgRatingEl) avgRatingEl.textContent = avgRating;
    if (successRateEl) successRateEl.textContent = successRate;
}

// View Patient Details
async function viewPatientDetails(patientName, patientEmail = '') {
    const modal = document.getElementById('patient-details-modal');
    const content = document.getElementById('patient-details-content');
    const nameEl = document.getElementById('patient-details-name');
    
    if (!modal || !content || !nameEl) {
        console.error('Patient details modal elements not found');
        return;
    }
    
    // Get Firebase instances from main script
    if (!window.getFirebaseInstances) {
        alert('Firebase not available yet. Please wait a moment.');
        return;
    }
    
    const instances = window.getFirebaseInstances();
    const auth = instances.auth;
    const db = instances.db;
    
    if (!auth || !auth.currentUser) {
        alert('Please log in to view patient details');
        return;
    }
    
    const currentDoctorId = auth.currentUser.uid;
    
    try {
        // Determine patient document ID
        let patientDocId;
        if (patientEmail) {
            patientDocId = patientEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        } else {
            patientDocId = patientName.toLowerCase().replace(/\s+/g, '_');
        }
        
        const patientDoc = await db.collection('patients').doc(patientDocId).get();
        const docExists = patientDoc.exists;
        
        let patientData = {};
        if (docExists) {
            patientData = patientDoc.data();
        }
        
        nameEl.textContent = `Patient: ${patientData.patientName || patientName}`;
        
        // Get all sessions for this patient treated by this doctor
        let sessionsQuery = db.collection('therapySessions')
            .where('doctorId', '==', currentDoctorId);
        
        if (patientEmail) {
            sessionsQuery = sessionsQuery.where('patientEmail', '==', patientEmail);
        } else {
            sessionsQuery = sessionsQuery.where('patientName', '==', patientName);
        }
        
        const sessionsSnapshot = await sessionsQuery.get();
        const sortedPatientSessions = sessionsSnapshot.docs.sort((a, b) => {
            const timeA = a.data().timestamp ? a.data().timestamp.toDate().getTime() : 0;
            const timeB = b.data().timestamp ? b.data().timestamp.toDate().getTime() : 0;
            return timeB - timeA;
        });
        
        // Get all feedback for this patient
        let feedbackQuery = db.collection('sessionFeedback')
            .where('userId', '==', currentDoctorId);
        
        if (patientEmail) {
            feedbackQuery = feedbackQuery.where('patientEmail', '==', patientEmail);
        } else {
            feedbackQuery = feedbackQuery.where('patientName', '==', patientName);
        }
        
        const feedbackSnapshot = await feedbackQuery.get();
        const sortedFeedback = feedbackSnapshot.docs.sort((a, b) => {
            const timeA = a.data().timestamp ? a.data().timestamp.toDate().getTime() : 0;
            const timeB = b.data().timestamp ? b.data().timestamp.toDate().getTime() : 0;
            return timeB - timeA;
        });
        
        // Build patient details HTML
        const html = buildPatientDetailsHTML(patientData, sortedPatientSessions, sortedFeedback);
        content.innerHTML = html;
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading patient details:', error);
        content.innerHTML = '<p>Error loading patient details</p>';
    }
}

// Build patient details HTML
function buildPatientDetailsHTML(patientData, patientSessions, patientFeedback) {
    return `
        <div class="patient-details">
            <div class="patient-info-summary">
                <p><strong>Age:</strong> ${patientData.patientAge || 'N/A'}</p>
                <p><strong>Total Sessions:</strong> ${patientData.totalSessions || 0}</p>
                <p><strong>Latest Stress Level:</strong> ${patientData.latestStressLevel || 'N/A'}</p>
                <p><strong>Latest Score:</strong> ${patientData.latestScore !== undefined ? patientData.latestScore + '/100' : 'N/A'}</p>
                <p><strong>Average Score:</strong> ${patientData.averageScore !== undefined ? patientData.averageScore + '/100' : 'N/A'}</p>
                <p><strong>Progress:</strong> ${patientData.progress !== undefined ? (patientData.progress > 0 ? '+' : '') + patientData.progress + ' points' : 'N/A'}</p>
                <p><strong>Last Session:</strong> ${patientData.lastSession ? new Date(patientData.lastSession.toDate()).toLocaleDateString() : 'N/A'}</p>
            </div>
            
            <h3>All Therapy Sessions</h3>
            <div class="details-section">
                ${patientSessions.length === 0
                    ? '<p>No sessions recorded</p>'
                    : patientSessions.map(doc => {
                        const session = doc.data();
                        const date = session.timestamp ? new Date(session.timestamp.toDate()).toLocaleDateString() : 'N/A';
                        const duration = session.duration ? Math.floor(session.duration / 60) + ' min' : 'N/A';
                        return `
                            <div class="session-detail-item">
                                <p><strong>Date:</strong> ${date}</p>
                                <p><strong>Environment:</strong> ${getEnvironmentName(session.environment)}</p>
                                <p><strong>Duration:</strong> ${duration}</p>
                                <p><strong>Stress Level Before:</strong> ${session.stressLevelBefore || 'N/A'}</p>
                                <p><strong>Stress Level After:</strong> ${session.stressRatingAfter || 'N/A'}/5</p>
                                <p><strong>Session Score:</strong> ${session.sessionScore !== undefined ? session.sessionScore + '/100' : 'N/A'}</p>
                                <p><strong>Recovery Status:</strong> <span class="recovery-badge ${session.recoveryStatus || 'no_change'}">${getRecoveryStatusText(session.recoveryStatus)}</span></p>
                                <p><strong>Relaxation:</strong> ${session.relaxationStatus === 'yes' ? '✅ Much More Relaxed' : session.relaxationStatus === 'somewhat' ? '👍 Somewhat Relaxed' : '➡️ No Change'}</p>
                                ${session.comments ? `<p><strong>Notes:</strong> ${session.comments}</p>` : ''}
                                <hr>
                            </div>
                        `;
                    }).join('')
                }
            </div>
            
            <h3>Session Feedback Summary</h3>
            <div class="details-section">
                ${patientFeedback.length === 0
                    ? '<p>No feedback recorded</p>'
                    : patientFeedback.map(doc => {
                        const feedback = doc.data();
                        const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleDateString() : 'N/A';
                        return `
                            <div class="feedback-detail-item">
                                <p><strong>Date:</strong> ${date}</p>
                                <p><strong>Stress Level:</strong> ${feedback.stressRatingAfter || 'N/A'}/5</p>
                                <p><strong>Effectiveness:</strong> ${feedback.effectivenessRating || 'N/A'}/5</p>
                                <p><strong>Recovery Status:</strong> <span class="recovery-badge ${feedback.recoveryStatus || 'no_change'}">${getRecoveryStatusText(feedback.recoveryStatus)}</span></p>
                                ${feedback.comments ? `<p><strong>Comments:</strong> ${feedback.comments}</p>` : ''}
                                <hr>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        </div>
    `;
}

// Close Patient Details
function closePatientDetails() {
    const modal = document.getElementById('patient-details-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Helper function to get environment name
function getEnvironmentName(environment) {
    const names = {
        'beach': 'Beach Paradise',
        'forest': 'Forest Sanctuary',
        'mountain': 'Mountain Peak',
        'zen': 'Zen Garden',
        'space': 'Space Observatory'
    };
    return names[environment] || environment;
}

// Helper function to get recovery status text
function getRecoveryStatusText(status) {
    const statusMap = {
        'improved': '✅ Improved',
        'slightly_improved': '👍 Slightly Improved',
        'no_change': '➡️ No Change'
    };
    return statusMap[status] || 'Unknown';
}

// Refresh dashboard function
// Refresh dashboard function
function refreshDashboard() {
    // Get Firebase instances from main script
    if (!window.getFirebaseInstances) {
        alert('Firebase not available yet. Please wait a moment.');
        return;
    }
    
    const instances = window.getFirebaseInstances();
    const auth = instances.auth;
    const db = instances.db;
    
    if (auth && db) {
        loadDoctorDashboard(auth, db);
    } else {
        alert('Firebase not available. Please refresh the page.');
    }
}

// Start Doctor VR Flow (placeholder - implement as needed)
function startDoctorVRFlow() {
    if (window.startDoctorVRFlow) {
        window.startDoctorVRFlow();
    } else {
        alert('VR flow functionality not available. Please ensure main script is loaded.');
    }
}

// Make functions available globally
window.viewPatientDetails = viewPatientDetails;
window.closePatientDetails = closePatientDetails;
window.refreshDashboard = refreshDashboard;
window.startDoctorVRFlow = startDoctorVRFlow;