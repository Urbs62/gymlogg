/* Ett Pass Till — superenkel gymapp (offline/localStorage) */
const APP_VERSION = "1.3";

const LS = {
  stations: "ept_stations_v1",
  plans: "ept_plans_v1",
  history: "ept_history_v1",
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function load(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}
function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeCsv(v){
  const s = String(v ?? "");
  if (/[",\n;]/.test(s)) return `"${s.replaceAll('"','""')}"`;
  return s;
}

const state = {
  stations: load(LS.stations, []),
  plans: load(LS.plans, []),  // {id,name,items:[{stationId, weight, sets, reps}]}
  history: load(LS.history, []), // {ts, date, planName, stationName, weight, sets, reps}
  workout: { planId: null, done: {} }
};

// ---------- Tabs ----------
const tabs = document.querySelectorAll(".tab");
const panels = {
  stations: document.getElementById("tab-stations"),
  plans: document.getElementById("tab-plans"),
  workout: document.getElementById("tab-workout"),
  history: document.getElementById("tab-history"),
};

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const t = btn.dataset.tab;
    Object.values(panels).forEach(p => p.classList.remove("active"));
    panels[t].classList.add("active");

    // refresh views when switching
    if (t === "stations") renderStations();
    if (t === "plans") { renderPlanSelectors(); renderPlanEditor(); }
    if (t === "workout") { renderWorkoutSelectors(); renderWorkoutChecklist(); }
    if (t === "history") renderHistory();
  });
});

// ---------- Stationer ----------
const stationForm = document.getElementById("stationForm");
const stationId = document.getElementById("stationId");
const stationName = document.getElementById("stationName");
const stationDefaultWeight = document.getElementById("stationDefaultWeight");
const stationDefaultSets = document.getElementById("stationDefaultSets");
const stationDefaultReps = document.getElementById("stationDefaultReps");
const stationCancelBtn = document.getElementById("stationCancelBtn");
const stationsList = document.getElementById("stationsList");

stationCancelBtn.addEventListener("click", () => clearStationForm());

stationForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = stationName.value.trim();
  if (!name) return;

  const w = stationDefaultWeight.value === "" ? null : Number(stationDefaultWeight.value);
  const s = stationDefaultSets.value === "" ? null : Number(stationDefaultSets.value);
  const r = stationDefaultReps.value === "" ? null : Number(stationDefaultReps.value);

  const id = stationId.value || uid();

  const existingIdx = state.stations.findIndex(x => x.id === id);
  const obj = { id, name, defaultWeight: w, defaultSets: s, defaultReps: r };

  if (existingIdx >= 0) state.stations[existingIdx] = obj;
  else state.stations.push(obj);

  save(LS.stations, state.stations);
  clearStationForm();
  renderStations();
  renderPlanSelectors();
  renderWorkoutSelectors();
});

function clearStationForm(){
  stationId.value = "";
  stationName.value = "";
  stationDefaultWeight.value = "";
  stationDefaultSets.value = "";
  stationDefaultReps.value = "";
}

function renderStations(){
  if (!state.stations.length){
    stationsList.innerHTML = `<div class="muted">Inga stationer ännu. Skapa en ovan.</div>`;
    return;
  }

  const html = state.stations
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name, "sv"))
    .map(s => {
      const meta = [
        s.defaultWeight != null ? `${s.defaultWeight} kg` : null,
        s.defaultSets != null ? `${s.defaultSets} set` : null,
        s.defaultReps != null ? `${s.defaultReps} reps` : null
      ].filter(Boolean).join(" • ");

      return `
        <div class="item">
          <div>
            <div class="name">${s.name}</div>
            <div class="meta">${meta || "—"}</div>
          </div>
          <div class="btns">
            <button class="ghost" data-edit="${s.id}">Edit</button>
            <button class="danger" data-del="${s.id}">Ta bort</button>
          </div>
        </div>
      `;
    }).join("");

  stationsList.innerHTML = html;

  stationsList.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = state.stations.find(x => x.id === btn.dataset.edit);
      if (!s) return;
      stationId.value = s.id;
      stationName.value = s.name;
      stationDefaultWeight.value = s.defaultWeight ?? "";
      stationDefaultSets.value = s.defaultSets ?? "";
      stationDefaultReps.value = s.defaultReps ?? "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  stationsList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.del;
      // Ta bort station från plan-items också
      state.stations = state.stations.filter(x => x.id !== id);
      state.plans.forEach(p => p.items = p.items.filter(it => it.stationId !== id));

      save(LS.stations, state.stations);
      save(LS.plans, state.plans);
      renderStations();
      renderPlanSelectors();
      renderPlanEditor();
      renderWorkoutSelectors();
      renderWorkoutChecklist();
    });
  });
}

// ---------- Planer ----------
const planCreateForm = document.getElementById("planCreateForm");
const planNameInput = document.getElementById("planName");
const planSelect = document.getElementById("planSelect");
const planRenameBtn = document.getElementById("planRenameBtn");
const planDeleteBtn = document.getElementById("planDeleteBtn");
const planAddStationSelect = document.getElementById("planAddStationSelect");
const planAddStationBtn = document.getElementById("planAddStationBtn");
const planItemsEditor = document.getElementById("planItemsEditor");

planCreateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = planNameInput.value.trim();
  if (!name) return;

  state.plans.push({ id: uid(), name, items: [] });
  save(LS.plans, state.plans);
  planNameInput.value = "";
  renderPlanSelectors(true);
  renderPlanEditor();
  renderWorkoutSelectors();
});

planSelect.addEventListener("change", () => {
  renderPlanEditor();
});

planRenameBtn.addEventListener("click", () => {
  const p = getSelectedPlan();
  if (!p) return;
  const newName = prompt("Nytt namn på plan:", p.name);
  if (!newName) return;
  p.name = newName.trim();
  save(LS.plans, state.plans);
  renderPlanSelectors(true);
  renderWorkoutSelectors();
  renderHistory(); // planName visas där
});

planDeleteBtn.addEventListener("click", () => {
  const p = getSelectedPlan();
  if (!p) return;
  if (!confirm(`Ta bort "${p.name}"?`)) return;
  state.plans = state.plans.filter(x => x.id !== p.id);
  save(LS.plans, state.plans);
  renderPlanSelectors(true);
  renderPlanEditor();
  renderWorkoutSelectors();
});

planAddStationBtn.addEventListener("click", () => {
  const p = getSelectedPlan();
  if (!p) return;
  const stationId = planAddStationSelect.value;
  if (!stationId) return;

  // defaultvärden från station
  const st = state.stations.find(s => s.id === stationId);
  const item = {
    stationId,
    weight: st?.defaultWeight ?? null,
    sets: st?.defaultSets ?? null,
    reps: st?.defaultReps ?? null
  };
  p.items.push(item);
  save(LS.plans, state.plans);
  renderPlanEditor();
});

function getSelectedPlan(){
  const id = planSelect.value;
  return state.plans.find(p => p.id === id) || null;
}

function renderPlanSelectors(keepSelection=false){
  // planSelect
  const prev = planSelect.value;
  planSelect.innerHTML = "";
  const plansSorted = state.plans.slice().sort((a,b)=>a.name.localeCompare(b.name,"sv"));
  plansSorted.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    planSelect.appendChild(opt);
  });
  if (plansSorted.length){
    planSelect.value = keepSelection && prev ? prev : plansSorted[0].id;
  }

  // station select (for adding)
  planAddStationSelect.innerHTML = "";
  const stSorted = state.stations.slice().sort((a,b)=>a.name.localeCompare(b.name,"sv"));
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = stSorted.length ? "Välj station…" : "Skapa stationer först…";
  planAddStationSelect.appendChild(empty);

  stSorted.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    planAddStationSelect.appendChild(opt);
  });
}

function renderPlanEditor(){
  const p = getSelectedPlan();
  if (!p){
    planItemsEditor.innerHTML = `<div class="muted">Skapa en plan först.</div>`;
    return;
  }

  if (!p.items.length){
    planItemsEditor.innerHTML = `<div class="muted">Ingen station i planen ännu. Lägg till en ovan.</div>`;
    return;
  }

  const rows = p.items.map((it, idx) => {
    const st = state.stations.find(s => s.id === it.stationId);
    const name = st?.name ?? "(saknad station)";
    return `
      <tr>
        <td>${name}</td>
        <td><input data-pidx="${idx}" data-field="weight" type="number" step="0.5" min="0" value="${it.weight ?? ""}" placeholder="kg"></td>
        <td><input data-pidx="${idx}" data-field="sets" type="number" step="1" min="1" value="${it.sets ?? ""}" placeholder="set"></td>
        <td><input data-pidx="${idx}" data-field="reps" type="number" step="1" min="1" value="${it.reps ?? ""}" placeholder="reps"></td>
        <td><button class="danger" type="button" data-remove="${idx}">Ta bort</button></td>
      </tr>
    `;
  }).join("");

  planItemsEditor.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Station</th>
          <th>Vikt (kg)</th>
          <th>Set</th>
          <th>Reps</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="hint">Ändringar sparas direkt när du skriver.</p>
  `;

  // live-save inputs
  planItemsEditor.querySelectorAll("input[data-pidx]").forEach(inp => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.pidx);
      const field = inp.dataset.field;
      const val = inp.value === "" ? null : Number(inp.value);
      p.items[idx][field] = val;
      save(LS.plans, state.plans);
    });
  });

  planItemsEditor.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.remove);
      p.items.splice(idx, 1);
      save(LS.plans, state.plans);
      renderPlanEditor();
    });
  });
}

// ---------- Träning ----------
const workoutPlanSelect = document.getElementById("workoutPlanSelect");
const workoutLoadBtn = document.getElementById("workoutLoadBtn");
const workoutChecklist = document.getElementById("workoutChecklist");
const workoutFinishBtn = document.getElementById("workoutFinishBtn");
const workoutResetBtn = document.getElementById("workoutResetBtn");

workoutLoadBtn.addEventListener("click", () => {
  state.workout.planId = workoutPlanSelect.value || null;
  state.workout.done = {};
  renderWorkoutChecklist();
});

workoutResetBtn.addEventListener("click", () => {
  state.workout.done = {};
  renderWorkoutChecklist();
});

workoutFinishBtn.addEventListener("click", () => {
  const p = getWorkoutPlan();
  if (!p) return;

  const now = new Date();
  const date = now.toLocaleString("sv-SE"); // fin tidsstämpel

  // Spara en rad per station (med planens värden)
  p.items.forEach(it => {
    const st = state.stations.find(s => s.id === it.stationId);
    state.history.unshift({
      ts: now.getTime(),
      date,
      planName: p.name,
      stationName: st?.name ?? "(saknad station)",
      weight: it.weight ?? "",
      sets: it.sets ?? "",
      reps: it.reps ?? ""
    });
  });

  save(LS.history, state.history);

  // Efter avslut: nollställ checklista men behåll plan-val
  state.workout.done = {};
  renderWorkoutChecklist();

  // hoppa till Historik
  document.querySelector('.tab[data-tab="history"]').click();
});

function getWorkoutPlan(){
  const id = state.workout.planId || workoutPlanSelect.value;
  return state.plans.find(p => p.id === id) || null;
}

function renderWorkoutSelectors(){
  const prev = workoutPlanSelect.value;
  workoutPlanSelect.innerHTML = "";
  const plansSorted = state.plans.slice().sort((a,b)=>a.name.localeCompare(b.name,"sv"));
  plansSorted.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    workoutPlanSelect.appendChild(opt);
  });
  if (plansSorted.length){
    workoutPlanSelect.value = prev || plansSorted[0].id;
  }
}

function renderWorkoutChecklist(){
  const p = getWorkoutPlan();
  if (!p){
    workoutChecklist.innerHTML = `<div class="muted">Skapa en plan under “Planer” först.</div>`;
    return;
  }
  if (!p.items.length){
    workoutChecklist.innerHTML = `<div class="muted">Planen är tom. Lägg till stationer under “Planer”.</div>`;
    return;
  }

  const html = p.items.map((it, idx) => {
    const st = state.stations.find(s => s.id === it.stationId);
    const name = st?.name ?? "(saknad station)";
    const done = !!state.workout.done[idx];
    const badge = done ? `<span class="badge done">Klar</span>` : `<span class="badge">Pågår</span>`;
    const meta = [
      it.weight != null && it.weight !== "" ? `${it.weight} kg` : null,
      it.sets != null && it.sets !== "" ? `${it.sets} set` : null,
      it.reps != null && it.reps !== "" ? `${it.reps} reps` : null
    ].filter(Boolean).join(" • ");

    return `
      <div class="rowline">
        <input type="checkbox" data-widx="${idx}" ${done ? "checked" : ""} />
        <div class="grow">
          <div><strong>${name}</strong> ${badge}</div>
          <div class="muted">${meta || "—"}</div>
        </div>
      </div>
    `;
  }).join("");

  workoutChecklist.innerHTML = html;

  workoutChecklist.querySelectorAll('input[type="checkbox"][data-widx]').forEach(cb => {
    cb.addEventListener("change", () => {
      const idx = Number(cb.dataset.widx);
      state.workout.done[idx] = cb.checked;
      // re-render bara för badge (enkel lösning)
      renderWorkoutChecklist();
    });
  });
}

// ---------- Historik ----------
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyTable = document.getElementById("historyTable");

exportCsvBtn.addEventListener("click", () => {
  if (!state.history.length){
    alert("Ingen historik att exportera.");
    return;
  }

  const header = ["datum", "plan", "station", "vikt", "set", "reps"];
  const rows = state.history.map(r => ([
    r.date, r.planName, r.stationName, r.weight, r.sets, r.reps
  ]));

  // semikolon funkar bra i svensk Excel
  const csv = [header, ...rows]
    .map(cols => cols.map(escapeCsv).join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ett-pass-till-historik.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

clearHistoryBtn.addEventListener("click", () => {
  if (!confirm("Rensa all historik?")) return;
  state.history = [];
  save(LS.history, state.history);
  renderHistory();
});

function renderHistory(){
  if (!state.history.length){
    historyTable.innerHTML = `<div class="muted">Ingen historik ännu. Kör ett pass under “Träning”.</div>`;
    return;
  }

  const rows = state.history.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.planName}</td>
      <td>${r.stationName}</td>
      <td>${r.weight}</td>
      <td>${r.sets}</td>
      <td>${r.reps}</td>
    </tr>
  `).join("");

  historyTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Datum</th>
          <th>Plan</th>
          <th>Station</th>
          <th>Vikt</th>
          <th>Set</th>
          <th>Reps</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---------- Init ----------
function firstRunDefaults(){
  // Om användaren är helt ny: skapa “Pass A” som mall (valfritt, men trevligt)
  if (!state.plans.length){
    state.plans.push({ id: uid(), name: "Pass A", items: [] });
    save(LS.plans, state.plans);
  }
}

firstRunDefaults();
renderStations();
renderPlanSelectors(true);
renderPlanEditor();
renderWorkoutSelectors();
renderWorkoutChecklist();
renderHistory();

// ---------- Register service worker (PWA/offline) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try{
      await navigator.serviceWorker.register("./sw.js");
    }catch(e){
      console.warn("SW registration failed", e);
    }
  });
}
