# SC TV — TizenBrew

Versione applicazione **0.3.1**. Interfaccia non ufficiale pensata per la TV, con schermata in evidenza, locandine grandi, ricerca, lista personale e selezione di stagioni ed episodi. Sostituisce la navigazione desktop di StreamingCommunity mentre il sito è aperto in TizenBrew.

## Installazione una volta sola: SC TV Auto

1. In TizenBrew scegli **Aggiungi modulo GitHub / Add GitHub Module**.
2. Inserisci **`leobernazzoli/sctv@a`**. La `a` identifica l'ingresso automatico stabile.
3. Conferma con Fine/Done e lascia il campo di testo; chiudi completamente e riapri TizenBrew.
4. D'ora in poi avvia sempre **SC TV Auto**.

Serve una sola nuova aggiunta per chi ha installato le vecchie voci `@r3`, `@r4` o `@r5`: quelle restano versioni fissate e non possono diventare il nuovo caricatore tramite un aggiornamento del repository. Non è necessario modificarle per usare la nuova voce.

**Gli aggiornamenti dell'app non richiedono più di cambiare il nome del modulo.** A ogni apertura, SC TV Auto legge il canale aggiornamenti e fa avviare a TizenBrew la versione disponibile. Nel menu Info/blu dell'app c'è anche **Aggiorna**, per ripetere il controllo senza digitare nulla. Se il controllo di rete fallisce, il caricatore usa l'ultima versione selezionata valida, oppure la versione iniziale 0.3.0.

La tessera di TizenBrew si chiama **SC TV Auto (1.0.0)**: 1.0.0 è la versione del piccolo caricatore stabile. **La versione effettiva dell'app si legge nel menu Info di SC TV** e può aumentare senza cambiare quella tessera.

Il caricatore usa una pagina locale servita da TizenBrew, un file `update.json` nel repository e il normale passaggio di modulo del servizio TizenBrew. Non esegue codice scaricato tramite eval e non modifica l'elenco dei moduli installati. I file dell'app sono caricati da riferimenti di versione immutabili, così la cache di una vecchia versione non viene riutilizzata per una versione nuova.

Repository principale: [leobernazzoli/sctv](https://github.com/LeoBernazzoli/sctv). Serve TizenBrew installato e funzionante. È un modulo, non un'app WGT autonoma. I file necessari sono già pubblicati.

## Cosa cambia dalla versione 0.1

- Interfaccia a schermo intero con impaginazione 1920×1080 che si adatta proporzionalmente al viewport della TV.
- Testo, pulsanti e copertine dimensionati per l'uso dal divano.
- Selezione a righe controllata direttamente dalle frecce, senza scandire gli elementi del sito desktop a ogni pressione.
- Home, Film, Serie TV, Cerca e La mia lista.
- Schermata dei dettagli con stagioni ed episodi, quando presenti nei dati del sito.
- Lista personale salvata localmente nel browser della TV.
- Ritorno alla scheda dopo aver lasciato il lettore, quando la sessione del browser lo consente.

## Comandi

| Tasto | Azione |
| --- | --- |
| Frecce | Sposta la selezione fra menu, pulsanti, titoli ed episodi |
| OK | Attiva la selezione |
| Return / Indietro | Esce dalla ricerca, torna alla schermata precedente o apre il menu dalla home |
| Info / Blu | Apre o chiude il menu di aiuto |
| IT / EN nel menu | Cambia la lingua del catalogo tramite la pagina del sito corrispondente |
| Blu durante la riproduzione | Torna alla home, se la pagina principale riceve il tasto |

In Cerca, la tastiera della TV mantiene il controllo delle frecce. Conferma con il pulsante Cerca; Return esce dal campo e seleziona il pulsante. Nel lettore restano attivi i comandi originali del sito e della TV.

Il menu Info/blu contiene anche **Sito originale**, che mostra la pagina sottostante per la sessione corrente, ed **Esci**. Riaprire il modulo ripristina l'interfaccia TV.

## Catalogo e API

Non è stata individuata documentazione di un'API pubblica ufficiale riutilizzabile. Il sito espone route `/api/tv/...`, ma nella verifica hanno restituito errori di accesso (401/403): il modulo non le usa e non tenta di aggirarne l'autenticazione.

L'interfaccia legge il JSON `data-page` che il sito consegna già nelle pagine di home, ricerca e dettagli. Le richieste successive sono normali GET sullo stesso dominio e nella sessione del browser. Le pagine ricevute vengono analizzate come dati: gli script delle risposte non vengono eseguiti. Non serve un proxy o un server aggiuntivo.

Il formato è interno al sito, quindi può cambiare. Se il catalogo non è leggibile, il modulo mantiene la schermata corrente e mostra un errore. Le pagine non riconosciute, come login e gestione account, mantengono l'interfaccia originale.

## Riproduzione e limiti

**Il lettore video resta quello del sito.** Guarda ed episodi aprono le normali pagine `/en/watch/...` o `/it/watch/...`. Non vengono estratti playlist, token o chiavi; non viene aggiunto un lettore AVPlay indipendente.

La nuova versione migliora catalogo e navigazione. Codec, audio, DRM, fullscreen, accesso al video e gestione dei tasti negli iframe dipendono ancora dal sito e dalla TV. Il tasto blu non può essere garantito quando il focus è dentro un iframe di un altro dominio.

Le schede Film/Serie filtrano le raccolte della home; per trovare titoli fuori da quelle raccolte usa Cerca. La lista personale non è sincronizzata con l'account del sito o con altre TV.

La compatibilità sul dispositivo non è ancora verificata: servono modello/anno della Samsung e una prova reale. Sono presenti accorgimenti per motori Tizen meno recenti, inclusi JavaScript senza sintassi moderna nel bundle, XMLHttpRequest e spaziatura senza dipendere da flex-gap.

## Sviluppo

Con Node.js 22 o superiore:

```sh
npm ci
npm run build
npm run check
npm test
npm pack --dry-run
```

`src/app.js` contiene la logica e `src/tv.css` lo stile. `scripts/build.cjs` genera `src/tv.js`, un unico file con lo stile incorporato. **Dopo una modifica ai sorgenti, ricompila e carica anche `src/tv.js`**. Il campo `main` del manifest punta al bundle compilato. Nessuna dipendenza esterna viene caricata dall'interfaccia sulla TV; jsdom serve soltanto ai test di sviluppo.

L'indirizzo iniziale resta quello fornito: `https://streamingcommunityz.boo/en`. Per cambiarlo aggiorna `websiteURL` nel manifest e `HOME_URL` nei sorgenti, poi ricompila.

## Verifiche

- 47 test automatici: navigazione, ricerca, dettagli, stagioni, link episodi, lista personale, errori HTTP, annullamento delle richieste, sicurezza del rendering e ridimensionamento.
- Integrazione offline con i dati reali del sito: 70 schede in home, 2 stagioni, 6 episodi e 31 risultati di ricerca caricati correttamente. Gli script del sito non sono stati eseguiti in questa prova.
- Il browser collegato non era disponibile per la verifica visuale. Rendering sulla TV, tastiera nativa, telecomando fisico e riproduzione restano da verificare.

Riferimento: [formato dei moduli TizenBrew](https://github.com/reisxd/TizenBrew/blob/main/docs/MODULES.md).

## Samsung UE49MU6500 (2017)

La piattaforma dei Samsung 2017 è Tizen 3.0, con Chromium 47 ([specifiche Samsung](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html)). La pagina Watch del sito usa uno script `type="module"`: il solo supporto dei codec non basta ad avviare quella pagina sui browser meno recenti.

La 0.2.3 rileva l'assenza del supporto agli script a moduli e monta direttamente la pagina iframe che il server ha già fornito nella pagina Watch. L'indirizzo deve essere una route `/en/iframe/...` o `/it/iframe/...` sullo stesso dominio. Sono mantenuti i controlli di accesso del sito; il fallback non si attiva se il sito richiede il login. Il frame viene dimensionato a schermo intero con un pulsante Catalogo.

Questo corregge l'avvio della pagina Watch sui browser vecchi, ma **non certifica la riproduzione sul dispositivo**: il player esterno, i codec audio/video, il motore MSE e i comandi nel frame devono ancora essere provati. L'HTML del player esterno ha restituito 403 alla verifica automatica, quindi non è stato possibile ispezionarlo completamente.

Prima prova consigliata: un film e un episodio a 1080p, se il lettore permette di scegliere la qualità; verifica immagine, audio, pausa e avanzamento. Samsung documenta limiti distinti per MSE e decodifica nativa sui modelli 2017 ([specifiche video 2017](https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2017-tv-video-specifications.html)).

## Rotella di caricamento e diagnostica del player (0.2.3)

La rotella da sola non distingue un errore di rete, un errore video o uno script non compatibile. La 0.2.3 passa il focus al lettore dopo il caricamento del frame e aggiunge OK/Play/Pausa e i tasti multimediali quando il video HTML5 è accessibile nel frame del player. I pulsanti e i campi di testo del lettore mantengono i propri comandi.

Se il film resta fermo, prova OK oppure Play. Poi apri **Info lettore** con il relativo pulsante o con Info e riporta lo stato visualizzato: presenza del video, stato dati/rete, eventuale codice di errore e supporto degli script a moduli. “Nessun dato ricevuto” significa che la diagnostica non ha raggiunto il lettore; non dimostra un problema di codec. Blu torna al catalogo, Info/Return chiude il pannello quando riceve il tasto.

Il piccolo helper viene eseguito soltanto nei frame `vixcloud.cc/embed/...` che hanno come pagina di provenienza il dominio configurato. I messaggi sono accettati dalla pagina TV solo dal frame effettivamente incorporato e dall'origine attesa. Non vengono trasferiti URL video, token, cookie o contenuti; lo stato resta tra i frame della pagina, senza un servizio di raccolta dati.

**Questa è una versione per correggere il focus e raccogliere uno stato leggibile, non una conferma di compatibilità del video.** Il player esterno non viene sostituito e il formato effettivo del video non viene convertito.

## Pannello automatico e telecomando (0.2.3)

Se il player esterno continua a segnalare assenza di video per almeno 8 secondi, la diagnostica si apre automaticamente una sola volta. Non serve cliccare Info lettore. Il pannello mostra anche il tipo dell'ultimo errore JavaScript rilevato e il nome di una funzione nota eventualmente mancante, senza mostrare il messaggio grezzo o URL. Un errore avvenuto prima dell'avvio del monitor potrebbe non essere rilevato.

Quando non esiste un video, le frecce e OK vengono inoltrati alla pagina dei controlli: Destra/Giù seleziona Info lettore, Sinistra/Su seleziona Catalogo, OK attiva la selezione. Con il pannello aperto, Su/Giù scorre il testo e OK/Return lo chiude. Return torna al catalogo quando il pannello è chiuso; prima esce dal fullscreen se attivo nel player. I campi di testo e i pulsanti nativi del player mantengono i propri comandi.

Avvia la versione più recente da **SC TV Auto** e attendi circa 10 secondi dopo aver aperto il film. Se la diagnostica appare, basta una foto del pannello. **Il blocco della riproduzione rimane da risolvere**: questa modifica rende disponibili i controlli e le osservazioni necessari, senza certificare il player.

## Pubblicazione degli aggiornamenti

Il riferimento `@a` è il caricatore stabile e non va spostato. Le nuove versioni dell'app vengono pubblicate con un nuovo tag e selezionate tramite `update.json`. Vedi [PUBLISHING.md](PUBLISHING.md) per l'ordine di pubblicazione e il ripristino di una versione precedente.

Il caricatore supera 10 test dedicati; la suite completa ne contiene 47. È stato verificato anche il passaggio dei messaggi usando il gestore reale del servizio TizenBrew in una prova locale. Il primo avvio e l'aggiornamento sulla TV fisica restano da confermare. Il blocco della riproduzione segnalato su UE49MU6500 rimane in diagnosi: l'aggiornamento automatico non è una certificazione del player.

## Pannello di emergenza senza messaggi dal player (0.3.1)

Il pannello non dipende più soltanto dai messaggi del lettore esterno: un controllo locale nella pagina Watch lo apre dopo 12 secondi se la riproduzione non è stata segnalata. Se il player ha segnalato una riproduzione in corso, il controllo viene annullato. Se l'utente apre e chiude il pannello manualmente, non viene riaperto dal controllo locale.

Il pulsante in alto mostra **Info lettore · 0.3.1**, così è possibile riconoscere la versione arrivata alla TV senza aprire il menu. L'apertura di emergenza tenta anche di uscire dal fullscreen per rendere visibile il pannello. Le frecce/OK del parent riconoscono sia i codici numerici sia i nomi dei tasti.

Per riceverla basta chiudere e riaprire **SC TV Auto**, oppure usare Aggiorna nel menu dell'app. Non aggiungere nuove voci e non modificare `@a`. Se non compare il pannello, una foto dell'intero schermo permette di controllare anche la versione visualizzata. Il problema della riproduzione rimane da diagnosticare.
