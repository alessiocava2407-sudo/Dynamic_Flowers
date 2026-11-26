"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  bouquetTargets,
  flowerGeometry,
  makeFaller,
  makeFlower,
  type FallingPetal,
  type Flower,
  type FlowerTarget,
} from "@/lib/garden";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const px = (v: number) => Math.round(v * 100) / 100;

function Defs() {
  return (
    <defs>
      <linearGradient id="sky-stem" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#264e2c" />
        <stop offset="0.5" stopColor="#3e7640" />
        <stop offset="1" stopColor="#59904b" />
      </linearGradient>
      <linearGradient id="sky-leaf" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#2f5c2c" />
        <stop offset="1" stopColor="#6a9b55" />
      </linearGradient>
      <linearGradient id="lily-white" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#f4ecdc" />
        <stop offset="0.5" stopColor="#fffdf6" />
        <stop offset="1" stopColor="#eef4ec" />
      </linearGradient>
      <linearGradient id="lily-pink" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#c8567a" />
        <stop offset="0.4" stopColor="#f0a2bb" />
        <stop offset="1" stopColor="#ffe0e9" />
      </linearGradient>
      <linearGradient id="lily-stripe" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#c93268" stopOpacity="0.85" />
        <stop offset="0.55" stopColor="#e86b9b" stopOpacity="0.4" />
        <stop offset="1" stopColor="#f5bdd0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="lily-stripe-pink" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#a81548" stopOpacity="0.75" />
        <stop offset="0.55" stopColor="#d44a78" stopOpacity="0.3" />
        <stop offset="1" stopColor="#f0a8c0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="peony-deep" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#a8335c" />
        <stop offset="0.5" stopColor="#d7608d" />
        <stop offset="1" stopColor="#f5b8cb" />
      </linearGradient>
      <linearGradient id="peony-mid" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#c15b83" />
        <stop offset="0.5" stopColor="#e995b5" />
        <stop offset="1" stopColor="#ffe1eb" />
      </linearGradient>
      <linearGradient id="peony-light" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#dd9db4" />
        <stop offset="0.5" stopColor="#f5cfdd" />
        <stop offset="1" stopColor="#fff5f8" />
      </linearGradient>
      <radialGradient id="peony-heart">
        <stop offset="0" stopColor="#f7dc72" />
        <stop offset="1" stopColor="#b9793c" />
      </radialGradient>
      <radialGradient id="lily-heart">
        <stop offset="0" stopColor="#f6dc73" />
        <stop offset="1" stopColor="#b58b3d" />
      </radialGradient>
      <radialGradient id="flower-glow">
        <stop offset="0" stopColor="#ffe6e8" stopOpacity="0.2" />
        <stop offset="0.55" stopColor="#ffd8e0" stopOpacity="0.07" />
        <stop offset="1" stopColor="#ffd8e0" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ribbon-band" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#b5406c" />
        <stop offset="0.5" stopColor="#f2a8c2" />
        <stop offset="1" stopColor="#b5406c" />
      </linearGradient>
      <linearGradient id="ribbon-loop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6c3d4" />
        <stop offset="1" stopColor="#a8345e" />
      </linearGradient>
    </defs>
  );
}

function FlowerShape({
  flower,
  w,
  h,
  detail,
  target,
}: {
  flower: Flower;
  w: number;
  h: number;
  detail: boolean;
  target?: FlowerTarget;
}) {
  const geometry = useMemo(
    () => flowerGeometry(flower, w, h, detail),
    [flower, w, h, detail],
  );
  const scale = clamp(Math.min(w, h) / 780, 0.62, 1.2);
  const s = flower.size * scale;
  const tipY = -flower.height * h;
  const place = target ?? { x: flower.nx * w, y: h, scale: 1, rotate: 0 };

  const vars: Vars = {
    "--sway-from": `${px(-flower.sway)}deg`,
    "--sway-to": `${px(flower.sway)}deg`,
    "--sway-dur": `${px(flower.swayDuration)}s`,
    "--sway-delay": `${px(flower.swayDelay)}s`,
    "--bloom-delay": `${px(flower.bloomDelay)}s`,
    "--bouquet-delay": `${px(target?.delay ?? 0)}s`,
  };

  return (
    <g
      className={target ? "flower flower--bouquet" : "flower"}
      style={
        {
          transform: `translate(${px(place.x)}px, ${px(place.y)}px) rotate(${px(place.rotate)}deg) scale(${px(place.scale)})`,
          "--bouquet-delay": `${px(target?.delay ?? 0)}s`,
        } as Vars
      }
    >
      <g className="flower__sway" style={vars}>
        <path className="flower__stem" d={geometry.stem} />
        {geometry.leaves.map((d, i) => (
          <path key={i} className="flower__leaf" d={d} />
        ))}
        <g transform={`translate(0 ${px(tipY)})`}>
          <circle className="flower__glow" r={px(s * 3.1)} fill="url(#flower-glow)" />
        </g>
        <g
          className="flower__head"
          transform={`translate(0 ${px(tipY)}) rotate(${px(flower.rotation)})`}
        >
          <g className="flower__bloom" style={vars}>
            {geometry.petals.map((petal, i) => (
              <g key={i} transform={`translate(${petal.x} ${petal.y}) rotate(${petal.rotation})`}>
                <path d={petal.d} fill={petal.fill} className="flower__petal" />
              </g>
            ))}
            {geometry.markings.map((mark, i) => (
              <g key={`m${i}`} transform={`translate(${mark.x} ${mark.y}) rotate(${mark.rotation})`}>
                <path d={mark.d} fill={mark.fill} className="flower__marking" />
              </g>
            ))}
            {geometry.veins.map((vein, i) => (
              <g key={`v${i}`} transform={`translate(${vein.x} ${vein.y}) rotate(${vein.rotation})`}>
                <path d={vein.d} className="flower__vein" />
              </g>
            ))}
            {geometry.stamens.map((d, i) => (
              <path key={`s${i}`} d={d} className="flower__stamen" />
            ))}
            {geometry.anthers.map((anther, i) => (
              <ellipse
                key={`a${i}`}
                cx={anther.x}
                cy={anther.y}
                rx={anther.rx}
                ry={anther.ry}
                transform={`rotate(${anther.rotation} ${anther.x} ${anther.y})`}
                className="flower__anther"
              />
            ))}
            <circle cx={geometry.center.x} cy={geometry.center.y} r={geometry.center.r} fill={geometry.center.fill} />
          </g>
        </g>
      </g>
    </g>
  );
}

function FallingPetalShape({ petal, w, h }: { petal: FallingPetal; w: number; h: number }) {
  const s = petal.size;
  const d = `M 0 0 C ${px(s * 0.5)} ${px(-s * 0.1)}, ${px(s * 0.62)} ${px(-s * 0.45)}, ${px(s * 0.42)} ${px(-s * 0.7)} C ${px(s * 0.18)} ${px(-s * 0.94)}, ${px(s * 0.05)} ${px(-s * 0.99)}, 0 ${px(-s)} C ${px(-s * 0.05)} ${px(-s * 0.99)}, ${px(-s * 0.18)} ${px(-s * 0.94)}, ${px(-s * 0.42)} ${px(-s * 0.7)} C ${px(-s * 0.62)} ${px(-s * 0.45)}, ${px(-s * 0.5)} ${px(-s * 0.1)}, 0 0 Z`;
  const vars: Vars = {
    "--fall-drift": `${px(petal.drift)}px`,
    "--fall-distance": `${px(h * 1.15)}px`,
    "--fall-duration": `${px(petal.duration)}s`,
    "--fall-spin": `${px(petal.rotate)}deg`,
  };
  return (
    <g transform={`translate(${px(petal.nx * w)} ${px(petal.y)})`}>
      <g className="faller" style={vars}>
        <path d={d} fill={petal.color} transform={`rotate(${px(petal.rotate)})`} />
      </g>
    </g>
  );
}

function Ribbon({ w, h }: { w: number; h: number }) {
  const cx = w / 2;
  const cy = h * 0.83;
  const half = Math.min(w * 0.1, 52);
  const bandH = Math.max(10, Math.min(h * 0.018, 14));
  const drop = Math.min(h * 0.055, 34);

  return (
    <g className="ribbon" aria-hidden="true">
      <path
        d={`M ${px(cx - half * 0.32)} ${px(cy + bandH * 0.25)} Q ${px(cx - half * 0.7)} ${px(cy + drop * 0.55)}, ${px(cx - half * 0.45)} ${px(cy + drop)} L ${px(cx - half * 0.04)} ${px(cy + bandH * 0.45)} Z`}
        fill="url(#ribbon-loop)"
      />
      <path
        d={`M ${px(cx + half * 0.32)} ${px(cy + bandH * 0.25)} Q ${px(cx + half * 0.7)} ${px(cy + drop * 0.55)}, ${px(cx + half * 0.45)} ${px(cy + drop)} L ${px(cx + half * 0.04)} ${px(cy + bandH * 0.45)} Z`}
        fill="url(#ribbon-loop)"
      />
      <rect
        x={px(cx - half)}
        y={px(cy - bandH / 2)}
        width={px(half * 2)}
        height={px(bandH)}
        rx={px(bandH / 2)}
        fill="url(#ribbon-band)"
      />
      <ellipse cx={px(cx - half * 0.42)} cy={px(cy)} rx={px(half * 0.26)} ry={px(bandH * 0.62)} fill="url(#ribbon-loop)" />
      <ellipse cx={px(cx + half * 0.42)} cy={px(cy)} rx={px(half * 0.26)} ry={px(bandH * 0.62)} fill="url(#ribbon-loop)" />
      <circle cx={px(cx)} cy={px(cy)} r={px(bandH * 0.45)} fill="#c9527b" />
    </g>
  );
}

export default function FlowerGarden() {
  const rootRef = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [bouquet, setBouquet] = useState<Flower[] | null>(null);
  const [fallers, setFallers] = useState<FallingPetal[]>([]);
  const [interacted, setInteracted] = useState(false);

  const sizeRef = useRef(size);
  const flowersRef = useRef<Flower[]>([]);
  const interactedRef = useRef(false);
  const flowerId = useRef(1);
  const fallerId = useRef(1);
  const lastRef = useRef({ x: -9999, y: -9999, t: 0, down: false });
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const rect = root.getBoundingClientRect();
      const next = { w: Math.round(rect.width), h: Math.round(rect.height) };
      sizeRef.current = next;
      setSize((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  const addFlower = useCallback((nx: number) => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const compact = Math.min(w, h) < 760;
    const max = compact ? 10 : 16;
    const next = flowersRef.current.slice();

    while (next.length >= max) {
      const old = next.shift();
      if (!old) continue;
      const petal = makeFaller(fallerId.current++, old, h);
      setFallers((prev) => [...prev, petal].slice(-8));
      const timer = window.setTimeout(
        () => setFallers((prev) => prev.filter((p) => p.id !== petal.id)),
        (petal.duration + 0.3) * 1000,
      );
      timersRef.current.push(timer);
    }

    next.push(makeFlower(flowerId.current++, nx, compact));
    flowersRef.current = next;
    setFlowers(next);
  }, []);

  const clearGarden = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
    flowersRef.current = [];
    setBouquet(null);
    setFlowers([]);
    setFallers([]);
  }, []);

  const cutGarden = useCallback(() => {
    if (!flowersRef.current.length) return;
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
    setFallers([]);
    setBouquet(flowersRef.current.slice());
  }, []);

  useEffect(
    () => () => {
      for (const timer of timersRef.current) window.clearTimeout(timer);
    },
    [],
  );

  const hideInstructions = useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }, []);

  const normalizedX = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return 0.5;
    return clamp((event.clientX - rect.left) / rect.width, 0.06, 0.94);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (bouquet) clearGarden();
    hideInstructions();
    addFlower(normalizedX(event));
    lastRef.current = { x: event.clientX, y: event.clientY, t: performance.now(), down: true };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const last = lastRef.current;
    if (event.pointerType === "touch" && !last.down) return;
    const now = performance.now();
    const distance = Math.hypot(event.clientX - last.x, event.clientY - last.y);
    const minDistance = sizeRef.current.w < 760 ? 34 : 42;
    if (last.x < -1000 || (distance >= minDistance && now - last.t >= 80)) {
      if (bouquet) clearGarden();
      hideInstructions();
      addFlower(normalizedX(event));
      lastRef.current = { x: event.clientX, y: event.clientY, t: now, down: last.down };
    }
  };

  const endPointer = () => {
    lastRef.current = { x: -9999, y: -9999, t: 0, down: false };
  };

  const detail = size.w >= 720;
  const bouquetTargetsMap = useMemo(
    () => (bouquet ? bouquetTargets(bouquet, size.w, size.h) : null),
    [bouquet, size.w, size.h],
  );

  return (
    <main
      ref={rootRef}
      className="garden"
      aria-label="Interactive Canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
    >
      <div className="garden__stars" aria-hidden="true" />
      <div className="garden__haze" aria-hidden="true" />
      {size.w > 0 && size.h > 0 && (
        <svg
          className="garden__scene"
          viewBox={`0 0 ${size.w} ${size.h}`}
          aria-hidden="true"
          focusable="false"
        >
          <Defs />
          {(bouquet ?? flowers).map((flower) => {
            const target = bouquetTargetsMap?.get(flower.id);
            const shown = target ? { ...flower, height: target.height } : flower;
            return (
              <FlowerShape
                key={flower.id}
                flower={shown}
                w={size.w}
                h={size.h}
                detail={detail}
                target={target}
              />
            );
          })}
          {fallers.map((petal) => (
            <FallingPetalShape key={petal.id} petal={petal} w={size.w} h={size.h} />
          ))}
          {bouquet && <Ribbon w={size.w} h={size.h} />}
        </svg>
      )}
      <button
        type="button"
        className={flowers.length > 0 && !bouquet ? "garden__cut" : "garden__cut is-hidden"}
        aria-label="Taglia i fiori e crea un mazzo"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onClick={() => {
          hideInstructions();
          cutGarden();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="6" cy="18" r="2.4" />
          <path d="M8 7.6 20 18M8 16.4 20 6M12 12h-2" />
        </svg>
      </button>
      <p className={interacted ? "garden__instructions hidden" : "garden__instructions"}>
        Muovi il mouse o tocca lo schermo
      </p>
    </main>
  );
}
