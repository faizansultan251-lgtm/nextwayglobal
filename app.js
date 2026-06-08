const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const cursorLight = document.querySelector(".cursor-light");
const magneticItems = document.querySelectorAll(".magnetic");
const tiltCards = document.querySelectorAll(".tilt-card");
const revealItems = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll("[data-counter]");
const chartCanvases = document.querySelectorAll(".chart-canvas");
const heatmap = document.querySelector(".heatmap-grid");
const atmosphereCanvas = document.querySelector("#atmosphere");
const globeCanvas = document.querySelector("#globeCanvas");

let pointer = {
  x: window.innerWidth * 0.62,
  y: window.innerHeight * 0.34,
};

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  cursorLight.style.transform = `translate3d(${pointer.x - 260}px, ${pointer.y - 260}px, 0)`;

  document.querySelectorAll("[data-depth]").forEach((panel) => {
    const depth = Number(panel.dataset.depth);
    const x = (pointer.x - window.innerWidth / 2) * depth;
    const y = (pointer.y - window.innerHeight / 2) * depth;
    panel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
});

magneticItems.forEach((item) => {
  item.addEventListener("pointermove", (event) => {
    if (prefersReducedMotion) return;
    const rect = item.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.18;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.18;
    item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "translate3d(0, 0, 0)";
  });
});

tiltCards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--x", `${x}%`);
    card.style.setProperty("--y", `${y}%`);

    if (prefersReducedMotion) return;
    const rotateY = (x - 50) * 0.045;
    const rotateX = (50 - y) * 0.045;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.6 }
);

counters.forEach((counter) => counterObserver.observe(counter));

function animateCounter(counter) {
  const target = Number(counter.dataset.target);
  const duration = 1300;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    counter.textContent = Math.round(target * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

if (heatmap) {
  const values = [
    0.16, 0.24, 0.38, 0.58, 0.72, 0.66, 0.44, 0.34, 0.26, 0.2, 0.18, 0.14,
    0.18, 0.36, 0.62, 0.88, 0.78, 0.54, 0.42, 0.4, 0.28, 0.22, 0.2, 0.15,
    0.14, 0.28, 0.48, 0.64, 0.72, 0.92, 0.82, 0.5, 0.3, 0.24, 0.18, 0.14,
    0.13, 0.2, 0.34, 0.48, 0.56, 0.74, 0.86, 0.68, 0.4, 0.26, 0.18, 0.12,
    0.12, 0.18, 0.28, 0.42, 0.52, 0.6, 0.72, 0.82, 0.58, 0.34, 0.2, 0.12,
  ];

  values.forEach((value) => {
    const cell = document.createElement("span");
    cell.style.setProperty("--heat", value);
    cell.title = `QC efficiency ${Math.round(value * 100)}%`;
    heatmap.appendChild(cell);
  });
}

const chartObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      drawChart(entry.target, true);
      chartObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.35 }
);

chartCanvases.forEach((canvas) => {
  chartObserver.observe(canvas);
  canvas.addEventListener("pointermove", (event) => showChartHover(canvas, event));
  canvas.addEventListener("pointerleave", () => drawChart(canvas, false));
});

window.addEventListener("resize", () => {
  resizeCanvas(atmosphereCanvas);
  resizeCanvas(globeCanvas);
  chartCanvases.forEach((canvas) => drawChart(canvas, false));
});

function resizeCanvas(canvas) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
  const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawChart(canvas, animate = false, hoverIndex = -1) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const type = canvas.dataset.chart;
  const progress = animate && !prefersReducedMotion ? 0 : 1;

  if (animate && !prefersReducedMotion) {
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min((now - start) / 1000, 1);
      renderChart(ctx, w, h, type, 1 - Math.pow(1 - p, 3), hoverIndex);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  } else {
    renderChart(ctx, w, h, type, progress || 1, hoverIndex);
  }
}

function renderChart(ctx, w, h, type, progress, hoverIndex) {
  ctx.clearRect(0, 0, w, h);
  drawGrid(ctx, w, h);

  if (type === "bar") {
    const before = [34, 38, 42, 45, 48, 51];
    const after = [70, 78, 83, 90, 96, 104];
    const groups = before.length;
    const gap = w / (groups + 1);

    before.forEach((value, i) => {
      const x = gap * (i + 0.7);
      drawBar(ctx, x, h, value, 120, "#94a3b8", progress, hoverIndex === i);
      drawBar(ctx, x + 14, h, after[i], 120, "#1e6fd6", progress, hoverIndex === i);
    });
    label(ctx, "Manual QC", 12, 20, "#64748b");
    label(ctx, "VisionX-AI", 104, 20, "#1e6fd6");
  }

  if (type === "line") {
    const defectTrend = [72, 66, 57, 48, 39, 30, 24, 20];
    const accuracy = [38, 48, 58, 70, 80, 87, 92, 95];
    drawLine(ctx, defectTrend, w, h, "#64748b", progress, true, hoverIndex);
    drawLine(ctx, accuracy, w, h, "#1e6fd6", progress, false, hoverIndex);
    label(ctx, "Defects", 12, 20, "#64748b");
    label(ctx, "Detection", 94, 20, "#1e6fd6");
  }

  if (type === "accuracy") {
    const vision = [54, 63, 71, 78, 84, 90, 93, 95];
    drawLine(ctx, vision, w, h, "#1e6fd6", progress, true, hoverIndex);
    label(ctx, "VisionX-AI detection accuracy", 12, 22, "#1e6fd6");
  }

  if (type === "roi") {
    const cost = [100, 92, 84, 76, 66, 57, 48, 42, 37];
    const value = [8, 17, 31, 46, 61, 78, 96, 118, 136];
    drawLine(ctx, cost, w, h, "#94a3b8", progress, false, hoverIndex);
    drawLine(ctx, value, w, h, "#1e6fd6", progress, true, hoverIndex);
    label(ctx, "Cost", 12, 20, "#64748b");
    label(ctx, "ROI", 68, 20, "#1e6fd6");
  }

  if (type === "governance") {
    const nationalIndex = [42, 51, 57, 66, 73, 79, 84, 87];
    const lagRisk = [62, 58, 54, 48, 42, 35, 28, 22];
    drawLine(ctx, nationalIndex, w, h, "#1e6fd6", progress, true, hoverIndex);
    drawLine(ctx, lagRisk, w, h, "#64748b", progress, false, hoverIndex);
    label(ctx, "National index", 12, 20, "#1e6fd6");
    label(ctx, "Lag risk", 126, 20, "#64748b");
  }
}

function drawGrid(ctx, w, h) {
  ctx.strokeStyle = "rgba(15, 27, 45, 0.08)";
  ctx.lineWidth = 1;

  for (let y = 28; y < h; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let x = 20; x < w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
}

function drawBar(ctx, x, h, value, max, color, progress, active) {
  const barH = (value / max) * (h - 52) * progress;
  const y = h - barH - 16;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = active ? 6 : 0;
  roundRect(ctx, x, y, 12, barH, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawLine(ctx, values, w, h, color, progress, fill, hoverIndex) {
  const max = Math.max(...values) * 1.12;
  const min = Math.min(...values) * 0.78;
  const points = values.map((value, index) => {
    const x = 18 + (index / (values.length - 1)) * (w - 36);
    const y = h - 18 - ((value - min) / (max - min)) * (h - 52);
    return { x, y, value };
  });

  const visibleCount = Math.max(2, Math.ceil(points.length * progress));
  const visible = points.slice(0, visibleCount);

  ctx.beginPath();
  visible.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 0;
  ctx.stroke();

  if (fill) {
    ctx.lineTo(visible[visible.length - 1].x, h - 18);
    ctx.lineTo(visible[0].x, h - 18);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, `${hexToRgba(color, 0.22)}`);
    gradient.addColorStop(1, `${hexToRgba(color, 0)}`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  visible.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, hoverIndex === index ? 6 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = hoverIndex === index ? "#0f1b2d" : color;
    ctx.fill();
  });
}

function label(ctx, text, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = "700 11px Inter, sans-serif";
  ctx.fillText(text, x, y);
}

function showChartHover(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const bucketCount = canvas.dataset.chart === "bar" ? 6 : 8;
  const index = Math.max(0, Math.min(bucketCount - 1, Math.round((x / rect.width) * (bucketCount - 1))));
  drawChart(canvas, false, index);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function initAtmosphere() {
  const canvas = atmosphereCanvas;
  const ctx = canvas.getContext("2d");
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.5 + 0.2,
    vx: (Math.random() - 0.5) * 0.00018,
    vy: (Math.random() - 0.5) * 0.00018,
  }));

  function draw() {
    resizeCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
      if (particle.y < 0 || particle.y > 1) particle.vy *= -1;

      const x = particle.x * w;
      const y = particle.y * h;
      ctx.beginPath();
      ctx.arc(x, y, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(150, 219, 255, 0.45)";
      ctx.fill();

      for (let j = index + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const ox = other.x * w;
        const oy = other.y * h;
        const distance = Math.hypot(x - ox, y - oy);
        if (distance < 125) {
          ctx.strokeStyle = `rgba(48, 216, 255, ${0.1 - distance / 1400})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(ox, oy);
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }

  draw();
}

function initGlobe() {
  const canvas = globeCanvas;
  const ctx = canvas.getContext("2d");
  let rotation = 0;
  const routes = [
    { a: [90, 24], b: [-80, 44], offset: 0, primary: true },
    { a: [-5, 52], b: [90, 24], offset: 1.1 },
    { a: [12, 50], b: [90, 24], offset: 2.3 },
    { a: [139, 35], b: [90, 24], offset: 3.2 },
    { a: [-122, 37], b: [90, 24], offset: 4.1 },
    { a: [2, 49], b: [24, -29], offset: 5.2 },
    { a: [103, 1], b: [151, -33], offset: 6.1 },
  ];
  const cityLights = [
    [-74, 40], [-118, 34], [-99, 19], [-46, -23], [-58, -34],
    [-0.1, 51], [2, 49], [13, 52], [37, 55], [28, -26],
    [31, 30], [55, 25], [77, 28], [90, 24], [100, 13],
    [103, 1], [106, -6], [116, 40], [121, 31], [139, 35],
    [126, 37], [151, -33], [144, -37],
  ];

  function project(lon, lat, radius, cx, cy) {
    const lambda = ((lon + rotation) * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    const x = radius * Math.cos(phi) * Math.sin(lambda);
    const y = -radius * Math.sin(phi);
    const z = radius * Math.cos(phi) * Math.cos(lambda);
    return { x: cx + x, y: cy + y, z };
  }

  function drawLatLon(radius, cx, cy) {
    ctx.strokeStyle = "rgba(92, 133, 181, 0.58)";
    ctx.lineWidth = 1.18;

    for (let lat = -60; lat <= 60; lat += 20) {
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 4) {
        const point = project(lon, lat, radius, cx, cy);
        if (point.z < 0) continue;
        if (lon === -180) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    for (let lon = -180; lon <= 180; lon += 20) {
      ctx.beginPath();
      let started = false;
      for (let lat = -85; lat <= 85; lat += 4) {
        const point = project(lon, lat, radius, cx, cy);
        if (point.z < 0) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(point.x, point.y);
          started = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
  }

  function drawContinents(radius, cx, cy) {
    const continentBands = [
      { lon: -126, lat: 54, w: 24, h: 13, r: -0.18 },
      { lon: -101, lat: 42, w: 38, h: 19, r: 0.08 },
      { lon: -83, lat: 23, w: 18, h: 10, r: 0.35 },
      { lon: -62, lat: -8, w: 24, h: 35, r: -0.18 },
      { lon: -70, lat: -34, w: 13, h: 22, r: 0.12 },
      { lon: -8, lat: 53, w: 18, h: 10, r: -0.12 },
      { lon: 14, lat: 48, w: 34, h: 14, r: 0.1 },
      { lon: 26, lat: 7, w: 25, h: 34, r: 0.08 },
      { lon: 44, lat: 28, w: 18, h: 12, r: -0.2 },
      { lon: 72, lat: 48, w: 34, h: 15, r: 0.05 },
      { lon: 93, lat: 31, w: 48, h: 22, r: -0.04 },
      { lon: 112, lat: 9, w: 30, h: 19, r: 0.28 },
      { lon: 136, lat: -25, w: 22, h: 12, r: 0.08 },
      { lon: 48, lat: -19, w: 9, h: 15, r: -0.18 },
    ];

    continentBands.forEach((band) => {
      const point = project(band.lon, band.lat, radius, cx, cy);
      if (point.z < 0) return;
      const scale = 0.45 + point.z / (radius * 1.8);
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, band.w * scale, band.h * scale, band.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(157, 187, 224, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "rgba(92, 133, 181, 0.34)";
      ctx.stroke();
    });
  }

  function drawElectricLights(radius, cx, cy, time) {
    cityLights.forEach((city, index) => {
      const point = project(city[0], city[1], radius, cx, cy);
      if (point.z < 0) return;
      const depth = Math.max(0.24, point.z / radius);
      const pulse = 0.55 + Math.sin(time * 0.003 + index * 0.9) * 0.35;
      const size = (1.2 + pulse * 1.6) * depth;

      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30, 111, 214, ${0.18 + pulse * 0.1})`;
      ctx.shadowColor = "#1e6fd6";
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (index % 3 === 0) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(30, 111, 214, ${0.04 * pulse})`;
        ctx.stroke();
      }
    });
  }

  function drawRoute(route, radius, cx, cy, time) {
    const a = project(route.a[0], route.a[1], radius, cx, cy);
    const b = project(route.b[0], route.b[1], radius, cx, cy);
    if (a.z < -radius * 0.18 || b.z < -radius * 0.18) return;

    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - radius * 0.18;

    ctx.strokeStyle = route.primary ? "rgba(30, 111, 214, 0.46)" : "rgba(30, 111, 214, 0.26)";
    ctx.lineWidth = route.primary ? 2.4 : 1.4;
    ctx.shadowColor = "#1e6fd6";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const speed = route.primary ? 0.0026 : 0.0018;
    const t = (Math.sin(time * speed + route.offset) + 1) / 2;
    const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
    const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y;
    ctx.beginPath();
    ctx.arc(x, y, route.primary ? 5.6 : 3.6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#1e6fd6";
    ctx.shadowBlur = 0;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (route.primary) {
      [a, b].forEach((node) => {
        if (node.z < 0) return;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(30, 111, 214, 0.28)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#1e6fd6";
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    }
  }

  function draw(time = 0) {
    resizeCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const radius = Math.min(w, h) * 0.38;
    const cx = w * 0.52 + (pointer.x / window.innerWidth - 0.5) * 14;
    const cy = h * 0.5 + (pointer.y / window.innerHeight - 0.5) * 12;

    ctx.clearRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 1.1);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.88)");
    glow.addColorStop(0.72, "rgba(234, 241, 247, 0.72)");
    glow.addColorStop(1, "rgba(234, 241, 247, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.12, 0, Math.PI * 2);
    ctx.fill();

    const planet = ctx.createRadialGradient(cx - radius * 0.38, cy - radius * 0.32, radius * 0.08, cx, cy, radius);
    planet.addColorStop(0, "#ffffff");
    planet.addColorStop(0.58, "#dceaf7");
    planet.addColorStop(1, "#b8cde3");
    ctx.fillStyle = planet;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    drawContinents(radius, cx, cy);
    drawLatLon(radius, cx, cy);
    drawElectricLights(radius, cx, cy, time);
    ctx.restore();

    const bd = project(90, 24, radius, cx, cy);
    if (bd.z > 0) {
      ctx.beginPath();
      ctx.arc(bd.x, bd.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#1e6fd6";
      ctx.shadowColor = "#1e6fd6";
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = "rgba(92, 133, 181, 0.62)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (!prefersReducedMotion) rotation += 0.045;
    requestAnimationFrame(draw);
  }

  draw();
}

initAtmosphere();
initGlobe();

const chatbot = document.querySelector(".chatbot");
const chatbotLauncher = document.querySelector(".chatbot-launcher");
const chatbotPanel = document.querySelector(".chatbot-panel");
const chatbotClose = document.querySelector(".chatbot-close");
const chatbotQuestions = document.querySelector(".chatbot-questions");
const chatbotAnswer = document.querySelector(".chatbot-answer");
const chatbotListView = document.querySelector(".chatbot-list-view");
const chatbotAnswerView = document.querySelector(".chatbot-answer-view");
const chatbotBack = document.querySelector(".chatbot-back");

const faqItems = [
  {
    label: "Who is Nextway?",
    question: "What is Nextway Global, and how do you support garment factories?",
    answer:
      "Nextway Global Ltd. is an industrial digitalization and technology implementation partner based in Bangladesh. We bridge global innovation with local manufacturers by introducing, deploying, and supporting advanced AI solutions that cut operational costs and reduce production inefficiencies. Our flagship solution is VisionX-AI.",
  },
  {
    label: "Who built VisionX-AI?",
    question: "Is Nextway Global the developer of VisionX-AI?",
    answer:
      "Nextway Global is the exclusive local implementation, commercialization, and technical support partner in Bangladesh. The core technology is developed by our international partner, Bamboo Innovations Inc. in Canada, led by Distinguished Research Professor Dr. Anwar Haque. This combines Canadian AI engineering with Nextway Global's on-the-ground industrial expertise in Bangladesh.",
  },
  {
    label: "Implementation process",
    question: "What does Nextway Global do during implementation?",
    answer:
      "We manage the full technology adoption lifecycle so your factory does not experience operational headaches.",
    bullets: [
      "Free Factory Assessment for your lines and QC process.",
      "Hardware and software setup with minimal production disruption.",
      "Onsite training for floor managers and operators.",
      "Local 24/7 technical support from our Bangladesh team.",
    ],
  },
  {
    label: "QC improvement",
    question: "How does VisionX-AI improve Quality Control?",
    answer:
      "Nextway Global replaces slow, inconsistent, and costly manual QC with an automated real-time AI scanning system. Manual inspectors face a fatigue-failure curve where accuracy drops over a shift. VisionX-AI provides instant, non-stop defect alerts and continuous digital quality tracking.",
  },
  {
    label: "Detectable defects",
    question: "What garment defects can the system detect?",
    answer:
      "The AI is trained to identify complex structural and stitching errors. On a standard 5-pocket pant, it can flag:",
    bullets: [
      "Skip stitches, uneven stitch shapes, slanted loops, and uneven bottom hems.",
      "Uneven zipper gaps, pocket openings up/down, and missing bartacks.",
      "Back yoke and back rise raw edges out.",
    ],
  },
  {
    label: "Performance data",
    question: "Can Nextway Global share factory performance data?",
    answer:
      "Yes. We have run live pilots in local factory environments, including Tarasima Apparels in Manikganj. Our Proof of Concept data showed 95% defect detection accuracy in factory testing conditions.",
  },
  {
    label: "ROI and disruption",
    question: "What commercial model and ROI can we expect?",
    answer:
      "VisionX-AI is designed as a plug-and-play deployment with minimal line disruption. Nextway Global offers flexible SaaS industrial pricing tailored to line count and volume, with typical payback within 6 to 12 months.",
  },
  {
    label: "Get started",
    question: "How do I get started with Nextway Global?",
    answer:
      "The first step is risk-free. Nextway Global is offering a Free Factory Assessment to evaluate your lines, map potential ROI, and see whether your facility qualifies for an early pilot deployment.",
    bullets: [
      "Share your contact details with the Nextway team.",
      "Schedule an onsite visit with our engineering team.",
      "Review your assessment and pilot deployment options.",
    ],
  },
];

function renderFaqAnswer(index) {
  const item = faqItems[index];
  const bullets = item.bullets
    ? `<ul>${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>`
    : "";

  chatbotAnswer.innerHTML = `
    <h3>${item.question}</h3>
    <p>${item.answer}</p>
    ${bullets}
  `;
  chatbotListView.classList.add("is-hidden");
  chatbotAnswerView.classList.add("is-active");
  chatbotAnswerView.setAttribute("aria-hidden", "false");

  document.querySelectorAll(".chatbot-question").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.faqIndex) === index);
  });
}

function showChatbotQuestions() {
  chatbotListView.classList.remove("is-hidden");
  chatbotAnswerView.classList.remove("is-active");
  chatbotAnswerView.setAttribute("aria-hidden", "true");
}

function initChatbot() {
  if (!chatbot || !chatbotLauncher || !chatbotQuestions || !chatbotAnswer || !chatbotBack) return;

  faqItems.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chatbot-question";
    button.dataset.faqIndex = String(index);
    button.textContent = item.question;
    button.addEventListener("click", () => renderFaqAnswer(index));
    chatbotQuestions.appendChild(button);
  });

  chatbotLauncher.addEventListener("click", () => {
    const isOpen = chatbot.classList.toggle("is-open");
    chatbotLauncher.setAttribute("aria-expanded", String(isOpen));
    chatbotPanel.setAttribute("aria-hidden", String(!isOpen));
  });

  chatbotClose.addEventListener("click", () => {
    chatbot.classList.remove("is-open");
    chatbotLauncher.setAttribute("aria-expanded", "false");
    chatbotPanel.setAttribute("aria-hidden", "true");
    showChatbotQuestions();
  });

  chatbotAnswer.innerHTML = "";
  chatbotBack.addEventListener("click", showChatbotQuestions);
  showChatbotQuestions();
}

initChatbot();
