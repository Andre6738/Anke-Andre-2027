/* ------------------------------------------------------------------
   André & Anke - troue-webwerf logika
   - Aftel-teller
   - RSVP indiening (Firestore-gereed, met demo-terugval)
   - Admin aanmelding en RSVP-lys (Firebase Auth + Firestore, met demo)
   Geen em-strepe. Afrikaans.
------------------------------------------------------------------ */

/* ==================================================================
   ENIGSTE PLEK OM DIE TROUE-BESONDERHEDE TE VERANDER
   ------------------------------------------------------------------
   Die datum (28 Augustus 2028) is korrek en bevestig.
   Die TYD (14:00) is 'n PLEKHOUER en word nog bevestig.
   Verander net WEDDING.tyd hieronder sodra André die regte tyd gee,
   en beide die aftel-teller EN die kalender-gebeurtenis werk reg.
================================================================== */
const WEDDING = {
  datum: "2028-08-28",            // 28 Augustus 2028 (bevestig)
  tyd: "14:00",                   // PLEKHOUER - verander SLEGS hier wanneer bekend
  tydsoneOffset: "+02:00",        // SAST (Suid-Afrika, geen somertyd)
  duurUre: 5,                     // geskatte duur vir die kalender-gebeurtenis
  titel: "André en Anke se troue",
  plek: "La Merveille Function Venue",
  rsvpSperdatum: "31 Mei 2028"
};
// Aftel-teller mik na die presiese oomblik in SAST, ongeag die kyker se tydsone.
const WEDDING_DATE = new Date(`${WEDDING.datum}T${WEDDING.tyd}:00${WEDDING.tydsoneOffset}`).getTime();

function pad(n, len){ n = String(n); while(n.length < len) n = "0" + n; return n; }

/* ============ 1. AFTEL-TELLER ============ */
function tickCountdown(){
  const diff = Math.max(0, WEDDING_DATE - Date.now());
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set("cd-d", pad(Math.floor(diff / 86400000), 3));
  set("cd-h", pad(Math.floor(diff % 86400000 / 3600000), 2));
  set("cd-m", pad(Math.floor(diff % 3600000 / 60000), 2));
  set("cd-s", pad(Math.floor(diff % 60000 / 1000), 2));
}
tickCountdown();
setInterval(tickCountdown, 1000);

/* ============ 1b. VOEG BY KALENDER ============ */
// Bou 'n gebeurtenis wat op iPhone/Apple, Google, Outlook en Android werk.
// Ons gebruik "swewende" (floating) tyd sodat 14:00 op elke toestel as 14:00
// wys, ongeag die kyker se tydsone (die tyd is 'n plekhouer vir 'n plaaslike
// geleentheid). Verander WEDDING.tyd om dit reg te stel.

function calStart(){ // {ymd:"20280828", hms:"140000"}
  const [Y,M,D] = WEDDING.datum.split("-");
  const [h,m] = WEDDING.tyd.split(":");
  return { ymd: `${Y}${M}${D}`, hms: `${pad(h,2)}${pad(m,2)}00`, Y, M, D, h:parseInt(h,10), m:parseInt(m,10) };
}
function calEnd(){
  const s = calStart();
  let endH = s.h + WEDDING.duurUre;
  if(endH > 23) endH = 23;
  return { ymd: s.ymd, hms: `${pad(endH,2)}${pad(s.m,2)}00`, h:endH, m:s.m };
}
const CAL_DESC = "André en Anke gaan trou by " + WEDDING.plek + ". "
  + "RSVP asseblief teen " + WEDDING.rsvpSperdatum + ". "
  + "Let wel: die tyd (" + WEDDING.tyd + ") is 'n plekhouer en word nog bevestig.";

// ICS lyne moet met CRLF geskei word en lang lyne word gevou (RFC 5545).
function icsFold(line){
  const bytes = line;
  if(bytes.length <= 73) return bytes;
  let out = "", rest = bytes;
  out = rest.slice(0, 73);
  rest = rest.slice(73);
  while(rest.length){ out += "\r\n " + rest.slice(0, 72); rest = rest.slice(72); }
  return out;
}
function icsEscape(t){
  return String(t).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
}
function buildICS(){
  const s = calStart(), e = calEnd();
  const stamp = new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+Z$/,"Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Andre en Anke//Troue//AF",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:andre-anke-" + s.ymd + "@wedding.local",
    "DTSTAMP:" + stamp,
    // Swewende tyd (geen Z, geen TZID): wys 14:00 op enige toestel.
    "DTSTART:" + s.ymd + "T" + s.hms,
    "DTEND:" + e.ymd + "T" + e.hms,
    "SUMMARY:" + icsEscape(WEDDING.titel),
    "LOCATION:" + icsEscape(WEDDING.plek),
    "DESCRIPTION:" + icsEscape(CAL_DESC),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
function icsDataUri(){
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(buildICS());
}
function googleUrl(){
  const s = calStart(), e = calEnd();
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: WEDDING.titel,
    dates: `${s.ymd}T${s.hms}/${e.ymd}T${e.hms}`,
    ctz: "Africa/Johannesburg",
    location: WEDDING.plek,
    details: CAL_DESC
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}
function outlookUrl(){
  const s = calStart(), e = calEnd();
  const iso = (d, hms) => `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${hms.slice(0,2)}:${hms.slice(2,4)}:00`;
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: WEDDING.titel,
    startdt: iso(s.ymd, s.hms),
    enddt: iso(e.ymd, e.hms),
    location: WEDDING.plek,
    body: CAL_DESC
  });
  return "https://outlook.office.com/calendar/0/deeplink/compose?" + p.toString();
}

// Stel op vir toetsing / inspeksie
window.WeddingCal = { buildICS, icsDataUri, googleUrl, outlookUrl, WEDDING };

function detectPlatform(){
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const mac = /Macintosh/.test(ua);
  if(iOS) return "ios";
  if(android) return "android";
  if(mac) return "mac";
  return "other";
}

function initCalendar(){
  const wrap = document.getElementById("cal-buttons");
  if(!wrap) return;
  const apple = document.getElementById("cal-apple");
  const google = document.getElementById("cal-google");
  const outlook = document.getElementById("cal-outlook");
  if(apple){ apple.setAttribute("href", icsDataUri()); apple.setAttribute("download", "andre-en-anke.ics"); }
  if(google){ google.setAttribute("href", googleUrl()); }
  if(outlook){ outlook.setAttribute("href", outlookUrl()); }

  // Rangskik die mees relevante opsie eerste en merk dit "Aanbeveel".
  const platform = detectPlatform();
  let order = [apple, google, outlook]; // .ics eerste werk oral (verstek)
  if(platform === "android") order = [google, apple, outlook];
  else if(platform === "ios" || platform === "mac") order = [apple, google, outlook];
  order = order.filter(Boolean);
  order.forEach((btn, i) => {
    wrap.appendChild(btn);
    btn.classList.toggle("primary", i === 0);
    const badge = btn.querySelector(".rec");
    if(badge) badge.style.display = (i === 0) ? "inline" : "none";
  });
}
initCalendar();

/* ============ 2. FIREBASE (opsioneel) ============ */
// Firestore data-struktuur vir 'n RSVP dokument (versameling: "rsvps"):
//   {
//     naam:        string,   // volle naam en van
//     epos:        string,
//     selfoon:     string,
//     bywoon:      "ja" | "nee",
//     aantalGaste: number,
//     dieet:       string,
//     boodskap:    string,
//     geskepOp:    Timestamp (serverTimestamp)
//   }
const cfg = window.FIREBASE_CONFIG || {};
const FIREBASE_READY = !!(cfg.apiKey && cfg.projectId);
const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

let fb = null; // { app, auth, db, fns... }

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
      app,
      auth: authMod.getAuth(app),
      db: fsMod.getFirestore(app),
      signIn: authMod.signInWithEmailAndPassword,
      signOut: authMod.signOut,
      onAuth: authMod.onAuthStateChanged,
      collection: fsMod.collection,
      addDoc: fsMod.addDoc,
      getDocs: fsMod.getDocs,
      query: fsMod.query,
      orderBy: fsMod.orderBy,
      serverTimestamp: fsMod.serverTimestamp
    };
    return fb;
  }catch(err){
    console.warn("Firebase kon nie laai nie, val terug na demo-modus.", err);
    return null;
  }
}

/* ============ 3. DEMO-BERGING (wanneer Firebase nie gekonfigureer is) ============ */
const DEMO_KEY = "andre_anke_rsvps_demo";
function demoLoad(){
  try{ return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); }
  catch(e){ return window.__demoRsvps || []; }
}
function demoSave(list){
  try{ localStorage.setItem(DEMO_KEY, JSON.stringify(list)); }
  catch(e){ window.__demoRsvps = list; }
}
function demoAdd(rec){
  const list = demoLoad();
  list.unshift(rec);
  demoSave(list);
}

/* ============ 4. RSVP VORM ============ */
const rsvpForm = document.getElementById("rsvp-form");
const rsvpMsg = document.getElementById("rsvp-msg");
function showMsg(el, text, ok){
  el.textContent = text;
  el.className = "form-msg " + (ok ? "ok" : "err");
}
if(rsvpForm){
  rsvpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      naam: rsvpForm.naam.value.trim(),
      epos: rsvpForm.epos.value.trim(),
      selfoon: rsvpForm.selfoon.value.trim(),
      bywoon: rsvpForm.bywoon.value,
      aantalGaste: parseInt(rsvpForm.aantalGaste.value, 10) || 1,
      dieet: rsvpForm.dieet.value.trim(),
      boodskap: rsvpForm.boodskap.value.trim()
    };
    if(!data.naam || !data.epos){
      showMsg(rsvpMsg, "Vul asseblief jou naam en e-posadres in.", false);
      return;
    }
    try{
      if(fb){
        await fb.addDoc(fb.collection(fb.db, "rsvps"), {
          ...data, geskepOp: fb.serverTimestamp()
        });
      }else{
        demoAdd({ ...data, geskepOp: new Date().toISOString() });
      }
      const woord = data.bywoon === "ja" ? "Ons sien uit daarna om jou te sien." : "Ons sal jou mis, dankie dat jy laat weet het.";
      showMsg(rsvpMsg, "Dankie, " + data.naam.split(" ")[0] + "! Jou RSVP is ontvang. " + woord, true);
      rsvpForm.reset();
    }catch(err){
      console.error(err);
      showMsg(rsvpMsg, "Iets het verkeerd geloop. Probeer asseblief weer.", false);
    }
  });
}

/* ============ 5. ADMIN ============ */
const modal = document.getElementById("admin-modal");
const openAdmin = document.getElementById("open-admin");
const closeAdmin = document.getElementById("close-admin");
const adminForm = document.getElementById("admin-form");
const adminMsg = document.getElementById("admin-msg");
const adminLoginView = document.getElementById("admin-login");
const adminPanel = document.getElementById("admin-panel");
const configNote = document.getElementById("admin-config-note");

if(configNote){
  configNote.textContent = FIREBASE_READY
    ? "Gekoppel aan Firebase. Meld aan met jou admin e-pos en wagwoord."
    : "Demo-modus: Firebase is nog nie gekonfigureer nie. Meld aan met enige e-pos en wagwoord om die plaaslike demo-antwoorde te sien. Regte aanmelding word aktief sodra Firebase gekoppel is.";
}

function openModal(){ modal.classList.add("open"); }
function closeModal(){ modal.classList.remove("open"); }
if(openAdmin) openAdmin.addEventListener("click", openModal);
if(closeAdmin) closeAdmin.addEventListener("click", closeModal);
if(modal) modal.addEventListener("click", (e) => { if(e.target === modal) closeModal(); });

function isAllowedAdmin(email){
  const list = window.ADMIN_EMAILS || [];
  if(!list.length) return true;
  return list.map(x => x.toLowerCase()).includes((email || "").toLowerCase());
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
      `<td>${esc(r.boodskap || "")}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById("stat-total").textContent = records.length;
  document.getElementById("stat-ja").textContent = ja;
  document.getElementById("stat-nee").textContent = nee;
  document.getElementById("stat-gaste").textContent = gaste;
}
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c])); }

async function loadRsvps(){
  if(fb){
    const q = fb.query(fb.collection(fb.db, "rsvps"), fb.orderBy("geskepOp", "desc"));
    const snap = await fb.getDocs(q);
    return snap.docs.map(d => d.data());
  }
  return demoLoad();
}

function showPanel(email){
  adminLoginView.style.display = "none";
  adminPanel.style.display = "block";
  document.getElementById("admin-user").textContent =
    (fb ? "Aangemeld as " : "Demo-modus - ") + (email || "");
  loadRsvps().then(renderRows).catch(err => {
    console.error(err);
  });
}
function showLogin(){
  adminPanel.style.display = "none";
  adminLoginView.style.display = "block";
}

if(adminForm){
  adminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("a-epos").value.trim();
    const wag = document.getElementById("a-wag").value;
    if(!email || !wag){
      showMsg(adminMsg, "Vul asseblief e-pos en wagwoord in.", false);
      return;
    }
    if(fb){
      try{
        const cred = await fb.signIn(fb.auth, email, wag);
        if(!isAllowedAdmin(cred.user.email)){
          showMsg(adminMsg, "Hierdie rekening het nie admin-toegang nie.", false);
          await fb.signOut(fb.auth);
          return;
        }
        adminMsg.className = "form-msg";
        showPanel(cred.user.email);
      }catch(err){
        showMsg(adminMsg, "Aanmelding het misluk. Kontroleer jou besonderhede.", false);
      }
    }else{
      // Demo: aanvaar enige besonderhede en wys plaaslike antwoorde
      adminMsg.className = "form-msg";
      showPanel(email);
    }
  });
}

const adminSignout = document.getElementById("admin-signout");
if(adminSignout){
  adminSignout.addEventListener("click", async () => {
    if(fb){ try{ await fb.signOut(fb.auth); }catch(e){} }
    showLogin();
  });
}

/* Init Firebase (indien gekonfigureer) en hou aanmeldstatus dop */
initFirebase().then(inst => {
  if(inst && inst.auth){
    inst.onAuth(inst.auth, user => {
      if(user && isAllowedAdmin(user.email)){ showPanel(user.email); }
      else { showLogin(); }
    });
  }
});
