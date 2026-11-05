"use client";

import { useEffect, useRef } from "react";
import { initFlowerGarden } from "@/lib/flower-garden";

export default function FlowerGarden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instructionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return initFlowerGarden(canvas, instructionRef.current);
  }, []);

  return (
    <main className="garden" aria-label="Giardino animato di gigli e peonie">
      <canvas ref={canvasRef} className="garden__canvas" aria-label="Giardino interattivo: muovi il puntatore o tocca lo schermo per far crescere i fiori" />
      <p ref={instructionRef} className="garden__instructions">
        Muovi il puntatore o tocca lo schermo
        <span>Un piccolo giardino prende vita al tuo passaggio</span>
      </p>
    </main>
  );
}
