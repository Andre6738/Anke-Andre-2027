/* ------------------------------------------------------------------
   André & Anke - ADMIN bladsy logika (aparte bladsy: /admin)
   - Meld aan met Google (popup, met terugval na herlei) of e-pos/wagwoord
   - Wys, voeg by, wysig en verwyder RSVP's in Firestore
   Slegs e-posse in window.ADMIN_EMAILS kry toegang.

   LET WEL: die admin-portaal se teks is in ENGELS (dit is net vir die
   paartjie). Die gaste-bladsy bly in Afrikaans.
   Geen em-strepe.
------------------------------------------------------------------ */

import { wysSukses, wysFout, wysInfo, vraBevestig, swalBeskikbaar, swalBasis, stelEtikette } from "./swal-tema.js?v=20260904b";

stelEtikette({
  suksesEyebrow: "Done",
  suksesKnoppie: "OK",
  foutEyebrow: "Something went wrong",
  foutKnoppie: "Try again",
  infoEyebrow: "Note",
  infoKnoppie: "OK",
  bevestigEyebrow: "Please confirm",
  bevestigKnoppie: "Delete",
  kanselleerKnoppie: "Cancel"
});

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

function authFoutTeks(err){
  const kode = (err && err.code) || "";
  const gasheer = window.location.hostname;
  switch(kode){
    case "auth/unauthorized-domain":
      return "This domain (" + gasheer + ") is not on Firebase's list of authorised domains. "
           + "Add it in the Firebase console under Authentication, Settings, Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled for this project. "
           + "Enable it in the Firebase console under Authentication, Sign-in method.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The sign-in window was closed before you finished. Please try again.";
    case "auth/network-request-failed":
      return "We could not reach Firebase. Check your internet connection and try again.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email or password is incorrect. Please check your details.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "Login failed" + (kode ? " (" + kode + ")" : "") + ". Please try again.";
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
    (fb ? "Signed in as " : "Demo mode - ") + (email || "");
  herlaai();
}

async function herlaai(){
  try{
    huidigeRekords = await loadRsvps();
    renderRows(huidigeRekords);
  }catch(err){
    console.error(err);
    document.getElementById("admin-user").textContent =
      "Could not load the list: " + ((err && err.code) || "unknown error") + ".";
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
    const by = r.bywoon === "ja" ? "Yes" : "No";
    const gasteStr = gasteArr.map(g => esc(((g.naam || "") + " " + (g.van || "")).trim())).join("<br>") || "-";
    const liedjieStr = liedjies.map(s => esc(s)).join("<br>") || "-";
    tr.innerHTML =
      `<td data-label="Name">${esc(r.naam || "")}</td>`+
      `<td data-label="Surname">${esc(r.van || "")}</td>`+
      `<td data-label="Phone">${esc(r.selfoon || "")}</td>`+
      `<td data-label="Attending"><span class="pill ${r.bywoon === "ja" ? "ja" : "nee"}">${by}</span></td>`+
      `<td data-label="Guests">${gasteStr}</td>`+
      `<td data-label="Songs">${liedjieStr}</td>`+
      `<td class="acts" data-label="Actions">`+
        `<button class="row-btn" data-wysig="${esc(r.id)}" type="button">Edit</button>`+
        `<button class="row-btn danger" data-verwyder="${esc(r.id)}" type="button">Delete</button>`+
      `</td>`;
    tbody.appendChild(tr);
  });
  if(!records.length){
    const tr = document.createElement("tr");
    tr.className = "leeg-ry";
    tr.innerHTML = `<td class="leeg" colspan="7">No RSVPs yet.</td>`;
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
        <div><label for="e-naam">Name</label><input id="e-naam" type="text" value="${esc(r.naam || "")}" maxlength="79" placeholder="Name"></div>
        <div><label for="e-van">Surname</label><input id="e-van" type="text" value="${esc(r.van || "")}" maxlength="79" placeholder="Surname"></div>
      </div>
      <label for="e-selfoon">Phone number</label>
      <input id="e-selfoon" type="tel" value="${esc(r.selfoon || "")}" maxlength="39" placeholder="082 000 0000">
      <label for="e-bywoon">Attending?</label>
      <select id="e-bywoon">
        <option value="ja"${r.bywoon !== "nee" ? " selected" : ""}>Yes, they will be there</option>
        <option value="nee"${r.bywoon === "nee" ? " selected" : ""}>No, they cannot make it</option>
      </select>
      <label for="e-gaste">Guests coming along</label>
      <textarea id="e-gaste" rows="3" placeholder="One guest per line: Name Surname">${esc(gasteNaTeks(r.gaste))}</textarea>
      <div class="hint">One guest per line, name and surname.</div>
      <label for="e-liedjies">Song requests</label>
      <textarea id="e-liedjies" rows="3" placeholder="One song per line">${esc(liedjieTeks)}</textarea>
      <div class="hint">One song per line.</div>
    </div>`;
}

function leesVorm(){
  const naam = document.getElementById("e-naam").value.trim();
  const van = document.getElementById("e-van").value.trim();
  const selfoon = document.getElementById("e-selfoon").value.trim();
  if(!naam || !van || !selfoon){
    window.Swal.showValidationMessage("Please fill in name, surname and phone number.");
    return false;
  }
  if(naam.length >= 80 || van.length >= 80 || selfoon.length >= 40){
    window.Swal.showValidationMessage("One of the fields is too long.");
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
    await wysInfo("Not available", "The dialog could not load. Please reload the page.");
    return null;
  }
  const r = await window.Swal.fire(swalBasis({
    title: titel,
    html: vormHtml(rekord),
    showCancelButton: true,
    confirmButtonText: "Save",
    cancelButtonText: "Cancel",
    focusConfirm: false,
    preConfirm: leesVorm
  }));
  return r.isConfirmed ? r.value : null;
}

async function voegRsvpBy(){
  const data = await vraRsvpVorm("Add RSVP", null);
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
    await wysSukses("RSVP added", "<strong>" + esc(data.naam) + " " + esc(data.van) + "</strong> has been added to the list.", "Saved");
  }catch(err){
    console.error(err);
    await wysFout("Could not save", "The RSVP could not be added" + (err.code ? " (" + esc(err.code) + ")" : "") + ".");
  }
}

async function wysigRsvp(id){
  const bestaande = huidigeRekords.find(r => r.id === id);
  if(!bestaande) return;
  const data = await vraRsvpVorm("Edit RSVP", bestaande);
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
    await wysSukses("RSVP updated", "The changes to <strong>" + esc(data.naam) + " " + esc(data.van) + "</strong> have been saved.", "Saved");
  }catch(err){
    console.error(err);
    await wysFout("Could not update", "The changes could not be saved" + (err.code ? " (" + esc(err.code) + ")" : "") + ".");
  }
}

async function verwyderRsvp(id){
  const bestaande = huidigeRekords.find(r => r.id === id);
  if(!bestaande) return;
  const naam = ((bestaande.naam || "") + " " + (bestaande.van || "")).trim();
  const seker = await vraBevestig(
    "Delete this RSVP?",
    "You are about to permanently delete the RSVP for <strong>" + esc(naam) + "</strong>. This cannot be undone.",
    "Delete"
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
    await wysSukses("RSVP deleted", "The RSVP for <strong>" + esc(naam) + "</strong> has been removed from the list.", "Deleted");
  }catch(err){
    console.error(err);
    await wysFout("Could not delete", "The RSVP could not be deleted" + (err.code ? " (" + esc(err.code) + ")" : "") + ".");
  }
}

/* ---------- sign in / out ---------- */
async function afterSignIn(user){
  if(!isAllowedAdmin(user.email)){
    msg("This account (" + (user.email || "") + ") does not have admin access.", false);
    await wysFout("No admin access", "The account <strong>" + esc(user.email || "") + "</strong> is not on the admin list.");
    try{ await fb.signOut(fb.auth); }catch(e){}
    showLogin();
    return;
  }
  clearMsg();
  showPanel(user.email);
}

async function meldAanMetGoogle(){
  if(!fb){ msg("Firebase is not configured.", false); return; }
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
        await wysFout("Google login failed", esc(authFoutTeks(err2)));
        return;
      }
    }
    msg(authFoutTeks(err), false);
    await wysFout("Google login failed", esc(authFoutTeks(err)));
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
      if(!email || !wag){ msg("Please fill in your email and password.", false); return; }
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
      const knoppie = e.target.closest ? e.target.closest("button") : null;
      if(!knoppie) return;
      const wysigId = knoppie.getAttribute("data-wysig");
      const verwyderId = knoppie.getAttribute("data-verwyder");
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
    ? "Log in with your Google account (or the admin email and password) to see the RSVP list."
    : "Demo mode: Firebase is not configured yet. Log in with any email and password to see the local demo responses.";
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
