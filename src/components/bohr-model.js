// Animated 2D Bohr Atom Model Canvas
export class BohrModel2D {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "bohr-canvas";
    this.ctx = this.canvas.getContext("2d");
    this.container.appendChild(this.canvas);

    this.elementData = null;
    this.animationId = null;
    this.shells = [];
    this.angleOffset = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const size = Math.min(rect.width || 300, rect.height || 300);
    this.canvas.width = size * (window.devicePixelRatio || 1);
    this.canvas.height = size * (window.devicePixelRatio || 1);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.size = size;
  }

  setElement(data) {
    this.elementData = data;
    this.shells = [];

    if (data && data["Electrons per Shell"]) {
      // Parse e.g. "2, 8, 14, 2"
      const counts = data["Electrons per Shell"]
        .split(",")
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n > 0);

      this.shells = counts;
    } else {
      this.shells = [1];
    }

    this.startAnimation();
  }

  startAnimation() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const animate = () => {
      this.draw();
      this.angleOffset += 0.015;
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  draw() {
    const { ctx, size } = this;
    if (!ctx || !size) return;

    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size * 0.44;
    const numShells = Math.max(1, this.shells.length);
    const stepRadius = (maxRadius - 26) / numShells;

    // Draw Nucleus
    const nucleusRadius = 22;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, nucleusRadius);
    grad.addColorStop(0, "rgba(255, 100, 100, 0.95)");
    grad.addColorStop(0.7, "rgba(220, 50, 70, 0.85)");
    grad.addColorStop(1, "rgba(160, 20, 40, 0.7)");

    ctx.beginPath();
    ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(255, 60, 80, 0.6)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nucleus Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px 'Open Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.elementData?.Symbol || "H", cx, cy - 2);

    ctx.font = "9px 'Open Sans', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(this.elementData?.["Atomic Number"] || "1", cx, cy + 9);

    // Draw Shells & Orbiting Electrons
    this.shells.forEach((electronCount, shellIdx) => {
      const radius = 30 + (shellIdx + 1) * stepRadius;
      const speedMult = (shellIdx % 2 === 0 ? 1 : -1) * (1 / Math.sqrt(shellIdx + 1));

      // Orbit track
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(123, 171, 237, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Electrons on this shell
      const angleStep = (Math.PI * 2) / electronCount;
      for (let e = 0; e < electronCount; e++) {
        const angle = this.angleOffset * speedMult + e * angleStep;
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius;

        // Electron glow
        ctx.beginPath();
        ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = "#7babed";
        ctx.shadowColor = "rgba(123, 171, 237, 0.9)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Electron core
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    });
  }
}
