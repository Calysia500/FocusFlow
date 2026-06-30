const timeDisplay = document.getElementById('timeDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const toggleAnalyticsBtn = document.getElementById('toggleAnalyticsBtn');
const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
const analyticsPanel = document.getElementById('analyticsPanel');
const themeBtns = document.querySelectorAll('.theme-btn');
const barChart = document.getElementById('barChart');
const sessionHistory = document.getElementById('sessionHistory');

// New elements
const modeTabs = document.querySelectorAll('.mode-tab');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const focusTimeInput = document.getElementById('focusTimeInput');
const shortBreakInput = document.getElementById('shortBreakInput');
const longBreakInput = document.getElementById('longBreakInput');

let settings = {
    focus: 25,
    shortBreak: 5,
    longBreak: 15
};

// Load settings from localStorage
const savedSettings = localStorage.getItem('focusflow_settings');
if(savedSettings) {
    settings = JSON.parse(savedSettings);
}
focusTimeInput.value = settings.focus;
shortBreakInput.value = settings.shortBreak;
longBreakInput.value = settings.longBreak;

let currentMode = 'focus'; // focus, shortBreak, longBreak
let timeLeft = settings[currentMode] * 60; 
let timerId = null;
let isRunning = false;

// Initialize Theme
const savedTheme = localStorage.getItem('focusflow_theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);
updateThemeBtns(savedTheme);

function updateThemeBtns(activeTheme) {
    themeBtns.forEach(btn => {
        if (btn.getAttribute('data-theme-val') === activeTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const theme = e.target.getAttribute('data-theme-val');
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('focusflow_theme', theme);
        updateThemeBtns(theme);
    });
});

// Mode Switching
modeTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        if (isRunning) {
            stopTimer(); // Stop timer if switching modes
        }
        
        modeTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        currentMode = e.target.getAttribute('data-mode');
        timeLeft = settings[currentMode] * 60;
        updateDisplay();
    });
});

// Settings Modal
openSettingsBtn.addEventListener('click', () => {
    // Populate with current settings when opening
    focusTimeInput.value = settings.focus;
    shortBreakInput.value = settings.shortBreak;
    longBreakInput.value = settings.longBreak;
    settingsOverlay.classList.add('open');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.remove('open');
});

saveSettingsBtn.addEventListener('click', () => {
    settings.focus = parseInt(focusTimeInput.value) || 25;
    settings.shortBreak = parseInt(shortBreakInput.value) || 5;
    settings.longBreak = parseInt(longBreakInput.value) || 15;
    
    localStorage.setItem('focusflow_settings', JSON.stringify(settings));
    
    // Update timer immediately if it's not currently running
    if (!isRunning) {
        timeLeft = settings[currentMode] * 60;
        updateDisplay();
    }
    
    settingsOverlay.classList.remove('open');
});

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timerId = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            clearInterval(timerId);
            isRunning = false;
            
            // Only record "focus" sessions in analytics
            if (currentMode === 'focus') {
                saveSession(settings.focus); 
            }
            
            timeLeft = settings[currentMode] * 60;
            updateDisplay();
            
            if (currentMode === 'focus') {
                updateAnalyticsUI();
            }
        }
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerId);
}

function stopTimer() {
    isRunning = false;
    clearInterval(timerId);
    timeLeft = settings[currentMode] * 60;
    updateDisplay();
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
stopBtn.addEventListener('click', stopTimer);

toggleAnalyticsBtn.addEventListener('click', () => {
    updateAnalyticsUI();
    analyticsPanel.classList.add('open');
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => {
        const height = bar.style.height;
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.height = height;
        }, 300);
    });
});

closeAnalyticsBtn.addEventListener('click', () => {
    analyticsPanel.classList.remove('open');
});

// Analytics & LocalStorage
function getSessions() {
    const data = localStorage.getItem('focusflow_sessions');
    return data ? JSON.parse(data) : [];
}

function saveSession(minutes) {
    const sessions = getSessions();
    sessions.push({
        date: new Date().toISOString(),
        duration: minutes
    });
    localStorage.setItem('focusflow_sessions', JSON.stringify(sessions));
}

function updateAnalyticsUI() {
    const sessions = getSessions();
    
    const grouped = {};
    sessions.forEach(s => {
        const dateObj = new Date(s.date);
        const dStr = dateObj.toLocaleDateString();
        if(!grouped[dStr]) grouped[dStr] = { count: 0, totalMins: 0, dateObj };
        grouped[dStr].count += 1;
        grouped[dStr].totalMins += s.duration;
    });

    const sortedDays = Object.values(grouped).sort((a,b) => b.dateObj - a.dateObj);
    
    sessionHistory.innerHTML = '';
    if(sortedDays.length === 0) {
        sessionHistory.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); border-bottom: none; padding-top: 3rem;">No sessions recorded yet. Start focusing!</td></tr>';
    } else {
        sortedDays.forEach(day => {
            const tr = document.createElement('tr');
            const tdDate = document.createElement('td');
            tdDate.textContent = day.dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const tdCount = document.createElement('td');
            tdCount.textContent = day.count;
            const tdTime = document.createElement('td');
            const h = Math.floor(day.totalMins / 60);
            const m = day.totalMins % 60;
            tdTime.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
            
            tr.appendChild(tdDate);
            tr.appendChild(tdCount);
            tr.appendChild(tdTime);
            sessionHistory.appendChild(tr);
        });
    }

    barChart.innerHTML = '';
    if (sortedDays.length === 0) {
        barChart.innerHTML = '<div style="color: var(--text-secondary); width: 100%; text-align: center; margin-bottom: 2rem;">Complete a focus session to see your stats!</div>';
        return;
    }
    
    const last7Days = [];
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d);
    }
    
    const maxMins = Math.max(60, ...sortedDays.map(d => d.totalMins)); 
    
    last7Days.forEach(d => {
        const dStr = d.toLocaleDateString();
        const data = grouped[dStr];
        const mins = data ? data.totalMins : 0;
        let heightPct = (mins / maxMins) * 100;
        
        if (mins > 0 && heightPct < 5) heightPct = 5; 
        if (mins === 0) heightPct = 1; 
        
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${heightPct}%`;
        bar.title = `${d.toLocaleDateString(undefined, {weekday: 'short'})}: ${mins}m`;
        
        barChart.appendChild(bar);
    });
}

updateDisplay();
updateAnalyticsUI();
