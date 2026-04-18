/* ═══════════════════════════════════════════════════════
   FitTrack — SPA (API-backed, async/await)
   ═══════════════════════════════════════════════════════ */

const APP = { user: null, currentView: null, charts: [] };

const NAV = {
  member: [
    { id: 'member-dashboard', icon: 'dashboard',    label: 'Dashboard' },
    { id: 'workout-plans',    icon: 'assignment',    label: 'My Plans' },
    { id: 'progress',         icon: 'trending_up',   label: 'Progress' },
    { id: 'payments',         icon: 'credit_card',   label: 'Payments' },
    { id: 'profile',          icon: 'person',        label: 'Profile' },
  ],
  trainer: [
    { id: 'trainer-dashboard', icon: 'dashboard',   label: 'Dashboard' },
    { id: 'trainer-members',   icon: 'group',        label: 'My Members' },
    { id: 'trainer-plans',     icon: 'assignment',   label: 'Workout Plans' },
    { id: 'trainer-progress',  icon: 'insights',     label: 'Progress' },
  ],
  admin: [
    { id: 'admin-members',   icon: 'group',          label: 'Members' },
    { id: 'admin-trainers',  icon: 'sports',         label: 'Trainers' },
    { id: 'admin-exercises', icon: 'fitness_center', label: 'Exercises' },
  ],
};

// ─── UTILITIES ────────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const initials = n => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function showToast(msg, type = 'success') {
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="material-icons-round">${icons[type] || 'info'}</span><span>${msg}</span>`;
  $('#toast-container').appendChild(t);
  setTimeout(() => { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 300); }, 3500);
}

function openModal(title, body, footer = '') {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = body;
  $('#modal-footer').innerHTML = footer;
  $('#modal-overlay').classList.remove('hidden');
}
function closeModal() { $('#modal-overlay').classList.add('hidden'); }
function destroyCharts() { APP.charts.forEach(c => { try { c.destroy(); } catch(e){} }); APP.charts = []; }
function empty(icon, title, sub) {
  return `<div class="empty-state"><span class="material-icons-round">${icon}</span><h4>${title}</h4><p>${sub}</p></div>`;
}

const chartOpts = () => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, beginAtZero: false }
  }
});

// ─── AUTH ────────────────────────────────────────────
function initAuth() {
  const session = DataService.getSession();
  if (session) { doLogin(session); return; }

  $('#show-register').onclick = e => { e.preventDefault(); $('#login-view').classList.add('hidden'); $('#register-view').classList.remove('hidden'); };
  $('#show-login').onclick    = e => { e.preventDefault(); $('#register-view').classList.add('hidden'); $('#login-view').classList.remove('hidden'); };

  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    const btn = $('#login-btn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    const r = await DataService.login($('#login-email').value.trim(), $('#login-password').value, $('#login-role').value);
    btn.disabled = false; btn.innerHTML = 'Sign In <span class="material-icons-round">arrow_forward</span>';
    if (!r.success) { showToast(r.error, 'error'); return; }
    doLogin(r.user);
  };

  $('#register-form').onsubmit = async e => {
    e.preventDefault();
    const pw = $('#reg-password').value, conf = $('#reg-confirm').value;
    if (pw !== conf) { showToast('Passwords do not match', 'error'); return; }
    if (pw.length < 8) { showToast('Password must be 8+ characters', 'error'); return; }
    const btn = $('#register-btn');
    btn.disabled = true; btn.textContent = 'Creating account…';
    const r = await DataService.register($('#reg-name').value.trim(), '', $('#reg-email').value.trim(), pw, $('#reg-role').value);
    btn.disabled = false; btn.innerHTML = 'Create Account <span class="material-icons-round">arrow_forward</span>';
    if (!r.success) { showToast(r.error, 'error'); return; }
    doLogin(r.user);
    showToast('Account created! Welcome aboard 🎉');
  };
}

function doLogin(user) {
  APP.user = user;
  $('#auth-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  $('#user-name').textContent = user.name;
  $('#user-role-label').textContent = user.role;
  $('#user-avatar').textContent = initials(user.name);
  buildSidebar(user.role);
  navigateTo(NAV[user.role][0].id);
}

function logout() {
  DataService.logout(); APP.user = null; destroyCharts();
  $('#app-shell').classList.add('hidden');
  $('#auth-screen').classList.remove('hidden');
  $('#login-view').classList.remove('hidden');
  $('#register-view').classList.add('hidden');
  $('#login-email').value = ''; $('#login-password').value = '';
}

// ─── SIDEBAR & ROUTING ────────────────────────────────
function buildSidebar(role) {
  const nav = $('#sidebar-nav');
  nav.innerHTML = `<div class="nav-section-label">${role === 'member' ? 'Menu' : role === 'trainer' ? 'Trainer Panel' : 'Admin Panel'}</div>`;
  NAV[role].forEach(item => {
    const el = document.createElement('div');
    el.className = 'nav-item'; el.dataset.view = item.id;
    el.innerHTML = `<span class="material-icons-round">${item.icon}</span><span>${item.label}</span>`;
    el.onclick = () => navigateTo(item.id);
    nav.appendChild(el);
  });
}

function navigateTo(viewId) {
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $$('.view').forEach(v => v.classList.remove('active'));
  const ni = $(`.nav-item[data-view="${viewId}"]`);
  if (ni) ni.classList.add('active');
  const ve = $(`#view-${viewId}`);
  if (ve) { ve.classList.add('active'); ve.style.animation = 'none'; ve.offsetHeight; ve.style.animation = ''; }
  const nc = NAV[APP.user.role].find(n => n.id === viewId);
  if (nc) $('#topbar-title').textContent = nc.label;
  APP.currentView = viewId;
  destroyCharts();
  const R = {
    'member-dashboard': renderMemberDash,
    'workout-plans':    renderMyPlans,
    'progress':         renderProgress,
    'payments':         renderPayments,
    'profile':          renderProfile,
    'trainer-dashboard': renderTrainerDash,
    'trainer-members':   renderTrainerMembers,
    'trainer-plans':     renderTrainerPlans,
    'trainer-progress':  renderTrainerProgress,
    'admin-members':     renderAdminMembers,
    'admin-trainers':    renderAdminTrainers,
    'admin-exercises':   renderAdminExercises,
  };
  if (R[viewId]) R[viewId]();
  $('#sidebar').classList.remove('open');
}

// Loading helper
function setLoading(el, msg = 'Loading…') {
  el.innerHTML = `<div class="empty-state"><span class="material-icons-round spin">refresh</span><p>${msg}</p></div>`;
}

// ═══════════════════════════════════════════════════════
//  MEMBER VIEWS
// ═══════════════════════════════════════════════════════

async function renderMemberDash() {
  const v = $('#view-member-dashboard');
  setLoading(v);
  const [prog, myPlanLinks] = await Promise.all([
    DataService.getProgress(APP.user.id),
    DataService.getMemberPlans(APP.user.id),
  ]);
  const latest = prog.length ? prog[prog.length - 1] : null;
  const prev   = prog.length > 1 ? prog[prog.length - 2] : null;
  const wDiff  = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;
  const payments = await DataService.getPayments(APP.user.id);

  v.innerHTML = `
    <div class="welcome-banner">
      <div class="banner-content">
        <h2>Welcome back, ${APP.user.name.split(' ')[0]}! 💪</h2>
        <p>${prog.length ? 'Keep up the great work!' : 'Start tracking your fitness journey!'}</p>
      </div>
    </div>
    <div class="grid-4 mb-6">
      <div class="card stat-card">
        <div class="stat-icon blue"><span class="material-icons-round">assignment</span></div>
        <div class="stat-content"><div class="stat-label">My Plans</div><div class="stat-value">${myPlanLinks.length}</div></div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon green"><span class="material-icons-round">monitor_weight</span></div>
        <div class="stat-content">
          <div class="stat-label">Latest Weight</div>
          <div class="stat-value">${latest ? latest.weight + ' kg' : '—'}</div>
          ${wDiff !== null ? `<span class="stat-change ${parseFloat(wDiff) <= 0 ? 'up' : 'down'}">${Math.abs(wDiff)} kg</span>` : ''}
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon orange"><span class="material-icons-round">speed</span></div>
        <div class="stat-content"><div class="stat-label">Body Fat</div><div class="stat-value">${latest ? latest.bodyFat + '%' : '—'}</div></div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon purple"><span class="material-icons-round">receipt_long</span></div>
        <div class="stat-content"><div class="stat-label">Payments</div><div class="stat-value">${payments.length}</div></div>
      </div>
    </div>
    <div class="grid-4 mb-6">
      <div class="quick-action" id="qa-plans"><div class="quick-action-icon" style="background:var(--accent-50);color:var(--accent-600)"><span class="material-icons-round">description</span></div><div class="quick-action-label">My Plans</div></div>
      <div class="quick-action" id="qa-progress"><div class="quick-action-icon" style="background:var(--success-50);color:var(--success-600)"><span class="material-icons-round">add_chart</span></div><div class="quick-action-label">Log Progress</div></div>
      <div class="quick-action" id="qa-pay"><div class="quick-action-icon" style="background:var(--warning-50);color:var(--warning-600)"><span class="material-icons-round">payment</span></div><div class="quick-action-label">Payments</div></div>
      <div class="quick-action" id="qa-profile"><div class="quick-action-icon" style="background:#fdf4ff;color:#c026d3"><span class="material-icons-round">person</span></div><div class="quick-action-label">Profile</div></div>
    </div>
    ${prog.length >= 2 ? `<div class="card card-padded"><div class="section-title">Weight Trend</div><div class="chart-container"><canvas id="dash-chart"></canvas></div></div>` : ''}
  `;
  $('#qa-plans').onclick   = () => navigateTo('workout-plans');
  $('#qa-progress').onclick = () => navigateTo('progress');
  $('#qa-pay').onclick     = () => navigateTo('payments');
  $('#qa-profile').onclick = () => navigateTo('profile');
  if (prog.length >= 2) {
    APP.charts.push(new Chart(document.getElementById('dash-chart'), {
      type: 'line',
      data: { labels: prog.map(p => fmtDate(p.date)), datasets: [{ data: prog.map(p => p.weight), borderColor: '#5c6fff', backgroundColor: 'rgba(92,111,255,.08)', fill: true, tension: .4, pointRadius: 4, pointBackgroundColor: '#5c6fff', pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5 }] },
      options: chartOpts()
    }));
  }
}

// ── MY PLANS ──
async function renderMyPlans() {
  const v = $('#view-workout-plans');
  setLoading(v);
  const [myPlanLinks, allPlans, exercises] = await Promise.all([
    DataService.getMemberPlans(APP.user.id),
    DataService.getPlans(),
    DataService.getExercises(),
  ]);
  const myPlanIds = myPlanLinks.map(x => x.planId);
  const myPlans   = allPlans.filter(p => myPlanIds.includes(p.id));
  const otherPlans= allPlans.filter(p => !myPlanIds.includes(p.id));

  // Fetch exercise lists for each plan
  const planExMap = {};
  await Promise.all(allPlans.map(async p => {
    planExMap[p.id] = await DataService.getPlanExercises(p.id);
  }));

  const planCard = (p, following) => {
    const peIds = planExMap[p.id].map(x => x.exerciseId);
    const exList = peIds.map(id => exercises.find(e => e.id === id)).filter(Boolean);
    return `
      <div class="card card-padded plan-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--accent-50);color:var(--accent-600);display:flex;align-items:center;justify-content:center"><span class="material-icons-round">assignment</span></div>
          <div><div style="font-weight:700;color:var(--gray-900)">${p.goal}</div><div style="font-size:var(--text-xs);color:var(--gray-500)">${p.duration} weeks • ${p.difficulty || '—'}</div></div>
        </div>
        <div style="min-height:60px;margin-bottom:12px">
          ${exList.slice(0, 3).map(e => `<div style="font-size:var(--text-xs);color:var(--gray-600);padding:3px 0">• ${e.name} — <span style="color:var(--gray-400)">${e.muscle}</span></div>`).join('')}
          ${exList.length > 3 ? `<div style="font-size:var(--text-xs);color:var(--gray-400)">+${exList.length - 3} more</div>` : ''}
          ${exList.length === 0 ? `<div style="font-size:var(--text-xs);color:var(--gray-400)">No exercises added</div>` : ''}
        </div>
        <div style="display:flex;gap:8px" class="mb-4">
          <span class="badge badge-blue">${p.difficulty || '—'}</span>
          <span class="badge badge-gray">${exList.length} exercises</span>
        </div>
        <button class="btn ${following ? 'btn-danger' : 'btn-primary'} btn-sm btn-full ${following ? 'btn-unfollow' : 'btn-follow'}" data-id="${p.id}">${following ? 'Unfollow' : 'Follow Plan'}</button>
      </div>`;
  };

  v.innerHTML = `
    <div class="section-title">My Workout Plans</div>
    ${myPlans.length ? `<div class="grid-3 mb-6">${myPlans.map(p => planCard(p, true)).join('')}</div>` : `<div class="card card-padded mb-6">${empty('assignment', 'No plans yet', 'Follow a plan from the list below')}</div>`}
    ${otherPlans.length ? `<div class="section-title">Available Plans</div><div class="grid-3">${otherPlans.map(p => planCard(p, false)).join('')}</div>` : ''}
  `;
  $$('.btn-follow').forEach(b => b.onclick = async () => {
    await DataService.followPlan(APP.user.id, parseInt(b.dataset.id));
    showToast('Plan followed!'); renderMyPlans();
  });
  $$('.btn-unfollow').forEach(b => b.onclick = async () => {
    await DataService.unfollowPlan(APP.user.id, parseInt(b.dataset.id));
    showToast('Plan unfollowed'); renderMyPlans();
  });
}

// ── PROGRESS ──
async function renderProgress() {
  const v = $('#view-progress');
  setLoading(v);
  const prog = await DataService.getProgress(APP.user.id);

  v.innerHTML = `
    <div class="card card-padded mb-6">
      <div class="section-title">Log Progress</div>
      <div class="progress-form">
        <div class="form-group" style="margin-bottom:0"><label>Date</label><input class="input-plain" type="date" id="p-date" value="${new Date().toISOString().split('T')[0]}" /></div>
        <div class="form-group" style="margin-bottom:0"><label>Weight (kg)</label><input class="input-plain" type="number" step="0.1" id="p-weight" placeholder="e.g. 70.5" /></div>
        <div class="form-group" style="margin-bottom:0"><label>Body Fat %</label><input class="input-plain" type="number" step="0.1" id="p-fat" placeholder="e.g. 22" /></div>
        <button class="btn btn-primary" id="log-btn" style="align-self:end;height:44px"><span class="material-icons-round">add</span> Record</button>
      </div>
    </div>
    ${prog.length >= 2 ? `
    <div class="grid-2 mb-6">
      <div class="card card-padded"><div class="section-title">Weight Over Time</div><div class="chart-container"><canvas id="wt-chart"></canvas></div></div>
      <div class="card card-padded"><div class="section-title">Body Fat Over Time</div><div class="chart-container"><canvas id="bf-chart"></canvas></div></div>
    </div>` : ''}
    <div class="card card-padded">
      <div class="section-title">History</div>
      ${prog.length ? `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Weight</th><th>Body Fat</th><th>Actions</th></tr></thead><tbody>
        ${prog.slice().reverse().map(p => `<tr><td>${fmtDate(p.date)}</td><td style="font-weight:600;color:var(--gray-900)">${p.weight} kg</td><td>${p.bodyFat}%</td><td>
          <button class="btn btn-ghost btn-sm del-prog" data-id="${p.id}" style="color:var(--danger-500)"><span class="material-icons-round" style="font-size:18px">delete</span></button>
        </td></tr>`).join('')}
      </tbody></table></div>` : empty('trending_up', 'No entries yet', 'Log your first progress above')}
    </div>
  `;
  $('#log-btn').onclick = async () => {
    const w = parseFloat($('#p-weight').value), f = parseFloat($('#p-fat').value);
    if (!w && !f) { showToast('Enter weight or body fat', 'error'); return; }
    await DataService.addProgress({ memberId: APP.user.id, date: $('#p-date').value, weight: w || 0, bodyFat: f || 0 });
    showToast('Progress logged!'); renderProgress();
  };
  $$('.del-prog').forEach(b => b.onclick = async () => {
    await DataService.deleteProgress(parseInt(b.dataset.id)); showToast('Deleted'); renderProgress();
  });
  if (prog.length >= 2) {
    const labels = prog.map(p => fmtDate(p.date));
    const c1 = document.getElementById('wt-chart');
    if (c1) APP.charts.push(new Chart(c1, { type: 'line', data: { labels, datasets: [{ data: prog.map(p => p.weight), borderColor: '#5c6fff', backgroundColor: 'rgba(92,111,255,.08)', fill: true, tension: .4, pointRadius: 4, borderWidth: 2 }] }, options: chartOpts() }));
    const c2 = document.getElementById('bf-chart');
    if (c2) APP.charts.push(new Chart(c2, { type: 'line', data: { labels, datasets: [{ data: prog.map(p => p.bodyFat), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.08)', fill: true, tension: .4, pointRadius: 4, borderWidth: 2 }] }, options: chartOpts() }));
  }
}

// ── PAYMENTS ──
async function renderPayments() {
  const v = $('#view-payments');
  setLoading(v);
  const payments = await DataService.getPayments(APP.user.id);
  const total = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  v.innerHTML = `
    <div class="grid-2 mb-6">
      <div class="card stat-card"><div class="stat-icon green"><span class="material-icons-round">paid</span></div>
        <div class="stat-content"><div class="stat-label">Total Paid</div><div class="stat-value">$${total.toFixed(2)}</div></div></div>
      <div class="card stat-card"><div class="stat-icon blue"><span class="material-icons-round">receipt_long</span></div>
        <div class="stat-content"><div class="stat-label">Transactions</div><div class="stat-value">${payments.length}</div></div></div>
    </div>
    <div class="grid-2">
      <div>
        <div class="section-title">Payment History</div>
        ${payments.length ? `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Amount</th><th>Method</th></tr></thead><tbody>
          ${payments.slice().reverse().map(p => `<tr><td style="font-weight:700;color:var(--success-600)">$${parseFloat(p.amount).toFixed(2)}</td><td><span class="badge badge-gray">${p.method}</span></td></tr>`).join('')}
        </tbody></table></div>` : `<div class="card card-padded">${empty('receipt_long', 'No payments', 'Your payment history will appear here')}</div>`}
      </div>
      <div class="card card-padded">
        <div class="section-title">Make a Payment</div>
        <div class="form-group"><label>Amount ($)</label><input class="input-plain" type="number" step="0.01" id="pay-amt" placeholder="50.00" /></div>
        <div class="form-group"><label>Method</label>
          <select class="input-plain" id="pay-method"><option>Credit Card</option><option>Cash</option><option>PayPal</option><option>Bank Transfer</option></select>
        </div>
        <button class="btn btn-primary btn-full mt-4" id="pay-btn"><span class="material-icons-round">payment</span> Pay Securely</button>
      </div>
    </div>
  `;
  $('#pay-btn').onclick = async () => {
    const amt = parseFloat($('#pay-amt').value);
    if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
    await DataService.addPayment({ memberId: APP.user.id, amount: amt, method: $('#pay-method').value });
    showToast('Payment recorded!'); renderPayments();
  };
}

// ── PROFILE ──
async function renderProfile() {
  const v = $('#view-profile');
  setLoading(v);
  const u = await DataService.getUser(APP.user.id) || APP.user;

  v.innerHTML = `
    <div class="card mb-6">
      <div class="profile-header">
        <div class="profile-avatar">${initials(u.name)}</div>
        <div class="profile-info"><h2>${u.name}</h2><p>${u.email}</p><span class="badge badge-blue" style="margin-top:8px">${u.role}</span></div>
      </div>
      <div class="profile-form">
        <div class="grid-2">
          <div class="form-group"><label>Name</label><input class="input-plain" id="pf-name" value="${u.name || ''}" /></div>
          <div class="form-group"><label>Email</label><input class="input-plain" id="pf-email" value="${u.email || ''}" /></div>
          <div class="form-group"><label>Phone</label><input class="input-plain" id="pf-phone" value="${u.phone || ''}" placeholder="e.g. 010012345" /></div>
          <div class="form-group"><label>Joined</label><input class="input-plain" value="${fmtDate(u.joinDate)}" disabled /></div>
        </div>
        <button class="btn btn-primary" id="save-prof"><span class="material-icons-round">save</span> Save Changes</button>
      </div>
    </div>
    <div class="card card-padded">
      <div class="section-title">Change Password</div>
      <div class="grid-2" style="max-width:600px">
        <div class="form-group"><label>Current Password</label><input class="input-plain" type="password" id="pw-old" /></div>
        <div></div>
        <div class="form-group"><label>New Password</label><input class="input-plain" type="password" id="pw-new" /></div>
        <div class="form-group"><label>Confirm</label><input class="input-plain" type="password" id="pw-conf" /></div>
      </div>
      <button class="btn btn-secondary" id="change-pw"><span class="material-icons-round">lock</span> Update Password</button>
    </div>
  `;
  $('#save-prof').onclick = async () => {
    const name = $('#pf-name').value.trim(), email = $('#pf-email').value.trim();
    if (!name || !email) { showToast('Name and email required', 'error'); return; }
    const r = await DataService.updateProfile(APP.user.id, { name, email, phone: $('#pf-phone').value.trim() });
    if (r.success) {
      APP.user = r.user;
      $('#user-name').textContent = APP.user.name;
      $('#user-avatar').textContent = initials(APP.user.name);
      showToast('Profile saved!');
    }
  };
  $('#change-pw').onclick = async () => {
    const n = $('#pw-new').value, c = $('#pw-conf').value;
    if (!$('#pw-old').value || !n) { showToast('Fill all fields', 'error'); return; }
    if (n.length < 8) { showToast('8+ characters required', 'error'); return; }
    if (n !== c) { showToast("Passwords don't match", 'error'); return; }
    const r = await DataService.changePassword(APP.user.id, $('#pw-old').value, n);
    if (r.success) { showToast('Password updated!'); $('#pw-old').value = $('#pw-new').value = $('#pw-conf').value = ''; }
    else showToast(r.error, 'error');
  };
}

// ═══════════════════════════════════════════════════════
//  TRAINER VIEWS
// ═══════════════════════════════════════════════════════

async function renderTrainerDash() {
  const v = $('#view-trainer-dashboard');
  setLoading(v);
  const [allMembers, plans, exercises] = await Promise.all([
    DataService.getMembers(),
    DataService.getPlans(),
    DataService.getExercises(),
  ]);
  const members = allMembers.filter(m => m.trainerId === APP.user.id);
  const myPlans = plans.filter(p => p.trainerId === APP.user.id);
  const progCounts = await Promise.all(members.map(m => DataService.getProgress(m.id)));
  const totalLogs = progCounts.reduce((s, p) => s + p.length, 0);

  v.innerHTML = `
    <div class="welcome-banner">
      <div class="banner-content">
        <h2>Welcome, ${APP.user.name.split(' ')[0]}! 🏋️</h2>
        <p>${members.length} member${members.length !== 1 ? 's' : ''} assigned to you</p>
      </div>
    </div>
    <div class="grid-4 mb-6">
      <div class="card stat-card"><div class="stat-icon blue"><span class="material-icons-round">group</span></div><div class="stat-content"><div class="stat-label">Members</div><div class="stat-value">${members.length}</div></div></div>
      <div class="card stat-card"><div class="stat-icon green"><span class="material-icons-round">assignment</span></div><div class="stat-content"><div class="stat-label">My Plans</div><div class="stat-value">${myPlans.length}</div></div></div>
      <div class="card stat-card"><div class="stat-icon orange"><span class="material-icons-round">fitness_center</span></div><div class="stat-content"><div class="stat-label">Exercises</div><div class="stat-value">${exercises.length}</div></div></div>
      <div class="card stat-card"><div class="stat-icon purple"><span class="material-icons-round">insights</span></div><div class="stat-content"><div class="stat-label">Progress Logs</div><div class="stat-value">${totalLogs}</div></div></div>
    </div>
    <div class="section-title">My Members</div>
    ${members.length ? `<div class="grid-3">${members.map((m, i) => `
      <div class="card member-card">
        <div class="avatar-lg avatar-color-${(i % 5) + 1}">${initials(m.name)}</div>
        <div class="member-card-info"><div class="member-card-name">${m.name}</div><div class="member-card-email">${m.email}</div></div>
      </div>`).join('')}</div>` : empty('group', 'No members assigned', 'Ask an admin to assign members to you')}
  `;
}

async function renderTrainerMembers() {
  const v = $('#view-trainer-members');
  setLoading(v);
  const allMembers = await DataService.getMembers();
  const members = allMembers.filter(m => m.trainerId === APP.user.id);
  v.innerHTML = `
    <div class="section-title mb-4">Assigned Members</div>
    ${members.length ? `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Joined</th></tr></thead><tbody>
      ${members.map(m => `<tr><td style="font-weight:600;color:var(--gray-900)">${m.name}</td><td>${m.phone || '—'}</td><td style="color:var(--gray-500)">${m.email}</td><td>${fmtDate(m.joinDate)}</td></tr>`).join('')}
    </tbody></table></div>` : empty('group', 'No members assigned', 'Ask an admin to assign members to you')}
  `;
}

async function renderTrainerPlans() {
  const v = $('#view-trainer-plans');
  setLoading(v);
  const [allPlans, exercises] = await Promise.all([DataService.getPlans(), DataService.getExercises()]);
  const plans = allPlans.filter(p => p.trainerId === APP.user.id);

  const planExMap = {};
  await Promise.all(plans.map(async p => { planExMap[p.id] = await DataService.getPlanExercises(p.id); }));

  v.innerHTML = `
    <div class="action-bar">
      <div class="section-title mb-0">Workout Plans</div>
      <button class="btn btn-primary" id="create-plan"><span class="material-icons-round">add</span> Create Plan</button>
    </div>
    ${plans.length ? `<div class="grid-3 mt-4">${plans.map(p => {
      const peIds = (planExMap[p.id] || []).map(x => x.exerciseId);
      const exList = peIds.map(id => exercises.find(e => e.id === id)).filter(Boolean);
      return `<div class="card card-padded plan-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:40px;height:40px;border-radius:var(--radius-md);background:rgba(245,158,11,.1);color:var(--warning-600);display:flex;align-items:center;justify-content:center"><span class="material-icons-round">assignment</span></div>
          <div><div style="font-weight:700;color:var(--gray-900)">${p.goal}</div><div style="font-size:var(--text-xs);color:var(--gray-500)">${p.duration} weeks • ${p.difficulty}</div></div>
        </div>
        <div style="min-height:60px;margin-bottom:12px">
          ${exList.slice(0, 3).map(e => `<div style="font-size:var(--text-xs);color:var(--gray-600);padding:2px 0">• ${e.name}</div>`).join('')}
          ${exList.length > 3 ? `<div style="font-size:var(--text-xs);color:var(--gray-400)">+${exList.length - 3} more</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:auto" class="mt-4">
          <button class="btn btn-secondary btn-sm edit-plan" data-id="${p.id}" style="flex:1"><span class="material-icons-round" style="font-size:16px">edit</span> Edit</button>
          <button class="btn btn-ghost btn-sm del-plan" data-id="${p.id}" style="color:var(--danger-500)"><span class="material-icons-round" style="font-size:16px">delete</span></button>
        </div>
      </div>`;
    }).join('')}</div>` : empty('assignment', 'No plans', 'Create your first workout plan')}
  `;
  $('#create-plan').onclick = () => openPlanEditor(null);
  $$('.edit-plan').forEach(b => b.onclick = async () => openPlanEditor(await DataService.getPlan(parseInt(b.dataset.id))));
  $$('.del-plan').forEach(b => b.onclick = () =>
    confirmDelete(async () => { await DataService.deletePlan(parseInt(b.dataset.id)); showToast('Deleted'); renderTrainerPlans(); })
  );
}

async function openPlanEditor(plan) {
  const ex = await DataService.getExercises();
  const sel = plan ? (await DataService.getPlanExercises(plan.id)).map(x => x.exerciseId) : [];

  openModal(plan ? 'Edit Plan' : 'Create Plan', `
    <div class="form-group"><label>Plan Goal</label><input class="input-plain" id="pe-goal" value="${plan ? plan.goal : ''}" placeholder="e.g. Weight Loss" /></div>
    <div class="grid-2">
      <div class="form-group"><label>Duration (weeks)</label><input class="input-plain" type="number" id="pe-dur" value="${plan ? plan.duration : ''}" placeholder="8" /></div>
      <div class="form-group"><label>Difficulty</label><select class="input-plain" id="pe-diff">
        <option ${plan?.difficulty === 'Beginner' ? 'selected' : ''}>Beginner</option>
        <option ${plan?.difficulty === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
        <option ${plan?.difficulty === 'Advanced' ? 'selected' : ''}>Advanced</option>
      </select></div>
    </div>
    <div class="form-group"><label>Exercises</label>
      ${ex.length ? `<div style="max-height:200px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:8px">
        ${ex.map(e => `<label style="display:flex;align-items:center;gap:8px;padding:4px;font-size:var(--text-sm);cursor:pointer"><input type="checkbox" class="pe-check" data-eid="${e.id}" ${sel.includes(e.id) ? 'checked' : ''} style="accent-color:var(--accent-600)" />${e.name} <span style="color:var(--gray-400)">— ${e.muscle}</span></label>`).join('')}
      </div>` : '<p style="font-size:var(--text-sm);color:var(--gray-400)">No exercises available — admin must add them first</p>'}
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="pe-save">${plan ? 'Save Changes' : 'Create Plan'}</button>`);

  setTimeout(() => {
    document.getElementById('pe-save').onclick = async () => {
      const goal = $('#pe-goal').value.trim();
      if (!goal) { showToast('Enter a plan goal', 'error'); return; }
      const data = { goal, duration: parseInt($('#pe-dur').value) || 0, difficulty: $('#pe-diff').value, trainerId: APP.user.id };
      const exIds = [...$$('.pe-check:checked')].map(c => parseInt(c.dataset.eid));
      let planId;
      if (plan) {
        await DataService.updatePlan(plan.id, data); planId = plan.id;
      } else {
        const np = await DataService.addPlan(data); planId = np.id;
      }
      await DataService.setPlanExercises(planId, exIds);
      closeModal(); showToast(plan ? 'Plan updated!' : 'Plan created!'); renderTrainerPlans();
    };
  }, 50);
}

async function renderTrainerProgress() {
  const v = $('#view-trainer-progress');
  setLoading(v);
  const allMembers = await DataService.getMembers();
  const members = allMembers.filter(m => m.trainerId === APP.user.id);
  const progList = await Promise.all(members.map(m => DataService.getProgress(m.id)));

  v.innerHTML = `
    <div class="section-title mb-4">Member Progress</div>
    ${members.length ? `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Member</th><th>Start Weight</th><th>Current Weight</th><th>Change</th><th>Body Fat</th><th>Entries</th></tr></thead><tbody>
      ${members.map((m, i) => {
        const prog = progList[i];
        const first = prog[0], last = prog[prog.length - 1];
        const diff = first && last ? (last.weight - first.weight).toFixed(1) : '—';
        return `<tr><td style="font-weight:600;color:var(--gray-900)">${m.name}</td><td>${first ? first.weight + ' kg' : '—'}</td><td style="font-weight:600">${last ? last.weight + ' kg' : '—'}</td>
          <td>${diff !== '—' ? `<span class="stat-change ${parseFloat(diff) <= 0 ? 'up' : 'down'}">${Math.abs(diff)} kg</span>` : '—'}</td>
          <td>${last ? last.bodyFat + '%' : '—'}</td><td><span class="badge badge-gray">${prog.length}</span></td></tr>`;
      }).join('')}
    </tbody></table></div>` : empty('insights', 'No members', 'Assign members to see their progress')}
  `;
}

// ═══════════════════════════════════════════════════════
//  ADMIN VIEWS
// ═══════════════════════════════════════════════════════

async function renderAdminMembers() {
  const v = $('#view-admin-members');
  setLoading(v);
  const [members, trainers] = await Promise.all([DataService.getMembers(), DataService.getTrainers()]);

  const trainerName = id => {
    if (!id) return 'Unassigned';
    const t = trainers.find(x => x.id === id);
    return t ? t.name : 'Unknown';
  };

  v.innerHTML = `
    <div class="action-bar">
      <div class="section-title mb-0">Platform Members</div>
      <button class="btn btn-primary" id="add-member"><span class="material-icons-round">person_add</span> Add Member</button>
    </div>
    ${members.length ? `<div class="table-wrapper mt-4"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Trainer</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
      ${members.map(m => `<tr>
        <td><div style="font-weight:600;color:var(--gray-900)">${m.name}</div><div style="color:var(--gray-500);font-size:var(--text-xs)">${m.phone || '—'}</div></td>
        <td>${m.email}</td>
        <td><span class="badge badge-blue">${trainerName(m.trainerId)}</span></td>
        <td>${fmtDate(m.joinDate)}</td>
        <td><div class="row-actions">
          <button class="btn btn-ghost edit-m" data-id="${m.id}"><span class="material-icons-round" style="font-size:18px">edit</span></button>
          <button class="btn btn-ghost del-m" data-id="${m.id}" style="color:var(--danger-500)"><span class="material-icons-round" style="font-size:18px">delete</span></button>
        </div></td></tr>`).join('')}
    </tbody></table></div>` : empty('group', 'No members', 'Add your first member')}
  `;

  const memberForm = m => `
    <div class="form-group"><label>Full Name</label><input class="input-plain" id="mf-name" value="${m.name || ''}" placeholder="e.g. John Doe" /></div>
    <div class="grid-2">
      <div class="form-group"><label>Phone</label><input class="input-plain" id="mf-phone" value="${m.phone || ''}" placeholder="010..." /></div>
      <div class="form-group"><label>Email</label><input class="input-plain" id="mf-email" value="${m.email || ''}" placeholder="email@example.com" /></div>
    </div>
    <div class="form-group"><label>Assigned Trainer</label><select class="input-plain" id="mf-trainer">
      <option value="">Unassigned</option>
      ${trainers.map(t => `<option value="${t.id}" ${m.trainerId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
    </select></div>`;

  $('#add-member').onclick = () => {
    openModal('Add Member', memberForm({}), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-m">Add Member</button>`);
    setTimeout(() => { document.getElementById('save-m').onclick = async () => {
      const name = $('#mf-name').value.trim();
      if (!name) { showToast('Name required', 'error'); return; }
      await DataService.addMember({ name, phone: $('#mf-phone').value, email: $('#mf-email').value, trainerId: parseInt($('#mf-trainer').value) || null });
      closeModal(); showToast('Member added!'); renderAdminMembers();
    }; }, 50);
  };
  $$('.edit-m').forEach(b => b.onclick = async () => {
    const m = members.find(x => x.id === parseInt(b.dataset.id));
    openModal('Edit Member', memberForm(m), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-m">Save Changes</button>`);
    setTimeout(() => { document.getElementById('save-m').onclick = async () => {
      await DataService.updateMember(m.id, { name: $('#mf-name').value, phone: $('#mf-phone').value, email: $('#mf-email').value, trainerId: parseInt($('#mf-trainer').value) || null });
      closeModal(); showToast('Updated!'); renderAdminMembers();
    }; }, 50);
  });
  $$('.del-m').forEach(b => b.onclick = () =>
    confirmDelete(async () => { await DataService.deleteMember(parseInt(b.dataset.id)); showToast('Deleted'); renderAdminMembers(); })
  );
}

async function renderAdminTrainers() {
  const v = $('#view-admin-trainers');
  setLoading(v);
  const [trainers, members] = await Promise.all([DataService.getTrainers(), DataService.getMembers()]);

  v.innerHTML = `
    <div class="action-bar">
      <div class="section-title mb-0">Platform Trainers</div>
      <button class="btn btn-primary" id="add-trainer"><span class="material-icons-round">person_add</span> Add Trainer</button>
    </div>
    ${trainers.length ? `<div class="table-wrapper mt-4"><table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Specialization</th><th>Members</th><th>Actions</th></tr></thead><tbody>
      ${trainers.map(t => `<tr>
        <td style="font-weight:600;color:var(--gray-900)">${t.name}</td>
        <td>${t.phone || '—'}</td>
        <td><span class="badge badge-gray">${t.specialization || '—'}</span></td>
        <td><span class="badge badge-blue">${members.filter(m => m.trainerId === t.id).length} Mentees</span></td>
        <td><div class="row-actions">
          <button class="btn btn-ghost edit-t" data-id="${t.id}"><span class="material-icons-round" style="font-size:18px">edit</span></button>
          <button class="btn btn-ghost del-t" data-id="${t.id}" style="color:var(--danger-500)"><span class="material-icons-round" style="font-size:18px">delete</span></button>
        </div></td></tr>`).join('')}
    </tbody></table></div>` : empty('sports', 'No trainers', 'Add your first trainer')}
  `;

  const trainerForm = t => `
    <div class="form-group"><label>Full Name</label><input class="input-plain" id="tf-name" value="${t.name || ''}" placeholder="e.g. Jane Smith" /></div>
    <div class="grid-2">
      <div class="form-group"><label>Phone</label><input class="input-plain" id="tf-phone" value="${t.phone || ''}" placeholder="0200..." /></div>
      <div class="form-group"><label>Specialization</label><input class="input-plain" id="tf-spec" value="${t.specialization || ''}" placeholder="e.g. Strength" /></div>
    </div>`;

  $('#add-trainer').onclick = () => {
    openModal('Add Trainer', trainerForm({}), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-t">Add Trainer</button>`);
    setTimeout(() => { document.getElementById('save-t').onclick = async () => {
      const name = $('#tf-name').value.trim();
      if (!name) { showToast('Name required', 'error'); return; }
      await DataService.addTrainer({ name, phone: $('#tf-phone').value, specialization: $('#tf-spec').value });
      closeModal(); showToast('Trainer added!'); renderAdminTrainers();
    }; }, 50);
  };
  $$('.edit-t').forEach(b => b.onclick = () => {
    const t = trainers.find(x => x.id === parseInt(b.dataset.id));
    openModal('Edit Trainer', trainerForm(t), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-t">Save Changes</button>`);
    setTimeout(() => { document.getElementById('save-t').onclick = async () => {
      await DataService.updateTrainer(t.id, { name: $('#tf-name').value, phone: $('#tf-phone').value, specialization: $('#tf-spec').value });
      closeModal(); showToast('Updated!'); renderAdminTrainers();
    }; }, 50);
  });
  $$('.del-t').forEach(b => b.onclick = () =>
    confirmDelete(async () => { await DataService.deleteTrainer(parseInt(b.dataset.id)); showToast('Deleted'); renderAdminTrainers(); })
  );
}

async function renderAdminExercises() {
  const v = $('#view-admin-exercises');
  setLoading(v);
  const exercises = await DataService.getExercises();

  v.innerHTML = `
    <div class="action-bar">
      <div class="section-title mb-0">Exercise Library</div>
      <button class="btn btn-primary" id="add-ex"><span class="material-icons-round">add</span> Add Exercise</button>
    </div>
    ${exercises.length ? `<div class="grid-3 mt-4">${exercises.map(e => `
      <div class="card exercise-card">
        <div class="exercise-icon"><span class="material-icons-round">fitness_center</span></div>
        <div class="exercise-info">
          <div class="exercise-name">${e.name}</div>
          <div class="exercise-meta">${e.equipment || 'No Equipment'} • <strong>${e.muscle}</strong></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button class="btn btn-ghost btn-sm edit-ex" data-id="${e.id}" style="padding:4px"><span class="material-icons-round" style="font-size:16px">edit</span></button>
          <button class="btn btn-ghost btn-sm del-ex" data-id="${e.id}" style="padding:4px;color:var(--danger-500)"><span class="material-icons-round" style="font-size:16px">delete</span></button>
        </div>
      </div>`).join('')}
    </div>` : empty('fitness_center', 'No exercises', 'Add exercises to the library')}
  `;

  const exForm = e => `
    <div class="form-group"><label>Exercise Name</label><input class="input-plain" id="ef-name" value="${e.name || ''}" placeholder="e.g. Bench Press" /></div>
    <div class="grid-2">
      <div class="form-group"><label>Target Muscle</label><input class="input-plain" id="ef-muscle" value="${e.muscle || ''}" placeholder="e.g. Chest" /></div>
      <div class="form-group"><label>Equipment</label><input class="input-plain" id="ef-equip" value="${e.equipment || ''}" placeholder="e.g. Barbell" /></div>
    </div>`;

  $('#add-ex').onclick = () => {
    openModal('Add Exercise', exForm({}), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-ex">Add Exercise</button>`);
    setTimeout(() => { document.getElementById('save-ex').onclick = async () => {
      if (!$('#ef-name').value.trim()) { showToast('Name required', 'error'); return; }
      await DataService.addExercise({ name: $('#ef-name').value, muscle: $('#ef-muscle').value, equipment: $('#ef-equip').value });
      closeModal(); showToast('Exercise added!'); renderAdminExercises();
    }; }, 50);
  };
  $$('.edit-ex').forEach(b => b.onclick = () => {
    const e = exercises.find(x => x.id === parseInt(b.dataset.id));
    openModal('Edit Exercise', exForm(e), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-ex">Save Changes</button>`);
    setTimeout(() => { document.getElementById('save-ex').onclick = async () => {
      await DataService.updateExercise(e.id, { name: $('#ef-name').value, muscle: $('#ef-muscle').value, equipment: $('#ef-equip').value });
      closeModal(); showToast('Updated!'); renderAdminExercises();
    }; }, 50);
  });
  $$('.del-ex').forEach(b => b.onclick = () =>
    confirmDelete(async () => { await DataService.deleteExercise(parseInt(b.dataset.id)); showToast('Deleted'); renderAdminExercises(); })
  );
}

function confirmDelete(cb) {
  openModal('Confirm Delete', '<p style="color:var(--gray-600)">Are you sure? This action cannot be undone.</p>',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" id="confirm-del">Delete</button>`);
  setTimeout(() => { document.getElementById('confirm-del').onclick = () => { closeModal(); cb(); }; }, 50);
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  $('#modal-close').onclick = closeModal;
  $('#modal-overlay').onclick = e => { if (e.target === e.currentTarget) closeModal(); };
  $('#logout-btn').onclick = logout;
  $('#sidebar-toggle').onclick = () => $('#sidebar').classList.toggle('open');
  document.addEventListener('click', e => {
    const sb = $('#sidebar');
    if (sb.classList.contains('open') && !sb.contains(e.target) && !$('#sidebar-toggle').contains(e.target))
      sb.classList.remove('open');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#sidebar').classList.remove('open'); } });
});
