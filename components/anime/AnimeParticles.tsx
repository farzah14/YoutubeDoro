"use client";

import { useEffect, useRef } from "react";

interface AnimeParticlesProps {
  type: "sakura" | "rain" | "stars" | "fireflies" | "dust";
  enabled?: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation?: number;
  rotationSpeed?: number;
  swayOffset?: number;
  color?: string;
}

export function AnimeParticles({ type, enabled = true }: AnimeParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const count = type === "rain" ? 70 : type === "sakura" ? 35 : 45;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: type === "sakura" ? Math.random() * 8 + 6 : type === "rain" ? Math.random() * 15 + 10 : Math.random() * 3 + 1,
        speedX: type === "sakura" ? Math.random() * 1.5 + 0.5 : type === "rain" ? Math.random() * 1 - 0.5 : (Math.random() - 0.5) * 0.4,
        speedY: type === "sakura" ? Math.random() * 1.2 + 0.8 : type === "rain" ? Math.random() * 8 + 12 : (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 2,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        if (type === "sakura") {
          // Draw cute cherry blossom petal
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(((p.rotation || 0) * Math.PI) / 180);
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 182, 193, ${p.opacity * 0.85})`;
          ctx.ellipse(0, 0, p.size, p.size * 0.5, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          p.x += p.speedX + Math.sin(frameCount * 0.02 + (p.swayOffset || 0)) * 0.8;
          p.y += p.speedY;
          p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.5);

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x > width + 20) p.x = -20;
        } else if (type === "rain") {
          // Draw delicate rain streak
          ctx.strokeStyle = `rgba(180, 220, 255, ${p.opacity * 0.5})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX * 2, p.y + p.size);
          ctx.stroke();

          p.y += p.speedY;
          p.x += p.speedX;

          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width;
          }
        } else {
          // Stars / Fireflies / Dust motes
          ctx.beginPath();
          const alpha = p.opacity * (0.6 + 0.4 * Math.sin(frameCount * 0.03 + (p.swayOffset || 0)));
          ctx.fillStyle =
            type === "fireflies"
              ? `rgba(253, 224, 71, ${alpha})`
              : `rgba(255, 255, 255, ${alpha})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.shadowBlur = 6;
          ctx.shadowColor = type === "fireflies" ? "#FACC15" : "#93C5FD";
          ctx.fill();
          ctx.shadowBlur = 0;

          p.x += p.speedX;
          p.y += p.speedY;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
    />
  );
}
