// ====== Storage keys ======
const K_STATIONS = "gymapp_stations_v1";
const K_PLANS    = "gymapp_plans_v1";
const K_HISTORY  = "gymapp_history_v1";

// ====== Helpers ======
const $ = (sel) => document.querySelector(sel);
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

function todayStamp(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeCsv(s){
  const str = String(s ?? "");
  if (/[",\n;]/.test(str)) return `"${str.replaceAll('"','""')}"`;
  return str;
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ====== State ======
let stations = load(K_STATIONS, []); // [{id,name}]
let plans    = load(K_PLANS,    []); // [{id,name,items:[{id,stationId,weight,sets,reps}]}]
let history  = load(K_HISTORY,  []); // [{id,ts,planName,rows:[{station,weight,sets,reps}]}]

let activeWorkout = null; // {planId, planName, checklist:[{...item, done:boolean, stationName}]}

// ====== Tabs ======
const tabButtons = document.querySelectorAll(".tab");
const panels = {
  stations: $("#tab-stations"),
  plans: $("#tab-plans"),
  workout: $("#tab-workout"),
  history: $("#tab-history"),
};

function setTab(tab){
  tabButtons.forEach(b=>{
    const isActive = b.dataset.tab === tab;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  Object.entries(panels).forEach(([k,el])=>{
    el.classList.toggle("hidden", k !== tab);
  });
}

tabButtons.forEach(btn=>{
  btn.addEventListener("click", ()=> setTab(btn.dataset.tab));
});

// ====== Stations UI ======
const stationName = $("#stationName");
const addStationBtn = $("#addStationBtn");
const stationsList = $("#stationsList");
const clearStationsBtn = $("#clearStationsBtn");

function renderStations(){
  stationsList.innerHTML = "";
  if(stations.length === 0){
    stationsList.innerHTML = `<div class="muted">Inga stationer ännu. Lägg till din första ovan.</div>`;
    return;
  }
  stations.forEach(s=>{
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="meta">
        <div class="name">${s.name}</div>
        <div class="sub">ID: ${s.id.slice(0,8)}</div>
      </div>
      <div class="actions">
        <button class="ghost" data-edit="${s.id}">Ändra</button>
        <button class="danger ghost" data-del="${s.id}">Ta bort</button>
      </div>
    `;
    stationsList.appendChild(row);
  });
  // actions
  stationsList.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.del;
      stations = stations.filter(s=>s.id!==id);
      // även rensa bort från plan-items
      plans = plans.map(p=>({
        ...p,
        items: p.items.filter(it=>it.stationId!==id)
      }));
      save(K_STATIONS, stations);
      save(K_PLANS, plans);
      refreshAll();
    });
  });
  stationsList.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.edit;
      const s = stations.find(x=>x.id===id);
      const name = prompt("Nytt stationsnamn:", s?.name ?? "");
      if(!name) return;
      s.name = name.trim();
      save(K_STATIONS, stations);
      refreshAll();
    });
  });
}

addStationBtn.addEventListener("click", ()=>{
  const name = stationName.value.trim();
  if(!name) return;
  stations.push({id: uid(), name});
  stationName.value = "";
  save(K_STATIONS, stations);
  refreshAll();
});

clearStationsBtn.addEventListener("click", ()=>{
  if(!confirm("Rensa alla stationer? (Detta tar även bort dem från planer)")) return;
  stations = [];
  plans = plans.map(p=>({ ...p, items: [] }));
  save(K_STATIONS, stations);
  save(K_PLANS, plans);
  refreshAll();
});

// ====== Plans UI ======
const planName = $("#planName");
const createPlanBtn = $("#createPlanBtn");
const planSelect = $("#planSelect");
const renamePlanBtn = $("#renamePlanBtn");
const deletePlanBtn = $("#deletePlanBtn");

const planStationSelect = $("#planStationSelect");
const planWeight = $("#planWeight");
const planSets = $("#planSets");
const planReps = $("#planReps");
const addToPlanBtn = $("#addToPlanBtn");
const clearPlanItemsBtn = $("#clearPlanItemsBtn");
const planItems = $("#planItems");

function getSelectedPlan(){
  const id = planSelect.value;
  return plans.find(p=>p.id===id) || null;
}

function renderPlanSelects(){
  // plans dropdown (Planer)
  planSelect.innerHTML = "";
  if(plans.length === 0){
    planSelect.innerHTML = `<option value="">(Inga planer)</option>`;
  }else{
    plans.forEach(p=>{
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      planSelect.appendChild(opt);
    });
  }

  // stations dropdown for plan items
  planStationSelect.innerHTML = "";
  if(stations.length === 0){
    planStationSelect.innerHTML = `<option value="">(Skapa stationer först)</option>`;
  }else{
    stations.forEach(s=>{
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      planStationSelect.appendChild(opt);
    });
  }

  // workout dropdown
  const workoutPlanSelect = $("#workoutPlanSelect");
  workoutPlanSelect.innerHTML = "";
  if(plans.length === 0){
    workoutPlanSelect.innerHTML = `<option value="">(Skapa planer först)</option>`;
  }else{
    plans.forEach(p=>{
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      workoutPlanSelect.appendChild(opt);
    });
  }
}

function renderPlanItems(){
  planItems.innerHTML = "";
  const p = getSelectedPlan();
  if(!p){
    planItems.innerHTML = `<div class="muted">Skapa och välj en plan.</div>`;
    return;
  }
  if(p.items.length === 0){
    planItems.innerHTML = `<div class="muted">Planen är tom. Lägg till stationer ovan.</div>`;
    return;
  }

  p.items.forEach(it=>{
    const sName = stations.find(s=>s.id===it.stationId)?.name ?? "(saknas)";
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="meta">
        <div class="name">${sName}</div>
        <div class="sub">Vikt: ${it.weight ?? ""} • Set: ${it.sets ?? ""} • Reps: ${it.reps ?? ""}</div>
      </div>
      <div class="actions">
        <button class="ghost" data-edit="${it.id}">Ändra</button>
        <button class="danger ghost" data-del="${it.id}">Ta bort</button>
      </div>
    `;
    planItems.appendChild(row);
  });

  planItems.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.del;
      const p = getSelectedPlan();
      p.items = p.items.filter(x=>x.id!==id);
      save(K_PLANS, plans);
      refreshAll();
    });
  });

  planItems.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.edit;
      const p = getSelectedPlan();
      const it = p.items.find(x=>x.id===id);
      if(!it) return;

      const sName = stations.find(s=>s.id===it.stationId)?.name ?? "(saknas)";
      const w = prompt(`Vikt för ${sName}:`, it.weight ?? "");
      if(w === null) return;
      const sets = prompt(`Antal set för ${sName}:`, it.sets ?? "");
      if(sets === null) return;
      const reps = prompt(`Antal reps för ${sName}:`, it.reps ?? "");
      if(reps === null) return;

      it.weight = Number(w);
      it.sets = Number(sets);
      it.reps = Number(reps);

      save(K_PLANS, plans);
      refreshAll();
    });
  });
}

createPlanBtn.addEventListener("click", ()=>{
  const name = planName.value.trim();
  if(!name) return;
  const p = {id: uid(), name, items: []};
  plans.push(p);
  planName.value = "";
  save(K_PLANS, plans);
  refreshAll();
  planSelect.value = p.id;
  renderPlanItems();
});

planSelect.addEventListener("change", ()=>{
  renderPlanItems();
});

renamePlanBtn.addEventListener("click", ()=>{
  const p = getSelectedPlan();
  if(!p) return;
  const name = prompt("Nytt plan-namn:", p.name);
  if(!name) return;
  p.name = name.trim();
  save(K_PLANS, plans);
  refreshAll();
  planSelect.value = p.id;
  renderPlanItems();
});

deletePlanBtn.addEventListener("click", ()=>{
  const p = getSelectedPlan();
  if(!p) return;
  if(!confirm(`Ta bort "${p.name}"?`)) return;
  plans = plans.filter(x=>x.id!==p.id);
  save(K_PLANS, plans);
  refreshAll();
});

addToPlanBtn.addEventListener("click", ()=>{
  const p = getSelectedPlan();
  if(!p) return;
  const stationId = planStationSelect.value;
  if(!stationId) return;

  const weight = planWeight.value === "" ? null : Number(planWeight.value);
  const sets   = planSets.value === "" ? null : Number(planSets.value);
  const reps   = planReps.value === "" ? null : Number(planReps.value);

  p.items.push({id: uid(), stationId, weight, sets, reps});
  save(K_PLANS, plans);

  planWeight.value = "";
  planSets.value = "";
  planReps.value = "";
  refreshAll();
  renderPlanItems();
});

clearPlanItemsBtn.addEventListener("click", ()=>{
  const p = getSelectedPlan();
  if(!p) return;
  if(!confirm(`Rensa alla stationer i "${p.name}"?`)) return;
  p.items = [];
  save(K_PLANS, plans);
  refreshAll();
  renderPlanItems();
});

// ====== Workout UI ======
const workoutPlanSelect = $("#workoutPlanSelect");
const startWorkoutBtn = $("#startWorkoutBtn");
const finishWorkoutBtn = $("#finishWorkoutBtn");
const workoutList = $("#workoutList");

function renderWorkout(){
  workoutList.innerHTML = "";
  if(!activeWorkout){
    workoutList.innerHTML = `<div class="muted">Ingen aktiv träning. Välj pass och tryck “Starta”.</div>`;
    finishWorkoutBtn.disabled = true;
    return;
  }
  finishWorkoutBtn.disabled = false;

  activeWorkout.checklist.forEach((it, idx)=>{
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="meta">
        <div class="name">${idx+1}. ${it.stationName}</div>
        <div class="sub">Vikt: ${it.weight ?? ""} • Set: ${it.sets ?? ""} • Reps: ${it.reps ?? ""}</div>
      </div>
      <div class="actions">
        <button class="${it.done ? "success" : "primary"}" data-toggle="${it.id}">
          ${it.done ? "Klar ✓" : "Markera klar"}
        </button>
      </div>
    `;
    workoutList.appendChild(row);
  });

  workoutList.querySelectorAll("button[data-toggle]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.toggle;
      const it = activeWorkout.checklist.find(x=>x.id===id);
      it.done = !it.done;
      renderWorkout();
    });
  });
}

startWorkoutBtn.addEventListener("click", ()=>{
  const planId = workoutPlanSelect.value;
  const p = plans.find(x=>x.id===planId);
  if(!p) return;

  const checklist = p.items.map(it=>{
    const stationName = stations.find(s=>s.id===it.stationId)?.name ?? "(saknas)";
    return {
      id: uid(),
      stationName,
      weight: it.weight ?? null,
      sets: it.sets ?? null,
      reps: it.reps ?? null,
      done: false
    };
  });

  activeWorkout = { planId: p.id, planName: p.name, checklist };
  renderWorkout();
});

finishWorkoutBtn.addEventListener("click", ()=>{
  if(!activeWorkout) return;

  const ts = todayStamp();
  const rows = activeWorkout.checklist.map(it=>({
    station: it.stationName,
    weight: it.weight ?? "",
    sets: it.sets ?? "",
    reps: it.reps ?? ""
  }));

  history.unshift({
    id: uid(),
    ts,
    planName: activeWorkout.planName,
    rows
  });

  save(K_HISTORY, history);

  activeWorkout = null;
  renderWorkout();
  renderHistory();
  setTab("history");
});

// ====== History UI ======
const exportCsvBtn = $("#exportCsvBtn");
const clearHistoryBtn = $("#clearHistoryBtn");
const historyTbody = $("#historyTbody");
const historyCount = $("#historyCount");

function renderHistory(){
  historyTbody.innerHTML = "";
  let rowCount = 0;

  history.forEach(h=>{
    h.rows.forEach(r=>{
      rowCount++;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${h.ts}</td>
        <td>${h.planName}</td>
        <td>${r.station}</td>
        <td>${r.weight}</td>
        <td>${r.sets}</td>
        <td>${r.reps}</td>
      `;
      historyTbody.appendChild(tr);
    });
  });

  historyCount.textContent = `${history.length} pass • ${rowCount} rader`;
  if(history.length === 0){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="muted">Ingen historik ännu.</td>`;
    historyTbody.appendChild(tr);
    historyCount.textContent = `0 pass • 0 rader`;
  }
}

exportCsvBtn.addEventListener("click", ()=>{
  // CSV med semikolon (svenskt Excel gillar ofta ;)
  const header = ["Datum","Pass","Station","Vikt","Set","Reps"];
  const lines = [header.join(";")];

  history.forEach(h=>{
    h.rows.forEach(r=>{
      lines.push([
        escapeCsv(h.ts),
        escapeCsv(h.planName),
        escapeCsv(r.station),
        escapeCsv(r.weight),
        escapeCsv(r.sets),
        escapeCsv(r.reps),
      ].join(";"));
    });
  });

  const csv = lines.join("\n");
  downloadText(`gym-historik-${new Date().toISOString().slice(0,10)}.csv`, csv);
});

clearHistoryBtn.addEventListener("click", ()=>{
  if(!confirm("Rensa ALL historik?")) return;
  history = [];
  save(K_HISTORY, history);
  renderHistory();
});

// ====== Refresh ======
function refreshAll(){
  renderStations();
  renderPlanSelects();
  renderPlanItems();
  renderWorkout();
  renderHistory();
}
refreshAll();

// ====== Register service worker (PWA/offline) ======
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try{
      await navigator.serviceWorker.register("./sw.js");
    }catch(e){
      // tyst fail - appen funkar ändå
      console.warn("SW registration failed", e);
    }
  });
}
