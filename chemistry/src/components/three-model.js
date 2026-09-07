// Interactive Three.js 3D Atom & Crystal Lattice Visualization
import * as THREE from "three";

export class ElementThreeView {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.group = null;
    this.lights = [];
    this.isNight = true;
    this.animId = null;

    // Interaction state
    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };
    this.targetRotation = { x: 0.3, y: 0.5 };

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 360;
    const height = this.container.clientHeight || 360;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 18;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setupLights();
    this.setupEvents();
    this.animate();
  }

  setupLights() {
    this.lights.forEach(l => this.scene.remove(l));
    this.lights = [];

    if (this.isNight) {
      const ambLight = new THREE.AmbientLight(0x223355, 0.8);
      const dirLight1 = new THREE.DirectionalLight(0x7babed, 2.5);
      dirLight1.position.set(10, 15, 10);
      const dirLight2 = new THREE.DirectionalLight(0xff66aa, 1.2);
      dirLight2.position.set(-10, -10, -10);

      this.scene.add(ambLight, dirLight1, dirLight2);
      this.lights.push(ambLight, dirLight1, dirLight2);
    } else {
      const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight1.position.set(10, 15, 10);
      const dirLight2 = new THREE.DirectionalLight(0xeeeeee, 1.0);
      dirLight2.position.set(-10, -10, 5);

      this.scene.add(ambLight, dirLight1, dirLight2);
      this.lights.push(ambLight, dirLight1, dirLight2);
    }
  }

  setLighting(mode) {
    this.isNight = mode === "night";
    this.setupLights();
  }

  setupEvents() {
    const el = this.renderer.domElement;

    el.addEventListener("mousedown", e => {
      this.isDragging = true;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", e => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMousePos.x;
      const dy = e.clientY - this.prevMousePos.y;
      this.targetRotation.y += dx * 0.008;
      this.targetRotation.x += dy * 0.008;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    el.addEventListener("wheel", e => {
      e.preventDefault();
      this.camera.position.z = Math.max(8, Math.min(32, this.camera.position.z + e.deltaY * 0.02));
    }, { passive: false });

    // Touch support
    el.addEventListener("touchstart", e => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener("touchmove", e => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.prevMousePos.x;
      const dy = e.touches[0].clientY - this.prevMousePos.y;
      this.targetRotation.y += dx * 0.01;
      this.targetRotation.x += dy * 0.01;
      this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    window.addEventListener("touchend", () => {
      this.isDragging = false;
    });
  }

  setElement(elementData) {
    // Clear old objects
    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
      this.group.remove(obj);
    }

    const crystalStructure = (elementData?.["Crystal Structure"] || "").toLowerCase();
    const series = elementData?.Series || "Transition Metal";

    // Sphere color based on chemical series
    let atomColor = 0x7babed;
    if (series.includes("Alkali")) atomColor = 0xef4444;
    else if (series.includes("Alkaline Earth")) atomColor = 0xf97316;
    else if (series.includes("Transition")) atomColor = 0x3b82f6;
    else if (series.includes("Noble")) atomColor = 0xa855f7;
    else if (series.includes("Halogen")) atomColor = 0x10b981;
    else if (series.includes("Lanthanide") || series.includes("Actinide")) atomColor = 0xec4899;
    else if (series.includes("Nonmetal")) atomColor = 0x06b6d4;

    const sphereGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const atomMat = new THREE.MeshPhysicalMaterial({
      color: atomColor,
      metalness: 0.7,
      roughness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1
    });

    const bondMat = new THREE.MeshStandardMaterial({
      color: 0x888899,
      metalness: 0.5,
      roughness: 0.4
    });

    // Build Lattice based on Crystal Structure
    const positions = [];
    const bonds = [];

    if (crystalStructure.includes("body-centered") || crystalStructure.includes("bcc")) {
      // Body centered cubic (8 corners + 1 center)
      const s = 3.2;
      for (let x of [-s, s]) {
        for (let y of [-s, s]) {
          for (let z of [-s, s]) {
            positions.push([x, y, z]);
            bonds.push([[x, y, z], [0, 0, 0]]);
          }
        }
      }
      positions.push([0, 0, 0]);
    } else if (crystalStructure.includes("face-centered") || crystalStructure.includes("fcc") || crystalStructure.includes("cubic")) {
      // Face centered cubic (8 corners + 6 face centers)
      const s = 3.2;
      for (let x of [-s, s]) {
        for (let y of [-s, s]) {
          for (let z of [-s, s]) {
            positions.push([x, y, z]);
          }
        }
      }
      // Faces
      positions.push([s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]);
      // Connect face centers to corners
      bonds.push([[s, 0, 0], [s, s, s]], [[s, 0, 0], [s, -s, s]], [[0, s, 0], [s, s, s]], [[0, 0, s], [s, s, s]]);
    } else if (crystalStructure.includes("hexagonal") || crystalStructure.includes("hcp")) {
      // Hexagonal prism
      const r = 3.5;
      const h = 3.0;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        positions.push([x, h, z]);
        positions.push([x, -h, z]);
        bonds.push([[x, h, z], [x, -h, z]]);
        const nextAng = ((i + 1) * Math.PI) / 3;
        bonds.push([[x, h, z], [Math.cos(nextAng) * r, h, Math.sin(nextAng) * r]]);
        bonds.push([[x, -h, z], [Math.cos(nextAng) * r, -h, Math.sin(nextAng) * r]]);
      }
      positions.push([0, h, 0], [0, -h, 0]);
    } else {
      // Default: Elegant coordination polyhedron (Octahedron / Cluster)
      positions.push([0, 0, 0]);
      const dist = 3.5;
      positions.push([dist, 0, 0], [-dist, 0, 0], [0, dist, 0], [0, -dist, 0], [0, 0, dist], [0, 0, -dist]);
      positions.slice(1).forEach(p => bonds.push([[0, 0, 0], p]));
    }

    // Add Spheres
    positions.forEach(p => {
      const mesh = new THREE.Mesh(sphereGeo, atomMat);
      mesh.position.set(p[0], p[1], p[2]);
      this.group.add(mesh);
    });

    // Add Bond Cylinders
    bonds.forEach(([p1, p2]) => {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const distance = v1.distanceTo(v2);
      const cylGeo = new THREE.CylinderGeometry(0.2, 0.2, distance, 12);
      const cyl = new THREE.Mesh(cylGeo, bondMat);

      // Orient cylinder
      const mid = v1.clone().add(v2).multiplyScalar(0.5);
      cyl.position.copy(mid);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
      this.group.add(cyl);
    });

    // Floating subtle glow halo particles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 40;
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 16;
      particlePos[i + 1] = (Math.random() - 0.5) * 16;
      particlePos[i + 2] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x7babed,
      size: 0.3,
      transparent: true,
      opacity: 0.7
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    this.group.add(particles);
  }

  resize() {
    const width = this.container.clientWidth || 360;
    const height = this.container.clientHeight || 360;
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());

    if (!this.isDragging) {
      this.targetRotation.y += 0.003;
    }

    if (this.group) {
      this.group.rotation.x += (this.targetRotation.x - this.group.rotation.x) * 0.1;
      this.group.rotation.y += (this.targetRotation.y - this.group.rotation.y) * 0.1;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}
