import { useEffect, useRef } from "react";

const COLORS = ["#c8a97e", "#e8d5b7", "#ffffff", "#a07040", "#f0e6d0", "#8b5cf6", "#06b6d4", "#963F30"];

export default function Confetti({ active, onDone }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";
    const pieces = [];
    const count = 52;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const x = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = 0.9 + Math.random() * 0.7;
      const size = 5 + Math.random() * 7;
      const rotate = Math.random() * 360;
      const isRound = Math.random() > 0.5;
      el.style.cssText = `
        left: ${x}%;
        background: ${color};
        width: ${size}px;
        height: ${isRound ? size : size * 2.2}px;
        border-radius: ${isRound ? "50%" : "2px"};
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        transform: rotate(${rotate}deg);
      `;
      container.appendChild(el);
      pieces.push(el);
    }

    const timer = setTimeout(() => { onDone?.(); }, 2200);
    return () => {
      clearTimeout(timer);
      pieces.forEach((p) => p.remove());
    };
  }, [active]);

  if (!active) return null;
  return <div ref={containerRef} className="confetti-container" aria-hidden="true" />;
}
