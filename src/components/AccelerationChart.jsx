import { useRef, useEffect } from 'react';

/**
 * Canvas-based real-time acceleration chart (line graph).
 * Shows the last ~30 seconds of accelerometer data.
 */
export default function AccelerationChart({ history = [], threshold = 30 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = 160 * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = '160px';
      ctx.scale(dpr, dpr);
    }

    resize();

    function draw() {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const padding = { top: 10, right: 10, bottom: 25, left: 35 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      ctx.clearRect(0, 0, w, h);

      // Draw chart area background
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(padding.left, padding.top, chartW, chartH);

      const maxVal = Math.max(50, threshold * 1.5);
      const data = history.slice(-150); // Last 150 readings

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        // Y axis labels
        const val = maxVal - (maxVal * i) / 4;
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toFixed(0), padding.left - 5, y);
      }

      // Threshold line
      const thresholdY = padding.top + chartH * (1 - threshold / maxVal);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padding.left, thresholdY);
      ctx.lineTo(w - padding.right, thresholdY);
      ctx.strokeStyle = 'rgba(239, 71, 111, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Threshold label
      ctx.font = '600 9px Inter, sans-serif';
      ctx.fillStyle = '#ef476f';
      ctx.textAlign = 'left';
      ctx.fillText('THRESHOLD', w - padding.right - 65, thresholdY - 6);

      if (data.length < 2) {
        ctx.font = '500 12px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for sensor data...', w / 2, h / 2);
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Draw the acceleration line
      const stepX = chartW / 150;

      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding.left + (i + (150 - data.length)) * stepX;
        const y = padding.top + chartH * (1 - Math.min(point.netForce, maxVal) / maxVal);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      // Gradient stroke
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      gradient.addColorStop(0, '#ef476f');
      gradient.addColorStop(0.5, '#ffd166');
      gradient.addColorStop(1, '#06d6a0');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Fill area under line
      const lastX = padding.left + (data.length - 1 + (150 - data.length)) * stepX;
      const firstX = padding.left + (150 - data.length) * stepX;
      ctx.lineTo(lastX, padding.top + chartH);
      ctx.lineTo(firstX, padding.top + chartH);
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      fillGrad.addColorStop(0, 'rgba(239, 71, 111, 0.15)');
      fillGrad.addColorStop(0.5, 'rgba(255, 209, 102, 0.08)');
      fillGrad.addColorStop(1, 'rgba(6, 214, 160, 0.03)');
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // X axis label
      ctx.font = '500 10px Inter, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('Time →', w / 2, h - 4);

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [history, threshold]);

  return (
    <div style={{ width: '100%', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
