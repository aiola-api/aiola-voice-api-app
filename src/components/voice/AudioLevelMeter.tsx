import { useEffect, useRef } from "react";

interface AudioLevelMeterProps {
  isActive: boolean;
  level: number;
  className?: string;
}

export function AudioLevelMeter({
  isActive,
  level,
  className = "",
}: AudioLevelMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // Use the level prop for audio level visualization

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw waveform bars
      const barCount = 20;
      const barWidth = canvas.width / barCount;
      const maxHeight = canvas.height * 0.8;

      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.random() * level * maxHeight + 2;
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, "#3b82f6"); // Blue
        gradient.addColorStop(1, "#1d4ed8"); // Darker blue

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, level]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <canvas
        ref={canvasRef}
        width={120}
        height={24}
        className="border rounded bg-muted"
      />
      <div className="text-xs text-muted-foreground">
        {isActive ? "Recording..." : "Silent"}
      </div>
    </div>
  );
}
