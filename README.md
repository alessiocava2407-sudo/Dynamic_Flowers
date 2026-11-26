# Interactive Canvas

Esperienza visiva interattiva pubblicata su GitHub Pages. La scena è SVG + CSS: nessun canvas, nessun devicePixelRatio e nessun loop `requestAnimationFrame`.

## Requisiti
- Node.js 20.9 o superiore
- npm

## Avvio
```bash
npm install
npm run dev
```
Apri http://localhost:3000.

`next dev` usa `.next-dev/`, mentre `next build` usa `.next/`: le cache non si sovrappongono, quindi non può succedere che il dev server carichi chunk della build con ID diversi (`__webpack_modules__[moduleId] is not a function`).

## Verifiche
```bash
npm run check   # lint + typecheck + build
```

## Build di produzione
```bash
npm run build
```
I file statici pronti per la pubblicazione vengono generati in `out/`. Su GitHub Pages il sito vive in un sottopercorso, quindi la build di pubblicazione usa `BASE_PATH=/Interactive-Canvas`:

```bash
BASE_PATH=/Interactive-Canvas npm run build          # macOS/Linux
$env:BASE_PATH="/Interactive-Canvas"; npm run build  # PowerShell
```

## Pubblicazione su GitHub Pages
Il workflow `.github/workflows/deploy.yml` compila e pubblica il sito su GitHub Pages a ogni push sul branch `main`. Il sito è disponibile all'indirizzo:
https://alessiocava2407-sudo.github.io/Interactive-Canvas/

Pages è configurato anche per il deploy dal branch `main`: per questo motivo la radice del repository contiene una copia dell'export (`index.html`, `_next/`, `404.html`, `index.txt`, `.nojekyll`). Dopo una modifica all'interfaccia rigenera la copia con:

```bash
BASE_PATH=/Interactive-Canvas npm run build && cp -R out/. .   # macOS/Linux
$env:BASE_PATH="/Interactive-Canvas"; npm run build; Copy-Item out\* -Destination . -Recurse -Force  # PowerShell
```

Il file `.nojekyll` è necessario affinché Pages non ignori la cartella `_next/`.

## Interazione
- All'avvio non compare nessun fiore: il giardino aspetta la prima interazione.
- Desktop: muovi il mouse per far crescere i fiori.
- Touch: tocca o trascina sullo schermo.
- Quando ci sono fiori, appare l'icona delle forbici in basso a destra: cliccandola i fiori si raggruppano in un mazzo naturale, con gli steli inclinati che convergono verso il nastro.
- Toccando di nuovo lo schermo il mazzo si scioglie e ricomincia un nuovo giardino.
- Il numero massimo di fiori dipende dalla dimensione dell'area visibile.
- I fiori più vecchi vengono sostituiti da nuovi petali che cadono.

## Perché SVG/CSS
La versione Canvas disegnava e ricacheava centinaia di forme a ogni frame, con costi imprevedibili su mobile Safari/Chrome (DPR, texture offscreen, fill rate). Qui il browser anima solo `transform` e `opacity` tramite CSS:

- **Nessun loop JS**: dopo l'evento del puntatore non viene eseguito alcun codice per frame.
- **Nessun DPR**: i vettori sono nitidi a qualsiasi densità; niente canvas ridimensionati male quando la barra di Safari cambia altezza.
- **Resize semplice**: `ResizeObserver` + `100dvh` aggiornano la `viewBox` conforme alle dimensioni reali del contenitore.
- **DOM legato**: al massimo 10 fiori su mobile e 16 su desktop; i dettagli costosi (nervature, stami, striature) sono disattivati sotto i 720 px.
- **Gradienti condivisi**: definiti una volta in `<defs>` e riutilizzati da tutti i petali.
- **Sfondo animato**: stelle e aloni si muovono solo con `transform` e `opacity`, senza ripittura del canvas.
- **`prefers-reduced-motion`**: le animazioni CSS vengono disattivate e il giardino appare fermo, reagendo comunque al tocco.

## Struttura
- `app/`: layout, metadati e stile globale (sfondo, keyframe, media query).
- `components/FlowerGarden.tsx`: scena SVG, eventi Pointer e gestione dei fiori.
- `lib/garden.ts`: geometria generata da seed (forma stabile tra re-render e resize).

`index.html` nella radice è lo specchio dell'export Next usato dal deploy branch-based di Pages; `original-index.html` è l'istantanea storica della versione Canvas. La build legge solo `app/`, `components/` e `lib/`.
