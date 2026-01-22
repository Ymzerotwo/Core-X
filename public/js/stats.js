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

// Start Auto Update
updateFullStats(); // Load disk stats on page load
setInterval(updateRealtimeStats, 1000); // Update CPU, RAM, uptime every second
