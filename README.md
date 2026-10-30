# BLODLØPET – SAK 013

En norsk, mobiltilpasset Halloween-finale for 7. trinn. Fire spor åpner en gradert saksmappe om deltakeren som forsvant fra Broløpet i 2001. Laget for iPad i liggende format, men fungerer også på telefon og datamaskin.

## Historien (kun for arrangører – inneholder løsningen)

31. oktober 2001 startet 34 elever i Broløpet. Bare 33 kom i mål. Løpet ble stanset frem til 2024. Etter gjenåpningen ble det meldt om uforklarlige skritt, en enslig løper og banking fra et forlatt hus. Da huset ble revet i oktober 2026, meldte arbeidere om urovekkende hendelser. Etterforskningen ble gjenåpnet.

Den savnede var Ole Vik, startnummer 13. Vendingen på slutten er at han ble angrepet av en svane og ble Ole Magnus Svanevik, elevenes lærer. Sluttskjermen viser dette som **Ole Vik + 🦢 = OLE MAGNUS SVANEVIK**, uten ytterligere forklaring. Elevene undersøker fire poster langs den vanlige Broløpet-løypa før de bruker appen ved mål.

**Hele opplevelsen er statisk og lokal.** Ingen backend, innlogging, analyseverktøy, eksterne skrifter, API-er eller CDN-er. Alle bilder og illustrasjoner ligger lokalt i `assets`. Lydene genereres på enheten med Web Audio, så ingen lydfiler eller nettverk trengs. Det er ingen tilfeldig historie eller innhold som avhenger av datoen.

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

Svar, spørsmål og innholdet i den hemmelige saksfilen ligger i **`case.config.js`**. Disse er oppdatert til de fire endelige postene:

| Post | Spørsmål | Godkjente svar |
| --- | --- | --- |
| 01 | Hva het deltakeren som forsvant under Broløpet i 2001? | `Ole Vik` |
| 02 | Hva var klokka da gutten banket på døren? | `18.42`, `18:42`, `1842` |
| 03 | Hvilken øy ble deltakeren sist observert på? | `Føynland`, `Foynland` |
| 04 | Hva forsøker den hemmelige beskjeden å advare dere mot? | `IKKE SNU DEG` |

Store/små bokstaver og innledende/avsluttende mellomrom ignoreres. Navn, øynavn og advarsel normaliserer ekstra mellomrom og tegnsetting mellom ordene. Post 2 bruker `format: "time"` og godtar bare de tre eksplisitte klokkeslettvariantene. Alle fire poster har `maxTypos: 0`, så feil navn, klokkeslett og advarsler slipper ikke gjennom. Feil svar får bare en generell arkivmelding, aldri fasiten. Bekreftede svar maskeres, slik at appen ikke viser løsninger mens andre poster fortsatt er uløst.

Behold nøyaktig fire spor. `revelation.fields` inneholder personopplysningene, `connection` de tre nye opplysningene og `identity` den endelige identiteten. Ingen av disse settes inn i dokumentet før alle fire svar er godkjent. `decryption` styrer de faste meldingene i dekrypteringen. Alle tider er i millisekunder. `characterDelay`, `paragraphPause`, `finalHold` og `warningDuration` styrer lesetempo og siste pause. `identityDelay` er pausen fra «SE BAK DERE» til identiteten begynner å skrives inn. Ved redusert bevegelse vises hver opplysning uten skriveanimasjon, med lesetid.

**Ved endringer som gjør lagrede svar ugyldige:** Endre `revision` i `case.config.js` for å forkaste gammel gruppefremdrift, og øk `CACHE` i `sw.js` (neste versjon: `sak013-v10`). Historieoppdateringen forkaster automatisk plassholderversjonens fremdrift. Rene stil-, lyd- og skrivefeilrettinger beholder fremdriften. Øk cacheversjonen ved enhver endring i publiserte filer. Legg også nye appfiler til i `ASSETS` i `sw.js`; ellers kan de mangle uten nett.

Dette er et spill, ikke et sikkerhetssystem. Grensesnittet viser ingen løsninger før de er verifisert, men et fullstendig statisk, frakoblet spill kan ikke skjule løsninger fra noen som undersøker kildekoden, nettleserens lagring eller denne offentlige README-en. «Gradert» og voksenkontrollen er del av presentasjonen, ikke autentisering. Det leverte bildet av broen ligger i `assets/bridge.png` og lagres for frakoblet bruk. Det er en arkiv-inspirert illustrasjon, ikke et historisk foto eller dokumentasjon på siste observasjonssted. Den leverte politilogoen ligger lokalt i `assets/police-logo.png`, brukes i toppfelt og saksfil og lagres for frakoblet bruk.

## Gjennomføring og koordinering av skremmeøyeblikket

1. Før første gruppe: åpne appen på riktig iPad og still inn et behagelig medievolum. **Lyd er på som standard**, uten av/på-knapp. Safari tillater ikke lyd før første brukerhandling; trykket på **ÅPNE SAKSMAPPEN** starter en mørk, lavmælt effekt. Deretter kommer korte, lagdelte droner ved svar og avsløring – ingen kontinuerlig bakgrunnsmusikk. Etter oppdatering starter lydmotoren igjen ved neste trykk.
2. Trykk **Tilsyn** nederst, eller hold saksnummeret **013** øverst til venstre inne i omtrent to sekunder. Avtal timingen med den utkledde voksne.
3. For presis timing, velg **Styr siste beskjed manuelt** før gruppen starter. Rapporten blir stående til den ansvarlige åpner Tilsyn og trykker **Vis siste beskjed**. Dette valget beholdes mellom grupper.
4. Gruppen åpner saksmappen og bekrefter de fire svarene. Etter alle fire riktige skjules spørsmålene, og en egen skjerm viser **Saksmappen er klar.** med en stor **ÅPNE SAKSMAPPEN**-knapp og en tydelig oppfordring til å trykke. Ingen avsløring starter før dette separate trykket, som gir den voksne tid til å gjøre seg klar. Oppdatering bevarer denne klare-til-åpning-skjermen; nullstilling viser spørsmålene igjen.
5. Etter **ALLE FIRE SPOR BEKREFTET / SAK 013 – TILGANG GODKJENT** følger ca. 15,5 sekunder dekryptering. Deretter åpnes **KONFIDENSIELT – SAK 013 / SAVNET PERSON** med navn, startnummer, dato og status. **NYE OPPLYSNINGER – 2026 / OLE VIK / NY IDENTITET FUNNET** skrives frem. Etter lesepausen fyller **SE BAK DERE** skjermen – dette er signalet til læreren. Etter 2,5 sekunder begynner **Ole Vik + 🦢 = OLE MAGNUS SVANEVIK** å skrives inn under beskjeden. Svaneemojien er et systemtegn som også fungerer uten nett. Begge blir stående til nullstilling. Avtal aldri skremmen utelukkende etter en stoppeklokke.

Tilsynsdialogen **setter tidsforløpet på pause** mens den er åpen. **Hopp over animasjonen** går fra dekryptering til rapport, eller viser hele rapporten umiddelbart hvis rapporten allerede er åpen. Knappen hopper aldri direkte til skremmebeskjeden; bruk **Vis siste beskjed** for det. Disse kontrollene er deaktivert før alle fire svar er godkjent.

**Startsignal før skremmen:** Etter at **NY IDENTITET FUNNET** er vist, blir rapporten stående gjennom siste innlasting og tre korte 660 Hz-pip med ett sekunds mellomrom (`revelation.countdownInterval`). Ingen tall eller egen nedtellingsskjerm vises. Et lengre 880 Hz-startpip kommer samtidig som **SE BAK DERE** vises. Ole Magnus kan bruke de korte pipene til å komme på plass og det lange pipet som signal. Lydene syntetiseres lokalt og virker uten nett; samme tidsforløp beholdes uten lyd og med redusert bevegelse. Tilsyn og bakgrunnsfaner pauser pipsekvensen, og nullstilling avbryter den. **Vis siste beskjed** fullfører rapporten og starter den samme omtrent tre sekunder lange pipsekvensen, ikke et øyeblikkelig hopp til skremmen. Identitetsavsløringen med svanen er uendret.

Ved bytte til en annen app/fane stopper tidsforløpet og lyd dempes. Når siden blir synlig igjen, fortsetter den fra samme punkt. En oppdatering midt i dekryptering eller rapport starter den aktuelle sekvensen fra begynnelsen, slik at ingen avsløring mistes. Bekreftede svar og usendte notater bevares. Er siste beskjed og hele identiteten allerede vist, vises begge umiddelbart etter oppdatering. Oppdatering midt i identitetsanimasjonen starter bare den siste innskrivingen på nytt.

Still iPad-volumet til et behagelig nivå før dere åpner saksmappen. Bruk enhetens volumknapper for å justere eller dempe lyd; appen har ingen lydknapp. Ingen raske strobelys brukes; reduserte bevegelsesinnstillinger respekteres. Tilpass skremmen til elevgruppen og la elever kunne stå over.

**Ingen lydeffekt ved åpning?** Kontroller medievolumet og sjekk at lyden ikke sendes til hodetelefoner/Bluetooth. På Safari 17 og nyere ber appen om `navigator.audioSession.type = "playback"` før lydmotoren starter. Det bruker mediekanalen i stedet for den vanlige «ambient»-kanalen, som iOS kan dempe i lydløsmodus ([WebKit-forklaring](https://bugs.webkit.org/show_bug.cgi?id=237322)). På eldre Safari uten denne funksjonen må lydløsmodus være av. Appen kan ikke lese enhetens volum eller bekrefte at høyttaleren faktisk spiller. Effektene bruker langsomme anslag, filtrerte overtoner, svake svevninger og en mollklang, uten tilfeldig variasjon. Hvis nettleseren setter lydmotoren på pause, fortsetter lyd automatisk ved neste trykk. En lydoppstart som ikke fullføres innen fire sekunder avbrytes med en melding og forsøkes igjen ved neste trykk. Oppstartfeil blokkerer aldri spillet. Hele historien fungerer uten lyd.

## Nullstilling mellom grupper

**Tilsyn → Nullstill saken → Ja, nullstill alt.** Langtrykk på **013** gir samme kontrollpanel. Nullstilling krever alltid bekreftelse og fungerer uten nett.

Dette fjerner alle svar, usendte notater, bekreftelser, pågående sekvenser og sluttbildet. Pågående lyder stoppes, og velkomstskjermen vises. Lyd starter automatisk igjen for neste gruppe. Frakoblet cache beholdes. Bare den voksnes valg om manuell siste beskjed beholdes. Nullstill før neste gruppe får iPaden. Ha bare **én appfane / ett appvindu** åpent per iPad.

Hvis lokal lagring er blokkert eller full, vises en tydelig advarsel. Spillet fungerer fortsatt, men fremdrift kan da ikke gjenopprettes etter oppdatering.

## Installer på iPad og test uten nett

1. Åpne den publiserte HTTPS-adressen i Safari mens enheten har nett.
2. Vent til det står **KLAR UTEN NETT** nederst. Denne meldingen vises først når service worker har bekreftet at **alle** nødvendige appfiler finnes i hurtigbufferen.
3. Velg **Del → Legg til på Hjem-skjerm**. Start fra Hjem-skjermen og vent på samme bekreftelse også der. Safari og Hjem-skjerm-appen kan ha separate lagringsområder.
4. Slå på flymodus og slå av Wi-Fi. Lukk og åpne appen, spill gjennom alle fire svar, kontroller lydeffektene, vis siste beskjed, og nullstill.
5. Spill en ny runde i flymodus. Prøv også å oppdatere etter to riktige svar og kontroller at svarene bevares.
6. Gjenta på **hver iPad** før arrangementet. En annen enhet eller nettleser er ikke automatisk klargjort.

Safari kan fjerne nettsteddata ved plassmangel eller etter lengre tids inaktivitet. Privat nettlesing er ikke egnet for arrangementet. Klargjør derfor på nytt og test i flymodus samme dag. Ikke slett nettleserdata eller avinstaller appen før arrangementet er ferdig.

### Oppdateringer

Nye versjoner installeres i bakgrunnen når det er nett. En ny service worker erstatter ikke en aktiv gruppe. Når Tilsyn melder at en oppdatering venter, avslutt gruppen, lukk **alle** faner og Hjem-skjerm-vinduer for appen, og åpne på nytt med nett. Vent på **KLAR UTEN NETT**, og test flymodus igjen. En ufullstendig nedlasting aktiveres ikke.

Appen bruker cache-first for en stabil opplevelse. En vanlig oppdatering av siden tvinger derfor ikke gjennom nytt innhold. Ved feilsøking på utviklermaskin kan service worker avregistreres og appens `sak013-*`-cache slettes i nettleserens utviklerverktøy. Ikke gjør dette på en iPad som må fungere uten nett.

## Venterom for smartboard

Åpne **https://tofu-pup.github.io/halloween/venterom/** på smartboardet. Lokalt: **http://127.0.0.1:4173/halloween/venterom/**. Siden er laget for 16:9, bruker den eksisterende politilogoen og broillustrasjonen, og viser ingen løsninger. iPad-opplevelsen ligger fortsatt på **https://tofu-pup.github.io/halloween/**.

Startnummer 13 vises som et dempet arkivobjekt til høyre, sammen med langsomt drivende dis og en svak skannelinje over bildet. Bevegelsene berører ikke nedtellingen eller knappene, har ingen blink og slås av når enheten ber om redusert bevegelse. Det leverte startnummerbildet ligger lokalt i `venterom/race-bib-13.png` og lagres for frakoblet bruk.

1. Skjermen starter på **GRUPPE 1 – KLAR TIL START**, uten aktiv nedtelling.
2. Trykk **SEND UT GRUPPE 1**. Gruppe 2 vises med **05:00** igjen. Utsendelsesknappen er låst mens tiden går.
3. Ved **00:00** blir neste gruppe klar. En voksen må trykke for å sende den ut og starte et nytt intervall. Ingen grupper sendes ut automatisk.
4. Etter gruppe 5 blir **ALLE GRUPPER ER SENDT UT / ETTERFORSKNINGEN PÅGÅR** stående.

Tannhjulet øverst til høyre åpner **Voksenkontroll**:

- **Antall grupper / minutter mellom gruppene:** standard 5 og 5. Endres før første utsendelse og låses deretter, også etter sideoppdatering. Nullstill sekvensen for å justere.
- **Lyd:** av som standard. Kan aktiveres underveis; gir ett kort, lavmælt varsel når en gruppe blir klar. Det er ingen kontinuerlig lyd. Etter oppdatering må en voksen trykke i vinduet igjen før nettleseren tillater lyd.
- **Tillat tidligere utsendelse:** krever egen bekreftelse og aktiverer bare utsendelsesknappen for den nåværende gruppen. Nedtellingen fortsetter. Gruppen går først når en voksen trykker på hovedknappen; neste intervall begynner fra det faktiske utsendelsestidspunktet.
- **Nullstill utsendelsene:** krever bekreftelse, fjerner alle utsendelsestidspunkter og pågående nedtelling, og går til gruppe 1. Antall grupper, intervall og lydvalg beholdes. Ingen iPad-data slettes.
- **Åpne fullskjerm:** bruk denne eller nettleserens fullskjermvalg, for eksempel F11 på Windows.

### Frakoblet bruk, lagring og isolasjon

Vent på **KLAR UTEN NETT** nederst og prøv en oppdatering uten nett før arrangementet. Venterommet har sin egen service worker med scope `/halloween/venterom/`, egen cache `blodlopet-venterom-cache-v2` og én lagringsnøkkel: `blodlopet-venterom-v1`. Nåværende gruppe beregnes fra listen over lagrede utsendelser. Tidspunkter, frist, unntak og innstillinger bevares etter oppdatering. Utløpt frist blir klar til start, ikke automatisk utsendelse.

Nedtellingen sammenligner lagret frist med enhetens klokke, ikke antall intervalloppdateringer. Den tar derfor igjen tid brukt i en inaktiv fane eller et lukket vindu. Bruk **ett venteromsvindu**, la systemklokken stå uendret og unngå at smartboardet går i dvale under visningen. Privat nettlesing, slettede nettstedsdata og lite lagringsplass kan hindre gjenoppretting eller fjerne frakoblede filer. Lagringsfeil varsles tydelig; ikke lukk vinduet hvis lagring feiler.

Siden importerer ingen kode fra iPad-appen og endrer aldri `sak013.*`-lagring. Stiler, timer, lyd og reset er selvstendige i `venterom/`. Den eneste endringen i iPad-service workeren er en ruteavgrensning: den lar `/venterom/` håndteres av den nye siden i stedet for å sende navigasjonen tilbake til saksmappen. Cacheversjonen økes til `sak013-v7`; iPad-cache og eksisterende oppdateringsstrategi beholdes ellers. Pages-arbeidsflyten kopierer den nye mappen, og den lokale serveren støtter mappens `index.html`. Spillet krever fortsatt ingen bygging eller nye pakker.

**Hvis denne nettleseren allerede har en gammel iPad-service worker:** åpne iPad-appens rotadresse på nett, la oppdateringen laste ned, lukk alle appfaner/vinduer og åpne deretter venteromsadressen. Eldre service workere kan ellers vise saksmappen ved første besøk. Ikke oppdater en iPad midt i en gruppes finale. Senere venteromsoppdateringer øker bare cacheversjonen i `venterom/sw.js`; aktive venterom oppdateres først når alle venteromsfaner er lukket.

## Automatiske kontroller

Spillet krever ingen bygging eller npm-avhengigheter. Playwright brukes bare til utviklingskontroller:

```sh
npm install
npx playwright install chromium webkit
npm run check
npm test
```

Testene kjører mot samme `/halloween/`-sti som Pages. De dekker lokal hurtigbuffer, frakoblet gjennomspilling og replay, svarnormalisering, feil svar, oppdatering, nullstilling, voksenstyrt finale, lyd, redusert bevegelse, lagringsfeil og mobil-/iPad-bredder. Chromium-testene måler det faktiske lydsignalet og dekker avbrudd og ny oppstart. En separat oppstartstest i Chromium og WebKit kontrollerer at mediekanalen velges før lydmotoren opprettes, med et simulert lyd-API: Windows-utgaven av Playwright WebKit har ikke Web Audio. Dette erstatter ikke testing av faktisk lyd på iPhone/iPad. Testserveren starter automatisk. For å regenerere de inkluderte PNG-ikonene: `npm run generate:icons`.

`tests/venterom.spec.js` dekker femgruppesekvensen, tidsberegning, gjenoppretting, dobbelttrykk, innstillinger, bekreftet tidlig utsendelse, nullstilling, lydvalg, 16:9-format og samtidig frakoblet bruk med iPad-appen. Kjør bare disse med `npm test -- --project=chromium tests/venterom.spec.js`.
