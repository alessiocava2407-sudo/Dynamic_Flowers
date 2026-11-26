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
  flowerGeometry,
  makeFaller,
  makeFlower,
  type FallingPetal,
  type Flower,
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
    </defs>
  );
}

function FlowerShape({ flower, w, h, detail }: { flower: Flower; w: number; h: number; detail: boolean }) {
  const geometry = useMemo(
    () => flowerGeometry(flower, w, h, detail),
    [flower, w, h, detail],
  );
  const scale = clamp(Math.min(w, h) / 780, 0.62, 1.2);
  const s = flower.size * scale;
  const tipY = -flower.height * h;

  const vars: Vars = {
    "--sway-from": `${px(-flower.sway)}deg`,
    "--sway-to": `${px(flower.sway)}deg`,
    "--sway-dur": `${px(flower.swayDuration)}s`,
    "--sway-delay": `${px(flower.swayDelay)}s`,
    "--bloom-delay": `${px(flower.bloomDelay)}s`,
  };

  return (
    <g transform={`translate(${px(flower.nx * w)} ${h})`} className="flower">
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

export default function FlowerGarden() {
  const rootRef = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [flowers, setFlowers] = useState<Flower[]>([]);
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (interactedRef.current) return;
      const w = sizeRef.current.w;
      if (!w) return;
      const count = w < 760 ? 2 : 3;
      for (let i = 0; i < count; i++) {
        addFlower(0.24 + (0.52 * i) / Math.max(1, count - 1));
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [addFlower]);

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
      hideInstructions();
      addFlower(normalizedX(event));
      lastRef.current = { x: event.clientX, y: event.clientY, t: now, down: last.down };
    }
  };

  const endPointer = () => {
    lastRef.current = { x: -9999, y: -9999, t: 0, down: false };
  };

  const detail = size.w >= 720;

  return (
    <main
      ref={rootRef}
      className="garden"
      aria-label="Giardino animato di gigli e peonie"
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
          {flowers.map((flower) => (
            <FlowerShape key={flower.id} flower={flower} w={size.w} h={size.h} detail={detail} />
          ))}
          {fallers.map((petal) => (
            <FallingPetalShape key={petal.id} petal={petal} w={size.w} h={size.h} />
          ))}
        </svg>
      )}
      <p className={interacted ? "garden__instructions hidden" : "garden__instructions"}>
        Muovi il puntatore o tocca lo schermo
        <span>Un piccolo giardino prende vita al tuo passaggio</span>
      </p>
    </main>
  );
}
