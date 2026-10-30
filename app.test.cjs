const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Minimal DOM fixture for exercising the real application event handlers in Node.
class Element {
  constructor(attrs = '') {
    this.attrs = {};
    for (const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) this.attrs[m[1]] = m[2];
    this.dataset = Object.fromEntries(Object.entries(this.attrs).filter(([k]) => k.startsWith('data-'))
      .map(([k,v]) => [k.slice(5).replace(/-([a-z])/g, (_,c) => c.toUpperCase()),v]));
    this.value = this.attrs.value ?? '';
    this.listeners = {};
    this.children = [];
    this.classList = { add(){}, remove(){} };
    this.parent = {};
    this.checked = false;
  }
  set innerHTML(value) {
    this.html = value;
    this.children = [...value.matchAll(/<(input|button)\b([^>]*)>/g)].map(m => new Element(m[2]));
    if (!value) this.value = '';
  }
  get innerHTML(){ return this.html ?? ''; }
  addEventListener(name, callback){ (this.listeners[name] ??= []).push(callback); }
  async fire(name){ for (const cb of this.listeners[name] ?? []) await cb({ preventDefault(){} }); }
  click(){ return this.fire('click'); }
  closest(){ return this.parent; }
  appendChild(child){ this.children.push(child); }
  remove(){}
  querySelectorAll(selector){
    return this.children.filter(child => {
      if (selector.startsWith('input') && !('type' in child.attrs)) return false;
      return [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)]
        .every(([,key,value]) => key in child.attrs && (value === undefined || child.attrs[key] === value));
    });
  }
  reportValidity(){
    if (this.attrs.type !== 'number') return true;
    const n = Number(this.value);
    return this.value !== '' && Number.isFinite(n) && n >= Number(this.attrs.min ?? -Infinity)
      && n <= Number(this.attrs.max ?? Infinity) && (this.attrs.step !== '1' || Number.isInteger(n));
  }
}
function boot(data = {}, options = {}) {
  const storage = new Map(Object.entries(data).map(([k,v]) => [k, JSON.stringify(v)]));
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const downloads = [];
  const revoked = [];
  const pageEvents = {};
  const context = vm.createContext({
    window: { addEventListener:(name,cb) => { pageEvents[name] = cb; }, scrollTo(){} }, navigator: options.navigator ?? {},
    document: { getElementById:get, querySelectorAll:() => [], querySelector:() => new Element(),
      addEventListener(){}, createElement:tag => {
        const el = new Element();
        if (tag === 'a' && !options.noDownload) el.download = '';
        return el;
      }, body:new Element() },
    localStorage: {
      get length(){ return storage.size; }, key:i => [...storage.keys()][i] ?? null,
      getItem:k => { if (options.storageFailure) throw Error('Storage unavailable'); return storage.get(k) ?? null; },
      setItem:(k,v) => storage.set(k,v)
    },
    alert(){}, confirm:() => true, prompt:() => null, console, Blob, File,
    URL: { createObjectURL:blob => { downloads.push(blob); return `blob:test-${downloads.length}`; },
      revokeObjectURL:url => revoked.push(url) }
  });
  vm.runInContext(fs.readFileSync('app.js','utf8'), context);
  return { get, storage, downloads, revoked, pageEvents, read:code => JSON.parse(JSON.stringify(vm.runInContext(code,context))),
    run:code => vm.runInContext(code,context) };
}
const legacy = {
  ept_stations_v1: [{ id:'s', name:'Bänkpress', defaultWeight:60, defaultSets:3, defaultReps:8 }],
  ept_plans_v1: [{ id:'p', name:'Pass A', items:[{ stationId:'s', weight:60, sets:3, reps:8 }] }],
  ept_history_v1: [{ ts:1, date:'2026-10-01 12:00', planName:'Pass A', stationName:'Bänkpress', weight:50, sets:3, reps:8 }]
};
async function addCardio(app) {
  app.get('stationName').value = 'Löpband <backe>';
  app.get('stationType').value = 'cardio';
  await app.get('stationType').fire('change');
  assert.equal(app.get('stationDefaultWeight').disabled, true);
  await app.get('stationForm').fire('submit');
  const id = app.read('state.stations.at(-1).id');
  app.get('planAddStationSelect').value = id;
  await app.get('planAddStationBtn').click();
  return id;
}
test('old data remains untouched on startup and strength still saves identically', async () => {
  const app = boot(legacy);
  for (const [key,value] of Object.entries(legacy)) assert.deepEqual(JSON.parse(app.storage.get(key)),value);
  assert.equal(app.read('stationTypeOf(state.stations[0])'), 'strength');
  assert.match(app.get('workoutChecklist').innerHTML,/Vikt: 60/);
  assert.doesNotMatch(app.get('historyTable').innerHTML,/Distans/);
  await app.get('workoutFinishBtn').click();
  const history = app.read('state.history');
  assert.equal(history[0].weight,60);
  assert.equal(history[0].reps,8);
  assert.deepEqual(history[1],legacy.ept_history_v1[0]);
});

test('complete JSON export includes settings and exact app storage without changing data', async () => {
  const app = boot({ ...legacy, ept_settings_v1:{ theme:'dark' }, ept_future:'unrecognized', unrelated:{ secret:true } });
  const before = [...app.storage];
  await app.get('exportAllBtn').click();
  const payload = JSON.parse(await app.downloads[0].text());
  assert.deepEqual(payload.stations,legacy.ept_stations_v1);
  assert.deepEqual(payload.plans,legacy.ept_plans_v1);
  assert.deepEqual(payload.history,legacy.ept_history_v1);
  assert.deepEqual(payload.settings.ept_settings_v1,{theme:'dark'});
  assert.equal(payload.settings.ept_future,'unrecognized');
  assert.equal(payload.localStorage.ept_history_v1,app.storage.get('ept_history_v1'));
  assert.equal(payload.localStorage.unrelated,undefined);
  assert.deepEqual([...app.storage],before);
  assert.deepEqual(JSON.parse(app.get('backupText').value),payload);
  assert.match(app.get('backupStatus').textContent,/Nedladdning begärd/);
  assert.equal(app.revoked.length,0);
  app.pageEvents.pagehide({persisted:true});
  assert.equal(app.revoked.length,0);
  app.pageEvents.pagehide({persisted:false});
  assert.equal(app.revoked.length,1);
});

test('native file share uses the tap directly and does not also download', async () => {
  let shared, resolveShare;
  const app = boot(legacy, {navigator:{
    canShare:({files}) => files[0].type === 'application/json',
    share:data => { shared = data; return new Promise(resolve => { resolveShare = resolve; }); }
  }});
  const pending = app.get('exportAllBtn').click();
  assert.ok(shared, 'share must be invoked synchronously before any await');
  assert.equal(app.get('exportAllBtn').disabled,true);
  assert.equal(shared.files[0].name,'ett-pass-till-backup.json');
  assert.deepEqual(JSON.parse(await shared.files[0].text()).history,legacy.ept_history_v1);
  resolveShare();
  await pending;
  assert.equal(app.downloads.length,0);
  assert.equal(app.get('exportAllBtn').disabled,false);
  assert.match(app.get('backupStatus').textContent,/kan inte bekräfta/);
});

test('unsupported JSON MIME can use a plain-text file with the same JSON name and content', async () => {
  let file;
  const app = boot(legacy, {navigator:{
    canShare:({files}) => files[0].type === 'text/plain',
    share:async data => { file = data.files[0]; }
  }});
  await app.get('exportAllBtn').click();
  assert.equal(file.type,'text/plain');
  assert.equal(file.name,'ett-pass-till-backup.json');
  assert.deepEqual(JSON.parse(await file.text()).stations,legacy.ept_stations_v1);
});

test('cancelled and failed shares retain backup and offer a separate download tap', async () => {
  for (const name of ['AbortError','NotAllowedError','DataError']){
    const app = boot(legacy, {navigator:{canShare:() => true, share:async () => {
      const error = Error('Share rejected'); error.name = name; throw error;
    }}});
    const before = [...app.storage];
    await app.get('exportAllBtn').click();
    assert.equal(app.downloads.length,0);
    assert.match(app.get('backupStatus').textContent,name === 'AbortError' ? /avbröts/ : /misslyckades/);
    assert.equal(app.get('backupFallback').hidden,false);
    await app.get('downloadBackupBtn').click();
    assert.equal(app.downloads.length,1);
    assert.deepEqual([...app.storage],before);
  }
});

test('unsupported sharing falls back to download; unsupported downloading leaves selectable JSON', async () => {
  for (const canShare of [() => false, () => { throw Error('Unsupported'); }]){
    const app = boot(legacy, {navigator:{canShare, share:() => assert.fail('must not share')}});
    await app.get('exportAllBtn').click();
    assert.equal(app.downloads.length,1);
  }
  const app = boot(legacy, {noDownload:true});
  await app.get('exportAllBtn').click();
  assert.equal(app.downloads.length,0);
  assert.match(app.get('backupStatus').textContent,/Kunde inte starta/);
  assert.deepEqual(JSON.parse(app.get('backupText').value).history,legacy.ept_history_v1);
});

test('backup preparation failure is visible and does not export incomplete data', async () => {
  const app = boot(legacy);
  const before = [...app.storage];
  app.run('localStorage.key = () => { throw new Error("Storage unavailable"); }');
  await app.get('exportAllBtn').click();
  assert.match(app.get('backupStatus').textContent,/Kunde inte skapa en komplett backup/);
  assert.equal(app.downloads.length,0);
  assert.equal(app.get('backupFallback').hidden,true);
  assert.equal(app.get('exportAllBtn').disabled,false);
  assert.deepEqual([...app.storage],before);
});
test('mixed plans save manual cardio values, escape text and survive reload/type edits', async () => {
  const app = boot(legacy);
  const id = await addCardio(app);
  assert.match(app.get('planItemsEditor').innerHTML,/data-field="distanceKm"/);
  await app.get('workoutLoadBtn').click();
  const values = { hours:'1', minutes:'23', seconds:'45', distanceKm:'12.345', comment:'Bra; "tempo" <backe>' };
  for (const input of app.get('workoutChecklist').querySelectorAll('[data-cardio-idx]')) {
    input.value = values[input.dataset.field];
    await input.fire('input');
  }
  // Checkbox updates rebuild the DOM; manual values must remain.
  const checkbox = app.get('workoutChecklist').querySelectorAll('[data-widx]')[1];
  checkbox.checked = true;
  await checkbox.fire('change');
  assert.equal(app.read('state.workout.cardio[1].distanceKm'),12.345);
  await app.get('workoutFinishBtn').click();
  let history = app.read('state.history');
  assert.equal(history[0].type,'cardio');
  assert.equal(history[0].minutes,23);
  assert.equal(history[0].comment,values.comment);
  assert.equal(history[1].weight,60);
  app.run('renderHistory()');
  assert.match(app.get('historyTable').innerHTML,/01:23:45/);
  assert.match(app.get('historyTable').innerHTML,/12.345 km/);
  assert.match(app.get('historyTable').innerHTML,/&lt;backe&gt;/);
  const reloaded = boot(Object.fromEntries([...app.storage].map(([k,v]) => [k,JSON.parse(v)])));
  assert.deepEqual(reloaded.read('state.history'),history);
  reloaded.run(`state.stations.find(s => s.id === '${id}').type = 'strength'; renderHistory()`);
  assert.match(reloaded.get('historyTable').innerHTML,/01:23:45/);
  await app.get('exportAllBtn').click();
  assert.equal(JSON.parse(await app.downloads.at(-1).text()).history[0].distanceKm,12.345);
  await app.get('exportCsvBtn').click();
  const csv = await app.downloads.at(-1).text();
  const imported = boot(legacy);
  imported.get('importCsvFile').files = [{text:async () => csv}];
  await imported.get('importCsvFile').fire('change');
  assert.equal(imported.read('state.history[0].comment'),values.comment);
  assert.equal(imported.read('state.history[0].distanceKm'),12.345);
});
test('invalid duration and distance prevent saving any workout rows', async () => {
  for (const [field,value] of [['minutes','60'],['seconds','-1'],['hours','1.5'],['distanceKm','-0.1'],['seconds','']]) {
    const app = boot(legacy);
    await addCardio(app);
    await app.get('workoutLoadBtn').click();
    const input = app.get('workoutChecklist').querySelectorAll('[data-cardio-idx]').find(i => i.dataset.field === field);
    input.value = value;
    await input.fire('input');
    await app.get('workoutFinishBtn').click();
    assert.deepEqual(app.read('state.history'),legacy.ept_history_v1);
  }
});
test('CSV quoted multiline comments and legacy CSV both import', async () => {
  const app = boot(legacy);
  assert.deepEqual(app.read('parseCsv(\'a;b\\n"line 1\\nline 2";"quote "" and ;"\')'),
    [['a','b'],['line 1\nline 2','quote " and ;']]);
  app.get('importCsvFile').files = [{ text:async () => 'datum;plan;station;vikt;set;reps\n2026-10-01 12:00;A;Press;40;3;8' }];
  await app.get('importCsvFile').fire('change');
  assert.equal(app.read('state.history[0].weight'),'40');
  assert.equal(app.read('stationTypeOf(state.history[0])'),'strength');
});
test('station editing defaults to strength and allows changing type without changing history', async () => {
  const app = boot(legacy);
  await app.get('stationsList').querySelectorAll('[data-edit]')[0].click();
  assert.equal(app.get('stationType').value,'strength');
  app.get('stationType').value = 'cardio';
  app.get('stationName').value = 'Cykel';
  await app.get('stationType').fire('change');
  await app.get('stationForm').fire('submit');
  assert.equal(app.read('state.stations[0].type'),'cardio');
  assert.equal(app.read('state.stations[0].defaultWeight'),60);
  assert.deepEqual(app.read('state.history'),legacy.ept_history_v1);
  assert.equal(app.get('stationType').value,'strength');
  assert.equal(app.get('stationDefaultWeight').disabled,false);
});
test('cardio plan targets persist and JSON backup restores mixed records', async () => {
  const app = boot(legacy);
  await addCardio(app);
  const minutes = app.get('planItemsEditor').querySelectorAll('[data-pidx]').find(i => i.dataset.field === 'minutes');
  minutes.value = '35';
  await minutes.fire('input');
  assert.equal(JSON.parse(app.storage.get('ept_plans_v1'))[0].items[1].minutes,35);
  await app.get('workoutLoadBtn').click();
  assert.equal(app.get('workoutChecklist').querySelectorAll('[data-cardio-idx]').find(i => i.dataset.field === 'minutes').value,'35');
  await app.get('workoutFinishBtn').click();
  await app.get('exportAllBtn').click();
  const backup = await app.downloads.at(-1).text();
  const restored = boot(legacy);
  restored.get('importAllFile').files = [{text:async () => backup}];
  await restored.get('importAllFile').fire('change');
  assert.deepEqual(restored.read('state.history'),app.read('state.history'));
  assert.deepEqual(restored.read('state.plans'),app.read('state.plans'));
  assert.deepEqual(restored.read('state.stations'),app.read('state.stations'));
  // Rebuild also retains the station type and cardio targets.
  restored.run('state.stations = []; state.plans = []');
  await restored.get('rebuildFromHistoryBtn').click();
  assert.equal(restored.read('state.stations.find(s => s.type === "cardio").name'),'Löpband <backe>');
  assert.equal(restored.read('state.plans[0].items[0].minutes'),35);
});
