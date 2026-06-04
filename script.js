const countdown = document.querySelector(".countdown");
const dateValue = countdown?.dataset.weddingDate;
const targetDate = dateValue ? new Date(dateValue).getTime() : null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  if (!targetDate) return;

  const now = Date.now();
  const distance = Math.max(targetDate - now, 0);
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  document.getElementById("days").textContent = String(days).padStart(3, "0");
  document.getElementById("hours").textContent = pad(hours);
  document.getElementById("minutes").textContent = pad(minutes);
  document.getElementById("seconds").textContent = pad(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);

let activeModal = null;
let lastFocusedElement = null;
const modalAnimationDuration = 1500;

function ensureLeafBurst(modal) {
  const burst = modal?.querySelector(".leaf-burst");
  if (!burst) return;
  while (burst.children.length < 14) {
    burst.appendChild(document.createElement("span"));
  }

  const rect = burst.getBoundingClientRect();
  const width = Math.max(rect.width, 360);
  const height = Math.max(rect.height, 260);
  const leaves = Array.from(burst.children);

  leaves.forEach((leaf, index) => {
    const side = Math.floor(Math.random() * 4);
    const edgeOffset = 18;
    let startX = 0;
    let startY = 0;

    if (side === 0) {
      startX = Math.random() * width;
      startY = edgeOffset;
    } else if (side === 1) {
      startX = width - edgeOffset;
      startY = Math.random() * height;
    } else if (side === 2) {
      startX = Math.random() * width;
      startY = height - edgeOffset;
    } else {
      startX = edgeOffset;
      startY = Math.random() * height;
    }

    const fromCenterX = startX - width / 2;
    const fromCenterY = startY - height / 2;
    const length = Math.max(Math.hypot(fromCenterX, fromCenterY), 1);
    const normalX = fromCenterX / length;
    const normalY = fromCenterY / length;
    const sideWobble = (Math.random() - 0.5) * 120;
    const tangentX = -normalY;
    const tangentY = normalX;
    const midX = normalX * (70 + Math.random() * 80) + tangentX * sideWobble;
    const midY = normalY * (70 + Math.random() * 80) + tangentY * sideWobble - 22;
    const endX = normalX * (180 + Math.random() * 190) + tangentX * sideWobble * 1.35;
    const endY = normalY * (180 + Math.random() * 190) + tangentY * sideWobble * 1.35 - 30;

    leaf.style.left = `${startX}px`;
    leaf.style.top = `${startY}px`;
    leaf.style.setProperty("--mid-x", `${midX}px`);
    leaf.style.setProperty("--mid-y", `${midY}px`);
    leaf.style.setProperty("--end-x", `${endX}px`);
    leaf.style.setProperty("--end-y", `${endY}px`);
    leaf.style.setProperty("--r", `${Math.round((Math.random() - 0.5) * 420)}deg`);
    leaf.style.setProperty("--leaf-scale", `${0.78 + Math.random() * 0.36}`);
    leaf.style.setProperty("--leaf-opacity", `${0.72 + Math.random() * 0.24}`);
    leaf.style.setProperty("--leaf-delay", `${(index % 5) * 32}ms`);
  });
}

function openModal(modal) {
  if (!modal) return;
  ensureLeafBurst(modal);
  lastFocusedElement = document.activeElement;
  activeModal = modal;
  modal.classList.remove("is-closing");
  modal.classList.add("is-open");
  document.body.classList.add("modal-active");
  modal.querySelector(".gift-modal")?.focus({ preventScroll: true });
}

function closeModal(modal = activeModal) {
  if (!modal || modal.classList.contains("is-closing")) return;
  modal.classList.remove("is-open");
  modal.classList.add("is-closing");

  window.setTimeout(() => {
    modal.classList.remove("is-closing");
    if (activeModal === modal) activeModal = null;
    document.body.classList.remove("modal-active");
    lastFocusedElement?.focus?.({ preventScroll: true });
  }, modalAnimationDuration);
}

document.querySelectorAll("[data-modal-target]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    openModal(document.getElementById(trigger.dataset.modalTarget));
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openModal(document.getElementById(trigger.dataset.modalTarget));
  });
});

document.querySelectorAll("[data-close-modal]").forEach((closer) => {
  closer.addEventListener("click", () => {
    closeModal(closer.closest(".modal-layer"));
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

document.querySelectorAll("[data-save-field]").forEach((field) => {
  const key = `casamento-${field.dataset.saveField}`;
  field.value = localStorage.getItem(key) || "";
});

document.querySelectorAll("[data-save-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const original = button.textContent;
    button.textContent = "Informações salvas";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1600);
  });
});

function renderPhotoPreview(key, photos) {
  const preview = document.querySelector(`[data-photo-preview="${key}"]`);
  if (!preview) return;
  preview.innerHTML = "";
  photos.forEach((photo, index) => {
    const print = document.createElement("figure");
    const clip = document.createElement("span");
    const image = document.createElement("img");
    print.className = "photo-print";
    clip.className = "photo-clip";
    image.alt = `Foto ${index + 1}`;
    image.src = photo;
    print.append(clip, image);
    preview.appendChild(print);
  });
}

function getStoredPhotos(key) {
  const photos = [];
  const adminPhoto = localStorage.getItem(`wedding-admin-photo-${key}`);
  const collection = JSON.parse(localStorage.getItem(`casamento-photos-${key}`) || "[]");

  if (adminPhoto) photos.push(adminPhoto);
  if (Array.isArray(collection)) photos.push(...collection.filter(Boolean));

  return photos;
}

document.querySelectorAll("[data-photo-input]").forEach((input) => {
  const key = input.dataset.photoInput;
  renderPhotoPreview(key, getStoredPhotos(key));

  input.addEventListener("change", async () => {
    if (document.body.classList.contains("admin-editing")) return;
    const files = Array.from(input.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    const photos = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener("load", () => resolve(String(reader.result)));
            reader.readAsDataURL(file);
          })
      )
    );

    renderPhotoPreview(key, photos);
    input.value = "";
  });
});

[
  "historia-encontro",
  "historia-pedido",
  "historia-grande-dia",
  "pix",
].forEach((slot) => renderPhotoPreview(slot, getStoredPhotos(slot)));

const music = document.getElementById("weddingMusic");
const musicWidget = document.querySelector(".music-widget");
const musicPanelToggle = document.getElementById("musicPanelToggle");
const musicEnabled = document.getElementById("musicEnabled");
const musicVolume = document.getElementById("musicVolume");
const musicState = document.getElementById("musicState");
const fadeTargetVolume = 0.5;
let fadeTimer = null;
let autoplayBlocked = false;
let musicPanelTimer = null;
const isEmbeddedPreview = window.self !== window.top;

function setMusicHint(text) {
  return text;
}

function updateVolumeFill() {
  if (!musicVolume) return;
  const min = Number(musicVolume.min || 0);
  const max = Number(musicVolume.max || 1);
  const value = Number(musicVolume.value);
  const percent = ((value - min) / (max - min)) * 100;
  musicVolume.style.setProperty("--volume-percent", `${Math.max(0, Math.min(100, percent))}%`);
}

function updateMusicState() {
  if (!music || !musicState || !musicEnabled) return;
  musicState.textContent = "Música";
}

function fadeMusicTo(target, duration = 3000) {
  if (!music) return;
  window.clearInterval(fadeTimer);
  const start = music.volume;
  const startedAt = performance.now();

  fadeTimer = window.setInterval(() => {
    const progress = Math.min((performance.now() - startedAt) / duration, 1);
    music.volume = start + (target - start) * progress;
    if (progress >= 1) window.clearInterval(fadeTimer);
  }, 50);
}

async function startMusic({ withFade = true } = {}) {
  if (!music || !musicEnabled?.checked) return;
  window.clearInterval(fadeTimer);
  music.loop = true;
  music.volume = withFade ? 0 : Number(musicVolume.value);

  try {
    await music.play();
    autoplayBlocked = false;
    if (withFade) fadeMusicTo(Number(musicVolume.value), 3000);
    setMusicHint("Música em loop com fade-in suave.");
  } catch {
    autoplayBlocked = true;
    setMusicHint("O navegador aguardou o primeiro clique para liberar a música.");
  } finally {
    updateMusicState();
  }
}

function stopMusic() {
  if (!music) return;
  window.clearInterval(fadeTimer);
  music.pause();
  updateMusicState();
  setMusicHint("Música pausada.");
}

if (isEmbeddedPreview) {
  music?.pause();
  music?.removeAttribute("autoplay");
  if (musicWidget) musicWidget.hidden = true;
} else if (music && musicEnabled && musicVolume) {
  music.volume = 0;
  musicVolume.value = String(fadeTargetVolume);
  updateVolumeFill();
  musicEnabled.checked = true;
  startMusic({ withFade: true });

  document.addEventListener(
    "pointerdown",
    () => {
      if (autoplayBlocked && musicEnabled.checked) startMusic({ withFade: true });
    },
    { once: false }
  );

  musicPanelToggle?.addEventListener("click", () => {
    if (!musicWidget) return;
    window.clearTimeout(musicPanelTimer);
    if (musicWidget.classList.contains("is-open")) {
      musicWidget.classList.remove("is-open");
      musicWidget.classList.add("is-closing");
      musicPanelToggle.setAttribute("aria-expanded", "false");
      musicPanelTimer = window.setTimeout(() => {
        musicWidget.classList.remove("is-closing");
      }, 520);
      return;
    }

    musicWidget.classList.remove("is-closing");
    musicWidget.classList.add("is-open");
    musicPanelToggle.setAttribute("aria-expanded", "true");
  });

  musicEnabled.addEventListener("change", () => {
    if (musicEnabled.checked) startMusic({ withFade: true });
    else stopMusic();
  });

  musicVolume.addEventListener("input", () => {
    const value = Number(musicVolume.value);
    updateVolumeFill();
    if (!music.paused) music.volume = value;
  });

  music.addEventListener("play", updateMusicState);
  music.addEventListener("pause", updateMusicState);
}

const clickLayer = document.getElementById("clickLayer");

document.addEventListener("pointerdown", (event) => {
  if (!clickLayer || event.button !== 0) return;
  const petals = 3;

  for (let index = 0; index < petals; index += 1) {
    const petal = document.createElement("span");
    const drift = (index - 1) * 16 + (Math.random() - 0.5) * 12;
    const fall = 92 + Math.random() * 54;
    petal.className = "click-spark";
    petal.style.left = `${event.clientX + drift * 0.4}px`;
    petal.style.top = `${event.clientY - 12}px`;
    petal.style.setProperty("--x", `${drift}px`);
    petal.style.setProperty("--y", `${fall}px`);
    petal.style.setProperty("--angle", `${-32 + Math.random() * 64}deg`);
    petal.style.setProperty("--spin", `${150 + Math.random() * 90}deg`);
    clickLayer.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove(), { once: true });
  }
});

const editableSelectors = [
  ".hero h1",
  ".hero-copy",
  ".date-card span",
  ".date-card strong",
  ".section-heading .eyebrow",
  ".section-heading h2",
  ".section-heading p",
  ".story-grid h3",
  ".story-grid p",
  ".timeline h3",
  ".timeline p",
  ".venue-panel h3",
  ".venue-panel p",
  ".attire-section h2",
  ".attire-section p",
  ".palette strong",
  ".palette small",
  ".pix-panel h3",
  ".pix-panel p",
  ".gift-modal h2",
  ".gift-modal p",
  ".memory-copy h2",
  ".memory-frame figcaption",
  ".site-footer p",
];

const textStoragePrefix = "wedding-admin-text-v3";
const editableElements = [];

editableSelectors.forEach((selector) => {
  Array.from(document.querySelectorAll(selector)).forEach((element, index) => {
    const key = `${textStoragePrefix}-${selector.replace(/[^a-z0-9]+/gi, "-")}-${index}`;
    element.dataset.adminKey = key;
    editableElements.push(element);
  });
});

editableElements.forEach((element) => {
  const key = element.dataset.adminKey;
  const savedText = localStorage.getItem(key);
  if (savedText !== null) element.textContent = savedText;
  element.addEventListener("input", () => localStorage.setItem(key, element.textContent.trim()));
});

function setAdminMode(enabled) {
  document.body.classList.toggle("admin-editing", enabled);
  editableElements.forEach((element) => {
    element.contentEditable = String(enabled);
    element.spellcheck = enabled;
  });
}

document.querySelectorAll("[data-admin-photo]").forEach((input) => {
  const slotKey = `wedding-admin-photo-${input.dataset.adminPhoto}`;
  const frame = document.querySelector(`[data-photo-slot="${input.dataset.adminPhoto}"]`);
  const image = frame?.querySelector("img");
  const savedPhoto = localStorage.getItem(slotKey);

  if (savedPhoto && image && frame) {
    image.src = savedPhoto;
    frame.classList.add("has-image");
  }

  input.addEventListener("change", () => {
    if (document.body.classList.contains("admin-editing")) return;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith("image/") || !image || !frame) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      image.src = String(reader.result);
      frame.classList.add("has-image");
      localStorage.setItem(slotKey, String(reader.result));
    });
    reader.readAsDataURL(file);
  });
});
