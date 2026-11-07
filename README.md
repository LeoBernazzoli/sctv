# StreamingCommunity TV per TizenBrew

Prototipo non ufficiale, versione 0.1.0. Apre **https://streamingcommunityz.boo/en** e aggiunge la navigazione con telecomando al sito esistente. La lingua iniziale resta quella dell'indirizzo fornito (`/en`).

## Installazione sulla TV

Serve TizenBrew già installato e funzionante sulla TV Samsung. Questo progetto è un **modulo `mods`**, non un pacchetto `.wgt`: non richiede una compilazione con Tizen Studio.

1. In TizenBrew apri il gestore moduli e scegli **Add GitHub Module**.
2. Inserisci esattamente `LeoBernazzoli/streamingcommunity-tizenbrew`.
3. Avvia **StreamingCommunity TV** dall'elenco dei moduli.

Repository: [LeoBernazzoli/streamingcommunity-tizenbrew](https://github.com/LeoBernazzoli/streamingcommunity-tizenbrew). Lo ZIP contiene i sorgenti: per l'installazione usa il nome del modulo sopra. Il caricamento GitHub usa jsDelivr; subito dopo una pubblicazione o un aggiornamento può esserci un ritardo di disponibilità. Dopo un aggiornamento chiudi completamente e riapri TizenBrew, che mantiene una cache dello script.

Riferimenti: [moduli TizenBrew](https://github.com/reisxd/TizenBrew/blob/main/docs/MODULES.md), [caricamento moduli](https://github.com/reisxd/TizenBrew/blob/main/tizenbrew-app/TizenBrew/service-nextgen/service/utils/moduleLoader.js).

## Comandi

| Tasto | Azione |
| --- | --- |
| Frecce | Sposta la selezione fra link, schede e pulsanti; scorre per raggiungerli |
| OK | Attiva la selezione; nei campi di testo usa il comportamento della tastiera TV |
| Return / Indietro | Chiude l'aiuto, esce dal campo di testo, esce dal fullscreen oppure torna alla pagina precedente |
| Info oppure blu | Apre/chiude il menu con aiuto, pagina iniziale e ricaricamento |
| Play / Pausa | Controlla un video HTML5 accessibile nella pagina principale |
| Stop | Mette in pausa il video |
| Avanti / Indietro multimediali | Sposta il video di 10 secondi, entro i limiti disponibili |

Nei campi di testo, nei menu di selezione, sui video e negli iframe restano attivi i comandi nativi. Premi Return per lasciare un campo di ricerca e riprendere la navigazione a frecce.

## Compatibilità e limiti

- Verificato con test automatici del DOM e degli eventi; **non provato su una TV Samsung**. Indica modello/anno della TV e versione TizenBrew per eventuali correzioni specifiche.
- Il sito usa JavaScript moderno: il modulo non aggiorna il motore web della TV. Se il sito non si avvia su un modello vecchio, questo adattamento potrebbe non bastare.
- Il lettore video non viene sostituito. Codec, streaming, fullscreen e autenticazione dipendono dal sito, dal lettore e dalla TV.
- Lo script opera solo nella pagina principale sul dominio configurato. I lettori in iframe, soprattutto su domini diversi, mantengono i propri comandi; i tasti multimediali del modulo possono quindi non raggiungerli.
- Menu personalizzati senza elementi HTML interattivi o ruoli accessibili potrebbero richiedere adattamenti ulteriori. Il modulo rileva i dialoghi HTML aperti e quelli marcati `role="dialog" aria-modal="true"`.
- Il modulo dipende dal sito remoto e dai suoi cambiamenti di struttura. Il codice del modulo non aggiunge servizi, proxy o raccolta dati; il sito continua a caricare le proprie risorse.

## Sviluppo e controlli

Con Node.js 22:

```sh
npm ci
npm run check
npm test
npm pack --dry-run
```

Il codice eseguito sulla TV è `src/tv.js`, senza dipendenze esterne. `jsdom` serve solo ai test locali. La geometria è simulata nei test: non costituisce una verifica del layout o del player sulla TV.

Per aggiornare l'indirizzo, cambia sia `websiteURL` in `package.json` sia `HOME_URL` all'inizio di `src/tv.js`, poi esegui i controlli. Il controllo del dominio impedisce di applicare l'adattamento ad altri siti.

## Prova sul dispositivo

1. Verifica che compaia il messaggio iniziale e che Play sia evidenziato.
2. Prova frecce e OK su menu, schede e dettagli; prova un campo di ricerca con la tastiera TV.
3. Prova Info/blu, chiusura con Return e ritorno alla selezione precedente.
4. Avvia un video e verifica audio, immagine, fullscreen e comandi del lettore. Segnala separatamente se il problema riguarda l'apertura del sito oppure il video.

Questi controlli sul dispositivo restano da eseguire.
