# Pubblicare SC TV senza far riscrivere il nome sulla TV

Gli utenti installano **`leobernazzoli/sctv@a`** una volta sola e avviano **SC TV Auto**. Il tag `a` contiene il piccolo caricatore immutabile. Le sue API e i suoi percorsi devono rimanere stabili.

## Nuove versioni dell'app

1. Aggiorna la versione in `package.json`, `package-lock.json` e `src/app.js`. Compila e verifica con `npm run check` e `npm test`. Il bundle deve restare in **`src/tv.js`**.
2. Pubblica il commit e un nuovo tag immutabile, per esempio `v0.3.1`, e la relativa release. Non modificare mai tag già pubblicati.
3. Verifica che `https://cdn.jsdelivr.net/gh/leobernazzoli/sctv@v0.3.1/package.json` e `src/tv.js` restituiscano la versione e il bundle corretti.
4. **Solo dopo la verifica**, aggiorna `update.json` su `main` con `schema: 1`, `version: "0.3.1"`, `tag: "v0.3.1"` e pubblica quel commit. La versione e il tag devono corrispondere esattamente.

SC TV Auto controllerà il canale al prossimo avvio. Anche il pulsante Aggiorna nel menu dell'app apre lo stesso caricatore. Gli utenti non devono installare riferimenti `@rN` o nuovi nomi per gli aggiornamenti dell'app.

Il caricatore legge `update.json` da raw.githubusercontent.com con un URL di controllo distinto a ogni apertura. Usa poi la connessione locale WebSocket di TizenBrew: Ready (-1), LaunchModule (5), GetDebugStatus (1). Attende la risposta ordinata del servizio prima di aprire il sito. Il codice dell'app viene quindi caricato dal normale debugger di TizenBrew con una chiave di versione nuova; non viene eseguito dal caricatore con eval.

## Ripristino

Se una versione ha un problema, modifica `update.json` indicando un tag precedente già verificato. Alla successiva apertura di SC TV Auto verrà selezionato quel riferimento. Non spostare il tag problematico e non chiedere all'utente di riscrivere il nome.

## Creazione iniziale dell'ingresso stabile

Questa operazione è già eseguita per `@a`. Non ripeterla per gli aggiornamenti dell'app. È mantenuta solo come riferimento:

- Crea un worktree separato dal tag iniziale dell'app.
- Nel worktree esegui `SCTV_AUTO_PACKAGE=1 node scripts/make-auto-package.cjs`.
- Il manifest generato punta alla pagina locale `/module/gh%2Fleobernazzoli%2Fsctv%40a/launcher/index.html` e a `launcher/auto.js`.
- Committa il manifest, crea il tag `a` e pubblicalo. Lascia `main` con il normale manifest dell'app.

La tessera SC TV Auto resta alla versione 1.0.0 del caricatore; la versione reale dell'app è visibile nel suo menu Info.
