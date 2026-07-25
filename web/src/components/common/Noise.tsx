import { useEffect, useRef } from "react";

interface NoiseProps {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
}

export function Noise({
  patternSize = 250,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 2,
  patternAlpha = 15,
}: NoiseProps) {
  const grainRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      return;
    }

    let frame = 0;
    let animationId: number;
    const canvasSize = Math.max(1, Math.round(patternSize));
    const refreshInterval = Math.max(1, Math.round(patternRefreshInterval));
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const drawGrain = () => {
      const imageData = ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = patternAlpha;
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      if (frame % refreshInterval === 0) {
        drawGrain();
      }
      frame++;
      animationId = window.requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [patternAlpha, patternRefreshInterval, patternSize]);

  return (
    <canvas
      className="pointer-events-none absolute left-0 top-0 h-screen w-screen"
      ref={grainRef}
      style={{
        height: `${patternScaleY * 100}vh`,
        imageRendering: "pixelated",
        width: `${patternScaleX * 100}vw`,
      }}
    />
  );
}
