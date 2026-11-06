/* PWA additions; original dashboard and storage key remain compatible. */
if (!Array.prototype.toReversed) Object.defineProperty(Array.prototype,'toReversed',{value:function(){return [...this].reverse()}});
function downloadJSON(value,name){const u=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
exportData=function(){downloadJSON(state,'athletic-backup-'+today()+'.json');toast('Backup angefordert – bitte in Dateien/Downloads prüfen')};
function rawBackup(){try{const raw=localStorage.getItem(KEY);if(raw===null)return toast('Kein gespeicherter Stand vorhanden');downloadJSON(raw,'athletic-gespeicherter-stand-'+today()+'.json')}catch{toast('Gespeicherter Stand nicht lesbar')}}
const originalValidator=validateImport;
validateImport=function(s){
  function safe(v,depth=0){if(depth>30)throw Error();if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error();safe(x,depth+1)}}safe(s);
  originalValidator(s);
  if(typeof s.story!=='string'||s.story.length>10000||typeof s.holiday!=='boolean')throw Error();
  for(const [d,v] of Object.entries(s.done))if(!validDate(d)||typeof v!=='boolean')throw Error();
  for(const v of Object.values(s.tasks))if(typeof v!=='boolean')throw Error();
  for(const p of s.photos)if(typeof p.note!=='string'||p.note.length>10000)throw Error();
  return s;
};
let offlineState='Offline-Vorbereitung läuft …';
function pwaPanel(){return `<section class="card" style="margin-bottom:20px"><h2>App & Datensicherheit · Version 7</h2><p id="offline-state">${esc(offlineState)}</p><p>Jedes Gerät und jeder Browser hat eigene Daten. Keine Konten oder Synchronisation. Regelmäßig JSON-Backups in Dateien sichern; ein App-Update ersetzt keine Trainingsdaten.</p><div class="actions"><button onclick="exportData()">Aktuellen Stand exportieren</button><button onclick="rawBackup()">Zuletzt gespeicherten Stand exportieren</button></div><p class="hint">iPhone: Safari → Teilen → Zum Home-Bildschirm → ggf. Als Web-App öffnen. Danach über das neue Symbol online starten und auf „Offline bereit“ warten. Externe Quellenlinks brauchen Internet.</p><button onclick="navigator.storage?.persist?.().then(ok=>toast(ok?'Dauerhafter Speicher gewährt':'Speicheranfrage nicht gewährt – Backups bleiben wichtig')).catch(()=>toast('Speicheranfrage nicht verfügbar'))">Dauerhaften Speicher anfragen</button></section>`}
const dashboardRender=render;
render=function(){dashboardRender();if(page==='settings'){
  $('#app').insertAdjacentHTML('afterbegin',pwaPanel());
  $('#import').onchange=async e=>{try{
    const file=e.target.files[0];if(!file)return;if(file.size>50000000)throw Error();
    const imported=validateImport(JSON.parse(await file.text()));
    modal(`<h2>Backup wiederherstellen?</h2><p>${imported.entries.length} Messpunkte und ${imported.photos.length} Fotos ersetzen den aktuellen Stand. Es wird nichts zusammengeführt.</p><p>Exportiere zuerst den bisherigen Stand und prüfe, dass die Datei gespeichert wurde.</p><button id="before-import">Bisherigen Stand exportieren</button><label class="check"><input type="checkbox" id="backup-confirm">Meine Sicherung ist gespeichert.</label><button id="confirmImport" class="primary" disabled>Daten ersetzen</button>`);
    let exported=false;$('#before-import').onclick=()=>{exportData();exported=true;$('#confirmImport').disabled=!$('#backup-confirm').checked};
    $('#backup-confirm').onchange=()=>{$('#confirmImport').disabled=!(exported&&$('#backup-confirm').checked)};
    $('#confirmImport').onclick=()=>{if(!exported||!$('#backup-confirm').checked)return;const old=state;state=structuredClone(imported);ensurePhone5();if(!save()){state=old;return}closeAthleticDialog();render();toast('Backup wiederhergestellt')};
  }catch{toast('Ungültiges oder zu großes ATHLETIC-Backup. Vorhandene Daten bleiben erhalten.')}};
}};
resetDialog=function(){modal(`<h2>Lokale Daten zurücksetzen?</h2><p>Erst Backup exportieren und in Dateien/Downloads prüfen.</p><button id="reset-export">Backup exportieren</button><button class="danger" id="reset-confirm" disabled>Gesicherte Daten zurücksetzen</button>`);$('#reset-export').onclick=()=>{exportData();$('#reset-confirm').disabled=false};$('#reset-confirm').onclick=()=>{if(!confirm('Ist dein Backup sicher gespeichert? Lokalen Stand jetzt zurücksetzen?'))return;let old=state;state=structuredClone(initial);ensurePhone5();if(!save()){state=old;return}closeAthleticDialog();render()}};
function setOffline(text){offlineState=text;const el=document.getElementById('offline-state');if(el)el.textContent=text}
async function checkOffline(){try{const reg=await navigator.serviceWorker.ready;const worker=reg.active;if(!worker)return;const channel=new MessageChannel();channel.port1.onmessage=e=>setOffline(e.data.ready?'Offline bereit – App und alle 14 Bilder gespeichert.':'Offline-Kopie unvollständig – online neu öffnen.');worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2])}catch{setOffline('Offline-Vorbereitung fehlgeschlagen. Online neu öffnen.')}}
if('serviceWorker' in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{checkOffline();reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'){if(navigator.serviceWorker.controller)setOffline('Update bereit. Backup sichern, dann alle App-Fenster schließen und neu öffnen.');else checkOffline()}})});if(reg.waiting)setOffline('Update bereit. Backup sichern, dann alle App-Fenster schließen und neu öffnen.')}).catch(()=>setOffline('Offline nicht verfügbar. HTTPS-Adresse und Internetverbindung prüfen.'))}else setOffline('Offline-Installation benötigt HTTPS oder localhost. HTML-Doppelklick reicht nicht.');
window.addEventListener('online',checkOffline);
window.addEventListener('storage',e=>{if(e.key===KEY){storageBlocked=true;save()}});
render();if(storageBlocked)save();


// Native method=dialog closes training even without any JavaScript handler.
document.querySelector('#modal').addEventListener('close',()=>{activeTrainingDay=null});

// Checklist flags are separate from measured step counts.
const validateBeforeStepChecklist=validateImport;
validateImport=function(s){validateBeforeStepChecklist(s);if(s.stepChecks!==undefined){if(!s.stepChecks||typeof s.stepChecks!=='object'||Array.isArray(s.stepChecks))throw Error();for(const [d,v] of Object.entries(s.stepChecks))if(!validDate(d)||typeof v!=='boolean')throw Error()}return s};
stepForm=function(){modal('<h2>Schrittziel erreicht?</h2><p>'+fmt(state.stepGoal,0)+' Schritte pro Tag · '+weeklyStepChecks()+'/7 erreicht</p><div class="step-checklist">'+Array.from({length:7},(_,i)=>{let d=add(week,i);return '<label class="step-check-row"><span>'+dayNames[i]+'<small>'+date(d)+'</small></span><input type="checkbox" aria-label="'+dayNames[i]+' Schrittziel erreicht" '+(stepCheckDone(d)?'checked ':'')+(d>today()?'disabled ':'')+'data-date="'+d+'" onchange="setStepCheck(this.dataset.date,this.checked)"></label>'}).join('')+'</div><form method="dialog"><button type="submit" class="primary">Fertig</button></form>')};
function setStepCheck(d,done){if(!validDate(d)||d>today())return;const old=structuredClone(state.stepChecks);state.stepChecks??={};state.stepChecks[d]=!!done;if(!save()){state.stepChecks=old;stepForm();return}render();stepForm()}
render();

// Clean home: training, three metrics, meals. Existing training pages stay accessible.
overview=function(){const e=last(),s=session(selectedDay);const title=s.type==='run'?'Cardio | Joggen':s.type==='bike'?'Cardio | Rad':s.type==='gym'?'Kraft | '+s.name:'Erholung | Pause';const art=s.type==='run'?'assets/joggen-dark.png':s.type==='bike'?asset5('spinning'):null;return '<div class="clean-home"><button class="home-feature training-feature '+(art?'has-photo':'')+'" onclick="sessionDetail(\''+selectedDay+'\')">'+(art?'<img class="feature-photo" src="'+art+'" alt="">':'')+'<span class="feature-content"><small>'+date(selectedDay)+'</small><strong>'+title+'</strong><span class="feature-action">Training öffnen <span aria-hidden="true">↗</span></span></span></button><div class="home-metrics"><button onclick="entryForm(\''+e.date+'\')"><small>Gewicht</small><strong>'+fmt(e.weight,2)+' <em>kg</em></strong><span>Ziel '+fmt(state.target,0)+' kg</span></button><button onclick="go(\'forecast\')"><small>KFA</small><strong>'+fmt(e.fat)+' <em>%</em></strong><span>Ziel '+fmt(state.goalFat,0)+' %</span></button><button onclick="stepForm()"><small>Schritte</small><strong>'+weeklyStepChecks()+'<em>/7</em></strong><span>'+fmt(state.stepGoal,0)+' / Tag</span></button></div><button class="home-feature meals-feature has-photo" onclick="go(\'nutrition\')"><img class="feature-photo" src="'+asset5('chicken-potato')+'" alt=""><span class="feature-content"><strong>Ernährung | Mahlzeiten</strong><span class="feature-action">Mahlzeiten öffnen <span aria-hidden="true">↗</span></span></span></button><section class="home-week">'+weekControl()+dayPicker()+'</section></div>'};
render();
