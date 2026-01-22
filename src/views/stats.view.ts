
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
        <a href="#" class="nav-link" data-target="intrusions">
           <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
           Intrusion Attempts
        </a>
      </li>
      <li class="nav-item">
        <a href="#" class="nav-link" data-target="banning">
           <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
           Banning Manager
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
      
      </div>
    </section>

    <!-- Requests Page -->
    <section id="requests" class="page-section">
      <div class="page-header">
        <h1 class="page-title">Requests Overview</h1>
        <p class="page-desc">Detailed statistics of processed requests.</p>
      </div>
      
      <div class="grid">
        <!-- Total Requests -->
        <div class="card">
          <div class="card-title">
            <span>Total Requests</span>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          </div>
          <div class="metric-value" id="total-req">--</div>
          <div class="metric-sub">Processed</div>
        </div>

        <!-- Successful -->
        <div class="card">
          <div class="card-title">
            <span>Successful</span>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--success, #10B981);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div class="metric-value" id="success-req">--</div>
          <div class="metric-sub" style="color: var(--success, #10B981);">2xx / 3xx</div>
        </div>

        <!-- Failed (Total) -->
        <div class="card">
          <div class="card-title">
             <span>Failed</span>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--danger, #EF4444);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div class="metric-value" id="failed-req">--</div>
          <div class="metric-sub" style="color: var(--danger, #EF4444);">Total Failed</div>
        </div>
      </div>
    </section>

    <!-- Errors Page -->
    <section id="errors" class="page-section">
      <div class="page-header">
         <h1 class="page-title">System Errors</h1>
         <p class="page-desc">Breakdown of client and server errors.</p>
      </div>

      <div class="grid" style="margin-bottom: 2rem;">
        <!-- Client Errors -->
        <div class="card">
          <div class="card-title">
             <span>Client Errors</span>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--warning, #F59E0B);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div class="metric-value" id="client-err">--</div>
          <div class="metric-sub" style="color: var(--warning, #F59E0B);">4xx Responses</div>
        </div>

        <!-- System Errors -->
        <div class="card">
          <div class="card-title">
             <span>System Errors</span>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--danger, #EF4444);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div class="metric-value" id="server-err">--</div>
          <div class="metric-sub" style="color: var(--danger, #EF4444);">5xx Responses</div>
        </div>
      </div>

      <h2 style="margin-bottom: 1rem; font-size: 1.2rem; color: var(--nav-text);">Recent Warnings (4xx)</h2>
      <div class="log-list" id="warnings-log">
         <div class="log-item" style="justify-content: center; color: var(--server-label);">No recent warnings logged.</div>
      </div>

      <h2 style="margin-bottom: 1rem; font-size: 1.2rem; color: var(--nav-text); margin-top: 2rem;">Recent System Logs (5xx)</h2>
      <div class="log-list" id="errors-log">
         <div class="log-item" style="justify-content: center; color: var(--server-label);">No recent system errors logged.</div>
      </div>
    </section>

    <!-- Intrusion Attempts Page -->
    <section id="intrusions" class="page-section">
      <div class="page-header">
         <h1 class="page-title">Intrusion Attempts</h1>
         <p class="page-desc">Security events and blocked access attempts.</p>
      </div>
      
      <div class="grid">
        <!-- Intrusions -->
        <div class="card">
          <div class="card-title">
             <span>Intrusions</span>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <div class="metric-value" id="intrusions-val">--</div>
          <div class="metric-sub" style="color: var(--server-label);">Blocked</div>
        </div>
      </div>

      <h2 style="margin: 2rem 0 1rem; font-size: 1.2rem; color: var(--nav-text);">Recent Security Events</h2>
      <div class="table-container" style="background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border); overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
             <thead style="background: rgba(0,0,0,0.2); text-align: left;">
                <tr>
                    <th style="padding: 1rem; color: var(--nav-text); font-weight: 500;">Time</th>
                    <th style="padding: 1rem; color: var(--nav-text); font-weight: 500;">Risk</th>
                    <th style="padding: 1rem; color: var(--nav-text); font-weight: 500;">IP Address</th>
                    <th style="padding: 1rem; color: var(--nav-text); font-weight: 500;">Identity (User/Token)</th>
                    <th style="padding: 1rem; color: var(--nav-text); font-weight: 500;">Details</th>
                </tr>
             </thead>
             <tbody id="intrusions-log">
                <tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--nav-text);">Loading security logs...</td></tr>
             </tbody>
          </table>
      </div>
    </section>

    <!-- Banning Manager Page -->
    <section id="banning" class="page-section">
      <div class="page-header">
        <h1 class="page-title">Banning Management</h1>
        <p class="page-desc">Manage system-wide blocks for IPs, Users, and Tokens.</p>
      </div>

      <!-- Controls -->
      <div class="ban-controls">
          <div class="ban-header">
              <h3>Create New Ban</h3>
              <p>Add a new security rule to block access.</p>
          </div>
          <form id="banForm" class="ban-form-grid">
              <div class="form-group">
                  <label class="input-label">Type</label>
                  <select id="banType" class="form-control">
                      <option value="ip">IP Address</option>
                      <option value="user">User ID</option>
                      <option value="token">Token Signature</option>
                  </select>
              </div>
              <div class="form-group" style="flex: 2; min-width: 200px;">
                  <label class="input-label">Target Identifier</label>
                  <input type="text" id="banValue" class="form-control" placeholder="e.g. 192.168.1.1" required>
              </div>
              <div class="form-group" style="flex: 2; min-width: 200px;">
                  <label class="input-label">Reason</label>
                  <input type="text" id="banReason" class="form-control" placeholder="Optional reason for audit logs">
              </div>
              <div class="form-group action-group">
                  <label class="input-label">&nbsp;</label>
                  <button type="submit" class="btn btn-primary btn-block">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 6px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                      Ban Target
                  </button>
              </div>
          </form>
      </div>

      <!-- Lists -->
      <div class="card">
          <div class="tab-nav">
              <button class="tab-btn active" data-tab="ips">Blacklisted IPs</button>
              <button class="tab-btn" data-tab="users">Banned Users</button>
              <button class="tab-btn" data-tab="tokens">Revoked Tokens</button>
          </div>

          <div id="ips-tab" class="tab-content">
              <table id="ips-table">
                  <thead><tr><th>IP Address</th><th style="text-align: right;">Action</th></tr></thead>
                  <tbody></tbody>
              </table>
          </div>
          <div id="users-tab" class="tab-content" style="display:none;">
              <table id="users-table">
                  <thead><tr><th>User ID</th><th style="text-align: right;">Action</th></tr></thead>
                  <tbody></tbody>
              </table>
          </div>
          <div id="tokens-tab" class="tab-content" style="display:none;">
              <table id="tokens-table">
                  <thead><tr><th>Token Signature</th><th style="text-align: right;">Action</th></tr></thead>
                  <tbody></tbody>
              </table>
          </div>
      </div>
    </section>



  </main>
  <script src="/js/stats.js" nonce="${data.nonce}"></script>
</body>
</html>
`;
