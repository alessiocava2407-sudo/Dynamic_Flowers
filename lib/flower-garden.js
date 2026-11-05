
"use strict";

export function initFlowerGarden(canvas, instr) {

let ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
let W, H, dpr;
let bgCanvas;

function resize() {
    const viewport = window.visualViewport;
    const nextW = Math.round(viewport ? viewport.width : window.innerWidth);
    const nextH = Math.round(viewport ? viewport.height : window.innerHeight);
    // Moltiplichiamo il dpr per la scala del pinch-zoom in modo che la risoluzione fisica non crolli sgranando l'immagine
    const zoomScale = viewport ? viewport.scale : 1;
    const nextDpr = Math.min((window.devicePixelRatio || 1) * zoomScale, quality.maxDpr); // Tetto massimo sicuro per evitare rallentamenti 
    if (nextW === W && nextH === H && nextDpr === dpr) return;
    const oldW = W, oldH = H;
    W = nextW; H = nextH; dpr = nextDpr;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    if (viewport) {
        canvas.style.left = viewport.offsetLeft + 'px';
        canvas.style.top = viewport.offsetTop + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    buildBG();
    if (oldW && oldH) {
        for (const flower of flowers) flower.resize(oldW, oldH);
    }
}

/* ═══════ UTILS ═══════ */
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const TAU   = Math.PI * 2;
const easeOut3 = t => 1 - (1 - t) ** 3;
const easeOut2 = t => 1 - (1 - t) ** 2;

function mulberry32(a) {
    return () => {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function qBez(a, b, c, t) {
    const u = 1 - t;
    return u * u * a + 2 * u * t * b + t * t * c;
}

/* ═══════ GLOBALS ═══════ */
let flowers = [];
let nextFlowerId = 0;
const maxFlowers = 60;
let fallingPetals = [];
let particles = [];
let mouse = { x: undefined, y: undefined };
let hasInteracted = false;
let gTime = 0;
let wind = 0;
let windTarget = 0;
let lastWindChange = 0;
const quality = { maxDpr: 2, maxParticles: 120 };

resize();
const onResize = () => resize();
window.addEventListener('resize', onResize, { passive: true });
window.addEventListener('orientationchange', onResize, { passive: true });
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize, { passive: true });

/* ═══════ FALLING PETAL ═══════ */
class FallingPetal {
    constructor(x, y, color, sz) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 0.65;
        this.vy = 0.35 + Math.random() * 0.55;
        this.gravity = 0.002 + Math.random() * 0.004;
        this.drag = 0.986 + Math.random() * 0.009;
        this.rot = Math.random() * TAU;
        this.rotV = (Math.random() - 0.5) * 0.05;
        this.sz = sz * (0.25 + Math.random() * 0.25);
        this.color = color;
        this.op = 0.75 + Math.random() * 0.25;
        this.phase = Math.random() * TAU;
    }
    update() {
        this.phase += 0.018 + wind * 0.002;
        this.vx = (this.vx + wind * 0.012) * this.drag;
        this.vy += this.gravity;
        this.x += this.vx + Math.sin(this.phase) * 0.34;
        this.y += this.vy;
        this.rot += this.rotV + wind * 0.0015;
        this.op -= 0.002;
        if (this.y > H + 20) this.op = 0;
    }
    draw() {
        if (this.op <= 0) return;
        const s = this.sz;
        ctx.save();
        ctx.globalAlpha = this.op;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * 0.55, -s * 0.15, s * 0.6, -s * 0.65, 0, -s);
        ctx.bezierCurveTo(-s * 0.6, -s * 0.65, -s * 0.55, -s * 0.15, 0, 0);
        const petal = ctx.createLinearGradient(-s * 0.35, 0, s * 0.35, -s);
        petal.addColorStop(0, 'rgba(255,255,255,0.38)');
        petal.addColorStop(0.34, this.color);
        petal.addColorStop(1, 'rgba(120,65,90,0.24)');
        ctx.fillStyle = petal;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.08);
        ctx.quadraticCurveTo(s * 0.04, -s * 0.52, 0, -s * 0.88);
        ctx.strokeStyle = 'rgba(255,255,255,0.30)';
        ctx.lineWidth = Math.max(0.35, s * 0.018);
        ctx.stroke();
        ctx.restore();
    }
}

/* ═══════ PARTICLE ═══════ */
class Particle {
    constructor(x, y, rgb) {
        this.x = x + (Math.random() - 0.5) * 25;
        this.y = y + (Math.random() - 0.5) * 25;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = -0.15 - Math.random() * 0.5;
        this.r = 0.8 + Math.random() * 1.8;
        this.rgb = rgb; this.op = 0.45 + Math.random() * 0.35;
        this.life = 70 + Math.random() * 70;
    }
    update() {
        this.x += this.vx + Math.sin(gTime * 0.015 + this.x * 0.01) * 0.12;
        this.y += this.vy; this.life--;
        if (this.life < 25) this.op *= 0.95;
    }
    draw() {
        if (this.op < 0.01) return;
        ctx.save(); ctx.globalAlpha = this.op;
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 2.5);
        g.addColorStop(0, `rgba(${this.rgb},0.7)`);
        g.addColorStop(1, `rgba(${this.rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 2.5, 0, TAU); ctx.fill();
        ctx.restore();
    }
}

/* ═══════ FLOWER ═══════ */
class Flower {
    constructor(x) {
        this.id = nextFlowerId++;
        this.curY = H;
        this.growV = 18 + Math.random() * 12;
        this.grown = false;
        this.bloom = 0;

        this.swPh = Math.random() * TAU;
        this.swSp = 0.005 + Math.random() * 0.009;
        this.swAm = 5 + Math.random() * 11;
        this.windPhase = Math.random() * TAU;
        this.windResponse = 0.55 + Math.random() * 0.9;
        this.depth = 0.72 + Math.random() * 0.48;

        this.stCurve = (Math.random() - 0.5) * 45;
        this.stW = 2.2 + Math.random() * 2;
        this.leafs = [];
        const nL = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < nL; i++) {
            this.leafs.push({
                t: 0.22 + i * 0.24 + Math.random() * 0.10,
                side: Math.random() > 0.5 ? 1 : -1,
                sm: 0.75 + Math.random() * 0.5
            });
        }

        this.sizeScale = clamp(Math.min(W, H) / 1000, 0.5, 1); // Fiori leggermente più grandi su mobile per mantenere i dettagli
        this.swAm *= this.sizeScale;
        this.stCurve *= this.sizeScale;
        this.stW *= this.sizeScale;
        this.glR = (40 + Math.random() * 25) * this.sizeScale;
        this.baseGl = 0.18; this.gl = this.baseGl;

        this.life = 8 + Math.random() * 8;
        this.op = 1;
        this.shed = false;

        // Solo due specie: 0/1 sono varianti cromatiche del giglio; 2 è la peonia.
        this.type = Math.floor(Math.random() * 3);

        this.seed = Math.floor(Math.random() * 999999);
        this.rng = mulberry32(this.seed);
        this.off = [];
        for (let i = 0; i < 60; i++) this.off.push(this.rng() * 2 - 1);

        // Dimensione dei fiori bilanciata
        this.sz = (this.type === 2
            ? 19 + Math.random() * 13
            : 20 + Math.random() * 13) * this.sizeScale * this.depth; // Gigli leggermente rimpiccioliti per mantenere le proporzioni
        this.x = clamp(x, this.sz * 4.25, W - this.sz * 4.25);
        // Ampliamo notevolmente il range per avere altezze molto variabili
        this.tgtY = this.isCompactScreen()
            ? H * (0.30 + Math.random() * 0.55) // Su mobile: dal 30% all'85% dello schermo
            : H * (0.15 + Math.random() * 0.70); // Su desktop: dal 15% all'85% dello schermo

        this.bRot = Math.random() * TAU;
        this.brPh = Math.random() * TAU;
        this.headCache = null;

        // Peony pink hue variation
        if (this.type === 2) {
            const v = Math.random();
            if (v < 0.33) this.peonySat = 'light';    // pale blush
            else if (v < 0.66) this.peonySat = 'mid';  // classic rose
            else this.peonySat = 'deep';                // deep magenta-pink
        }
    }

    isCompactScreen() {
        return Math.min(W, H) < 760;
    }

    resize(oldW, oldH) {
        const nextScale = clamp(Math.min(W, H) / 1000, 0.5, 1);
        const scaleRatio = nextScale / this.sizeScale;
        this.sizeScale = nextScale;
        this.sz *= scaleRatio;
        this.glR *= scaleRatio;
        this.stW *= scaleRatio;
        this.stCurve *= scaleRatio;
        this.swAm *= scaleRatio;
        this.headCache = null;
        this.x = clamp(this.x * W / oldW, this.sz * 4.25, W - this.sz * 4.25);
        this.curY = this.curY * H / oldH;
        this.tgtY = this.isCompactScreen()
            ? H * (0.30 + Math.random() * 0.55)
            : this.tgtY * H / oldH;
    }

    get tipX() {
        const breeze = Math.sin(gTime * 0.00042 + this.windPhase) * 0.58 + Math.sin(gTime * 0.00017 + this.x * 0.006) * 0.42;
        return this.x + Math.sin(this.swPh) * this.swAm + wind * this.windResponse * this.swAm * 0.9 + breeze * this.swAm * 0.32;
    }

    update() {
        if (!this.grown) {
            this.curY -= this.growV;
            if (this.curY <= this.tgtY) { this.curY = this.tgtY; this.grown = true; }
        } else {
            if (this.bloom < 1) this.bloom = Math.min(1, this.bloom + 0.08);
            this.swPh += this.swSp * (0.8 + Math.abs(wind) * 0.12);
            this.brPh += 0.013;
            this.life--;
            if (this.life <= 0) {
                this.op -= 0.1;
                if (!this.shed && Math.random() < 0.04) { this.shedPetal(); this.shed = true; }
                if (Math.random() < 0.012) this.shedPetal();
            }
        }
        if (mouse.x !== undefined) {
            const d = Math.hypot(this.tipX - mouse.x, this.curY - mouse.y);
            const p = clamp(1 - d / 220, 0, 1);
            this.gl = lerp(this.gl, lerp(this.baseGl, 2.2, p * p), 0.10);
        } else {
            this.gl = lerp(this.gl, this.baseGl, 0.04);
        }
        if (this.bloom > 0.8 && mouse.x !== undefined && particles.length < quality.maxParticles) {
            const d = Math.hypot(this.tipX - mouse.x, this.curY - mouse.y);
            if (d < 90 && Math.random() < 0.06) {
                const rgb = this.type === 2 ? '255,200,215' : '255,245,210';
                particles.push(new Particle(this.tipX, this.curY, rgb));
            }
        }
    }

    shedPetal() {
        const c = this.type === 2
            ? `rgba(${210 + Math.random()*40},${140+Math.random()*60},${160+Math.random()*40},0.75)`
            : `rgba(${240+Math.random()*15},${200+Math.random()*40},${210+Math.random()*30},0.75)`;
        fallingPetals.push(new FallingPetal(this.tipX, this.curY, c, this.sz));
    }

    /* ── STEM ── */
    drawStem(tx, ty) {
        const bx = this.x, by = H;
        const my = (by + ty) / 2;
        const cx = bx + this.stCurve + (tx - bx) * 0.35;

        // Shadow
        ctx.beginPath();
        ctx.moveTo(bx + 1.5, by);
        ctx.quadraticCurveTo(cx + 1.5, my + 1.5, tx + 1, ty);
        ctx.strokeStyle = 'rgba(0,0,0,0.20)';
        ctx.lineWidth = this.stW + 1.2;
        ctx.lineCap = 'round'; ctx.stroke();

        // Stem
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(cx, my, tx, ty);
        const sg = ctx.createLinearGradient(bx, by, tx, ty);
        sg.addColorStop(0, 'rgba(38,78,38,0.92)');
        sg.addColorStop(0.35, 'rgba(50,100,48,0.88)');
        sg.addColorStop(0.75, 'rgba(62,118,55,0.85)');
        sg.addColorStop(1, 'rgba(78,135,60,0.80)');
        ctx.strokeStyle = sg;
        ctx.lineWidth = this.stW;
        ctx.lineCap = 'round'; ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.moveTo(bx - 0.6, by);
        ctx.quadraticCurveTo(cx - 0.6, my, tx - 0.5, ty);
        ctx.strokeStyle = 'rgba(115,165,95,0.15)';
        ctx.lineWidth = 0.7; ctx.stroke();

        for (const ld of this.leafs) {
            const lx = qBez(bx, cx, tx, ld.t);
            const ly = qBez(by, my, ty, ld.t);
            const dt = 0.01;
            const nx = qBez(bx, cx, tx, ld.t + dt) - lx;
            const ny = qBez(by, my, ty, ld.t + dt) - ly;
            this.drawLeaf(lx, ly, ld.side, ld.sm, Math.atan2(ny, nx));
        }
    }

    drawLeaf(lx, ly, side, sm, sa) {
        const len = (22 + this.sz * 0.55) * sm;
        const w = 7.5 * sm;
        const a = sa + side * (-1.15 - Math.sin(this.swPh * 0.35) * 0.07);
        ctx.save();
        ctx.translate(lx, ly); ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(w, -len * 0.22, w * 0.9, -len * 0.72, 0, -len);
        ctx.bezierCurveTo(-w * 0.9, -len * 0.72, -w, -len * 0.22, 0, 0);
        const lg = ctx.createLinearGradient(0, 0, 0, -len);
        lg.addColorStop(0, 'rgba(42,88,42,0.88)');
        lg.addColorStop(0.5, 'rgba(55,110,48,0.82)');
        lg.addColorStop(1, 'rgba(68,125,55,0.68)');
        ctx.fillStyle = lg; ctx.fill();
        ctx.strokeStyle = 'rgba(32,70,32,0.20)';
        ctx.lineWidth = 0.4; ctx.stroke();
        // vein
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -len + 3);
        ctx.strokeStyle = 'rgba(35,72,35,0.30)'; ctx.lineWidth = 0.65; ctx.stroke();
        for (let i = 1; i <= 3; i++) {
            const vy = -len * (0.15 + i * 0.18);
            const vw = w * (0.60 - i * 0.08);
            ctx.beginPath();
            ctx.moveTo(0, vy); ctx.lineTo(vw * 0.75, vy - len * 0.05);
            ctx.moveTo(0, vy); ctx.lineTo(-vw * 0.75, vy - len * 0.05);
            ctx.strokeStyle = 'rgba(35,72,35,0.15)'; ctx.lineWidth = 0.35; ctx.stroke();
        }
        ctx.restore();
    }

    /* ── GLOW ── */
    drawGlow(tx, ty) {
        const r = this.glR * this.gl;
        if (r < 10) return;
        const rgb = this.type === 2 ? '255,190,210' : (this.type === 1 ? '255,195,210' : '255,250,235');
        const f = clamp(this.gl / 2.2, 0, 1);
        const g1 = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 1.6);
        g1.addColorStop(0, `rgba(${rgb},${0.22 * f})`);
        g1.addColorStop(0.35, `rgba(${rgb},${0.08 * f})`);
        g1.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(tx, ty, r * 1.6, 0, TAU); ctx.fill();
        const g2 = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 0.45);
        g2.addColorStop(0, `rgba(${rgb},${0.32 * f})`);
        g2.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(tx, ty, r * 0.45, 0, TAU); ctx.fill();
    }

    cacheFlowerHead(tx, ty) {
        const radius = this.sz * 4.25;
        const size = Math.ceil(radius * 2);
        const headCanvas = document.createElement('canvas');
        
        // Oversampling: moltiplichiamo la risoluzione della cache per 2 (oltre al dpr dinamico) 
        // per garantire margini netti e vettoriali anche durante gli zoom intensi
        const CACHE_MULT = 1.5; // Ridotto per ottimizzare le prestazioni
        
        headCanvas.width = Math.ceil(size * dpr * CACHE_MULT);
        headCanvas.height = Math.ceil(size * dpr * CACHE_MULT);
        const headContext = headCanvas.getContext('2d');
        if (!headContext) throw new Error('Impossibile creare la cache del fiore.');
        
        headContext.imageSmoothingEnabled = true;
        headContext.imageSmoothingQuality = 'high';
        
        // Applichiamo la scala al nuovo contesto
        headContext.scale(dpr * CACHE_MULT, dpr * CACHE_MULT);

        const mainContext = ctx;
        ctx = headContext;
        try {
            ctx.translate(radius - tx, radius - ty);
            if (this.type <= 1) this.drawLily(tx, ty, 1);
            else this.drawPeony(tx, ty, 1);
        } finally {
            ctx = mainContext;
        }
        // Salviamo anche la dimensione "size" per utilizzarla durante il disegno
        this.headCache = { canvas: headCanvas, radius, size };
    }

    /* ── BUD ── */
    drawBud(tx, ty) {
        const s = this.sz * 0.38;
        ctx.save(); ctx.translate(tx, ty);
        for (let i = 0; i < 3; i++) {
            ctx.save(); ctx.rotate((i / 3) * TAU + this.bRot);
            ctx.beginPath();
            ctx.moveTo(0, s * 0.15);
            ctx.bezierCurveTo(s * 0.22, 0, s * 0.18, -s * 0.55, 0, -s);
            ctx.bezierCurveTo(-s * 0.18, -s * 0.55, -s * 0.22, 0, 0, s * 0.15);
            const bg = ctx.createLinearGradient(0, s * 0.15, 0, -s);
            bg.addColorStop(0, 'rgba(65,115,55,0.90)');
            bg.addColorStop(0.5, 'rgba(80,135,65,0.85)');
            bg.addColorStop(1, this.type === 2 ? 'rgba(215,155,175,0.75)' : 'rgba(225,195,200,0.75)');
            ctx.fillStyle = bg; ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    /* ═══════════════════════════════════════
       LILY — Lollypop / Stargazer style
       White base with pink/magenta stripes,
       wide star-shaped petals that recurve,
       large prominent stamens with dark anthers
       ═══════════════════════════════════════ */
    drawLily(cx, cy, bloom) {
        const raw = bloom;
        bloom = easeOut3(bloom);
        const s = this.sz;
        const br = 1 + Math.sin(this.brPh) * 0.010;
        const sc = bloom * br;
        if (sc < 0.02) return;

        const isWhite = this.type === 0; // Lollypop: white + pink stripes
        // type 1 = full pink lily

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.bRot);

        // Subtle shadow
        if (bloom > 0.3) {
            ctx.save(); ctx.scale(1, 0.25);
            const sh = ctx.createRadialGradient(0, s * 3, 0, 0, s * 3, s * sc * 2);
            sh.addColorStop(0, `rgba(0,0,0,${0.10 * bloom})`);
            sh.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, s * 3, s * sc * 2, 0, TAU); ctx.fill();
            ctx.restore();
        }

        // ── 6 petals: 2 layers × 3 ──
        for (let layer = 0; layer < 2; layer++) {
            const lRot = layer * (Math.PI / 3);
            const lSc = layer === 0 ? 1.0 : 0.90;

            for (let i = 0; i < 3; i++) {
                const ang = (i / 3) * TAU + lRot + this.off[i + layer * 3] * 0.10 * bloom;
                ctx.save();
                ctx.rotate(ang);

                const pL = s * 2.8 * lSc * sc;   // petal length (longer)
                const pW = s * 0.75 * lSc * sc;  // petal width (wider — star shape)
                if (pL < 1) { ctx.restore(); continue; }

                // ── Petal shape — wide, star-shaped, tips recurve ──
                ctx.beginPath();
                ctx.moveTo(0, 0);
                // Right edge: wide belly
                ctx.bezierCurveTo(
                    pW * 0.9, -pL * 0.05,
                    pW * 1.35, -pL * 0.40,
                    pW * 0.55, -pL * 0.82
                );
                // Recurved pointed tip
                ctx.bezierCurveTo(
                    pW * 0.25, -pL * 1.02,
                    -pW * 0.25, -pL * 1.02,
                    -pW * 0.55, -pL * 0.82
                );
                // Left edge
                ctx.bezierCurveTo(
                    -pW * 1.35, -pL * 0.40,
                    -pW * 0.9, -pL * 0.05,
                    0, 0
                );

                // ── Base white/cream fill ──
                const pg = ctx.createLinearGradient(0, 0, 0, -pL);
                if (isWhite) {
                    // Lollypop: creamy white base
                    pg.addColorStop(0, 'rgba(252,248,235,0.96)');
                    pg.addColorStop(0.2, 'rgba(255,253,245,0.95)');
                    pg.addColorStop(0.5, 'rgba(255,255,250,0.93)');
                    pg.addColorStop(0.8, 'rgba(255,255,255,0.90)');
                    pg.addColorStop(1, 'rgba(250,252,245,0.85)');
                } else {
                    // Full pink lily
                    pg.addColorStop(0, 'rgba(200,85,120,0.96)');
                    pg.addColorStop(0.15, 'rgba(225,125,155,0.95)');
                    pg.addColorStop(0.35, 'rgba(240,160,180,0.93)');
                    pg.addColorStop(0.6, 'rgba(250,190,205,0.90)');
                    pg.addColorStop(0.85, 'rgba(255,215,225,0.87)');
                    pg.addColorStop(1, 'rgba(255,235,240,0.82)');
                }
                ctx.fillStyle = pg;
                ctx.fill();

                // ── Pink/magenta central stripe (Lollypop pattern) ──
                if (isWhite && pL > 3) {
                    ctx.save();
                    ctx.clip();

                    // Central wide stripe — vivid magenta-pink
                    const stripeW = pW * 0.55;
                    const sGrad = ctx.createLinearGradient(0, 0, 0, -pL);
                    sGrad.addColorStop(0, 'rgba(210,50,100,0.85)');
                    sGrad.addColorStop(0.15, 'rgba(225,70,120,0.75)');
                    sGrad.addColorStop(0.45, 'rgba(240,100,145,0.55)');
                    sGrad.addColorStop(0.70, 'rgba(245,140,170,0.25)');
                    sGrad.addColorStop(0.90, 'rgba(250,180,200,0.05)');
                    sGrad.addColorStop(1, 'rgba(255,220,230,0)');

                    ctx.fillStyle = sGrad;
                    // Paint stripe as a narrow shape
                    ctx.beginPath();
                    ctx.moveTo(-stripeW, 0);
                    ctx.bezierCurveTo(-stripeW * 0.8, -pL * 0.3, -stripeW * 0.4, -pL * 0.65, 0, -pL * 0.95);
                    ctx.bezierCurveTo(stripeW * 0.4, -pL * 0.65, stripeW * 0.8, -pL * 0.3, stripeW, 0);
                    ctx.closePath();
                    ctx.fill();

                    // Feathered edges of stripe
                    const featherGrad = ctx.createLinearGradient(-stripeW * 1.2, 0, stripeW * 1.2, 0);
                    featherGrad.addColorStop(0, 'rgba(220,60,110,0)');
                    featherGrad.addColorStop(0.2, 'rgba(220,60,110,0.15)');
                    featherGrad.addColorStop(0.5, 'rgba(210,50,100,0.30)');
                    featherGrad.addColorStop(0.8, 'rgba(220,60,110,0.15)');
                    featherGrad.addColorStop(1, 'rgba(220,60,110,0)');
                    ctx.fillStyle = featherGrad;
                    ctx.fillRect(-stripeW * 1.3, -pL * 0.65, stripeW * 2.6, pL * 0.45);

                    ctx.restore();
                }

                // ── 3D curvature highlight ──
                if (pL > 4) {
                    ctx.save(); ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(pW * 0.9, -pL * 0.05, pW * 1.35, -pL * 0.40, pW * 0.55, -pL * 0.82);
                    ctx.bezierCurveTo(pW * 0.25, -pL * 1.02, -pW * 0.25, -pL * 1.02, -pW * 0.55, -pL * 0.82);
                    ctx.bezierCurveTo(-pW * 1.35, -pL * 0.40, -pW * 0.9, -pL * 0.05, 0, 0);
                    ctx.clip();
                    const rg = ctx.createRadialGradient(pW * 0.2, -pL * 0.35, 0, 0, -pL * 0.4, pL * 0.55);
                    rg.addColorStop(0, 'rgba(255,255,255,0.22)');
                    rg.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = rg;
                    ctx.fillRect(-pW * 1.5, -pL * 1.1, pW * 3, pL * 1.2);
                    ctx.restore();
                }

                // ── Central vein ──
                ctx.beginPath();
                ctx.moveTo(0, -s * 0.1 * sc);
                ctx.bezierCurveTo(0, -pL * 0.3, pW * 0.02, -pL * 0.6, 0, -pL * 0.93);
                ctx.strokeStyle = isWhite ? 'rgba(190,180,170,0.22)' : 'rgba(180,100,130,0.18)';
                ctx.lineWidth = 0.6; ctx.stroke();

                // ── Side veins ──
                for (let v = 1; v <= 5; v++) {
                    const vy = -pL * (0.12 + v * 0.14);
                    const vSpread = pW * (0.35 + v * 0.10);
                    ctx.beginPath();
                    ctx.moveTo(0, vy);
                    ctx.quadraticCurveTo(vSpread * 0.55, vy - pL * 0.02, vSpread * 0.75, vy + pL * 0.005);
                    ctx.moveTo(0, vy);
                    ctx.quadraticCurveTo(-vSpread * 0.55, vy - pL * 0.02, -vSpread * 0.75, vy + pL * 0.005);
                    ctx.strokeStyle = isWhite ? 'rgba(185,180,170,0.12)' : 'rgba(180,100,135,0.10)';
                    ctx.lineWidth = 0.3; ctx.stroke();
                }

                // ── Edge highlight ──
                ctx.beginPath();
                ctx.moveTo(pW * 0.55, -pL * 0.82);
                ctx.bezierCurveTo(pW * 0.25, -pL * 1.02, -pW * 0.25, -pL * 1.02, -pW * 0.55, -pL * 0.82);
                ctx.strokeStyle = isWhite ? 'rgba(255,255,255,0.28)' : 'rgba(255,215,225,0.22)';
                ctx.lineWidth = 0.5; ctx.stroke();

                // ── Speckles ──
                if (raw > 0.55) {
                    const rng = mulberry32(this.seed + i * 19 + layer * 73);
                    const nDots = isWhite ? (6 + Math.floor(rng() * 5)) : (12 + Math.floor(rng() * 8));
                    for (let d = 0; d < nDots; d++) {
                        const dx = (rng() - 0.5) * pW * (isWhite ? 0.6 : 1.5);
                        const dy = -pL * (0.12 + rng() * 0.50);
                        const dr = 0.5 + rng() * (isWhite ? 0.8 : 0.6);
                        ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU);
                        ctx.fillStyle = isWhite
                            ? `rgba(170,40,70,${0.35 + rng() * 0.20})`
                            : `rgba(150,35,65,${0.25 + rng() * 0.15})`;
                        ctx.fill();
                    }
                }

                ctx.restore();
            }
        }

        // ── STAMENS — very prominent, dark anthers ──
        if (raw > 0.40) {
            const sa = clamp((raw - 0.40) / 0.60, 0, 1);
            const sE = easeOut3(sa);

            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * TAU + this.off[22] * 0.4;
                const sLen = s * 1.3 * sE;
                const spread = s * 0.38 * sE;
                const sx = Math.cos(a) * spread;
                const sy = Math.sin(a) * spread;

                // Filament — curved outward
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(
                    sx * 0.3, sy * 0.3 - sLen * 0.20,
                    sx * 0.7, sy * 0.7 - sLen * 0.35,
                    sx * 1.1, sy * 1.1 - sLen * 0.50
                );
                ctx.strokeStyle = `rgba(160,170,110,${0.55 * sa})`;
                ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.stroke();

                // Anther — large, dark brown-red, elongated
                ctx.save();
                ctx.translate(sx * 1.1, sy * 1.1 - sLen * 0.50);
                ctx.rotate(a + Math.PI * 0.35);
                ctx.beginPath();
                ctx.ellipse(0, 0, 3.8 * sE, 1.5 * sE, 0, 0, TAU);
                const aG = ctx.createLinearGradient(-4, 0, 4, 0);
                aG.addColorStop(0, `rgba(120,60,40,${0.92 * sa})`);
                aG.addColorStop(0.3, `rgba(150,80,50,${0.92 * sa})`);
                aG.addColorStop(0.5, `rgba(170,100,55,${0.92 * sa})`);
                aG.addColorStop(0.7, `rgba(150,75,45,${0.92 * sa})`);
                aG.addColorStop(1, `rgba(115,55,35,${0.92 * sa})`);
                ctx.fillStyle = aG; ctx.fill();
                // Pollen dust on anther
                ctx.beginPath();
                ctx.ellipse(0, 0, 3.2 * sE, 0.8 * sE, 0, 0, TAU);
                ctx.fillStyle = `rgba(210,175,60,${0.25 * sa})`; ctx.fill();
                ctx.restore();
            }

            // Central pistil
            const pH = s * 0.85 * sE;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -pH);
            ctx.strokeStyle = `rgba(130,155,85,${0.50 * sa})`;
            ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
            // Stigma — 3-lobed
            for (let j = 0; j < 3; j++) {
                const la = (j / 3) * TAU + 0.3;
                ctx.beginPath();
                ctx.arc(Math.cos(la) * 2.5 * sE, -pH + Math.sin(la) * 1.8 * sE, 1.8 * sE, 0, TAU);
                ctx.fillStyle = `rgba(120,145,65,${0.60 * sa})`; ctx.fill();
            }
        }

        ctx.restore();
    }

    /* ═══════════════════════════════════════
       PEONY — full, dense, PINK ball of petals
       Pale blush → classic rose → deep magenta
       Many tightly packed ruffled layers
       ═══════════════════════════════════════ */
    drawPeony(cx, cy, bloom) {
        const raw = bloom;
        bloom = easeOut3(bloom);
        const s = this.sz;
        const br = 1 + Math.sin(this.brPh) * 0.008;
        const sc = bloom * br;
        if (sc < 0.02) return;

        // Color palettes based on saturation
        let baseR, baseG, baseB;   // deep base color
        let midR, midG, midB;     // mid
        let lightR, lightG, lightB; // light tips
        let edgeR, edgeG, edgeB;   // edge tint

        if (this.peonySat === 'deep') {
            // Deep magenta-pink
            baseR = 185; baseG = 55; baseB = 95;
            midR = 210; midG = 95; midB = 130;
            lightR = 235; lightG = 155; lightB = 175;
            edgeR = 250; edgeG = 200; edgeB = 215;
        } else if (this.peonySat === 'mid') {
            // Classic rose pink
            baseR = 210; baseG = 110; baseB = 140;
            midR = 232; midG = 150; midB = 170;
            lightR = 248; lightG = 190; lightB = 205;
            edgeR = 255; edgeG = 225; edgeB = 235;
        } else {
            // Pale blush
            baseR = 232; baseG = 170; baseB = 185;
            midR = 245; midG = 200; midB = 212;
            lightR = 252; lightG = 228; lightB = 235;
            edgeR = 255; edgeG = 245; edgeB = 248;
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.bRot);

        // Shadow
        if (bloom > 0.25) {
            ctx.save(); ctx.scale(1, 0.22);
            const sh = ctx.createRadialGradient(0, s * 3.5, 0, 0, s * 3.5, s * sc * 2.2);
            sh.addColorStop(0, `rgba(0,0,0,${0.12 * bloom})`);
            sh.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, s * 3.5, s * sc * 2.2, 0, TAU); ctx.fill();
            ctx.restore();
        }

        // ── Peony layers — MANY more petals, tightly packed ──
        const layers = [
            { n: 11, rM: 1.10, sM: 1.0,  aO: 0,    },
            { n: 13, rM: 0.92, sM: 0.90, aO: 0.24,  },
            { n: 12, rM: 0.76, sM: 0.82, aO: 0.12,  },
            { n: 11, rM: 0.62, sM: 0.72, aO: 0.38,  },
            { n: 10, rM: 0.48, sM: 0.62, aO: 0.20,  },
            { n: 9,  rM: 0.36, sM: 0.52, aO: 0.50,  },
            { n: 8,  rM: 0.25, sM: 0.42, aO: 0.35,  },
            { n: 7,  rM: 0.15, sM: 0.32, aO: 0.65,  },
            { n: 6,  rM: 0.07, sM: 0.22, aO: 0.85,  },
        ];

        for (let li = 0; li < layers.length; li++) {
            const L = layers[li];
            const delay = li * 0.05;
            const lb = clamp((raw - delay) / (1 - delay), 0, 1);
            const lbE = easeOut2(lb);
            if (lbE < 0.01) continue;

            const radius = s * 2.4 * L.rM * lbE;
            const pSize = s * 1.4 * L.sM * lbE;
            const depth = li / layers.length; // 0=outer, 1=inner

            for (let i = 0; i < L.n; i++) {
                const angle = (i / L.n) * TAU + L.aO + this.off[(li * 7 + i) % 60] * 0.20;
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;

                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angle + Math.PI * 0.5 + this.off[(i + li * 4) % 60] * 0.12);

                const pw = pSize * (0.50 + this.off[(i + li) % 60] * 0.06);
                const ph = pSize * (0.82 + this.off[(i * 3 + li) % 60] * 0.06);
                if (ph < 0.6) { ctx.restore(); continue; }

                // ── Petal shape — rounder with ruffled edge ──
                const ruf = pw * 0.07 * (1 + this.off[(i * 2 + li) % 60] * 0.4);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(pw * 1.05, -ph * 0.04, pw * 1.20, -ph * 0.50, pw * 0.40, -ph * 0.88);
                // Ruffled top
                ctx.bezierCurveTo(pw * 0.25, -ph * 1.0 + ruf, pw * 0.10, -ph * 1.03, 0, -ph * 0.96 - ruf * 0.4);
                ctx.bezierCurveTo(-pw * 0.10, -ph * 1.03, -pw * 0.25, -ph * 1.0 + ruf, -pw * 0.40, -ph * 0.88);
                ctx.bezierCurveTo(-pw * 1.20, -ph * 0.50, -pw * 1.05, -ph * 0.04, 0, 0);

                // ── Color gradient — pink with depth variation ──
                const pg = ctx.createLinearGradient(0, 0, 0, -ph);
                // Outer layers darker, inner layers lighter
                const r1 = Math.round(lerp(baseR, lightR, depth * 0.6));
                const g1 = Math.round(lerp(baseG, lightG, depth * 0.6));
                const b1 = Math.round(lerp(baseB, lightB, depth * 0.6));
                const r2 = Math.round(lerp(midR, edgeR, depth * 0.5));
                const g2 = Math.round(lerp(midG, edgeG, depth * 0.5));
                const b2 = Math.round(lerp(midB, edgeB, depth * 0.5));
                const r3 = Math.round(lerp(lightR, edgeR, depth * 0.4));
                const g3 = Math.round(lerp(lightG, edgeG, depth * 0.4));
                const b3 = Math.round(lerp(lightB, edgeB, depth * 0.4));

                pg.addColorStop(0, `rgba(${r1},${g1},${b1},0.94)`);
                pg.addColorStop(0.3, `rgba(${r2},${g2},${b2},0.92)`);
                pg.addColorStop(0.65, `rgba(${r3},${g3},${b3},0.88)`);
                pg.addColorStop(1, `rgba(${edgeR},${edgeG},${edgeB},0.82)`);
                ctx.fillStyle = pg; ctx.fill();

                // ── 3D curvature ──
                if (ph > 3) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(pw * 1.05, -ph * 0.04, pw * 1.20, -ph * 0.50, pw * 0.40, -ph * 0.88);
                    ctx.bezierCurveTo(pw * 0.25, -ph * 1.0, 0, -ph * 1.03, -pw * 0.40, -ph * 0.88);
                    ctx.bezierCurveTo(-pw * 1.20, -ph * 0.50, -pw * 1.05, -ph * 0.04, 0, 0);
                    ctx.clip();

                    // Light highlight
                    const cg = ctx.createRadialGradient(pw * 0.12, -ph * 0.42, 0, 0, -ph * 0.42, ph * 0.45);
                    cg.addColorStop(0, `rgba(255,255,252,${0.18 - depth * 0.06})`);
                    cg.addColorStop(1, 'rgba(255,255,252,0)');
                    ctx.fillStyle = cg;
                    ctx.fillRect(-pw * 1.5, -ph * 1.1, pw * 3, ph * 1.2);

                    // Shadow at base
                    const baseS = ctx.createLinearGradient(0, 0, 0, -ph * 0.18);
                    const sR = Math.round(baseR * 0.7);
                    const sG = Math.round(baseG * 0.7);
                    const sB = Math.round(baseB * 0.7);
                    baseS.addColorStop(0, `rgba(${sR},${sG},${sB},${0.15 - depth * 0.06})`);
                    baseS.addColorStop(1, 'rgba(200,180,185,0)');
                    ctx.fillStyle = baseS;
                    ctx.fillRect(-pw * 1.5, 0, pw * 3, -ph * 0.22);

                    ctx.restore();
                }

                // Subtle edge line
                ctx.strokeStyle = `rgba(${Math.round(baseR*0.85)},${Math.round(baseG*0.85)},${Math.round(baseB*0.85)},${0.18 - depth * 0.08})`;
                ctx.lineWidth = 0.3; ctx.stroke();

                ctx.restore();
            }
        }

        // ── Golden center ──
        if (raw > 0.50) {
            const ca = easeOut3(clamp((raw - 0.50) / 0.50, 0, 1));

            // Innermost tiny curled petals
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * TAU + this.off[45];
                const r = s * 0.10 * ca;
                const ipx = Math.cos(a) * r;
                const ipy = Math.sin(a) * r;
                ctx.save();
                ctx.translate(ipx, ipy);
                ctx.rotate(a + Math.PI * 0.5);
                const tw = s * 0.06 * ca, th = s * 0.12 * ca;
                ctx.beginPath();
                ctx.ellipse(0, -th * 0.5, tw, th, 0, 0, TAU);
                ctx.fillStyle = `rgba(${Math.round(lerp(lightR,255,0.5))},${Math.round(lerp(lightG,240,0.5))},${Math.round(lerp(lightB,225,0.5))},${0.55 * ca})`;
                ctx.fill();
                ctx.restore();
            }

            // Pistils
            const rng = mulberry32(this.seed + 777);
            for (let i = 0; i < 22; i++) {
                const a = rng() * TAU;
                const r = rng() * s * 0.12;
                const ppx = Math.cos(a) * r;
                const ppy = Math.sin(a) * r;
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(ppx, ppy);
                ctx.strokeStyle = `rgba(195,170,55,${0.28 * ca})`;
                ctx.lineWidth = 0.35; ctx.stroke();
                ctx.beginPath();
                ctx.arc(ppx, ppy, 0.6 + rng() * 0.8, 0, TAU);
                const dG = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, 1.4);
                dG.addColorStop(0, `rgba(225,190,45,${0.85 * ca})`);
                dG.addColorStop(1, `rgba(195,160,30,${0.50 * ca})`);
                ctx.fillStyle = dG; ctx.fill();
            }
        }

        ctx.restore();
    }

    /* ── MAIN DRAW ── */
    draw() {
        ctx.globalAlpha = clamp(this.op, 0, 1);
        const tx = this.tipX, ty = this.curY;
        this.drawStem(tx, ty);
        this.drawGlow(tx, ty);
        if (this.grown) {
            if (this.bloom < 0.04) {
                this.drawBud(tx, ty);
            } else {
                if (!this.headCache) this.cacheFlowerHead(tx, ty);
                const { canvas: head, radius, size } = this.headCache;
                const sc = easeOut3(this.bloom);
                const curSize = size * sc;
                ctx.save();
                ctx.translate(tx, ty);
                ctx.drawImage(head, -curSize / 2, -curSize / 2, curSize, curSize);
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;
    }
}

/* ═══════ BACKGROUND ═══════ */
function buildBG() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = W * dpr;
    bgCanvas.height = H * dpr;
    const b = bgCanvas.getContext('2d');
    
    b.scale(dpr, dpr);
    
    // 1. Sfondo base: Gradiente crepuscolare / notturno magico
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#090a0f');    // Cielo scuro in alto
    g.addColorStop(0.4, '#101326');  // Blu notte profondo
    g.addColorStop(0.8, '#1a1423');  // Tocco violaceo/crepuscolo scuro
    g.addColorStop(1, '#050408');    // Terreno scurissimo
    b.fillStyle = g; 
    b.fillRect(0, 0, W, H);

    // 2. Luce soffusa centrale/bassa (Glow atmosferico per far risaltare i fiori)
    const glow = b.createRadialGradient(W * 0.5, H * 0.8, 0, W * 0.5, H * 0.8, Math.max(W, H) * 0.65);
    glow.addColorStop(0, 'rgba(65, 40, 75, 0.18)'); // Tocco magenta/prugna caldo
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    b.fillStyle = glow;
    b.fillRect(0, 0, W, H);
    
    // 3. Piccole stelle / pulviscolo magico (luce netta)
    for (let i = 0; i < Math.min(70, Math.floor(W * H / 18000)); i++) {
        b.beginPath();
        const x = Math.random() * W;
        const y = Math.random() * H * 0.8;
        b.arc(x, y, 0.2 + Math.random() * 1.2, 0, TAU);
        b.fillStyle = `rgba(255,250,245,${0.1 + Math.random() * 0.4})`;
        b.fill();
    }

    // 4. Effetto Bokeh / Lucciole sfuocate sullo sfondo per dare molta profondità
    for (let i = 0; i < Math.min(25, Math.floor(W * H / 50000)); i++) {
        b.beginPath();
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 4 + Math.random() * 18; // Sfere più grandi
        b.arc(x, y, r, 0, TAU);
        const bok = b.createRadialGradient(x, y, 0, x, y, r);
        bok.addColorStop(0, `rgba(255, 215, 170, ${0.02 + Math.random() * 0.05})`);
        bok.addColorStop(1, 'rgba(255, 215, 170, 0)');
        b.fillStyle = bok;
        b.fill();
    }

    // Foschia bassa e morbida per separare i piani del giardino.
    const haze = b.createLinearGradient(0, H * 0.58, 0, H);
    haze.addColorStop(0, 'rgba(104,92,112,0)');
    haze.addColorStop(0.62, 'rgba(110,94,115,0.055)');
    haze.addColorStop(1, 'rgba(15,22,22,0.28)');
    b.fillStyle = haze;
    b.fillRect(0, H * 0.55, W, H * 0.45);

    // Silhouette vegetale su più piani: felci, foglie lanceolate e ciuffi d'erba.
    // Disegnata una sola volta nel fondale per contenere il costo per frame.
    for (let layer = 0; layer < 3; layer++) {
        const baseline = H * (0.91 + layer * 0.035);
        const count = Math.max(18, Math.floor(W / (layer === 0 ? 24 : 34)));
        for (let i = 0; i < count; i++) {
            const x = (i / Math.max(1, count - 1)) * W + (Math.random() - 0.5) * 24;
            const height = (22 + Math.random() * 90) * (1 - layer * 0.22);
            const lean = (Math.random() - 0.5) * height * 0.55;
            b.save();
            b.globalAlpha = 0.22 + layer * 0.10;
            b.strokeStyle = layer === 0 ? '#314b37' : layer === 1 ? '#263b31' : '#1a2b27';
            b.fillStyle = layer === 0 ? '#38533b' : layer === 1 ? '#293f32' : '#1d3029';
            b.lineWidth = 1 + layer * 0.45;
            b.beginPath(); b.moveTo(x, baseline); b.quadraticCurveTo(x + lean * 0.45, baseline - height * 0.55, x + lean, baseline - height); b.stroke();
            for (let leaf = 0; leaf < 3; leaf++) {
                const t = 0.25 + leaf * 0.22;
                const lx = x + lean * t;
                const ly = baseline - height * t;
                const side = leaf % 2 ? 1 : -1;
                const leafLen = height * (0.22 + Math.random() * 0.12);
                b.beginPath(); b.moveTo(lx, ly);
                b.quadraticCurveTo(lx + side * leafLen * 0.55, ly - leafLen * 0.72, lx + side * leafLen, ly - leafLen * 0.78);
                b.quadraticCurveTo(lx + side * leafLen * 0.45, ly - leafLen * 0.15, lx, ly); b.fill();
            }
            b.restore();
        }
    }
}

/* ═══════ LOOP ═══════ */
let animate = function(time) {
    gTime = time;
    if (time - lastWindChange > 3600 + Math.random() * 4200) {
        windTarget = (Math.random() - 0.5) * 1.55;
        lastWindChange = time;
    }
    wind = lerp(wind, windTarget, 0.006);
    for (let i = flowers.length - 1; i >= 0; i--) {
        const f = flowers[i];
        f.update();
        if (f.op <= 0) flowers.splice(i, 1);
    }
    if (mouse.x !== undefined && time - lastST > 150) {
        spawnFlower(mouse.x, time);
    }
    for (let i = fallingPetals.length - 1; i >= 0; i--) {
        const p = fallingPetals[i];
        p.update();
        if (p.op <= 0) fallingPetals.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.op < 0.01 || p.life <= 0) particles.splice(i, 1);
    }

    ctx.drawImage(bgCanvas, 0, 0, W, H);
    flowers.sort((a, b) => a.curY - b.curY);
    for (const f of flowers) f.draw();
    for (const p of fallingPetals) p.draw();
    for (const p of particles) p.draw();
    rafId = requestAnimationFrame(animate);
}

/* ═══════ INTERACTION ═══════ */
let lastSX = -999, lastSY = -999, lastST = 0;
let rafId = 0;
let isRunning = true;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function addFlower(x, time) {
    if (flowers.length >= maxFlowers) {
        let oldestIndex = 0;
        for (let i = 1; i < flowers.length; i++) {
            if (flowers[i].id < flowers[oldestIndex].id) oldestIndex = i;
        }
        flowers.splice(oldestIndex, 1);
    }
    flowers.push(new Flower(x + (Math.random() - 0.5) * 16));
    lastST = time;
}

function spawnAlongPath(x, y, time) {
    if (lastSX === -999) {
        addFlower(x, time);
        lastSX = x;
        lastSY = y;
        return;
    }

    const dx = x - lastSX;
    const dy = y - lastSY;
    const distance = Math.hypot(dx, dy);
    const spacing = 18;
    const steps = Math.floor(distance / spacing);
    if (steps === 0) return;

    const stepX = dx / distance * spacing;
    const stepY = dy / distance * spacing;
    for (let i = 1; i <= steps; i++) {
        addFlower(lastSX + stepX * i, time);
    }
    lastSX += stepX * steps;
    lastSY += stepY * steps;
}

function spawnFlower(x, time) {
    if (time - lastST <= 60) return;
    addFlower(x, time);
}

function interact(e) {
    if (!hasInteracted) {
        instr?.classList.add('hidden');
        hasInteracted = true;
    }
    const cx = e.clientX;
    const cy = e.clientY;
    mouse.x = cx; mouse.y = cy;
    spawnAlongPath(cx, cy, performance.now());
}
function clrM() { mouse.x = undefined; mouse.y = undefined; }

function onVisibilityChange() {
    if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(rafId);
    } else if (!isRunning) {
        isRunning = true;
        rafId = requestAnimationFrame(animate);
    }
}

canvas.addEventListener('pointermove', interact, { passive: true });
canvas.addEventListener('pointerdown', interact, { passive: true });
canvas.addEventListener('pointerleave', clrM, { passive: true });
canvas.addEventListener('pointercancel', clrM, { passive: true });
document.addEventListener('visibilitychange', onVisibilityChange);

if (reducedMotion) {
    // Preserve the interactive experience while lowering update frequency.
    const originalAnimate = animate;
    animate = function(time) {
        originalAnimate(time);
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = window.setTimeout(() => { rafId = requestAnimationFrame(animate); }, 50);
        }
    };
}

rafId = requestAnimationFrame(animate);

return () => {
    cancelAnimationFrame(rafId);
    window.clearTimeout(rafId);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize);
    canvas.removeEventListener('pointermove', interact);
    canvas.removeEventListener('pointerdown', interact);
    canvas.removeEventListener('pointerleave', clrM);
    canvas.removeEventListener('pointercancel', clrM);
    document.removeEventListener('visibilitychange', onVisibilityChange);
};
}
