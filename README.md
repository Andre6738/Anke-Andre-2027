# André & Anke - troue-webwerf

Een-bladsy troue-webwerf. Ontwerp is 'n kombinasie van Konsep A (elegant, redaksioneel) en Konsep C (warm, romanties): klassieke Cormorant serif en 'n simmetriese, lugtige uitleg, verwarm met Pinyon Script kalligrafie vir die name en sagte eucalyptus- en wit-roos waterverf-aksente. Skerp hoeke deurgaans, eucalyptus + wit rose, Augustus-gevoel, Afrikaans deurgaans. Geen em-strepe.

## Struktuur

```
wedding-site-final/
  public/                 <- word deur Firebase Hosting bedien
    index.html            <- die een-bladsy webwerf
    css/styles.css
    js/config.js          <- Firebase konfig (PLEKHOUER - vul in)
    js/app.js             <- aftel-teller, RSVP, admin
    assets/img/           <- PNG blomme (geen SVG)
  firebase.json
  .firebaserc             <- projek-ID hard gekodeer (anke-andre-4ddcd)
  firestore.rules
  firestore.indexes.json
  .github/workflows/firebase-deploy.yml
  .gitignore
```

## Kenmerke

- Lewende aftel-teller na 28 Augustus 2027 (14:00 is 'n plekhouer-tyd).
- "Voeg by jou kalender" afdeling: .ics aflaai (iPhone/Apple, Outlook desktop), Google Kalender skakel, en Outlook web skakel. Dit bespeur die toestel en wys die mees relevante opsie eerste (Apple op iOS, Google op Android) en werk op iPhone.
- Datum en tyd word op EEN plek gestel: die `WEDDING` konstante boaan `public/js/app.js`. Verander net `WEDDING.tyd` sodra die regte tyd bekend is, en beide die teller en die kalender-gebeurtenis werk reg.
- "Ons vier oomblikke" tydlyn (vier momente, plekhouer-teks).
- RSVP-vorm met Afrikaanse velde, gekoppel aan 'n skoon datastruktuur wat gereed is vir Firestore.
- Admin-aanmelding (modaal) wat die RSVP-lys en 'n opsomming wys.
- Foto-plekhouers.

## Firebase (reeds gekonfigureer)

Die publieke web-konfig is ingevul in `public/js/config.js`, so die webwerf is op LIVE-modus gestel:
- RSVP's word na die Firestore `rsvps` versameling geskryf.
- Admin meld aan met Firebase Auth en lees die `rsvps`.

Projek-besonderhede:
- Firebase projek-ID: `anke-andre-4ddcd`
- Hosting site: `anke-andre-2027` (gestel in `firebase.json` as `hosting.site`)
- Admin allowlist (`ADMIN_EMAILS`): `andrec06112001@gmail.com`

Analytics: `measurementId` (`G-G78M3BLN44`) is in die konfig, so Analytics kan opsioneel geinisialiseer word. Dit is nie tans aktief in die kode nie.

### André moet nog die volgende doen voordat live werk

1. Aktiveer Firestore Database in die Firebase Console.
2. Aktiveer Authentication (Email/Password) en skep die admin-gebruiker
   (die e-pos in `ADMIN_EMAILS`). Bevestig dat daardie admin-e-pos reg is.
3. Voeg die GitHub secret en variable by (sien Ontplooiing hieronder).

As Firestore/Auth nog nie aktief is nie, val die webwerf terug na demo-gedrag
in die blaaier (RSVP's word plaaslik gestoor) sodat niks breek nie.

### Firestore datastruktuur

Versameling `rsvps`, een dokument per antwoord:

```
naam:        string
epos:        string
selfoon:     string
bywoon:      "ja" | "nee"
aantalGaste: number
dieet:       string
boodskap:    string
geskepOp:    Timestamp (serverTimestamp)
```

Sekuriteitsreels (`firestore.rules`): enigeen mag 'n RSVP skep (die publieke vorm), maar slegs aangemelde gebruikers mag die lys lees. Opdateer en verwyder is af.

## Ontplooiing (GitHub CI, moet nog opgestel word)

`.github/workflows/firebase-deploy.yml` ontplooi na Firebase Hosting wanneer daar na `main` gepush word.

Die projek-ID (`anke-andre-4ddcd`) is HARD GEKODEER in `.firebaserc`, `firebase.json`
(via die hosting site) en in die deploy-werksvloei. Daar is dus GEEN CI-variable nodig nie.

Die ENIGSTE ding wat André in GitHub moet byvoeg is EEN secret:
- Secret `FIREBASE_SERVICE_ACCOUNT` (Settings > Secrets and variables > Actions > New repository secret):
  die volledige diensrekening-JSON (Firebase Console > Project settings > Service accounts > Generate new private key).
  DIT IS DIE ENIGSTE GEHEIM en mag NOOIT in die repo wees nie.

Die CI-werksvloei loop op elke push na `main`, maar dit sal MISLUK totdat die
`FIREBASE_SERVICE_ACCOUNT` secret bygevoeg is en Firebase (Firestore + Auth)
geaktiveer is. Dit is verwag.

Geen regte geheime is in hierdie repo nie. Die web-konfig in `config.js` is
publiek en veilig om te commit.

## Plaaslik hardloop

Enige statiese bediener werk, bv:

```
cd public
python -m http.server 8000
# open http://localhost:8000
```

Of installeer die Firebase CLI en gebruik `firebase emulators:start` sodra die projek gekoppel is.

## Oop items (benodig van André)

- Presiese tyd van die seremonie/onthaal (tans "Word bevestig"; die teller gebruik 14:00 as plekhouer).
- Regte foto's vir die foto-afdeling.
- Firebase: aktiveer Firestore en Authentication, skep die admin-gebruiker, bevestig die admin-e-pos, en voeg NET die `FIREBASE_SERVICE_ACCOUNT` secret in GitHub by. (Web-konfig en projek-ID is reeds ingevul; projek-ID is hard gekodeer, geen CI-variable nodig nie.)
- Bevestig die RSVP-sperdatum (31 Mei 2027, drie maande voor die troue, sodat daar tyd is om vervangers te nooi as gaste bedank).

## Opdaterings (admin, Google, kaart, geskenke, liedjie)

- Admin-aanmelding is nou op 'n APARTE bladsy: `/admin` (public/admin/index.html).
  Dit is nie op die gaste-bladsy nie. Meld aan met Google of met e-pos/wagwoord.
- Slegs e-posse in `ADMIN_EMAILS` (config.js) kry toegang. Firestore-reels laat
  ook net daardie e-pos toe om die `rsvps` te lees.
- RSVP-vorm het nou 'n "Liedjie-voorstel" veld (`liedjie`); dit wys in die admin-lys.
- "Plek" afdeling met 'n ingebedde Google Maps kaart en 'n "Maak oop in Google Maps"
  knoppie. Die kaart soek tans op die naam "La Merveille Function Venue".
- "Geskenke" afdeling: teenwoordigheid is die grootste geskenk, met bankbesonderhede
  vir wie wil bydra.

### André moet nog

1. Firebase Authentication: aktiveer die GOOGLE sign-in provider (Authentication >
   Sign-in method), bo-op Email/Password. Skep die admin-gebruiker vir die e-pos in
   ADMIN_EMAILS.
2. Authentication > Settings > Authorized domains: voeg `anke-andre-2027.web.app`
   by sodat Google-aanmelding op die live webwerf werk.
3. Vervang die plekhouer-bankbesonderhede in `public/index.html` (afdeling "Geskenke")
   met die regte rekeningbesonderhede.
4. Opsioneel: as die kaart nie die presiese plek wys nie, vervang die soek-navraag in
   die `<iframe>` en die "Maak oop in Google Maps" skakel met die venue se presiese
   adres of koordinate.
