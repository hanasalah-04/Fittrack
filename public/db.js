/* ═══════════════════════════════════════════════════════
   FitTrack — DataService (API-backed, shared across devices)
   All data is now stored server-side in SQLite.
   ═══════════════════════════════════════════════════════ */

const DataService = (() => {

  // ── Session (still local per browser tab — just the logged-in user token) ──
  const SESSION_KEY = 'ft_session_v2';

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }
  function setSession(user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
  function logout() { sessionStorage.removeItem(SESSION_KEY); }

  // ── HTTP helpers ──
  async function api(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    return res.json();
  }
  const GET  = (path)       => api('GET',    path);
  const POST = (path, body) => api('POST',   path, body);
  const PUT  = (path, body) => api('PUT',    path, body);
  const DEL  = (path, body) => api('DELETE', path, body);

  // ── AUTH ──
  async function login(email, password, role) {
    const r = await POST('/api/login', { email, password, role });
    if (r.success) setSession(r.user);
    return r;
  }

  async function register(name, phone, email, password, role) {
    const r = await POST('/api/register', { name, phone, email, password, role });
    if (r.success) setSession(r.user);
    return r;
  }

  async function getUser(id)             { return GET(`/api/user/${id}`); }
  async function updateProfile(id, data) { const r = await PUT(`/api/user/${id}`, data); if (r.success) setSession(r.user); return r; }
  async function changePassword(id, oldPassword, newPassword) { return PUT(`/api/user/${id}/password`, { oldPassword, newPassword }); }

  // ── MEMBERS ──
  async function getMembers()        { return GET('/api/members'); }
  async function getMember(id)       { return GET(`/api/members/${id}`); }
  async function addMember(d)        { return POST('/api/members', d); }
  async function updateMember(id, d) { return PUT(`/api/members/${id}`, d); }
  async function deleteMember(id)    { return DEL(`/api/members/${id}`); }

  // ── TRAINERS ──
  async function getTrainers()        { return GET('/api/trainers'); }
  async function getTrainer(id)       { return GET(`/api/trainers/${id}`); }
  async function addTrainer(d)        { return POST('/api/trainers', d); }
  async function updateTrainer(id, d) { return PUT(`/api/trainers/${id}`, d); }
  async function deleteTrainer(id)    { return DEL(`/api/trainers/${id}`); }

  // ── EXERCISES ──
  async function getExercises()        { return GET('/api/exercises'); }
  async function addExercise(d)        { return POST('/api/exercises', d); }
  async function updateExercise(id, d) { return PUT(`/api/exercises/${id}`, d); }
  async function deleteExercise(id)    { return DEL(`/api/exercises/${id}`); }

  // ── WORKOUT PLANS ──
  async function getPlans()        { return GET('/api/plans'); }
  async function getPlan(id)       { return GET(`/api/plans/${id}`); }
  async function addPlan(d)        { return POST('/api/plans', d); }
  async function updatePlan(id, d) { return PUT(`/api/plans/${id}`, d); }
  async function deletePlan(id)    { return DEL(`/api/plans/${id}`); }

  async function getPlanExercises(planId)             { return GET(`/api/plans/${planId}/exercises`); }
  async function setPlanExercises(planId, exerciseIds){ return PUT(`/api/plans/${planId}/exercises`, { exerciseIds }); }

  // ── MEMBER ↔ PLAN (Follows junction) ──
  async function getMemberPlans(memberId) { return GET(`/api/member-plans/${memberId}`); }
  async function followPlan(memberId, planId)   { return POST('/api/member-plans', { memberId, planId }); }
  async function unfollowPlan(memberId, planId) { return DEL('/api/member-plans', { memberId, planId }); }

  // ── PROGRESS LOGS ──
  async function getProgress(memberId) { return GET(`/api/progress/${memberId}`); }
  async function addProgress(d)        { return POST('/api/progress', d); }
  async function deleteProgress(id)    { return DEL(`/api/progress/${id}`); }

  // ── PAYMENTS ──
  async function getPayments(memberId) { return GET(`/api/payments/${memberId}`); }
  async function addPayment(d)         { return POST('/api/payments', d); }

  return {
    getSession, setSession, logout,
    login, register, getUser, updateProfile, changePassword,
    getMembers, getMember, addMember, updateMember, deleteMember,
    getTrainers, getTrainer, addTrainer, updateTrainer, deleteTrainer,
    getExercises, addExercise, updateExercise, deleteExercise,
    getPlans, getPlan, addPlan, updatePlan, deletePlan,
    getPlanExercises, setPlanExercises,
    getMemberPlans, followPlan, unfollowPlan,
    getProgress, addProgress, deleteProgress,
    getPayments, addPayment,
  };
})();
