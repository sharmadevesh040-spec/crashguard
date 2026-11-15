import { useRef, useEffect } from 'react';

/**
 * Animated radial gauge showing real-time G-force / acceleration.
 */
export default function AccelerometerGauge({ value = 0, max = 50, threshold = 30, label = 'Force' }) {
  const canvasRef = useRef(null);
  const animatedValue = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 85;

    function draw() {
      // Ease toward target
      animatedValue.current += (value - animatedValue.current) * 0.15;
      const v = animatedValue.current;
      const pct = Math.min(v / max, 1);

      ctx.clearRect(0, 0, size, size);

      // Background arc
      const startAngle = 0.75 * Math.PI;
      const endAngle = 2.25 * Math.PI;
      const totalAngle = endAngle - startAngle;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle, false);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Threshold marker
      const thresholdPct = Math.min(threshold / max, 1);
      const thresholdAngle = startAngle + totalAngle * thresholdPct;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, thresholdAngle - 0.02, thresholdAngle + 0.02, false);
      ctx.strokeStyle = 'rgba(239, 71, 111, 0.5)';
      ctx.lineWidth = 14;
      ctx.stroke();

      // Value arc
      const valueAngle = startAngle + totalAngle * pct;

      // Color gradient based on value
      let color;
      if (pct < 0.4) {
        color = '#06d6a0'; // green
      } else if (pct < 0.7) {
        color = '#ffd166'; // yellow
      } else {
        color = '#ef476f'; // red
      }

      const gradient = ctx.createLinearGradient(0, size, size, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, pct > 0.7 ? '#ff1744' : color);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, valueAngle, false);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect when high
      if (pct > 0.5) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, valueAngle, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.3;
        ctx.filter = 'blur(6px)';
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
      }

      // Center text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Value
      ctx.font = '700 36px Inter, sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(v.toFixed(1), cx, cy - 8);

      // Unit
      ctx.font = '500 13px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('m/s²', cx, cy + 18);

      // Label
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(label.toUpperCase(), cx, cy + 38);

      // Tick marks
      for (let i = 0; i <= 10; i++) {
        const tickAngle = startAngle + (totalAngle * i) / 10;
        const innerR = radius - 18;
        const outerR = radius - 14;
        const x1 = cx + innerR * Math.cos(tickAngle);
        const y1 = cy + innerR * Math.sin(tickAngle);
        const x2 = cx + outerR * Math.cos(tickAngle);
        const y2 = cy + outerR * Math.sin(tickAngle);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, max, threshold, label]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
