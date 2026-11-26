# Giardino di Gigli e Peonie — Next.js

Versione Next.js del progetto HTML originale, pubblicata su GitHub Pages. L'animazione Canvas è gestita dal browser.

## Requisiti
- Node.js 20.9 o superiore
- npm

## Avvio
```bash
npm install
npm run dev
```
Apri http://localhost:3000.

## Verifiche
```bash
npm run check   # lint + typecheck + build
```

## Build di produzione
```bash
npm run build
```
I file statici pronti per la pubblicazione vengono generati nella cartella `out/`.

## Pubblicazione su GitHub Pages
Il workflow `.github/workflows/deploy.yml` compila e pubblica il sito su GitHub Pages a ogni push sul branch `main`.

Nel repository, apri **Settings → Pages** e imposta **Build and deployment → Source** su **GitHub Actions**. Dopo il completamento del workflow, il sito sarà disponibile all'indirizzo:
https://alessiocava2407-sudo.github.io/Dynamic_Flowers/

## Interazione
- Desktop: muovi il puntatore per far crescere i fiori.
- Touch: tocca o trascina sullo schermo.
- La scena si adatta a dimensioni e densità dello schermo.
- L'animazione viene sospesa quando la scheda non è visibile.

## Struttura
- `app/`: layout, metadati e stile globale.
- `components/FlowerGarden.tsx`: componente client React.
- `lib/flower-garden.js`: motore Canvas, disegno e animazione.

## Note tecniche
Il disegno originale di gigli e peonie è stato conservato. Sono stati aggiunti cleanup degli event listener e del frame loop, gestione Pointer Events unificata per mouse e touch, sospensione in background, limite DPR più prudente e densità dello sfondo proporzionata all'area disponibile.

Le ottimizzazioni successive includono:

- **Physics indipendente dal refresh rate:** ogni incremento è normalizzato a 60 fps; i frame extra dei display a 120/144/240 Hz vengono ignorati, mantenendo la fluidità senza consumo doppio.
- **Meno lavoro per frame:** posizione della punta del fiore calcolata una volta e riutilizzata, contesto dei canvas in pool riutilizzato senza `getContext()` ripetuti, sprite delle particelle risolti al momento della creazione, alpha delle particelle senza `save()/restore()` e comparatore di sort condiviso.
- **Cache dei fiori:** teste dei fiori e fondale prerenderizzati; il fondale viene disegnato a 1:1, quindi la qualità di resampling del contesto principale è `medium` (i dettagli restano `high` nella cache).
- **Accessibilità:** zoom abilitato, testo di fallback nel canvas, etichette ARIA e rispetto di `prefers-reduced-motion` (giardino statico che reagisce comunque al puntatore).
- **Metadati:** Open Graph/Twitter e `color-scheme` coerente con la pagina.

`index.html` e `original-index.html` nella radice sono istantanee storiche del progetto originale: non vengono usate dalla build, che legge solo `app/`, `components/` e `lib/`.


## Aggiornamenti della versione

- **Specie botaniche:** soltanto gigli (due varianti cromatiche) e peonie.
- **Resa floreale:** petali con gradienti di luce/ombra, nervature e sovrapposizioni; le peonie mantengono strati concentrici e bordi ondulati.
- **Profondità:** vegetazione di fondo su tre piani, foschia bassa, foglie e steli con dimensioni differenziate.
- **Fisica:** brezza variabile nel tempo, risposta indipendente di ogni stelo, inerzia e resistenza dell'aria per i petali in caduta.
- **Prestazioni:** fondale e teste dei fiori vengono memorizzati in cache; DPR limitato, numero massimo di fiori/particelle controllato e animazione sospesa quando la scheda non è visibile.
- **Cache delle peonie:** il riquadro di rendering delle peonie include margine aggiuntivo per contenere tutti i petali esterni senza tagliarli.

### Valutazione WebGL

Il progetto usa forme botaniche disegnate con curve Bézier, gradienti e compositing 2D. In questo caso WebGL non garantisce automaticamente un'accelerazione: per usarlo davvero bisognerebbe ricostruire petali, maschere, illuminazione e stratificazione come geometrie/shader, oltre a gestire un renderer alternativo. La versione mantiene quindi Canvas 2D, che sfrutta già il compositing accelerato dal browser e la cache delle teste floreali. È una scelta deliberata per preservare qualità e semplicità; WebGL avrebbe senso in una fase successiva solo dopo un profiling su dispositivi target che dimostri un collo di bottiglia GPU/CPU.
