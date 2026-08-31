/* ------------------------------------------------------------------
   André & Anke - ADMIN bladsy logika (aparte bladsy: /admin)
   - Meld aan met Google (of e-pos/wagwoord)
   - Wys die RSVP-lys en 'n opsomming uit Firestore
   Slegs e-posse in window.ADMIN_EMAILS kry toegang.
   Geen em-strepe. Afrikaans.
------------------------------------------------------------------ */

const cfg = window.FIREBASE_CONFIG || {};
const FIREBASE_READY = !!(cfg.apiKey && cfg.projectId);
const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
const DEMO_KEY = "andre_anke_rsvps_demo";

let fb = null;

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
      signInEmail: authMod.signInWithEmailAndPassword,
      signOut: authMod.signOut,
      onAuth: authMod.onAuthStateChanged,
      collection: fsMod.collection,
      getDocs: fsMod.getDocs,
      query: fsMod.query,
      orderBy: fsMod.orderBy
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
  loadRsvps().then(renderRows).catch(err => {
    console.error(err);
    document.getElementById("admin-user").textContent =
      "Kon nie die lys laai nie. Is Firestore geaktiveer?";
  });
}

async function loadRsvps(){
  if(fb){
    const q = fb.query(fb.collection(fb.db, "rsvps"), fb.orderBy("geskepOp", "desc"));
    const snap = await fb.getDocs(q);
    return snap.docs.map(d => d.data());
  }
  return demoLoad();
}

function renderRows(records){
  const tbody = document.getElementById("rsvp-rows");
  tbody.innerHTML = "";
  let ja = 0, nee = 0, gaste = 0;
  records.forEach(r => {
    if(r.bywoon === "ja"){ ja++; gaste += (r.aantalGaste || 0); } else { nee++; }
    const tr = document.createElement("tr");
    const by = r.bywoon === "ja" ? "Ja" : "Nee";
    tr.innerHTML =
      `<td>${esc(r.naam)}</td>`+
      `<td>${esc(r.epos)}</td>`+
      `<td>${by}</td>`+
      `<td>${r.aantalGaste != null ? r.aantalGaste : ""}</td>`+
      `<td>${esc(r.dieet || "")}</td>`+
      `<td>${esc(r.liedjie || "")}</td>`+
      `<td>${esc(r.boodskap || "")}</td>`;
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
  document.getElementById("stat-gaste").textContent = gaste;
}

/* ---------- sign in / out ---------- */
async function afterSignIn(user){
  if(!isAllowedAdmin(user.email)){
    msg("Hierdie rekening (" + (user.email || "") + ") het nie admin-toegang nie.", false);
    try{ await fb.signOut(fb.auth); }catch(e){}
    return;
  }
  clearMsg();
  showPanel(user.email);
}

function wireEvents(){
  const googleBtn = document.getElementById("google-signin");
  const emailForm = document.getElementById("admin-form");
  const signout = document.getElementById("admin-signout");

  if(googleBtn){
    googleBtn.addEventListener("click", async () => {
      if(!fb){ msg("Firebase is nie gekonfigureer nie.", false); return; }
      try{
        clearMsg();
        const provider = new fb.GoogleProvider();
        const cred = await fb.signInWithPopup(fb.auth, provider);
        await afterSignIn(cred.user);
      }catch(err){
        console.error(err);
        msg("Google-aanmelding het misluk of is gekanselleer.", false);
      }
    });
  }

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
          msg("Aanmelding het misluk. Kontroleer jou besonderhede.", false);
        }
      }else{
        // Demo (Firebase nie gekonfigureer): wys plaaslike demo-antwoorde
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
}

/* ---------- boot ---------- */
wireEvents();
const note = document.getElementById("admin-config-note");
if(note){
  note.textContent = FIREBASE_READY
    ? "Meld aan met jou Google-rekening (of admin e-pos en wagwoord) om die RSVP-lys te sien."
    : "Demo-modus: Firebase is nog nie gekonfigureer nie. Meld aan met enige e-pos en wagwoord om die plaaslike demo-antwoorde te sien.";
}
initFirebase().then(inst => {
  if(inst && inst.auth){
    inst.onAuth(inst.auth, user => {
      if(user && isAllowedAdmin(user.email)){ showPanel(user.email); }
      else { showLogin(); }
    });
  }else{
    showLogin();
  }
});
