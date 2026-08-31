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
  const android = document.getElementById("cal-android");
  const google = document.getElementById("cal-google");
  const outlook = document.getElementById("cal-outlook");
  // Apple en Android laai albei die .ics af (Android open die kalender-kieser).
  if(apple){ apple.setAttribute("href", icsDataUri()); apple.setAttribute("download", "andre-en-anke.ics"); }
  if(android){ android.setAttribute("href", icsDataUri()); android.setAttribute("download", "andre-en-anke.ics"); }
  if(google){ google.setAttribute("href", googleUrl()); }
  if(outlook){ outlook.setAttribute("href", outlookUrl()); }
  // Alle knoppies is dieselfde wit styl, geen aanbeveling nie.
}
initCalendar();

/* ============ 2. FIREBASE (opsioneel) ============ */
// Firestore data-struktuur vir 'n RSVP dokument (versameling: "rsvps"):
//   {
//     naam:     string,
//     van:      string,
//     selfoon:  string,
//     bywoon:   "ja" | "nee",
//     gaste:    [ { naam: string, van: string } ],   // bykomende gaste
//     liedjies: [ string ],                          // liedjie-versoeke
//     geskepOp: Timestamp (serverTimestamp)
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
  // Bywoon: twee keuse-knoppies
  const bywoonInput = document.getElementById("f-bywoon");
  document.querySelectorAll("#attend-btns .attend-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#attend-btns .attend-btn").forEach(b => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      if(bywoonInput) bywoonInput.value = btn.dataset.val;
    });
  });

  // Gaste byvoeg / verwyder (elk met naam en van)
  const guestList = document.getElementById("guest-list");
  function addGuestRow(){
    const row = document.createElement("div");
    row.className = "dyn-row";
    row.innerHTML =
      '<input type="text" class="g-naam" placeholder="Naam">' +
      '<input type="text" class="g-van" placeholder="Van">' +
      '<button type="button" class="rm-btn" aria-label="Verwyder gas">&times;</button>';
    row.querySelector(".rm-btn").addEventListener("click", () => row.remove());
    guestList.appendChild(row);
  }
  const addGuestBtn = document.getElementById("add-guest");
  if(addGuestBtn) addGuestBtn.addEventListener("click", addGuestRow);

  // Liedjies byvoeg / verwyder (meer as een)
  const songList = document.getElementById("song-list");
  function addSongRow(){
    const row = document.createElement("div");
    row.className = "dyn-row";
    row.innerHTML =
      '<input type="text" class="s-naam" placeholder="Liedjie">' +
      '<input type="text" class="s-art" placeholder="Kunstenaar (opsioneel)">' +
      '<button type="button" class="rm-btn" aria-label="Verwyder liedjie">&times;</button>';
    row.querySelector(".rm-btn").addEventListener("click", () => row.remove());
    songList.appendChild(row);
  }
  const addSongBtn = document.getElementById("add-song");
  if(addSongBtn) addSongBtn.addEventListener("click", addSongRow);

  function collectGuests(){
    return [...guestList.querySelectorAll(".dyn-row")].map(r => ({
      naam: r.querySelector(".g-naam").value.trim(),
      van: r.querySelector(".g-van").value.trim()
    })).filter(g => g.naam || g.van);
  }
  function collectSongs(){
    return [...songList.querySelectorAll(".dyn-row")].map(r => {
      const naam = r.querySelector(".s-naam").value.trim();
      const art = r.querySelector(".s-art").value.trim();
      if(!naam) return "";
      return art ? (naam + " - " + art) : naam;
    }).filter(Boolean);
  }

  rsvpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      naam: rsvpForm.naam.value.trim(),
      van: rsvpForm.van.value.trim(),
      selfoon: rsvpForm.selfoon.value.trim(),
      bywoon: (bywoonInput && bywoonInput.value) || "ja",
      gaste: collectGuests(),
      liedjies: collectSongs()
    };
    if(!data.naam || !data.van || !data.selfoon){
      showMsg(rsvpMsg, "Vul asseblief jou naam, van en selfoonnommer in.", false);
      return;
    }
    try{
      if(fb){
        await fb.addDoc(fb.collection(fb.db, "rsvps"), { ...data, geskepOp: fb.serverTimestamp() });
      }else{
        demoAdd({ ...data, geskepOp: new Date().toISOString() });
      }
      const woord = data.bywoon === "ja" ? "Ons sien uit daarna om jou te sien." : "Ons sal jou mis, dankie dat jy laat weet het.";
      showMsg(rsvpMsg, "Dankie, " + data.naam + "! Jou RSVP is ontvang. " + woord, true);
      rsvpForm.reset();
      guestList.innerHTML = "";
      songList.innerHTML = "";
      document.querySelectorAll("#attend-btns .attend-btn").forEach(b => b.classList.toggle("is-on", b.dataset.val === "ja"));
      if(bywoonInput) bywoonInput.value = "ja";
    }catch(err){
      console.error(err);
      showMsg(rsvpMsg, "Iets het verkeerd geloop. Probeer asseblief weer.", false);
    }
  });
}

/* Admin-aanmelding is op 'n aparte bladsy (/admin), nie op hierdie gaste-bladsy nie.
   Hier inisialiseer ons net Firebase sodat RSVP's na Firestore geskryf kan word. */
initFirebase();
