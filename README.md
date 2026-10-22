# SAK 013 – Blodløpet

En norsk, mobiltilpasset Halloween-finale for 7. trinn. Fire spor åpner en gradert saksmappe om deltakeren som forsvant fra Broløpet i 2001. Laget for iPad i liggende format, men fungerer også på telefon og datamaskin.

**Hele opplevelsen er statisk og lokal.** Ingen backend, innlogging, analyseverktøy, eksterne skrifter, API-er eller CDN-er. Illustrasjonene er inkluderte SVG-filer. Lydene genereres på enheten med Web Audio, så ingen lydfiler eller nettverk trengs. Det er ingen tilfeldig historie eller innhold som avhenger av datoen.

## Start lokalt

Krever Node.js 20.11 eller nyere:

```sh
npm run dev
```

Åpne **http://127.0.0.1:4173/halloween/**. Utviklingsserveren trenger ingen npm-pakker. Ikke dobbeltklikk `index.html`: service worker og JavaScript-moduler krever en webserver. Service worker fungerer på HTTPS eller localhost. iPad må bruke den publiserte HTTPS-adressen; en vanlig HTTP-adresse på lokalnettet er ikke tilstrekkelig.

## Publiser på GitHub Pages

1. Velg **Settings → Pages → Build and deployment → Source: GitHub Actions** i `tofu-pup/halloween`.
2. Slå sammen endringene til `main`. Arbeidsflyten `.github/workflows/deploy-pages.yml` publiserer automatisk. Den kan også startes manuelt fra Actions.
3. Åpne **https://tofu-pup.github.io/halloween/** når publiseringen er ferdig.

Alle stier er relative til appmappen, inkludert ikoner, manifest, startadresse, service worker og hurtigbuffer. Ingen stier peker til domeneroten. Bare appfilene og `assets` publiseres; tester, npm-pakker og dokumentasjon følger ikke med.

## Bytt spørsmål, svar og fortelling

Alt spillinnhold ligger i **`case.config.js`**. De fire spørsmålene og historien er **plassholdere**, og må tilpasses de faktiske postene før arrangementet.

| Spor | Plassholderspørsmål | Eksempler på godkjente svar |
| --- | --- | --- |
| 01 | Hvilket startnummer hadde deltakeren? | `13`, `013`, `tretten`, `nummer 13` |
| 02 | Hvor ble deltakeren sist sett? | `broen`, `brua`, `broa`, `på broen`, `på brua` |
| 03 | Hva lå igjen ved siste post? | `nøkkel`, `en nøkkel`, `nøkkelen` |
| 04 | Hvilket ord var risset inn i treet? | `vent`, `vente` |

Hvert spor har `title`, `question`, `answers`, `maxTypos` og `success`. Store/små bokstaver, ekstra mellomrom, tegnsetting og norske tegnvarianter som `ø/o`, `æ/ae` og `å/a` normaliseres. `maxTypos: 1` tillater én innsetting, sletting eller erstatning. Tall og svaralternativer kortere enn fire tegn må stemme nøyaktig etter normalisering. Legg inn eksplisitte alternativer for andre ordformer; bruk `maxTypos: 0` ved korte eller presise koder.

Behold nøyaktig fire spor. Rediger `revelation.title` og `revelation.paragraphs` for sluttrapporten. Tekst settes som tekst, ikke HTML. `decryption` styrer de faste meldingene i dekrypteringen. Alle tider er i millisekunder. `characterDelay`, `paragraphPause`, `finalHold` og `warningDuration` styrer lesetempo og siste pause. Ved redusert bevegelse vises hele avsnitt uten skriveanimasjon, med tilsvarende lesetid.

**Ved innholdsendring:** Endre `revision` i `case.config.js` for å forkaste gammel gruppefremdrift, og øk `CACHE` i `sw.js` (for eksempel `sak013-v2`). Øk cacheversjonen ved enhver endring i publiserte filer. Legg også nye appfiler til i `ASSETS` i `sw.js`; ellers kan de mangle uten nett.

Dette er et spill, ikke et sikkerhetssystem. Svarene finnes i den nedlastede kildekoden. «Gradert» og voksenkontrollen er del av presentasjonen, ikke autentisering. Bildet av broen er en egen arkiv-inspirert illustrasjon, ikke et historisk foto.

## Gjennomføring og koordinering av skremmeøyeblikket

1. Før første gruppe: åpne appen på riktig iPad og aktiver eventuelt lyd med **LYD AV**-knappen. På iOS krever lyd et bevisst trykk. Lyd starter aldri automatisk og slås av ved ny sideinnlasting.
2. Trykk **Tilsyn** nederst, eller hold saksnummeret **013** øverst til venstre inne i omtrent to sekunder. Avtal timingen med den utkledde voksne.
3. For presis timing, velg **Styr siste beskjed manuelt** før gruppen starter. Rapporten blir stående til den ansvarlige åpner Tilsyn og trykker **Vis siste beskjed**. Dette valget beholdes mellom grupper.
4. Gruppen åpner saksmappen og bekrefter de fire svarene. Først etter alle fire riktige vises **ÅPNE SLUTTRAPPORTEN**. Det separate trykket gir den voksne tid til å gjøre seg klar.
5. Standardforløpet har ca. 15,5 sekunder dekryptering, deretter en rapport som skrives frem. Etter siste avsnitt følger en lesepause og en varseltekst før **SE BAK DERE.** fyller skjermen. Den faktiske varigheten avhenger av tekstlengden; avtal aldri skremmen utelukkende etter en stoppeklokke.

Tilsynsdialogen **setter tidsforløpet på pause** mens den er åpen. **Hopp over animasjonen** går fra dekryptering til rapport, eller viser hele rapporten umiddelbart hvis rapporten allerede er åpen. Knappen hopper aldri direkte til skremmebeskjeden; bruk **Vis siste beskjed** for det.

Ved bytte til en annen app/fane stopper tidsforløpet og lyd dempes. Når siden blir synlig igjen, fortsetter den fra samme punkt. En oppdatering midt i dekryptering eller rapport starter den aktuelle sekvensen fra begynnelsen, slik at ingen avsløring mistes. Bekreftede svar og usendte notater bevares. Er siste beskjed allerede vist, vises den igjen etter oppdatering.

Skru ned iPad-volumet til et behagelig nivå før dere aktiverer lyd. Lyden kan slås av når som helst. Ingen raske strobelys brukes; reduserte bevegelsesinnstillinger respekteres. Tilpass skremmen til elevgruppen og la elever kunne stå over.

## Nullstilling mellom grupper

**Tilsyn → Nullstill saken → Ja, nullstill alt.** Langtrykk på **013** gir samme kontrollpanel. Nullstilling krever alltid bekreftelse og fungerer uten nett.

Dette fjerner alle svar, usendte notater, bekreftelser, pågående sekvenser og sluttbildet. Lyd slås av, og velkomstskjermen vises. Frakoblet cache beholdes. Bare den voksnes valg om manuell siste beskjed beholdes. Nullstill før neste gruppe får iPaden. Ha bare **én appfane / ett appvindu** åpent per iPad.

Hvis lokal lagring er blokkert eller full, vises en tydelig advarsel. Spillet fungerer fortsatt, men fremdrift kan da ikke gjenopprettes etter oppdatering.

## Installer på iPad og test uten nett

1. Åpne den publiserte HTTPS-adressen i Safari mens enheten har nett.
2. Vent til det står **KLAR UTEN NETT** nederst. Denne meldingen vises først når service worker har bekreftet at **alle** nødvendige appfiler finnes i hurtigbufferen.
3. Velg **Del → Legg til på Hjem-skjerm**. Start fra Hjem-skjermen og vent på samme bekreftelse også der. Safari og Hjem-skjerm-appen kan ha separate lagringsområder.
4. Slå på flymodus og slå av Wi-Fi. Lukk og åpne appen, spill gjennom alle fire svar, slå på lyd, vis siste beskjed, og nullstill.
5. Spill en ny runde i flymodus. Prøv også å oppdatere etter to riktige svar og kontroller at svarene bevares.
6. Gjenta på **hver iPad** før arrangementet. En annen enhet eller nettleser er ikke automatisk klargjort.

Safari kan fjerne nettsteddata ved plassmangel eller etter lengre tids inaktivitet. Privat nettlesing er ikke egnet for arrangementet. Klargjør derfor på nytt og test i flymodus samme dag. Ikke slett nettleserdata eller avinstaller appen før arrangementet er ferdig.

### Oppdateringer

Nye versjoner installeres i bakgrunnen når det er nett. En ny service worker erstatter ikke en aktiv gruppe. Når Tilsyn melder at en oppdatering venter, avslutt gruppen, lukk **alle** faner og Hjem-skjerm-vinduer for appen, og åpne på nytt med nett. Vent på **KLAR UTEN NETT**, og test flymodus igjen. En ufullstendig nedlasting aktiveres ikke.

Appen bruker cache-first for en stabil opplevelse. En vanlig oppdatering av siden tvinger derfor ikke gjennom nytt innhold. Ved feilsøking på utviklermaskin kan service worker avregistreres og appens `sak013-*`-cache slettes i nettleserens utviklerverktøy. Ikke gjør dette på en iPad som må fungere uten nett.

## Automatiske kontroller

Spillet krever ingen bygging eller npm-avhengigheter. Playwright brukes bare til utviklingskontroller:

```sh
npm install
npx playwright install chromium
npm run check
npm test
```

Testene kjører mot samme `/halloween/`-sti som Pages. De dekker lokal hurtigbuffer, frakoblet gjennomspilling og replay, svarnormalisering, feil svar, oppdatering, nullstilling, voksenstyrt finale, lyd, redusert bevegelse, lagringsfeil og mobil-/iPad-bredder. Testserveren starter automatisk. For å regenerere de inkluderte PNG-ikonene: `npm run generate:icons`.
