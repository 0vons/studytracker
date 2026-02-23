"use strict";

const $ = id => document.getElementById(id);
const fmt = h => h === 1 ? "1 hr" : `${h} hrs`;
const fmtH = h => Number(h).toFixed(1) + " hrs";
const DAYS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS= ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function today(){ return new Date().toISOString().slice(0,10); }
function greetTime(){
  const h = new Date().getHours();
  if(h < 12) return "Good morning";
  if(h < 18) return "Good afternoon";
  return "Good evening";
}

function toast(msg, type="info", dur=3500){
  const c = $("toastContainer");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), dur);
}

function showModal(html){
  $("modalContent").innerHTML = html;
  $("modalOverlay").classList.remove("hidden");
}
function closeModal(){
  $("modalOverlay").classList.add("hidden");
  $("modalContent").innerHTML = "";
}

function showFormMsg(id, msg, type){
  const el = $(id);
  if(!el) return;
  el.textContent = msg;
  el.className = `form-msg ${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

let currentUser = null;
let pomSettings  = JSON.parse(localStorage.getItem("pomSettings") || '{"work":25,"short":5,"long":15}');
let pomState     = { mode:"work", running:false, totalSec:0, remaining:0, timerId:null, startedAt:null };
let allTags      = [];

const api = {
  get:  url => window.API.get(url),
  post: (url,b)=> window.API.post(url,b),
  put:  (url,b)=> window.API.put(url,b),
  del:  url => window.API.del(url),
};

async function boot(){
  const token = localStorage.getItem("accessToken");
  if(!token){ showAuth(); return; }
  try {
    currentUser = await api.get("/api/me");
    showApp();
  } catch(e){
    showAuth();
  }
}

function showAuth(){
  $("authWrapper").classList.remove("hidden");
  $("appWrapper").classList.add("hidden");
}
function showApp(){
  $("authWrapper").classList.add("hidden");
  $("appWrapper").classList.remove("hidden");
  updateSidebarUser();
  loadPage("dashboard");
}
function updateSidebarUser(){
  if(!currentUser) return;
  const initials = currentUser.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  $("sidebarAvatar").textContent = initials;
  $("sidebarName").textContent   = currentUser.name;
  $('sidebarEmail').textContent  = currentUser.email;
}

document.querySelectorAll(".auth-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    $("loginForm").classList.toggle("hidden",    tab !== "login");
    $("registerForm").classList.toggle("hidden", tab !== "register");
  });
});

$("registerForm").querySelector("input[type=password]").addEventListener("input", function(){
  const v = this.value;
  const fill  = $("pwStrengthFill");
  const label = $("pwStrengthLabel");
  let score = 0;
  if(v.length >= 8) score++;
  if(/[A-Z]/.test(v)) score++;
  if(/[0-9]/.test(v)) score++;
  if(/[^A-Za-z0-9]/.test(v)) score++;
  const map = [[0,"rgba(239,68,68,.7)","Weak"],[2,"rgba(245,158,11,.8)","Fair"],[3,"rgba(6,182,212,.8)","Good"],[4,"rgba(16,185,129,.8)","Strong"]];
  const [s,c,t] = v.length === 0 ? [0,"",""] : map.filter(([s])=>score>=s).pop();
  fill.style.width      = v.length ? `${(score+1)/5*100}%` : "0%";
  fill.style.background = c;
  label.textContent     = t;
  label.style.color     = c;
});

document.querySelectorAll(".pw-toggle").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const form = $(btn.dataset.target);
    const inp  = form.querySelector("input[type=password], input[type=text][name=password]");
    const i2   = form.querySelectorAll("input[type=password]");
    form.querySelectorAll("input[type=password], input[type=text]").forEach(i=>{
      if(i.name==="password"||i.name==="email") return;
    });
    const pw = btn.closest(".pw-wrap").querySelector("input");
    pw.type = pw.type === "password" ? "text" : "password";
  });
});

$("registerForm").addEventListener("submit", async e => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const data = Object.fromEntries(fd);
  const btn  = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Creating...";
  try {
    const res = await window.API.post("/auth/register", data, true);
    localStorage.setItem("accessToken",  res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    currentUser = res.user;
    showApp();
  } catch(err){
    $("registerError").textContent = err.message || "Registration failed.";
    $("registerError").classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Create Account";
  }
});

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const data = Object.fromEntries(fd);
  const btn  = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Signing in...";
  try {
    const res = await window.API.post("/auth/login", data, true);
    localStorage.setItem("accessToken",  res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    currentUser = res.user;
    showApp();
  } catch(err){
    $("loginError").textContent = err.message || "Invalid credentials.";
    $("loginError").classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Sign In";
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try { await api.post("/auth/logout",{}); } catch{}
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  currentUser = null;
  showAuth();
});

function loadPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  const page = $(`page-${name}`);
  if(page) page.classList.add("active");
  const nav = document.querySelector(`.nav-item[data-page="${name}"]`);
  if(nav) nav.classList.add("active");

  const handlers = {
    dashboard: loadDashboard,
    log:       loadLog,
    pomodoro:  loadPomodoro,
    history:   loadHistory,
    goals:     loadGoals,
    insights:  loadInsights,
    settings:  loadSettings,
  };
  if(handlers[name]) handlers[name]();
}

document.querySelectorAll(".nav-item").forEach(n=>{
  n.addEventListener("click", e => {
    e.preventDefault();
    loadPage(n.dataset.page);
    $("sidebar").classList.remove("open");
  });
});

$("hamburger").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("quickLogBtn").addEventListener("click", () => loadPage("log"));
$("quickPomBtn").addEventListener("click", () => loadPage("pomodoro"));

$("modalClose").addEventListener("click", closeModal);
$("modalOverlay").addEventListener("click", e => { if(e.target===$("modalOverlay")) closeModal(); });

async function loadDashboard(){
  const name = currentUser?.name?.split(" ")[0] || "there";
  $("greetingText").textContent = `${greetTime()}, ${name} `;
  const now = new Date();
  $("greetingDate").textContent = now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

  try {
    const [stats, insights] = await Promise.all([
      api.get("/api/stats"),
      api.get("/api/insights").catch(()=>null)
    ]);

    $("sc-today").textContent   = fmtH(stats.today   || 0);
    $("sc-week").textContent    = fmtH(stats.week     || 0);
    $("sc-streak").textContent  = `${stats.streak     || 0} days`;
    $("sc-total").textContent   = fmtH(stats.allTime?.total || 0);
    $("sc-longest").textContent = `${stats.longestStreak || 0} days`;
    $("sc-month").textContent   = fmtH(stats.month || 0);

    if(stats.thisWeekDays){
      drawWeekBar("weekChart", stats.thisWeekDays.map(d=>({label:d.day_label||d.date?.slice(5)||"?", hours:d.hours||0})));
    }

    const goal = currentUser.weekly_goal_hours || 0;
    const week = stats.week || 0;
    const pct  = goal > 0 ? week/goal : 0;
    drawRing("goalRing", pct);
    $("ringPercent").textContent = `${Math.round(pct*100)}%`;
    $("ringLabel").textContent   = `${week.toFixed(1)} / ${goal} hrs`;
    if(goal > 0){
      const rem = goal - week;
      $("goalHintDash").textContent = rem > 0 ? `${rem.toFixed(1)} hrs to go this week` : " Weekly goal reached!";
    }

    if(goal > 0){
      const pctLabel = Math.round(pct*100);
      const badge = $("weekGoalBadge");
      badge.textContent = `${pctLabel}% of goal`;
      badge.style.display = "block";
    }

    const subEl = $("subjectList");
    subEl.innerHTML = "";
    if(stats.subjects && stats.subjects.length){
      const max = stats.subjects[0].hours;
      stats.subjects.slice(0,6).forEach(s => {
        subEl.innerHTML += `<div class="subject-row">
          <span class="subject-row__name">${s.subject||"(no subject)"}</span>
          <div class="subject-row__bar-bg"><div class="subject-row__bar-fill" style="width:${(s.hours/max*100).toFixed(1)}%"></div></div>
          <span class="subject-row__val">${s.hours.toFixed(1)}h</span>
        </div>`;
      });
    } else {
      subEl.innerHTML = `<p style="color:var(--muted);font-size:.85rem">No data yet.</p>`;
    }

    const moodEl = $("moodChart");
    moodEl.innerHTML = "";
    const moodColors = ["#ef4444","#f59e0b","#6b7280","#06b6d4","#10b981"];
    const moodLabels = ["","","","",""];
    if(stats.moodDist){
      const maxM = Math.max(...Object.values(stats.moodDist), 1);
      for(let m=1;m<=5;m++){
        const cnt = stats.moodDist[m] || 0;
        const pct = cnt/maxM*100;
        moodEl.innerHTML += `<div class="mood-bar-wrap">
          <div class="mood-bar" style="height:${Math.max(pct,4)}px;background:${moodColors[m-1]}"></div>
          <span class="mood-bar-label">${moodLabels[m-1]}</span>
        </div>`;
      }
    }

    const recEl = $("recentActivity");
    recEl.innerHTML = "";
    if(stats.recentActivity && stats.recentActivity.length){
      stats.recentActivity.slice(0,5).forEach(r=>{
        recEl.innerHTML += `<div class="recent-item">
          <div class="recent-item__dot"></div>
          <div class="recent-item__info">
            <div class="recent-item__subject">${r.subject||"Study session"}</div>
            <div class="recent-item__date">${r.date}</div>
          </div>
          <div class="recent-item__hours">${Number(r.hours).toFixed(1)}h</div>
        </div>`;
      });
    } else {
      recEl.innerHTML = `<p style="color:var(--muted);font-size:.85rem">No recent activity.</p>`;
    }

  } catch(e){}
}

async function loadLog(){
  $("logDate").value  = today();
  $("logHours").value = "";
  $("logSubject").value = "";
  $("logTags").value    = "";
  $("logNotes").value   = "";
  document.querySelectorAll(".mood-btn").forEach(b=>b.classList.remove("active"));

  try {
    const res = await api.get("/api/tags");
    allTags = res.tags || [];
    renderTagSuggestions("");
  } catch{}
}

function renderTagSuggestions(current){
  const box = $("tagSuggestions");
  box.innerHTML = "";
  const used = current.split(",").map(t=>t.trim().toLowerCase());
  allTags.filter(t=> !used.includes(t.toLowerCase())).slice(0,10).forEach(tag=>{
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag;
    chip.addEventListener("click", ()=>{
      const cur = $("logTags").value;
      const parts = cur.split(",").map(t=>t.trim()).filter(Boolean);
      if(!parts.includes(tag)){
        parts.push(tag);
        $("logTags").value = parts.join(", ");
        renderTagSuggestions($("logTags").value);
      }
    });
    box.appendChild(chip);
  });
}

$('logTags').addEventListener('input', ()=>renderTagSuggestions($('logTags').value));

document.querySelectorAll(".mood-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".mood-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.querySelectorAll(".chip[data-hrs]").forEach(c=>{
  c.addEventListener("click", ()=>{ $("logHours").value = c.dataset.hrs; });
});

$("logClearBtn").addEventListener("click", ()=>{
  $("logForm").reset();
  $("logDate").value = today();
  document.querySelectorAll(".mood-btn").forEach(b=>b.classList.remove("active"));
  $("logMessage").classList.add("hidden");
});

$("logForm").addEventListener("submit", async e => {
  e.preventDefault();
  const mood  = document.querySelector(".mood-btn.active")?.dataset.mood || null;
  const tags  = $("logTags").value.split(",").map(t=>t.trim()).filter(Boolean).join(",");
  const body  = {
    date:    $("logDate").value,
    hours:   parseFloat($("logHours").value),
    subject: $("logSubject").value.trim(),
    notes:   $("logNotes").value.trim(),
    mood:    mood ? parseInt(mood) : null,
    tags
  };
  const btn = $("logSubmitBtn");
  btn.disabled = true; btn.textContent = "Saving...";
  try {
    await api.post("/api/logs", body);
    toast("Study session saved! ", "success");
    $("logForm").reset();
    $('logDate').value = today();
    document.querySelectorAll(".mood-btn").forEach(b=>b.classList.remove("active"));
    const res = await api.get("/api/tags");
    allTags = res.tags || [];
    renderTagSuggestions("");
  } catch(err){
    toast(err.message || "Failed to save.", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Save Log";
  }
});

async function loadPomodoro(){
  pomState.running  = false;
  clearInterval(pomState.timerId);
  pomApplyMode("work");
  loadPomStats();
  loadPomHistory();
}

function pomApplyMode(mode){
  pomState.mode = mode;
  const dur = { work: pomSettings.work, short: pomSettings.short, long: pomSettings.long };
  pomState.totalSec    = dur[mode] * 60;
  pomState.remaining   = pomState.totalSec;
  pomState.running     = false;
  clearInterval(pomState.timerId);
  pomRenderTime();
  $("pomProgressBar").style.width = "100%";
  const labels = { work:"Focus Session", short:"Short Break", long:"Long Break" };
  $("pomLabel").textContent = labels[mode];
  $("pomStart").textContent = "Start";
  $("pomStart").classList.remove("running");
  document.querySelectorAll(".pom-tab").forEach(t=>t.classList.toggle("active", t.dataset.pom===mode));
}

function pomRenderTime(){
  const m = Math.floor(pomState.remaining/60).toString().padStart(2,"0");
  const s = (pomState.remaining % 60).toString().padStart(2,"0");
  $("pomTimer").textContent = `${m}:${s}`;
  document.title = pomState.running ? `${m}:${s}  Study Tracker` : "Study Tracker";
}

document.querySelectorAll(".pom-tab").forEach(t=>{
  t.addEventListener("click", ()=> pomApplyMode(t.dataset.pom));
});

$('pomStart').addEventListener('click', ()=>{
  if(pomState.running){
    clearInterval(pomState.timerId);
    pomState.running = false;
    $("pomStart").textContent = "Resume";
    $("pomStart").classList.remove("running");
  } else {
    if(pomState.remaining === 0) pomApplyMode(pomState.mode);
    pomState.running   = true;
    pomState.startedAt = pomState.startedAt || new Date().toISOString();
    $("pomStart").textContent = "Pause";
    $("pomStart").classList.add("running");
    pomState.timerId = setInterval(pomTick, 1000);
  }
});

$("pomReset").addEventListener("click", ()=>{
  clearInterval(pomState.timerId);
  pomState.startedAt = null;
  pomApplyMode(pomState.mode);
});

function pomTick(){
  pomState.remaining--;
  pomRenderTime();
  const pct = pomState.remaining / pomState.totalSec * 100;
  $("pomProgressBar").style.width = `${pct}%`;
  if(pomState.remaining <= 0){
    clearInterval(pomState.timerId);
    pomState.running = false;
    $("pomStart").textContent = "Start";
    $("pomStart").classList.remove("running");
    document.title = "Study Tracker";
    pomComplete();
  }
}

async function pomComplete(){
  try {
    await api.post("/api/pomodoro", {
      type:       pomState.mode,
      duration:   pomState.totalSec / 60,
      subject:    $("pomSubject").value.trim() || null,
      started_at: pomState.startedAt
    });
    pomState.startedAt = null;
    toast(pomState.mode==="work" ? " Pomodoro complete! Take a break." : "Break done! Time to focus.", "success");
    loadPomStats();
    loadPomHistory();
  } catch(e){}

  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = pomState.mode==="work" ? 880 : 660;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+1.5);
    osc.start(); osc.stop(ctx.currentTime+1.5);
  } catch{}
}

async function loadPomStats(){
  try {
    const s = await api.get("/api/pomodoro/stats");
    $("pomTodayCount").textContent = s.today  || 0;
    $("pomTotalCount").textContent = s.total  || 0;
    $("pomTotalMins").textContent  = ((s.total_minutes)||0).toFixed(0);
  } catch{}
}

async function loadPomHistory(){
  try {
    const res = await api.get("/api/pomodoro");
    const list = res.sessions || [];
    const el   = $("pomHistory");
    el.innerHTML = "";
    if(!list.length){ el.innerHTML=`<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:20px">No sessions yet.</p>`; return; }
    list.slice(0,15).forEach(s=>{
      el.innerHTML += `<div class="pom-hist-item">
        <div>
          <div class="subject">${s.subject||"Focus session"}</div>
          <div class="meta">${s.started_at ? new Date(s.started_at).toLocaleString() : ""}  ${s.duration} min</div>
        </div>
        <span class="pom-hist-badge ${s.type}">${s.type==="work"?"Work":s.type==="short"?"Short":"Long"}</span>
      </div>`;
    });
  } catch{}
}

$("pomSettingsForm").addEventListener("submit", e=>{
  e.preventDefault();
  pomSettings.work  = parseInt($("pomWorkDur").value)  || 25;
  pomSettings.short = parseInt($("pomShortDur").value) || 5;
  pomSettings.long  = parseInt($("pomLongDur").value)  || 15;
  localStorage.setItem("pomSettings", JSON.stringify(pomSettings));
  pomApplyMode(pomState.mode);
  toast("Pomodoro settings saved.", "success");
});

async function loadHistory(){
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  $("historyMonth").value = ym;
  $("heatmapYear").textContent = now.getFullYear();
  loadHistoryData();
  loadHeatmap();
  const tok = localStorage.getItem("accessToken") || "";
  $("exportCsvLink").href  = `/api/export/csv?token=${tok}`;
  $("exportJsonLink").href = `/api/export/json?token=${tok}`;
}

async function loadHistoryData(search=""){
  try {
    const logs = await api.get("/api/logs");
    let rows = logs.logs || [];
    if(search) rows = rows.filter(r=>r.subject && r.subject.toLowerCase().includes(search.toLowerCase()));
    const el = $("historyList");
    el.innerHTML = "";
    if(!rows.length){ el.innerHTML=`<p style="color:var(--muted);padding:20px;text-align:center">No sessions found.</p>`; return; }
    rows.slice(0,60).forEach(r => {
      const tags = (r.tags||"").split(",").filter(Boolean).map(t=>`<span class="tag-chip" style="font-size:.7rem">${t.trim()}</span>`).join("");
      el.innerHTML += `<div class="hist-row" data-id="${r.id}">
        <span class="hist-row__date">${r.date}</span>
        <span class="hist-row__subject">${r.subject||"—"}</span>
        <span class="hist-row__hours">${Number(r.hours).toFixed(1)}h</span>
        <div class="hist-row__tags">${tags}</div>
        <div class="hist-row__actions">
          <button title="Delete" onclick="deleteLog(${r.id})"><svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
        </div>
      </div>`;
    });
  } catch(e){}
}

async function deleteLog(id){
  if(!confirm("Delete this session?")) return;
  try {
    await api.del(`/api/logs/${id}`);
    toast("Session deleted.", "info");
    loadHistoryData($("historySearch").value);
  } catch(e){ toast("Failed to delete.", "error"); }
}
window.deleteLog = deleteLog;

$("historySearch").addEventListener("input", ()=> loadHistoryData($("historySearch").value));
$("historyMonth").addEventListener("change", loadHistoryData);

async function loadHeatmap(){
  try {
    const res = await api.get("/api/logs");
    const logs = res.logs || [];
    const byDate = {};
    logs.forEach(r=>{ byDate[r.date] = (byDate[r.date]||0) + r.hours; });
    const el = $("historyHeatmap");
    el.innerHTML = "";
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() - end.getDay());
    const start = new Date(end);
    start.setDate(start.getDate() - 52*7);

    let d = new Date(start);
    let week = document.createElement("div");
    week.className = "hm-week";
    el.appendChild(week);
    let dayOfWeek = d.getDay();
    for(let i=0;i<dayOfWeek;i++){
      const blank = document.createElement("div");
      blank.className = "hm-cell";
      week.appendChild(blank);
    }
    while(d <= end){
      if(d.getDay()===0 && d > start){
        week = document.createElement("div");
        week.className = "hm-week";
        el.appendChild(week);
      }
      const key = d.toISOString().slice(0,10);
      const h = byDate[key] || 0;
      const cell = document.createElement("div");
      cell.className = "hm-cell";
      cell.title = `${key}: ${h.toFixed(1)}h`;
      const level = h === 0 ? 0 : h < 2 ? 1 : h < 4 ? 2 : h < 6 ? 3 : 4;
      if(level > 0) cell.dataset.level = level;
      week.appendChild(cell);
      d.setDate(d.getDate()+1);
    }
  } catch(e){}
}

async function loadGoals(){
  try {
    const res = await api.get("/api/goals");
    const goals = res.goals || [];
    const el = $("goalsList");
    el.innerHTML = "";
    if(!goals.length){
      el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">
        <p style="font-size:2.5rem;margin-bottom:12px"></p>
        <p>No goals yet. Create your first goal!</p>
      </div>`;
      return;
    }
    goals.forEach(g => {
      const pct = Math.min((g.current_hours||0)/Math.max(g.target_hours,1)*100,100);
      el.innerHTML += `<div class="goal-card">
        ${g.completed ? `<span class="goal-card__complete"> Done</span>` : ""}
        <div class="goal-card__title">${g.title}</div>
        ${g.description ? `<div class="goal-card__desc">${g.description}</div>` : ""}
        <div class="goal-card__progress"><div class="goal-card__progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
        <div class="goal-card__meta">
          <span>${(g.current_hours||0).toFixed(1)} / ${g.target_hours} hrs</span>
          <span>${pct.toFixed(0)}%</span>
        </div>
        <div class="goal-card__actions">
          <button class="btn btn--ghost" style="font-size:.8rem" onclick="editGoal(${g.id})">Edit</button>
          <button class="btn btn--ghost" style="font-size:.8rem" onclick="deleteGoal(${g.id})">Delete</button>
          ${!g.completed ? `<button class="btn btn--ghost" style="font-size:.8rem;color:var(--success)" onclick="completeGoal(${g.id})">Mark Done</button>` : ""}
        </div>
      </div>`;
    });
  } catch(e){}
}

$("addGoalBtn").addEventListener("click", () => openGoalModal());

function openGoalModal(goal=null){
  showModal(`
    <div class="modal-title">${goal ? "Edit Goal" : "New Goal"}</div>
    <form id="goalModalForm" class="modal-form">
      <div class="field"><label>Title</label><input type="text" id="gTitle" value="${goal?.title||""}" required placeholder="e.g. Complete 100 hours of Math" /></div>
      <div class="field"><label>Description (optional)</label><textarea id="gDesc" rows="2" placeholder="More details about this goal...">${goal?.description||""}</textarea></div>
      <div class="field"><label>Target Hours</label><input type="number" id="gTarget" value="${goal?.target_hours||""}" min="1" required placeholder="50" /></div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button type="submit" class="btn btn--primary">${goal ? "Save Changes" : "Create Goal"}</button>
        <button type="button" class="btn btn--ghost" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `);
  $("goalModalForm").addEventListener("submit", async e => {
    e.preventDefault();
    const body = {
      title:        $("gTitle").value.trim(),
      description:  $("gDesc").value.trim(),
      target_hours: parseFloat($("gTarget").value)
    };
    try {
      if(goal){
        await api.put(`/api/goals/${goal.id}`, body);
        toast("Goal updated.", "success");
      } else {
        await api.post("/api/goals", body);
        toast("Goal created! ", "success");
      }
      closeModal();
      loadGoals();
    } catch(er){ toast(er.message||"Error.", "error"); }
  });
}

async function editGoal(id){
  try {
    const res = await api.get("/api/goals");
    const g   = (res.goals||[]).find(g=>g.id===id);
    if(g) openGoalModal(g);
  } catch{}
}
window.editGoal = editGoal;

async function deleteGoal(id){
  if(!confirm("Delete this goal?")) return;
  try { await api.del(`/api/goals/${id}`); toast("Goal deleted.", "info"); loadGoals(); }
  catch{ toast("Failed.", "error"); }
}
window.deleteGoal = deleteGoal;

async function completeGoal(id){
  try { await api.put(`/api/goals/${id}`, {completed:true}); toast("Goal completed! ","success"); loadGoals(); }
  catch{ toast("Failed.", "error"); }
}
window.completeGoal = completeGoal;

$("editGoalBtn").addEventListener("click", ()=> openGoalModal());

async function loadInsights(){
  try {
    const [ins, stats] = await Promise.all([
      api.get("/api/insights"),
      api.get("/api/stats")
    ]);

    const bestDate = ins.bestDay?.date || "";
    const bestHrs  = ins.bestDay?.hours || 0;
    $("insightBestDay").innerHTML = `${bestDate}<small>${bestHrs.toFixed(1)} hrs logged</small>`;

    const cons = ins.consistency ?? 0;
    $("insightConsistency").innerHTML = `${cons.toFixed(0)}%<small>Days studied in last 30</small>`;

    const ls = ins.longestSession ?? 0;
    $("insightLongest").innerHTML = `${ls.toFixed(1)} hrs<small>Single session record</small>`;

    if(ins.thisMonth !== undefined && ins.lastMonth !== undefined){
      const diff  = ins.thisMonth - ins.lastMonth;
      const arrow = diff >= 0 ? "" : "";
      const col   = diff >= 0 ? "var(--success)" : "var(--danger)";
      $("insightVsLast").innerHTML = `<span style="color:${col}">${arrow} ${Math.abs(diff).toFixed(1)} hrs</span><small>This vs last month</small>`;
    }

    if(ins.avgPerWeekday){
      const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const barData  = dayNames.map((l,i)=>({ label:l, avg: ins.avgPerWeekday[i] || 0 }));
      drawWeekdayBars("weekdayChart", barData);
    }

    if(stats.weeklyTrend && stats.weeklyTrend.length){
      const trendData = stats.weeklyTrend.map((w,i)=>({
        label: `W${stats.weeklyTrend.length - i}`,
        hours: w.hours || 0
      })).reverse();
      drawTrendLine("trendChart", trendData);
    }

  } catch(e){}
}

async function loadSettings(){
  if(!currentUser) return;
  $("settingName").value  = currentUser.name  || "";
  $("settingEmail").value = currentUser.email || "";
  $("settingBio").value   = currentUser.bio   || "";
  $("settingGoal").value  = currentUser.weekly_goal_hours || 0;

  $("pomWorkDur").value  = pomSettings.work;
  $("pomShortDur").value = pomSettings.short;
  $("pomLongDur").value  = pomSettings.long;

  const tok = localStorage.getItem("accessToken") || "";
  $("exportAllLink").href = `/api/export/json?token=${tok}`;

  try {
    const res = await api.get("/auth/sessions");
    const sessions = res.sessions || [];
    const el = $("sessionsList");
    el.innerHTML = "";
    sessions.forEach(s => {
      const isCurrent = s.is_current;
      el.innerHTML += `<div class="session-item ${isCurrent?"current":""}">
        <div>
          <div class="device">${s.user_agent ? s.user_agent.slice(0,30)+"" : "Unknown device"}</div>
          <div class="time">${new Date(s.created_at).toLocaleString()}</div>
        </div>
        ${isCurrent ? `<span class="current-badge">Current</span>` : ""}
      </div>`;
    });
  } catch{}
}

$("profileForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = {
    name:               $("settingName").value.trim(),
    bio:                $("settingBio").value.trim(),
    weekly_goal_hours:  parseInt($("settingGoal").value) || 0
  };
  try {
    const res = await api.put("/api/me", body);
    currentUser = res.user;
    updateSidebarUser();
    showFormMsg("profileMsg", "Profile saved successfully!", "success");
    toast("Profile updated.", "success");
  } catch(er){ showFormMsg("profileMsg", er.message||"Failed.", "error"); }
});

$("passwordForm").addEventListener("submit", async e => {
  e.preventDefault();
  const np = $("settingPwNew").value;
  const cp = $("settingPwConfirm").value;
  if(np !== cp){ showFormMsg("passwordMsg","Passwords do not match.","error"); return; }
  if(np.length < 8){ showFormMsg("passwordMsg","Password must be at least 8 characters.","error"); return; }
  try {
    await api.put("/api/me/password",{
      current_password: $("settingPwCurrent").value,
      new_password: np
    });
    $("passwordForm").reset();
    showFormMsg("passwordMsg","Password updated!","success");
    toast("Password changed.", "success");
  } catch(er){ showFormMsg("passwordMsg", er.message||"Failed.","error"); }
});

$("logoutAllBtn").addEventListener("click", async () => {
  if(!confirm("This will sign you out of all devices. Continue?")) return;
  try {
    await api.post("/auth/logout-all",{});
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    currentUser = null;
    showAuth();
  } catch{ toast("Failed.", "error"); }
});

boot();
