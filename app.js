const STORAGE_KEY = "study-tracker-data";

const entryForm = document.getElementById("entryForm");
const entryDate = document.getElementById("entryDate");
const entryHours = document.getElementById("entryHours");
const todayHours = document.getElementById("todayHours");
const weekTotal = document.getElementById("weekTotal");
const chart = document.getElementById("chart");
const chartLegend = document.getElementById("chartLegend");
const goalForm = document.getElementById("goalForm");
const goalHours = document.getElementById("goalHours");
const goalBar = document.getElementById("goalBar");
const goalText = document.getElementById("goalText");
const goalPercent = document.getElementById("goalPercent");
const goalHint = document.getElementById("goalHint");
const notes = document.getElementById("notes");
const resetBtn = document.getElementById("resetBtn");

const state = loadState();

init();

function init() {
  entryDate.value = getTodayKey();
  notes.value = state.notes || "";
  entryForm.addEventListener("submit", handleEntrySubmit);
  goalForm.addEventListener("submit", handleGoalSubmit);
  notes.addEventListener("input", handleNotesChange);
  resetBtn.addEventListener("click", handleReset);

  render();
}

function handleEntrySubmit(event) {
  event.preventDefault();
  const dateKey = entryDate.value;
  const hours = Number(entryHours.value);

  if (!dateKey || Number.isNaN(hours)) {
    return;
  }

  state.entries[dateKey] = hours;
  entryHours.value = "";
  saveState();
  render();
}

function handleGoalSubmit(event) {
  event.preventDefault();
  const goal = Number(goalHours.value);
  if (!goal || goal <= 0) {
    return;
  }
  state.goal = goal;
  saveState();
  render();
  goalHours.value = "";
}

function handleNotesChange(event) {
  state.notes = event.target.value;
  saveState();
}

function handleReset() {
  if (!window.confirm("Tüm veriler silinsin mi?")) {
    return;
  }
  state.entries = {};
  state.goal = 0;
  state.notes = "";
  saveState();
  render();
}

function render() {
  const weekDays = getWeekDays();
  const weekEntries = weekDays.map((day) => ({
    key: day.key,
    label: day.label,
    hours: state.entries[day.key] || 0,
  }));

  const todayKey = getTodayKey();
  const todayEntry = state.entries[todayKey] || 0;
  const weekSum = weekEntries.reduce((sum, entry) => sum + entry.hours, 0);

  todayHours.textContent = formatHours(todayEntry);
  weekTotal.textContent = formatHours(weekSum);

  renderChart(weekEntries);
  renderGoal(weekSum);
}

function renderChart(entries) {
  chart.innerHTML = "";
  chartLegend.innerHTML = "";

  const maxHours = Math.max(1, ...entries.map((entry) => entry.hours));

  entries.forEach((entry) => {
    const bar = document.createElement("div");
    bar.className = "chart__bar";
    bar.style.height = `${(entry.hours / maxHours) * 100}%`;

    const value = document.createElement("span");
    value.textContent = entry.hours ? entry.hours.toFixed(1) : "0";
    bar.appendChild(value);

    chart.appendChild(bar);

    const label = document.createElement("div");
    label.textContent = entry.label;
    chartLegend.appendChild(label);
  });
}

function renderGoal(weekSum) {
  const goal = state.goal || 0;
  const percent = goal ? Math.min(100, Math.round((weekSum / goal) * 100)) : 0;

  goalText.textContent = `Hedef: ${goal || 0} saat`;
  goalPercent.textContent = `%${percent}`;
  goalBar.style.width = `${percent}%`;

  if (goal > 0) {
    goalHint.textContent = percent >= 100 ? "Hedefini tamamladın!" : "Hedefine doğru ilerliyorsun.";
  } else {
    goalHint.textContent = "Hedef koymak için saat değerini gir.";
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      entries: {},
      goal: 0,
      notes: "",
    };
  }
  try {
    const data = JSON.parse(raw);
    return {
      entries: data.entries || {},
      goal: data.goal || 0,
      notes: data.notes || "",
    };
  } catch (error) {
    return {
      entries: {},
      goal: 0,
      notes: "",
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTodayKey() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function getWeekDays() {
  const today = new Date();
  const dayIndex = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - dayIndex);

  const labels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  return labels.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      label,
    };
  });
}

function formatHours(hours) {
  return `${hours.toFixed(1)} saat`;
}
