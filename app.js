const state = {
  mood: 72,
  fullness: 36,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  rotation: 0,
  dragging: false,
  pointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  lastDragTime: 0,
  lastDragX: 0,
  lastDragY: 0,
};

const arena = document.getElementById("arena");
const pal = document.getElementById("pal");
const palPhoto = document.getElementById("palPhoto");
const palAvatar = document.getElementById("palAvatar");
const mouth = document.getElementById("mouth");
const snack = document.getElementById("snack");
const burst = document.getElementById("burst");
const moodFill = document.getElementById("moodFill");
const fullnessFill = document.getElementById("fullnessFill");
const statusLine = document.getElementById("statusLine");
const hint = document.getElementById("hint");
const photoInput = document.getElementById("photoInput");
const captureButton = document.getElementById("captureButton");
const captureHeroButton = document.getElementById("captureHeroButton");
const capturePrompt = document.getElementById("capturePrompt");
const feedButton = document.getElementById("feedButton");
const calmButton = document.getElementById("calmButton");
const installButton = document.getElementById("installButton");

let deferredPrompt = null;
let lastFrame = performance.now();

const statusMessages = {
  uncaptured: "Pick a target. Capture a teammate to begin.",
  captured: "Captured. Keep your teammate fed and under control.",
  ecstatic: "Your pal is thriving in captivity.",
  happy: "Your pal is playful and dangerously tossable.",
  okay: "Your pal is suspicious but cooperative.",
  hungry: "Your pal is getting dramatic about snacks.",
  stuffed: "Too many snacks. Morale is wobbling.",
  dizzy: "That toss rattled their tiny soul.",
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message) {
  statusLine.textContent = message;
}

function setInteractionEnabled(enabled) {
  feedButton.disabled = !enabled;
  calmButton.disabled = !enabled;
}

function hasPhoto() {
  return pal.classList.contains("has-photo");
}

function updateMeters() {
  moodFill.style.width = `${state.mood}%`;
  fullnessFill.style.width = `${state.fullness}%`;

  if (!hasPhoto()) {
    setStatus(statusMessages.uncaptured);
    return;
  }

  if (state.mood > 82) {
    mouth.style.borderRadius = "0 0 18px 18px";
    mouth.style.borderTop = "0";
    mouth.style.borderBottom = "4px solid var(--ink)";
    setStatus(statusMessages.ecstatic);
  } else if (state.fullness > 84) {
    mouth.style.borderRadius = "18px 18px 0 0";
    mouth.style.borderTop = "4px solid var(--ink)";
    mouth.style.borderBottom = "0";
    setStatus(statusMessages.stuffed);
  } else if (state.mood < 35) {
    mouth.style.borderRadius = "18px 18px 0 0";
    mouth.style.borderTop = "4px solid var(--ink)";
    mouth.style.borderBottom = "0";
    setStatus(statusMessages.hungry);
  } else {
    mouth.style.borderRadius = "0 0 18px 18px";
    mouth.style.borderTop = "0";
    mouth.style.borderBottom = "4px solid var(--ink)";
    setStatus(statusMessages.okay);
  }
}

function renderPal() {
  pal.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg)`;
}

function animateBurst(text) {
  burst.textContent = text;
  burst.hidden = false;
  burst.getAnimations().forEach((animation) => animation.cancel());
  burst.style.animation = "none";
  burst.offsetHeight;
  burst.style.animation = "burst-pop 850ms ease forwards";
  window.setTimeout(() => {
    burst.hidden = true;
  }, 820);
}

function showSnack() {
  snack.hidden = false;
  snack.getAnimations().forEach((animation) => animation.cancel());
  snack.style.animation = "none";
  snack.offsetHeight;
  snack.style.animation = "snack-drop 650ms ease forwards";
  window.setTimeout(() => {
    snack.hidden = true;
  }, 640);
}

function feedPal() {
  if (!hasPhoto()) {
    setStatus(statusMessages.uncaptured);
    return;
  }

  showSnack();
  state.fullness = clamp(state.fullness + 14, 0, 100);
  state.mood = clamp(state.mood + (state.fullness > 78 ? -6 : 9), 0, 100);
  state.vy -= 2.2;
  animateBurst(state.fullness > 78 ? "too much" : "+1 snack");
  updateMeters();
}

function calmPal() {
  if (!hasPhoto()) {
    setStatus(statusMessages.uncaptured);
    return;
  }

  state.mood = clamp(state.mood + 8, 0, 100);
  state.fullness = clamp(state.fullness - 4, 0, 100);
  state.rotation = clamp(state.rotation - 6, -24, 24);
  animateBurst("pat pat");
  updateMeters();
}

function degradeNeeds() {
  if (!hasPhoto()) {
    return;
  }

  state.fullness = clamp(state.fullness - 0.018, 0, 100);
  state.mood = clamp(state.mood - (state.fullness < 22 ? 0.024 : 0.008), 0, 100);
}

function applyBounds() {
  const arenaRect = arena.getBoundingClientRect();
  const maxX = arenaRect.width / 2 - 72;
  const minY = -arenaRect.height / 2 + 76;
  const maxY = arenaRect.height / 2 - 76;

  if (state.x < -maxX) {
    state.x = -maxX;
    state.vx *= -0.64;
  } else if (state.x > maxX) {
    state.x = maxX;
    state.vx *= -0.64;
  }

  if (state.y < minY) {
    state.y = minY;
    state.vy *= -0.52;
  } else if (state.y > maxY) {
    if (Math.abs(state.vy) > 8) {
      state.mood = clamp(state.mood - 7, 0, 100);
      setStatus(statusMessages.dizzy);
    }
    state.y = maxY;
    state.vy *= -0.46;
    state.vx *= 0.96;
  }
}

function tick(now) {
  const delta = Math.min(32, now - lastFrame);
  lastFrame = now;

  if (!state.dragging) {
    degradeNeeds();
    state.vy += 0.025 * delta;
    state.x += state.vx * (delta / 16);
    state.y += state.vy * (delta / 16);
    state.rotation += state.vx * 0.06;
    state.vx *= 0.992;
    state.vy *= 0.996;
    applyBounds();
    updateMeters();
    renderPal();
  }

  window.requestAnimationFrame(tick);
}

function pointerPosition(event) {
  const rect = arena.getBoundingClientRect();
  return {
    x: event.clientX - rect.left - rect.width / 2,
    y: event.clientY - rect.top - rect.height / 2,
  };
}

function startDrag(event) {
  if (!hasPhoto()) {
    photoInput.click();
    return;
  }

  event.preventDefault();
  state.dragging = true;
  state.pointerId = event.pointerId;
  pal.classList.add("dragging");

  if (pal.setPointerCapture) {
    try {
      pal.setPointerCapture(event.pointerId);
    } catch {}
  }

  const point = pointerPosition(event);
  state.dragStartX = point.x;
  state.dragStartY = point.y;
  state.dragOriginX = state.x;
  state.dragOriginY = state.y;
  state.lastDragTime = performance.now();
  state.lastDragX = point.x;
  state.lastDragY = point.y;
}

function moveDrag(event) {
  if (!state.dragging || state.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const point = pointerPosition(event);
  state.x = state.dragOriginX + (point.x - state.dragStartX);
  state.y = state.dragOriginY + (point.y - state.dragStartY);
  state.rotation = clamp((point.x - state.dragStartX) * 0.18, -24, 24);
  state.lastDragX = point.x;
  state.lastDragY = point.y;
  state.lastDragTime = performance.now();
  applyBounds();
  renderPal();
}

function releasePal(event) {
  if (!state.dragging || state.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const point = pointerPosition(event);
  const elapsed = Math.max(16, performance.now() - state.lastDragTime);
  state.vx = ((point.x - state.lastDragX) / elapsed) * 22;
  state.vy = ((point.y - state.lastDragY) / elapsed) * 22;
  state.rotation = clamp(state.vx * 2.4, -32, 32);
  state.mood = clamp(state.mood + 4, 0, 100);
  state.dragging = false;
  state.pointerId = null;
  pal.classList.remove("dragging");
}

function applyPhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("That file is not an image.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    palPhoto.src = reader.result;
    palPhoto.hidden = false;
    pal.classList.add("has-photo");
    capturePrompt.hidden = true;
    captureButton.textContent = "Retake Photo";
    hint.textContent = "Drag or flick your teammate to toss them. Feed carefully: too many snacks makes them grumpy.";
    setInteractionEnabled(true);
    state.mood = 72;
    state.fullness = 36;
    state.vx = 0;
    state.vy = 0;
    setStatus(statusMessages.captured);
    updateMeters();
    renderPal();
  });
  reader.readAsDataURL(file);
}

pal.addEventListener("pointerdown", startDrag);
pal.addEventListener("pointermove", moveDrag);
pal.addEventListener("pointerup", releasePal);
pal.addEventListener("pointercancel", releasePal);
window.addEventListener("pointermove", moveDrag, { passive: false });
window.addEventListener("pointerup", releasePal, { passive: false });
window.addEventListener("pointercancel", releasePal, { passive: false });

captureButton.addEventListener("click", () => {
  photoInput.click();
});

captureHeroButton.addEventListener("click", () => {
  photoInput.click();
});

photoInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  applyPhoto(file);
  photoInput.value = "";
});

feedButton.addEventListener("click", feedPal);
calmButton.addEventListener("click", calmPal);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) {
    return;
  }

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
  setStatus("Pocket Pal installed. Containment is permanent.");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      setStatus("App loaded, but offline install support could not start.");
    });
  });
}

updateMeters();
renderPal();
setInteractionEnabled(false);
window.requestAnimationFrame(tick);
