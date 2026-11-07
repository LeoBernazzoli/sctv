# SC TV — TizenBrew

Versione **0.2.1**. Interfaccia non ufficiale pensata per la TV, con schermata in evidenza, locandine grandi, ricerca, lista personale e selezione di stagioni ed episodi. Sostituisce la navigazione desktop di StreamingCommunity mentre il sito è aperto in TizenBrew.

## Installazione e aggiornamento

1. In TizenBrew scegli **Aggiungi modulo GitHub / Add GitHub Module**.
2. Inserisci **`leobernazzoli/sctv@r3`**. Il suffisso breve fissa la versione 0.2.1 e usa una nuova chiave di cache.
3. Conferma con Fine/Done e lascia il campo di testo. L'aggiunta avviene senza una schermata di installazione.
4. Chiudi completamente e riapri TizenBrew; avvia **SC TV (0.2.1)** dalla schermata principale.

Se compare ancora 0.1.1, aggiungi una nuova voce con `leobernazzoli/sctv@r3` e chiudi completamente TizenBrew prima di riaprirlo. La voce senza suffisso può mantenere una copia precedente nella cache della TV o della CDN. La versione è visibile anche nel menu Info/blu. Se compare ancora 0.1.x, la CDN o TizenBrew possono avere una copia precedente; in alternativa aggiungi `leobernazzoli/sctv@v0.2.1` per usare una versione fissata.

È mantenuta anche la copia di compatibilità `LeoBernazzoli/streamingcomunity-tizenbrew`, con una sola `m` in `comunity`, per le TV dove quel nome è già stato salvato. Il repository principale è [leobernazzoli/sctv](https://github.com/LeoBernazzoli/sctv).

Serve TizenBrew installato e funzionante. Questo è un modulo `mods`, non un'app WGT autonoma. I file compilati sono già nel repository: non devi compilare nulla per usarlo sulla TV.

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

- 24 test automatici: navigazione, ricerca, dettagli, stagioni, link episodi, lista personale, errori HTTP, annullamento delle richieste, sicurezza del rendering e ridimensionamento.
- Integrazione offline con i dati reali del sito: 70 schede in home, 2 stagioni, 6 episodi e 31 risultati di ricerca caricati correttamente. Gli script del sito non sono stati eseguiti in questa prova.
- Il browser collegato non era disponibile per la verifica visuale. Rendering sulla TV, tastiera nativa, telecomando fisico e riproduzione restano da verificare.

Riferimento: [formato dei moduli TizenBrew](https://github.com/reisxd/TizenBrew/blob/main/docs/MODULES.md).

## Samsung UE49MU6500 (2017)

La piattaforma dei Samsung 2017 è Tizen 3.0, con Chromium 47 ([specifiche Samsung](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html)). La pagina Watch del sito usa uno script `type="module"`: il solo supporto dei codec non basta ad avviare quella pagina sui browser meno recenti.

La 0.2.1 rileva l'assenza del supporto agli script a moduli e monta direttamente la pagina iframe che il server ha già fornito nella pagina Watch. L'indirizzo deve essere una route `/en/iframe/...` o `/it/iframe/...` sullo stesso dominio. Sono mantenuti i controlli di accesso del sito; il fallback non si attiva se il sito richiede il login. Il frame viene dimensionato a schermo intero con un pulsante Catalogo.

Questo corregge l'avvio della pagina Watch sui browser vecchi, ma **non certifica la riproduzione sul dispositivo**: il player esterno, i codec audio/video, il motore MSE e i comandi nel frame devono ancora essere provati. L'HTML del player esterno ha restituito 403 alla verifica automatica, quindi non è stato possibile ispezionarlo completamente.

Prima prova consigliata: un film e un episodio a 1080p, se il lettore permette di scegliere la qualità; verifica immagine, audio, pausa e avanzamento. Samsung documenta limiti distinti per MSE e decodifica nativa sui modelli 2017 ([specifiche video 2017](https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2017-tv-video-specifications.html)).
