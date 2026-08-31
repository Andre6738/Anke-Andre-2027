/* ------------------------------------------------------------------
   FIREBASE KONFIGURASIE
   ------------------------------------------------------------------
   Hierdie is die PUBLIEKE Firebase web-app konfigurasie. Dit is nie 'n
   geheim nie en is veilig om te commit (dit word in elk geval na die
   blaaier gestuur). Die ENIGSTE geheim is die diensrekening-JSON, wat
   NOOIT in die repo mag wees nie (sien FIREBASE_SERVICE_ACCOUNT in die
   GitHub secrets en firestore.rules vir sekuriteit).

   Noudat apiKey ingevul is, loop die webwerf in LIVE-modus:
   - RSVP's word na Firestore geskryf (versameling "rsvps").
   - Admin meld aan met Firebase Auth en lees die "rsvps".

   Firebase moet nog geaktiveer word deur André:
   - Aktiveer Firestore Database.
   - Aktiveer Authentication (Email/Password) en skep die admin-gebruiker.
------------------------------------------------------------------ */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDYzx6sMrpJa26p_TcBHRmzjv1NQAJnKOw",
  authDomain: "anke-andre-4ddcd.firebaseapp.com",
  projectId: "anke-andre-4ddcd",
  storageBucket: "anke-andre-4ddcd.firebasestorage.app",
  messagingSenderId: "47882548963",
  appId: "1:47882548963:web:ed675190489206251fb7d6",
  measurementId: "G-G78M3BLN44"
};

/* Beperk admin-toegang tot spesifieke e-posadresse.
   Verstek: André se e-pos. Voeg meer by indien nodig.
   LET WEL: André moet hierdie admin-e-pos bevestig EN daardie gebruiker
   in Firebase Authentication (Email/Password) skep, anders sal admin-
   aanmelding nie werk nie. */
window.ADMIN_EMAILS = [
  "andrec06112001@gmail.com"
];
