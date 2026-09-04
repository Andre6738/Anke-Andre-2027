/* ------------------------------------------------------------------
   André & Anke - ADMIN bladsy logika (aparte bladsy: /admin)
   - Meld aan met Google (popup, met terugval na herlei) of e-pos/wagwoord
   - Wys, voeg by, wysig en verwyder RSVP's in Firestore
   Slegs e-posse in window.ADMIN_EMAILS kry toegang.
   Geen em-strepe. Afrikaans.
------------------------------------------------------------------ */

import { wysSukses, wysFout, wysInfo, vraBevestig, swalBeskikbaar, swalBasis } from "./swal-tema.js?v=20260904";

const cfg = window.FIREBASE_CONFIG || {};
const FIREBASE_READY = !!(cfg.apiKey && cfg.projectId);
const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
const DEMO_KEY = "andre_anke_rsvps_demo";

let fb = null;
let huidigeRekords = [];

async function initFirebase(){
  if(!FIREBASE_READY) return null;
  try{
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);
    const app = initializeApp(cfg);
    fb = {
      auth: authMod.getAuth(app),
      db: fsMod.getFirestore(app),
      GoogleProvider: authMod.GoogleAuthProvider,
      signInWithPopup: authMod.signInWithPopup,
      signInWithRedirect: authMod.signInWithRedirect,
      getRedirectResult: authMod.getRedirectResult,
      signInEmail: authMod.signInWithEmailAndPassword,
      signOut: authMod.signOut,
      onAuth: authMod.onAuthStateChanged,
      collection: fsMod.collection,
      doc: fsMod.doc,
      getDocs: fsMod.getDocs,
      addDoc: fsMod.addDoc,
      updateDoc: fsMod.updateDoc,
      deleteDoc: fsMod.deleteDoc,
      serverTimestamp: fsMod.serverTimestamp
    };
    return fb;
  }catch(err){
    console.warn("Firebase kon nie laai nie, val terug na demo-modus.", err);
    return null;
  }
}

/* ---------- helpers ---------- */
function isAllowedAdmin(email){
  const list = window.ADMIN_EMAILS || [];
  if(!list.length) return true;
  return list.map(x => x.toLowerCase()).includes((email || "").toLowerCase());
}
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c])); }
function msg(text, ok){
  const el = document.getElementById("admin-msg");
  el.textContent = text;
  el.className = "form-msg " + (ok ? "ok" : "err");
}
function clearMsg(){ const el = document.getElementById("admin-msg"); el.textContent = ""; el.className = "form-msg"; }

function demoLoad(){ try{ return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); }catch(e){ return []; } }
function demoSave(list){ try{ localStorage.setItem(DEMO_KEY, JSON.stringify(list)); }catch(e){} }

/* Verduidelik Firebase se foutkodes in gewone Afrikaans. */
function authFoutTeks(err){
  const kode = (err && err.code) || "";
  const gasheer = window.location.hostname;
  switch(kode){
    case "auth/unauthorized-domain":
      return "Hierdie domein (" + gasheer + ") is nie in Firebase se lys van gemagtigde domeine nie. "
           + "Voeg dit by in die Firebase-konsole onder Authentication, Settings, Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google-aanmelding is nie vir hierdie projek geaktiveer nie. "
           + "Aktiveer dit in die Firebase-konsole onder Authentication, Sign-in method.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Die aanmeld-venster is toegemaak voordat jy klaar was. Probeer gerus weer.";
    case "auth/network-request-failed":
      return "Ons kon nie aan Firebase koppel nie. Kontroleer jou internetverbinding en probeer weer.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Die e-pos of wagwoord is verkeerd. Kontroleer asseblief jou besonderhede.";
    case "auth/too-many-requests":
      return "Te veel pogings. Wag 'n oomblik en probeer weer.";
    default:
      return "Aanmelding het misluk" + (kode ? " (" + kode + ")" : "") + ". Probeer asseblief weer.";
  }
}
function popupGeblokkeer(err){
  const kode = (err && err.code) || "";
  return kode === "auth/popup-blocked"
      || kode === "auth/popup-closed-by-user"
      || kode === "auth/cancelled-popup-request"
      || kode === "auth/operation-not-supported-in-this-environment";
}

/* ---------- views ---------- */
function showLogin(){
  document.getElementById("admin-login").style.display = "block";
  document.getElementById("admin-panel").style.display = "none";
}
function showPanel(email){
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-panel").style.display = "block";
  document.getElementById("admin-user").textContent =
    (fb ? "Aangemeld as " : "Demo-modus - ") + (email || "");
  herlaai();
}

async function herlaai(){
  try{
    huidigeRekords = await loadRsvps();
    renderRows(huidigeRekords);
  }catch(err){
    console.error(err);
    document.getElementById("admin-user").textContent =
      "Kon nie die lys laai nie: " + ((err && err.code) || "onbekende fout") + ".";
  }
}

async function loadRsvps(){
  if(fb){
    // Haal alles en sorteer plaaslik, sodat 'n dokument sonder "geskepOp"
    // nooit uit die lys verdwyn nie.
    const snap = await fb.getDocs(fb.collection(fb.db, "rsvps"));
    const lys = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    lys.sort((a, b) => tydWaarde(b) - tydWaarde(a));
    return lys;
  }
  return demoLoad().map((r, i) => ({ id: "demo-" + i, ...r }));
}
function tydWaarde(r){
  const t = r && r.geskepOp;
  if(!t) return 0;
  if(typeof t.toMillis === "function") return t.toMillis();
  const d = new Date(t).getTime();
  return isNaN(d) ? 0 : d;
}

function renderRows(records){
  const tbody = document.getElementById("rsvp-rows");
  tbody.innerHTML = "";
  let ja = 0, nee = 0, mense = 0;
  records.forEach(r => {
    const gasteArr = Array.isArray(r.gaste) ? r.gaste : [];
    const liedjies = Array.isArray(r.liedjies) ? r.liedjies : (r.liedjie ? [r.liedjie] : []);
    if(r.bywoon === "ja"){ ja++; mense += (1 + gasteArr.length); } else { nee++; }
    const tr = document.createElement("tr");
    const by = r.bywoon === "ja" ? "Ja" : "Nee";
    const gasteStr = gasteArr.map(g => esc(((g.naam || "") + " " + (g.van || "")).trim())).join("<br>") || "-";
    const liedjieStr = liedjies.map(s => esc(s)).join("<br>") || "-";
    tr.innerHTML =
      `<td>${esc(r.naam || "")}</td>`+
      `<td>${esc(r.van || "")}</td>`+
      `<td>${esc(r.selfoon || "")}</td>`+
      `<td>${by}</td>`+
      `<td>${gasteStr}</td>`+
      `<td>${liedjieStr}</td>`+
      `<td class="acts">`+
        `<button class="row-btn" data-wysig="${esc(r.id)}" type="button">Wysig</button>`+
        `<button class="row-btn danger" data-verwyder="${esc(r.id)}" type="button">Verwyder</button>`+
      `</td>`;
    tbody.appendChild(tr);
  });
  if(!records.length){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" style="text-align:center;color:#8a7657;">Geen RSVP's nog nie.</td>`;
    tbody.appendChild(tr);
  }
  document.getElementById("stat-total").textContent = records.length;
  document.getElementById("stat-ja").textContent = ja;
  document.getElementById("stat-nee").textContent = nee;
  document.getElementById("stat-gaste").textContent = mense;
}

/* ---------- RSVP byvoeg / wysig / verwyder ---------- */
function gasteNaTeks(gaste){
  return (Array.isArray(gaste) ? gaste : [])
    .map(g => ((g.naam || "") + " " + (g.van || "")).trim())
    .filter(Boolean).join("\n");
}
function teksNaGaste(teks){
  return String(teks || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const dele = l.split(/\s+/);
    const naam = dele.shift() || "";
    return { naam, van: dele.join(" ") };
  }).slice(0, 29);
}
function teksNaLiedjies(teks){
  return String(teks || "").split("\n").map(l => l.trim()).filter(Boolean).slice(0, 29);
}

function vormHtml(r){
  r = r || {};
  const liedjieTeks = (Array.isArray(r.liedjies) ? r.liedjies : []).join("\n");
  return `
    <div class="aa-form">
      <div class="two">
        <div><label for="e-naam">Naam</label><input id="e-naam" type="text" value="${esc(r.naam || "")}" maxlength="79" placeholder="Naam"></div>
        <div><label for="e-van">Van</label><input id="e-van" type="text" value="${esc(r.van || "")}" maxlength="79" placeholder="Van"></div>
      </div>
      <label for="e-selfoon">Selfoonnommer</label>
      <input id="e-selfoon" type="tel" value="${esc(r.selfoon || "")}" maxlength="39" placeholder="082 000 0000">
      <label for="e-bywoon">Sal hulle bywoon?</label>
      <select id="e-bywoon">
        <option value="ja"${r.bywoon !== "nee" ? " selected" : ""}>Ja, hulle sal daar wees</option>
        <option value="nee"${r.bywoon === "nee" ? " selected" : ""}>Nee, hulle kan nie maak nie</option>
      </select>
      <label for="e-gaste">Gaste wat saam kom</label>
      <textarea id="e-gaste" rows="3" placeholder="Een gas per lyn: Naam Van">${esc(gasteNaTeks(r.gaste))}</textarea>
      <div class="hint">Een gas per lyn, naam en van.</div>
      <label for="e-liedjies">Liedjie-versoeke</label>
      <textarea id="e-liedjies" rows="3" placeholder="Een liedjie per lyn">${esc(liedjieTeks)}</textarea>
      <div class="hint">Een liedjie per lyn.</div>
    </div>`;
}

function leesVorm(){
  const naam = document.getElementById("e-naam").value.trim();
  const van = document.getElementById("e-van").value.trim();
  const selfoon = document.getElementById("e-selfoon").value.trim();
  if(!naam || !van || !selfoon){
    window.Swal.showValidationMessage("Vul asseblief naam, van en selfoonnommer in.");
    return false;
  }
  if(naam.length >= 80 || van.length >= 80 || selfoon.length >= 40){
    window.Swal.showValidationMessage("Een van die velde is te lank.");
    return false;
  }
  return {
    naam, van, selfoon,
    bywoon: document.getElementById("e-bywoon").value === "nee" ? "nee" : "ja",
    gaste: teksNaGaste(document.getElementById("e-gaste").value),
    liedjies: teksNaLiedjies(document.getElementById("e-liedjies").value)
  };
}

async function vraRsvpVorm(titel, rekord){
  if(!swalBeskikbaar()){
    await wysInfo("Nie beskikbaar nie", "Die venster kon nie laai nie. Herlaai asseblief die bladsy.");
    return null;
  }
  const r = await window.Swal.fire(swalBasis({
    title: titel,
    html: vormHtml(rekord),
    showCancelButton: true,
    confirmButtonText: "Stoor",
    cancelButtonText: "Kanselleer",
    focusConfirm: false,
    preConfirm: leesVorm
  }));
  return r.isConfirmed ? r.value : null;
}

async function voegRsvpBy(){
  const data = await vraRsvpVorm("Voeg RSVP by", null);
  if(!data) return;
  try{
    if(fb){
      await fb.addDoc(fb.collection(fb.db, "rsvps"), { ...data, geskepOp: fb.serverTimestamp() });
    }else{
      const lys = demoLoad();
      lys.unshift({ ...data, geskepOp: new Date().toISOString() });
      demoSave(lys);
    }
    await herlaai();
    await wysSukses("RSVP bygevoeg", "<strong>" + esc(data.naam) + " " + esc(data.van) + "</strong> is by die lys gevoeg.", "Gestoor");
  }catch(err){
    console.error(err);
    await wysFout("Kon nie stoor nie", "Die RSVP kon nie bygevoeg word nie" + (err.code ? " (" + esc(err.code) + ")" : "") + ".");
  }
}

async function wysigRsvp(id){
  const bestaande = huidigeRekords.find(r => r.id === id);
  if(!bestaande) return;
  const data = await vraRsvpVorm("Wysig RSVP", bestaande);
  if(!data) return;
  try{
    if(fb){
      await fb.updateDoc(fb.doc(fb.db, "rsvps", id), data);
    }else{
      const lys = demoLoad();
      const i = parseInt(String(id).replace("demo-", ""), 10);
      if(!isNaN(i) && lys[i]){ lys[i] = { ...lys[i], ...data }; demoSave(lys); }
    }
    await herlaai();
    await wysSukses("RSVP opgedateer", "Die veranderinge aan <strong>" + esc(data.naam) + " " + esc(data.van) + "</strong> is gestoor.", "Gestoor");
  }catch(err){
    console.error(err);
    await wysFout("Kon nie opdateer nie", "Die veranderinge kon nie gestoor word nie" + (err.code ? " (" + esc(err.code) + ")" : "") + ".");
  }
}

async function verwyderRsvp(id){
  const bestaande = huidigeRekords.find(r => r.id === id);
  if(!bestaande) return;
  const naam = ((bestaande.naam || "") + " " + (bestaande.van || "")).trim();
  const seker = await vraBevestig(
    "Verwyder hierdie RSVP?",
    "Jy is op die punt om die RSVP van <strong>" + esc(naam) + "</strong> permanent te verwyder. Hierdie stap kan nie ongedaan gemaak word nie.",
    "Ja, verwyder"
  );
  if(!seker) return;
  try{
    if(fb){
      await fb.deleteDoc(fb.doc(fb.db, "rsvps", id));
    }else{
      const lys = demoLoad();
      const i = parseInt(String(id).replace("demo-", ""), 10);
      if(!isNaN(i)){ lys.splice(i, 1); demoSave(lys); }
    }
    await herlaai();
    await wysSukses("RSVP verwyder", "Die RSVP van <strong>" + esc(naam) + "</strong> is uit die lys verwyder.", "Verwyder");
  }catch(err){
    console.error(err);
    await wysFout("Kon nie verwyder nie", "Die RSVP kon nie verwyder word nie" + (err.code ? " (" + esc(err.code) + ")" : "") + ".");
  }
}

/* ---------- sign in / out ---------- */
async function afterSignIn(user){
  if(!isAllowedAdmin(user.email)){
    msg("Hierdie rekening (" + (user.email || "") + ") het nie admin-toegang nie.", false);
    await wysFout("Geen admin-toegang nie", "Die rekening <strong>" + esc(user.email || "") + "</strong> is nie op die admin-lys nie.");
    try{ await fb.signOut(fb.auth); }catch(e){}
    showLogin();
    return;
  }
  clearMsg();
  showPanel(user.email);
}

async function meldAanMetGoogle(){
  if(!fb){ msg("Firebase is nie gekonfigureer nie.", false); return; }
  clearMsg();
  const provider = new fb.GoogleProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try{
    const cred = await fb.signInWithPopup(fb.auth, provider);
    await afterSignIn(cred.user);
  }catch(err){
    console.error("Google-aanmelding het misluk:", err.code, err.message);
    // Popups word dikwels op selfone geblokkeer: probeer dan herlei.
    if(popupGeblokkeer(err)){
      try{
        await fb.signInWithRedirect(fb.auth, provider);
        return;
      }catch(err2){
        console.error("Herlei-aanmelding het ook misluk:", err2.code, err2.message);
        msg(authFoutTeks(err2), false);
        await wysFout("Google-aanmelding het misluk", esc(authFoutTeks(err2)));
        return;
      }
    }
    msg(authFoutTeks(err), false);
    await wysFout("Google-aanmelding het misluk", esc(authFoutTeks(err)));
  }
}

function wireEvents(){
  const googleBtn = document.getElementById("google-signin");
  const emailForm = document.getElementById("admin-form");
  const signout = document.getElementById("admin-signout");
  const addBtn = document.getElementById("rsvp-add");
  const rows = document.getElementById("rsvp-rows");

  if(googleBtn) googleBtn.addEventListener("click", meldAanMetGoogle);

  if(emailForm){
    emailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("a-epos").value.trim();
      const wag = document.getElementById("a-wag").value;
      if(!email || !wag){ msg("Vul asseblief e-pos en wagwoord in.", false); return; }
      if(fb){
        try{
          const cred = await fb.signInEmail(fb.auth, email, wag);
          await afterSignIn(cred.user);
        }catch(err){
          console.error("E-pos aanmelding het misluk:", err.code, err.message);
          msg(authFoutTeks(err), false);
        }
      }else{
        clearMsg();
        showPanel(email);
      }
    });
  }

  if(signout){
    signout.addEventListener("click", async () => {
      if(fb){ try{ await fb.signOut(fb.auth); }catch(e){} }
      showLogin();
    });
  }

  if(addBtn) addBtn.addEventListener("click", voegRsvpBy);

  if(rows){
    rows.addEventListener("click", (e) => {
      const wysigId = e.target.getAttribute && e.target.getAttribute("data-wysig");
      const verwyderId = e.target.getAttribute && e.target.getAttribute("data-verwyder");
      if(wysigId) wysigRsvp(wysigId);
      else if(verwyderId) verwyderRsvp(verwyderId);
    });
  }
}

/* ---------- boot ---------- */
wireEvents();
const note = document.getElementById("admin-config-note");
if(note){
  note.textContent = FIREBASE_READY
    ? "Meld aan met jou Google-rekening (of admin e-pos en wagwoord) om die RSVP-lys te sien."
    : "Demo-modus: Firebase is nog nie gekonfigureer nie. Meld aan met enige e-pos en wagwoord om die plaaslike demo-antwoorde te sien.";
}
initFirebase().then(async (inst) => {
  if(inst && inst.auth){
    // Vang die antwoord op as ons via herlei aangemeld het.
    try{
      const herleiResultaat = await inst.getRedirectResult(inst.auth);
      if(herleiResultaat && herleiResultaat.user){ await afterSignIn(herleiResultaat.user); }
    }catch(err){
      console.error("Herlei-resultaat het misluk:", err.code, err.message);
      msg(authFoutTeks(err), false);
    }
    inst.onAuth(inst.auth, user => {
      if(user && isAllowedAdmin(user.email)){ showPanel(user.email); }
      else { showLogin(); }
    });
  }else{
    showLogin();
  }
});
