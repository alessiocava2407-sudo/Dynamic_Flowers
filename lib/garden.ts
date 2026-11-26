/**
 * Geometry helpers for the SVG garden.
 *
 * Everything is derived from a flower's seed so a React re-render (or a
 * resize) never changes the shape of a flower that is already on screen.
 */

export type FlowerKind = "white-lily" | "pink-lily" | "peony";

export interface Flower {
  id: number;
  /** horizontal position, 0..1 of the viewport width */
  nx: number;
  /** stem length, 0..1 of the viewport height */
  height: number;
  /** base head size in CSS pixels */
  size: number;
  kind: FlowerKind;
  /** 0 = deep, 1 = medium, 2 = light (peonies only) */
  tone: number;
  curve: number;
  rotation: number;
  sway: number;
  swayDuration: number;
  swayDelay: number;
  bloomDelay: number;
}

export interface FallingPetal {
  id: number;
  nx: number;
  y: number;
  drift: number;
  duration: number;
  rotate: number;
  size: number;
  color: string;
}

export interface Petal {
  d: string;
  x: number;
  y: number;
  rotation: number;
  fill: string;
}

export interface Anther {
  x: number;
  y: number;
  rotation: number;
  rx: number;
  ry: number;
}

export interface Geometry {
  stem: string;
  leaves: string[];
  petals: Petal[];
  /** Stripes and other details drawn on top of the petals. */
  markings: Petal[];
  veins: Petal[];
  center: { x: number; y: number; r: number; fill: string };
  stamens: string[];
  anthers: Anther[];
}

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeFlower(id: number, nx: number, compact: boolean): Flower {
  const rnd = mulberry32(id * 2654435761 + 17);
  const roll = rnd();
  const kind: FlowerKind = roll < 0.42 ? "white-lily" : roll < 0.7 ? "pink-lily" : "peony";

  return {
    id,
    nx: clamp(nx, 0.06, 0.94),
    // Shorter stems: the flowers stay in the lower half of the viewport.
    height: 0.22 + rnd() * 0.3,
    size: (compact ? 20 : 24) + rnd() * 9,
    kind,
    tone: Math.floor(rnd() * 3),
    curve: (rnd() - 0.5) * 46,
    rotation: rnd() * 360,
    sway: 1.2 + rnd() * 2.1,
    swayDuration: 5 + rnd() * 4,
    swayDelay: -rnd() * 9,
    // Bloom starts while the stem is still rising, so there is no empty gap.
    bloomDelay: 0.42 + rnd() * 0.2,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function petalPath(len: number, wide: number, ruffled: boolean) {
  if (ruffled) {
    // Slight notch at the tip: a peony petal is angular, not a rounded blob.
    return (
      `M 0 0 ` +
      `C ${round(wide * 0.85)} ${round(-len * 0.04)}, ${round(wide * 1.18)} ${round(-len * 0.4)}, ${round(wide * 0.6)} ${round(-len * 0.78)} ` +
      `C ${round(wide * 0.36)} ${round(-len * 0.96)}, ${round(wide * 0.1)} ${round(-len * 0.98)}, 0 ${round(-len * 0.92)} ` +
      `C ${round(-wide * 0.1)} ${round(-len * 0.98)}, ${round(-wide * 0.36)} ${round(-len * 0.96)}, ${round(-wide * 0.6)} ${round(-len * 0.78)} ` +
      `C ${round(-wide * 1.18)} ${round(-len * 0.4)}, ${round(-wide * 0.85)} ${round(-len * 0.04)}, 0 0 Z`
    );
  }
  return lilyPetalPath(len, wide);
}

/** A long, narrow lily tepal: softly rounded base, curved sides, pointed tip. */
function lilyPetalPath(len: number, wide: number) {
  // A tiny quadratic at the base removes the cusp where the two sides meet,
  // without making the tepal look like a droplet.
  const b = wide * 0.2;
  return (
    `M ${round(-b)} 0 ` +
    `Q 0 ${round(b * 0.55)}, ${round(b)} 0 ` +
    `C ${round(wide * 0.42)} ${round(-len * 0.06)}, ${round(wide * 0.86)} ${round(-len * 0.28)}, ${round(wide * 0.88)} ${round(-len * 0.5)} ` +
    `C ${round(wide * 0.76)} ${round(-len * 0.67)}, ${round(wide * 0.3)} ${round(-len * 0.88)}, 0 ${round(-len)} ` +
    `C ${round(-wide * 0.3)} ${round(-len * 0.88)}, ${round(-wide * 0.76)} ${round(-len * 0.67)}, ${round(-wide * 0.88)} ${round(-len * 0.5)} ` +
    `C ${round(-wide * 0.86)} ${round(-len * 0.28)}, ${round(-wide * 0.42)} ${round(-len * 0.06)}, ${round(-b)} 0 Z`
  );
}

/** Central streak that gives a lily its recognisable look. */
function lilyStripePath(len: number, wide: number) {
  return (
    `M 0 ${round(-len * 0.06)} ` +
    `C ${round(wide * 0.42)} ${round(-len * 0.16)}, ${round(wide * 0.9)} ${round(-len * 0.36)}, ${round(wide * 0.7)} ${round(-len * 0.58)} ` +
    `C ${round(wide * 0.58)} ${round(-len * 0.72)}, ${round(wide * 0.24)} ${round(-len * 0.84)}, 0 ${round(-len * 0.9)} ` +
    `C ${round(-wide * 0.24)} ${round(-len * 0.84)}, ${round(-wide * 0.58)} ${round(-len * 0.72)}, ${round(-wide * 0.7)} ${round(-len * 0.58)} ` +
    `C ${round(-wide * 0.9)} ${round(-len * 0.36)}, ${round(-wide * 0.42)} ${round(-len * 0.16)}, 0 ${round(-len * 0.06)} Z`
  );
}

function lilyVeins(len: number, wide: number) {
  const out: string[] = [];
  for (const side of [-1, 1]) {
    for (const [t, spread] of [
      [0.3, 0.5],
      [0.46, 0.72],
    ]) {
      out.push(
        `M 0 ${round(-len * 0.08)} Q ${round(side * wide * 0.34)} ${round(-len * t * 0.75)}, ${round(side * wide * spread)} ${round(-len * t)}`,
      );
    }
  }
  return out;
}

function quad(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, t: number) {
  const u = 1 - t;
  return {
    x: u * u * ax + 2 * u * t * bx + t * t * cx,
    y: u * u * ay + 2 * u * t * by + t * t * cy,
  };
}

function leafPath(x: number, y: number, side: number, len: number) {
  return `M ${round(x)} ${round(y)} Q ${round(x + side * len * 0.45)} ${round(y - len * 0.1)}, ${round(x + side * len)} ${round(y - len * 0.5)} Q ${round(x + side * len * 0.38)} ${round(y + len * 0.06)}, ${round(x)} ${round(y)} Z`;
}

export function flowerGeometry(flower: Flower, w: number, h: number, detail: boolean): Geometry {
  const scale = clamp(Math.min(w, h) / 780, 0.62, 1.2);
  const s = flower.size * scale;
  const stemH = flower.height * h;
  const curve = flower.curve * scale;
  const rnd = mulberry32(flower.id * 7919 + 3);

  const stem = `M 0 0 Q ${round(curve)} ${round(-stemH * 0.55)}, 0 ${round(-stemH)}`;
  const leaves: string[] = [];
  for (const t of [0.32, 0.58]) {
    const p = quad(0, 0, curve, -stemH * 0.55, 0, -stemH, t);
    leaves.push(leafPath(p.x, p.y, rnd() > 0.5 ? 1 : -1, (18 + s * 0.65) * (1 - t * 0.25)));
  }

  const petals: Petal[] = [];
  const markings: Petal[] = [];
  const veins: Petal[] = [];
  const stamens: string[] = [];
  const anthers: Anther[] = [];

  if (flower.kind === "peony") {
    const fills = ["url(#peony-deep)", "url(#peony-mid)", "url(#peony-light)"];
    const layers = [
      { r: 1.42, len: 1.28, wide: 0.72, count: 9 },
      { r: 0.96, len: 1.08, wide: 0.62, count: 8 },
      { r: 0.52, len: 0.86, wide: 0.5, count: 7 },
    ];
    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        const a = (i / layer.count) * TAU + li * 0.38 + (rnd() - 0.5) * 0.16;
        const ring = s * layer.r;
        petals.push({
          d: petalPath(s * layer.len * (0.94 + rnd() * 0.12), s * layer.wide, true),
          x: round(Math.cos(a) * ring),
          y: round(-Math.sin(a) * ring),
          rotation: round(90 - (a * 180) / Math.PI),
          fill: fills[(flower.tone + li) % fills.length],
        });
      }
    });
    if (detail) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        anthers.push({
          x: round(Math.cos(a) * s * 0.17),
          y: round(-Math.sin(a) * s * 0.17),
          rotation: 0,
          rx: round(s * 0.045),
          ry: round(s * 0.035),
        });
      }
    }
  } else {
    const white = flower.kind === "white-lily";
    const fill = white ? "url(#lily-white)" : "url(#lily-pink)";
    const stripe = white ? "url(#lily-stripe)" : "url(#lily-stripe-pink)";
    const ring = s * 0.1;
    const baseLen = s * 2.95;
    const wide = s * 0.5;

    // Six tepals, alternating slightly in length, like a real lily.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + (rnd() - 0.5) * 0.05;
      const len = baseLen * (i % 2 === 0 ? 1 : 0.93);
      const x = round(Math.cos(a) * ring);
      const y = round(-Math.sin(a) * ring);
      const rotation = round(90 - (a * 180) / Math.PI);

      petals.push({ d: lilyPetalPath(len, wide), x, y, rotation, fill });
      markings.push({
        d: lilyStripePath(len * 0.92, wide * 0.38),
        x,
        y,
        rotation,
        fill: stripe,
      });
      if (detail) {
        for (const d of lilyVeins(len, wide)) {
          veins.push({ d, x, y, rotation, fill: "none" });
        }
      }
    }

    // Curved filaments with visible anthers, the other lily signature.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.26;
      const ex = Math.cos(a) * s * 0.62;
      const ey = -Math.sin(a) * s * 0.62 - s * 0.32;
      stamens.push(
        `M 0 0 Q ${round(Math.cos(a) * s * 0.2)} ${round(-Math.sin(a) * s * 0.2 - s * 0.32)}, ${round(ex)} ${round(ey)}`,
      );
      if (detail) {
        anthers.push({
          x: round(ex),
          y: round(ey),
          rotation: round((Math.atan2(ey, ex) * 180) / Math.PI),
          rx: round(s * 0.13),
          ry: round(s * 0.04),
        });
      }
    }
  }

  return {
    stem,
    leaves,
    petals,
    markings,
    veins,
    stamens,
    anthers,
    center: {
      x: 0,
      y: 0,
      r: round(s * (flower.kind === "peony" ? 0.22 : 0.14)),
      fill: flower.kind === "peony" ? "url(#peony-heart)" : "url(#lily-heart)",
    },
  };
}

export function makeFaller(id: number, flower: Flower, h: number): FallingPetal {
  const rnd = mulberry32(id * 104729 + 91);
  const pink = flower.kind !== "white-lily";
  return {
    id,
    nx: clamp(flower.nx + (rnd() - 0.5) * 0.08, 0.02, 0.98),
    y: h * (1 - flower.height) + (rnd() - 0.5) * 20,
    drift: (rnd() - 0.5) * 120,
    duration: 2.6 + rnd() * 1.6,
    rotate: rnd() * 360,
    size: 7 + rnd() * 7,
    color: pink ? "url(#lily-pink)" : "url(#lily-white)",
  };
}

export interface FlowerTarget {
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

/** Where each flower goes when the scissors turn the garden into a bouquet. */
export function bouquetTargets(flowers: Flower[], w: number, h: number): Map<number, FlowerTarget> {
  const count = flowers.length;
  const centerX = w / 2;
  const baseY = h * 0.86;
  const spread = Math.min(w * 0.16, 90);

  return new Map(
    flowers.map((flower, i) => {
      const angle = (i / Math.max(1, count)) * TAU;
      return [
        flower.id,
        {
          x: round(centerX + Math.cos(angle) * spread),
          y: round(baseY - Math.abs(Math.sin(angle)) * h * 0.05),
          scale: round(0.52 + (i % 3) * 0.05),
          rotate: round(Math.sin(angle) * 11),
        },
      ];
    }),
  );
}
