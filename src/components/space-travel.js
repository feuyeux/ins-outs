// Dynamic 3D Space Travel Starfield Canvas Animation
export function initSpaceTravel(canvasId = "space-travel") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const starCount = 350;
  const stars = [];

  class Star {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = (Math.random() - 0.5) * width * 1.5;
      this.y = (Math.random() - 0.5) * height * 1.5;
      this.z = initial ? Math.random() * 1000 : 1000;
      this.pz = this.z;
      this.color = Math.random() > 0.85 ? "rgba(123, 171, 237, 0.9)" : "rgba(255, 255, 255, 0.85)";
      this.radius = 0.5 + Math.random() * 1.2;
    }

    update(speed = 1.2) {
      this.pz = this.z;
      this.z -= speed;
      if (this.z <= 1) {
        this.reset();
      }
    }

    draw() {
      const sx = (this.x / this.z) * 350 + width / 2;
      const sy = (this.y / this.z) * 350 + height / 2;

      const px = (this.x / this.pz) * 350 + width / 2;
      const py = (this.y / this.pz) * 350 + height / 2;

      if (sx < 0 || sx > width || sy < 0 || sy > height) return;

      const alpha = Math.min(1, Math.max(0, (1000 - this.z) / 800));

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = this.color.replace("0.85", alpha.toFixed(2)).replace("0.9", alpha.toFixed(2));
      ctx.lineWidth = Math.max(0.5, (1 - this.z / 1000) * 2.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.4, (1 - this.z / 1000) * this.radius), 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  }

  for (let i = 0; i < starCount; i++) {
    stars.push(new Star());
  }

  let animationFrameId;
  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < stars.length; i++) {
      stars[i].update();
      stars[i].draw();
    }
    animationFrameId = requestAnimationFrame(animate);
  }

  animate();

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}
