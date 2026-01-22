
export const getStatusPage = (data: {
  serviceName: string;
  nonce: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Status | ${data.serviceName}</title>
  <link rel="stylesheet" href="/css/stats.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>

  <!-- Sidebar -->
  <nav class="sidebar">
    <div class="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Core-X
    </div>
    
    <ul class="nav-menu">
      <li class="nav-item">
        <a href="#" class="nav-link active" data-target="dashboard">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          Dashboard
        </a>
      </li>
      <li class="nav-item">
        <a href="#" class="nav-link" data-target="requests">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          Requests
        </a>
      </li>
      <li class="nav-item">
        <a href="#" class="nav-link" data-target="errors">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          Errors
        </a>
      </li>
      <li class="nav-item">
        <a href="#" class="nav-link" data-target="auth">
           <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
           Intrusion Attempts
        </a>
      </li>
    </ul>

    <div class="server-info">
      <div class="server-label">Connected to</div>
      <div class="server-name">${data.serviceName}</div>
      <button class="theme-toggle-btn" id="themeToggle" aria-label="Toggle Theme">
        <svg id="moon-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        <svg id="sun-icon" style="display:none;" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
      </button>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="main-content">
    
    <!-- Dashboard Page -->
    <section id="dashboard" class="page-section active">
      <div class="page-header">
        <h1 class="page-title">System Dashboard</h1>
        <p class="page-desc">Real-time overview of server performance and status.</p>
      </div>

      <div class="grid">
        <!-- CPU Card -->
        <div class="card">
          <div class="card-title">
            <span>CPU Load</span>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div class="metric-value" id="cpu-val">--%</div>
          <div class="metric-sub">${navigator.hardwareConcurrency || 'Multi'} Cores Active</div>
          <div class="progress-bar">
            <div class="progress-fill" id="cpu-bar" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Memory Card -->
        <div class="card">
          <div class="card-title">
             <span>Memory Usage</span>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div class="metric-value" id="mem-val">--%</div>
          <div class="metric-sub" id="mem-sub">Analyzing...</div>
          <div class="progress-bar">
            <div class="progress-fill" id="mem-bar" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Uptime Card -->
        <div class="card">
          <div class="card-title">
             <span>System Uptime</span>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div class="metric-value" id="uptime">--</div>
          <div class="metric-sub">Continuous Operation</div>
        </div>

         <!-- Disk Card -->
        <div class="card">
          <div class="card-title">
            <span>Storage</span>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          </div>
          <div class="metric-value" id="disk-val">--%</div>
          <div class="metric-sub" id="disk-sub">Free: --</div>
          <div class="progress-bar">
            <div class="progress-fill" id="disk-bar" style="width: 0%;"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Requests Page -->
    <section id="requests" class="page-section">
      <div class="page-header">
        <h1 class="page-title">Recent Requests</h1>
        <p class="page-desc">Log of recent HTTP requests handled by the server.</p>
      </div>
      <div class="log-list" id="requests-log">
        <div class="log-item" style="justify-content: center; color: var(--server-label);">Waiting for data...</div>
      </div>
    </section>

    <!-- Errors Page -->
    <section id="errors" class="page-section">
      <div class="page-header">
         <h1 class="page-title">System Errors</h1>
         <p class="page-desc">Recent application errors and exceptions.</p>
      </div>
      <div class="log-list" id="errors-log">
         <div class="log-item" style="justify-content: center; color: var(--server-label);">No recent errors logged.</div>
      </div>
    </section>

    <!-- Intrusion Attempts Page -->
    <section id="auth" class="page-section">
      <div class="page-header">
         <h1 class="page-title">Intrusion Attempts</h1>
         <p class="page-desc">Security events and blocked access attempts.</p>
      </div>
        <div class="log-list" id="security-log">
         <div class="log-item" style="justify-content: center; color: var(--server-label);">System Secure. No threats detected.</div>
      </div>
    </section>

  </main>
  <script src="/js/stats.js" nonce="${data.nonce}"></script>
</body>
</html>
`;
