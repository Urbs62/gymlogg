# gymlogg
Files for my Gym App Ett Pass Till

Stationer kan vara styrka eller kondition. Äldre stationer utan typ räknas som
styrka. Konditionsstationer använder manuellt angiven tid (timmar/minuter/sekunder),
distans i kilometer och en valfri kommentar. Målvärden kan anges i passet och
justeras under träningen utan att ändra passets mål.

All data sparas i befintliga localStorage-nycklar. Konditionshistorik sparar
`type: "cardio"`, `hours`, `minutes`, `seconds`, `distanceKm` och `comment`.
JSON-backup och CSV-export/import inkluderar konditionsvärden; äldre filer fungerar
fortfarande. Ingen migrering eller rensning av användardata krävs.

Kör regressionstester med `node --test app.test.cjs` (Node.js 20+). Testerna kör
appens händelsehanterare med en DOM-fixtur och isolerad localStorage.

## Komplett JSON-backup, inklusive iPhone

Tryck på **Exportera ALLT (JSON)** under Historik. När fildelning stöds öppnas
enhetens delningsruta. På iPhone: välj **Spara i Filer**, välj mapp och bekräfta.
Kontrollera därefter filen i Filer. Att delningen avslutats utan fel bevisar inte
att en fil sparats. Avbruten delning och fel visas i appen; ingen nedladdning
startas automatiskt efter avbruten eller misslyckad delning.

Om fildelning inte stöds begär appen en vanlig nedladdning. Knappen **Ladda ner
backup (JSON)** ger även möjlighet att försöka separat efter delning. Kontrollera
Hämtningar/Filer; webbläsaren rapporterar inte om filen faktiskt sparades. Om
inget händer finns hela innehållet under **Visa backuptext för manuell kopiering**.
Kopiera i så fall hela texten till en fil med ändelsen `.json`.

Backupen innehåller `stations`, `plans`, `history`, `settings`, appversion och
exporttid. `settings` innehåller eventuella övriga `ept_`-nycklar. Appen har för
närvarande ingen separat inställningsmodell. `localStorage` innehåller dessutom
exakta råvärden för alla `ept_`-nycklar, även sådana som inte kan tolkas som JSON.
Andra appars nycklar på samma ursprung exporteras inte. Export ändrar inga lokala
data. Befintlig JSON-import läser stationer, pass och historik som tidigare;
extra inställnings- och rådatanycklar bevaras i filen men återställs inte av den
nuvarande importfunktionen. CSV-funktionen påverkas inte av denna exportändring.

### Orsak och teknisk lösning

I den tidigare committade koden låg registreringen av JSON-exportknappen inne i
CSV-importens händelsehanterare. Knappen saknade därför funktion innan en CSV-fil
importerats. Registreringen ligger nu på toppnivå. Den tidigare nedladdningen
återkallade dessutom blob-URL:en direkt efter ett syntetiskt klick och saknade
återkoppling. Detta gav inget tillförlitligt besked vid misslyckad nedladdning.
Den exakta orsaken på en viss iPhone måste bekräftas där.

Exporten provar `navigator.canShare({files})` och använder `navigator.share`
direkt från knapptrycket utan föregående asynkront arbete. Filen heter
`ett-pass-till-backup.json`; om JSON-MIME inte stöds för delning provas samma
filnamn och innehåll med `text/plain`. Om ingen variant stöds används
nedladdningsvägen. Blob-URL:er behålls medan sidan är öppen, inklusive vid
återgång från sidcache, i stället för att återkallas direkt efter klicket.
Efter ett delningsfel kräver nedladdningen ett nytt tryck, med ny användaraktivering.

Referenser: [Web Share-specifikationen](https://www.w3.org/TR/web-share/) och
[WebKits beskrivning av användaraktivering](https://webkit.org/blog/13862/the-user-activation-api/).

### Manuell verifiering på iPhone

1. Kör via HTTPS och öppna den uppdaterade appen i det läge där befintliga data
   syns. Kontrollera antal stationer, pass och historikrader före export.
   Safari och hemskärmsappen kan ha olika lagringskontext: exportera där datan finns.
2. Tryck på **Exportera ALLT (JSON)**. Kontrollera delningsrutan, välj **Spara i
   Filer**, spara och öppna filen i Filer. Kontrollera att den går att tolka som
   JSON och att `stations`, `plans`, `history` samt eventuella `settings` stämmer.
   Kontrollera svenska tecken, kommentarer och både styrke- och konditionsposter.
3. Upprepa exporten och avbryt delningsrutan. Kontrollera att avbrottet visas,
   att ingen automatisk nedladdning startar och att exportknappen fungerar igen.
4. Prova **Ladda ner backup (JSON)**. Kontrollera Hämtningar/Filer. Om webbläsaren
   inte sparar filen, öppna backuptexten och kontrollera att hela texten går att
   markera och kopiera. Statusen ska aldrig påstå att filen säkert är sparad.
5. Upprepa i både Safari och installerad hemskärmsapp, även med en stor historik.
   Bakgrundslägg och återgå till appen under delning och kontrollera återkopplingen.
6. Ladda om appen och bekräfta att ursprungliga stationer, pass och historik finns
   kvar. Prova återimport av filen endast i en separat testprofil/enhet; befintlig
   import ersätter data efter bekräftelse. Skriv inte över originaldata för testet.

Automatiska tester simulerar delning, avbrott, nekad delning, saknat API,
MIME-fallback, nedladdning, lagringsfel och dataoförändring. De kan inte bekräfta
iOS delningsruta eller att en fil faktiskt hamnat i Filer.
