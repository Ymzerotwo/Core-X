export const getBanningPage = (nonce: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Banning Management | Core-X</title>
  <link rel="stylesheet" href="/css/stats.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Add specific styles for banning table if needed, reusing stats.css for consistency */
    .ban-controls {
        background: var(--card-bg);
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--border);
    }
    .form-group {
        display: flex;
        gap: 1rem;
        align-items: flex-end;
        flex-wrap: wrap;
    }
    .form-control {
        background: var(--bg);
        border: 1px solid var(--border);
        color: var(--text);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-family: inherit;
    }
    .btn {
        padding: 0.5rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        border: none;
        transition: all 0.2s;
    }
    .btn-danger { background: var(--danger); color: white; }
    .btn-primary { background: var(--accent); color: white; }
    
    /* Improved Table Styles */
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 1rem; }
    th { text-align: left; padding: 1rem; color: var(--nav-text); font-weight: 500; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    td { padding: 1rem; border-bottom: 1px solid var(--border); color: var(--text); font-size: 0.95rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    
    .tab-nav { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0px; }
    .tab-btn { 
        background: none; 
        border: none; 
        padding: 0.75rem 0.5rem; 
        color: var(--nav-text); 
        cursor: pointer; 
        border-bottom: 2px solid transparent; 
        font-weight: 500;
        transition: all 0.2s;
    }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
  </style>
</head>
<body>

  <!-- Reusing Sidebar Structure -->
  <nav class="sidebar">
    <div class="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Core-X
    </div>
    <ul class="nav-menu">
      <li class="nav-item"><a href="/admin/core-x-state" class="nav-link"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7"></path></svg> Dashboard</a></li>
      <li class="nav-item"><a href="#" class="nav-link active"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Banning</a></li>
      <li class="nav-item"><a href="/" class="nav-link"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> Home</a></li>
    </ul>
  </nav>

  <main class="main-content">
    <div class="page-header">
      <h1 class="page-title">Banning Management</h1>
      <p class="page-desc">Manage system-wide blocks for IPs, Users, and Tokens.</p>
    </div>

    <!-- Controls -->
    <div class="ban-controls">
        <h3 style="margin-bottom: 1rem; font-size: 1.1rem;">Add New Ban</h3>
        <form id="banForm" class="form-group">
            <select id="banType" class="form-control" style="width: 150px;">
                <option value="ip">IP Address</option>
                <option value="user">User ID</option>
                <option value="token">Token Signature</option>
            </select>
            <input type="text" id="banValue" class="form-control" placeholder="Value (e.g. 127.0.0.1)" required style="flex: 1;">
            <input type="text" id="banReason" class="form-control" placeholder="Reason (Optional)" style="flex: 1;">
            <button type="submit" class="btn btn-primary">Ban Item</button>
        </form>
    </div>

    <!-- Lists -->
    <div class="card">
        <div class="tab-nav">
            <button class="tab-btn active" onclick="switchTab('ips')">Blacklisted IPs</button>
            <button class="tab-btn" onclick="switchTab('users')">Banned Users</button>
            <button class="tab-btn" onclick="switchTab('tokens')">Revoked Tokens</button>
        </div>

        <div id="ips-tab" class="tab-content">
            <table id="ips-table">
                <thead><tr><th>IP Address</th><th>Reason</th><th style="text-align: right;">Action</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <div id="users-tab" class="tab-content" style="display:none;">
            <table id="users-table">
                <thead><tr><th>User ID</th><th>Reason</th><th style="text-align: right;">Action</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <div id="tokens-tab" class="tab-content" style="display:none;">
            <table id="tokens-table">
                <thead><tr><th>Token Signature</th><th>Reason</th><th style="text-align: right;">Action</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
    </div>

  </main>

  <script nonce="${nonce}">
    // State
    let banData = { ips: {}, users: {}, tokens: {} };

    // Fetch Data
    async function loadBans() {
        const res = await fetch('/admin/bans');
        const data = await res.json();
        if(data.success) {
            banData = data.data;
            renderTables();
        }
    }

    // Render
    function renderTables() {
        const ipBody = document.querySelector('#ips-table tbody');
        ipBody.innerHTML = Object.entries(banData.ips || {}).map(([ip, reason]) => \`
            <tr>
                <td>\${ip}</td>
                <td>\${reason || '-'}</td>
                <td style="text-align: right;"><button class="btn btn-danger" onclick="unban('ip', '\${ip}')">Unban</button></td>
            </tr>
        \`).join('') || '<tr><td colspan="3" style="text-align: center; color: var(--nav-text);">No IPs currently banned</td></tr>';

        const userBody = document.querySelector('#users-table tbody');
        userBody.innerHTML = Object.entries(banData.users || {}).map(([u, reason]) => \`
             <tr>
                <td>\${u}</td>
                <td>\${reason || '-'}</td>
                <td style="text-align: right;"><button class="btn btn-danger" onclick="unban('user', '\${u}')">Unban</button></td>
            </tr>
        \`).join('') || '<tr><td colspan="3" style="text-align: center; color: var(--nav-text);">No Users currently banned</td></tr>';

        const tokenBody = document.querySelector('#tokens-table tbody');
        tokenBody.innerHTML = Object.entries(banData.tokens || {}).map(([t, reason]) => \`
             <tr>
                <td title="\${t}">\${t.substring(0, 50)}...</td>
                <td>\${reason || '-'}</td>
                <td style="text-align: right;"><button class="btn btn-danger" onclick="unban('token', '\${t}')">Restore</button></td>
            </tr>
        \`).join('') || '<tr><td colspan="3" style="text-align: center; color: var(--nav-text);">No Tokens revoked</td></tr>';
    }

    // Actions
    async function unban(type, value) {
        if(!confirm('Are you sure you want to remove this ban?')) return;
        
        await fetch('/admin/bans', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, value })
        });
        loadBans();
    }

    document.getElementById('banForm').onsubmit = async (e) => {
        e.preventDefault();
        const type = document.getElementById('banType').value;
        const value = document.getElementById('banValue').value;
        const reason = document.getElementById('banReason').value;

        await fetch('/admin/bans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, value, reason })
        });
        
        document.getElementById('banValue').value = '';
        document.getElementById('banReason').value = '';
        loadBans();
    };

    // Tabs
    window.switchTab = (tab) => {
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        
        document.getElementById(\`\${tab}-tab\`).style.display = 'block';
        event.target.classList.add('active');
    };

    // Init
    loadBans();
  </script>
</body>
</html>
`;
