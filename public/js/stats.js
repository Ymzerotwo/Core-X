const themeToggleBtn = document.getElementById('themeToggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcons(newTheme);
}

function updateIcons(theme) {
    if (theme === 'light') {
        if (moonIcon) moonIcon.style.display = 'none';
        if (sunIcon) sunIcon.style.display = 'block';
    } else {
        if (moonIcon) moonIcon.style.display = 'block';
        if (sunIcon) sunIcon.style.display = 'none';
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
}

const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateIcons(savedTheme);

function showPage(pageId, linkElement) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (linkElement) linkElement.classList.add('active');
}

document.querySelectorAll('.nav-link[data-target]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        const activeLink = e.currentTarget;
        showPage(target, activeLink);
    });
});

const updateFullStats = async () => {
    try {
        const response = await fetch('/state/server-state');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        const cpuVal = document.querySelector('#cpu-val');
        const cpuBar = document.querySelector('#cpu-bar');
        if (cpuVal) cpuVal.innerText = data.cpu.toFixed(1) + '%';
        if (cpuBar) cpuBar.style.width = Math.min(data.cpu, 100) + '%';
        const memVal = document.querySelector('#mem-val');
        const memSub = document.querySelector('#mem-sub');
        const memBar = document.querySelector('#mem-bar');
        if (memVal) memVal.innerText = data.memory.percent.toFixed(1) + '%';
        if (memSub) memSub.innerHTML = `
            Sys: ${data.memory.formatted.used} / ${data.memory.formatted.total}<br>
            <span style="color: var(--accent)">App: ${data.memory.process.formatted.heapUsed}</span>
        `;
        if (memBar) memBar.style.width = Math.min(data.memory.percent, 100) + '%';
        const diskVal = document.querySelector('#disk-val');
        const diskSub = document.querySelector('#disk-sub');
        const diskBar = document.querySelector('#disk-bar');
        if (diskVal) diskVal.innerText = data.disk.percent.toFixed(1) + '%';
        if (diskSub) diskSub.innerText = `Free: ${data.disk.formatted.free}`;
        if (diskBar) diskBar.style.width = Math.min(data.disk.percent, 100) + '%';
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl) uptimeEl.innerText = data.uptime;

    } catch (err) {
        console.error('Full Stats Update Error:', err);
    }
};

const updateRealtimeStats = async () => {
    try {
        const response = await fetch('/state/server-state/realtime');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        const cpuVal = document.querySelector('#cpu-val');
        const cpuBar = document.querySelector('#cpu-bar');
        if (cpuVal) cpuVal.innerText = data.cpu.toFixed(1) + '%';
        if (cpuBar) cpuBar.style.width = Math.min(data.cpu, 100) + '%';
        const memVal = document.querySelector('#mem-val');
        const memSub = document.querySelector('#mem-sub');
        const memBar = document.querySelector('#mem-bar');
        if (memVal) memVal.innerText = data.memory.percent.toFixed(1) + '%';
        if (memSub) memSub.innerHTML = `
            Sys: ${data.memory.formatted.used} / ${data.memory.formatted.total}<br>
            <span style="color: var(--accent)">App: ${data.memory.process.formatted.heapUsed}</span>
        `;
        if (memBar) memBar.style.width = Math.min(data.memory.percent, 100) + '%';
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl) uptimeEl.innerText = data.uptime;

    } catch (err) {
        console.error('Realtime Stats Update Error:', err);
    }
};

const updateRequestStats = async () => {
    try {
        const response = await fetch('/state/requests-state');
        if (!response.ok) throw new Error('Failed to fetch requests');
        const data = await response.json();
        if (document.getElementById('total-req')) document.getElementById('total-req').innerText = data.totalRequests;
        if (document.getElementById('success-req')) document.getElementById('success-req').innerText = data.successfulRequests;
        if (document.getElementById('failed-req')) document.getElementById('failed-req').innerText = data.failedRequests;
        if (document.getElementById('client-err')) document.getElementById('client-err').innerText = data.clientErrors;
        if (document.getElementById('server-err')) document.getElementById('server-err').innerText = data.serverErrors;
        if (document.getElementById('intrusions-val')) document.getElementById('intrusions-val').innerText = data.intrusionAttempts;
        const warningsLog = document.getElementById('warnings-log');
        if (warningsLog && data.recentClientErrors && data.recentClientErrors.length > 0) {
            warningsLog.innerHTML = data.recentClientErrors.map(err => `
                <div class="log-item" style="border-left: 3px solid var(--warning, #F59E0B);">
                    <div class="log-time" title="${err.timestamp}">${new Date(err.timestamp).toLocaleTimeString()}</div>
                    <div class="log-detail" style="overflow: hidden;">
                        <span class="badge badge-warning" style="margin-right: 8px; background: rgba(245, 158, 11, 0.1); color: var(--warning, #F59E0B);">${err.method} ${err.route}</span>
                        <div style="font-family: monospace; color: var(--warning, #F59E0B); margin-top: 4px; font-size: 0.9em;">
                            ${err.message}
                        </div>
                    </div>
                </div>
            `).join('');
        } else if (warningsLog) {
            warningsLog.innerHTML = '<div class="log-item" style="justify-content: center; color: var(--server-label);">No recent warnings logged.</div>';
        }

        const intrusionsLog = document.getElementById('intrusions-log');
        if (intrusionsLog && data.recentIntrusions && data.recentIntrusions.length > 0) {
            intrusionsLog.innerHTML = data.recentIntrusions.map(event => `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 1rem; color: var(--text-secondary); font-size: 0.9em;">${new Date(event.timestamp).toLocaleString()}</td>
                    <td style="padding: 1rem;">
                        <span class="badge ${event.riskLevel === 'HIGH' ? 'badge-error' : 'badge-warning'}">
                            ${event.riskLevel}
                        </span>
                    </td>
                    <td style="padding: 1rem; font-family: monospace;">${event.ip}</td>
                    <td style="padding: 1rem;">
                        ${event.userId ? `<div title="User ID">👤 ${event.userId}</div>` : ''}
                        ${event.token ? `<div title="Token" style="font-family: monospace; font-size: 0.85em; color: var(--text-secondary);">🔑 ${event.token}</div>` : ''}
                        ${!event.userId && !event.token ? '<span style="color: var(--nav-text);">-</span>' : ''}
                    </td>
                    <td style="padding: 1rem; color: var(--text-secondary);">
                        <div style="font-weight: 500; color: var(--text-primary);">${event.type}</div>
                        <div style="font-size: 0.85em;">${event.details || event.route}</div>
                    </td>
                </tr>
            `).join('');
        } else if (intrusionsLog) {
            intrusionsLog.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--nav-text);">No recent security events logged.</td></tr>';
        }

        const errorsLog = document.getElementById('errors-log');
        if (errorsLog && data.recentSystemErrors && data.recentSystemErrors.length > 0) {
            errorsLog.innerHTML = data.recentSystemErrors.map(err => `
                <div class="log-item" style="border-left: 3px solid #EF4444;">
                    <div class="log-time" title="${err.timestamp}">${new Date(err.timestamp).toLocaleTimeString()}</div>
                    <div class="log-detail" style="overflow: hidden;">
                        <span class="badge badge-error" style="margin-right: 8px;">${err.method} ${err.route}</span>
                        <div style="font-family: monospace; color: var(--danger, #EF4444); margin-top: 4px; font-size: 0.9em;">
                            ${err.message}
                        </div>
                    </div>
                </div>
            `).join('');
        } else if (errorsLog) {
            errorsLog.innerHTML = '<div class="log-item" style="justify-content: center; color: var(--server-label);">No recent system errors logged.</div>';
        }
    } catch (err) {
        console.error('Request Stats Update Error:', err);
    }
};

// Start Auto Update
updateFullStats(); // Load disk stats on page load
updateRequestStats(); // Load request stats
setInterval(updateRealtimeStats, 1000); // Update CPU, RAM, uptime every second
setInterval(updateRequestStats, 60000); // Update Request stats every 60 seconds

let banData = { ips: [], users: [], tokens: [] };

async function loadBans() {
    try {
        const res = await fetch('/admin/bans');
        const data = await res.json();
        if (data.success) {
            banData = data.data;
            renderBanTables();
        }
    } catch (e) {
        console.error('Failed to load bans', e);
    }
}

function renderBanTables() {
    const ipBody = document.querySelector('#ips-table tbody');
    if (ipBody) {
        ipBody.innerHTML = banData.ips.map(ip => `
            <tr>
                <td>${ip}</td>
                <td style="text-align: right;">
                    <button class="btn btn-danger" data-action="unban" data-type="ip" data-value="${ip}">Unban</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align: center; color: var(--nav-text);">No IPs currently banned</td></tr>';
    }

    const userBody = document.querySelector('#users-table tbody');
    if (userBody) {
        userBody.innerHTML = banData.users.map(u => `
             <tr>
                <td>${u}</td>
                <td style="text-align: right;">
                    <button class="btn btn-danger" data-action="unban" data-type="user" data-value="${u}">Unban</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align: center; color: var(--nav-text);">No Users currently banned</td></tr>';
    }

    const tokenBody = document.querySelector('#tokens-table tbody');
    if (tokenBody) {
        tokenBody.innerHTML = banData.tokens.map(t => `
             <tr>
                <td title="${t}">${t.substring(0, 50)}...</td>
                <td style="text-align: right;">
                    <button class="btn btn-danger" data-action="unban" data-type="token" data-value="${t}">Restore</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align: center; color: var(--nav-text);">No Tokens revoked</td></tr>';
    }
}


function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
}


document.addEventListener('click', async (e) => {
    if (e.target && e.target.closest('[data-action="unban"]')) {
        const btn = e.target.closest('[data-action="unban"]');
        const type = btn.getAttribute('data-type');
        const value = btn.getAttribute('data-value');

        await unbanItem(type, value);
    }
});

async function unbanItem(type, value) {
    if (!confirm('Are you sure you want to remove this ban?')) return;
    try {
        const res = await fetch('/admin/bans', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': getCookie('csrf_token')
            },
            body: JSON.stringify({ type, value })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || (data.error && data.error.message) || 'Failed to unban');
        }
        loadBans();
    } catch (e) {
        console.error('Failed to unban:', e);
        alert(`Error: ${e.message}`);
    }
};

const banForm = document.getElementById('banForm');
if (banForm) {
    banForm.onsubmit = async (e) => {
        e.preventDefault();
        const type = document.getElementById('banType').value;
        const value = document.getElementById('banValue').value;
        const reason = document.getElementById('banReason').value;
        try {
            const res = await fetch('/admin/bans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCookie('csrf_token')
                },
                body: JSON.stringify({ type, value, reason })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                const debugMsg = (data.debug && data.debug.error_message) ? ` (${data.debug.error_message})` : '';
                throw new Error((data.message || 'Failed to add ban') + debugMsg);
            }
            document.getElementById('banValue').value = '';
            document.getElementById('banReason').value = '';
            loadBans();
        } catch (e) {
            console.error('Failed to ban:', e);
            alert(`Error: ${e.message}`);
        }
    };
}


document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tab = e.target.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`${tab}-tab`);
        if (target) target.style.display = 'block';
        e.target.classList.add('active');
    });
});

loadBans();
