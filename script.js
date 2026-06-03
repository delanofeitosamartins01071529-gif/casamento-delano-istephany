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

const form = document.getElementById("rsvpForm");
const statusText = document.getElementById("formStatus");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const response = {
    name: data.get("name"),
    guests: data.get("guests"),
    attendance: data.get("attendance"),
    message: data.get("message") || "",
  };

  localStorage.setItem("casamento-rsvp", JSON.stringify(response));

  const message =
    "Delano e Istephany, é com muito prazer que estarei sim presente nesse grande dia tão especial para vocês, que Deus abençoe e guie vocês nesses próximos meses, tudo dará certo!";

  const whatsappUrl = `https://wa.me/558594292105?text=${encodeURIComponent(message)}`;
  statusText.textContent = "Confirmação salva. Abrindo WhatsApp dos noivos...";
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

const saved = localStorage.getItem("casamento-rsvp");
if (saved && form) {
  try {
    const response = JSON.parse(saved);
    form.elements.name.value = response.name || "";
    form.elements.guests.value = response.guests || "1";
    form.elements.message.value = response.message || "";
    const attendance = form.querySelector(`[name="attendance"][value="${response.attendance}"]`);
    if (attendance) attendance.checked = true;
    statusText.textContent = "Sua última confirmação foi carregada.";
  } catch {
    localStorage.removeItem("casamento-rsvp");
  }
}

let activeModal = null;
let lastFocusedElement = null;

function openModal(modal) {
  if (!modal) return;
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
  }, 420);
}

document.querySelectorAll("[data-modal-target]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (document.body.classList.contains("admin-editing")) return;
    openModal(document.getElementById(trigger.dataset.modalTarget));
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (document.body.classList.contains("admin-editing")) return;
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
  field.addEventListener("input", () => localStorage.setItem(key, field.value));
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
    const image = document.createElement("img");
    image.alt = `Foto ${index + 1}`;
    image.src = photo;
    preview.appendChild(image);
  });
}

document.querySelectorAll("[data-photo-input]").forEach((input) => {
  const key = input.dataset.photoInput;
  const storageKey = `casamento-photos-${key}`;
  const savedPhotos = JSON.parse(localStorage.getItem(storageKey) || "[]");
  renderPhotoPreview(key, savedPhotos);

  input.addEventListener("change", async () => {
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

    localStorage.setItem(storageKey, JSON.stringify(photos));
    renderPhotoPreview(key, photos);
    input.value = "";
  });
});

const music = document.getElementById("weddingMusic");
const musicWidget = document.querySelector(".music-widget");
const musicPanelToggle = document.getElementById("musicPanelToggle");
const musicEnabled = document.getElementById("musicEnabled");
const musicVolume = document.getElementById("musicVolume");
const musicState = document.getElementById("musicState");
const fadeTargetVolume = Number(localStorage.getItem("wedding-music-volume") || musicVolume?.value || 0.72);
let fadeTimer = null;
let autoplayBlocked = false;

function setMusicHint(text) {
  return text;
}

function updateMusicState() {
  if (!music || !musicState || !musicEnabled) return;
  musicState.textContent = music.paused || !musicEnabled.checked ? "Música" : "Tocando";
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

if (music && musicEnabled && musicVolume) {
  music.volume = 0;
  musicVolume.value = String(fadeTargetVolume);
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
    const isOpen = musicWidget?.classList.toggle("is-open");
    musicPanelToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  });

  musicEnabled.addEventListener("change", () => {
    if (musicEnabled.checked) startMusic({ withFade: true });
    else stopMusic();
  });

  musicVolume.addEventListener("input", () => {
    const value = Number(musicVolume.value);
    localStorage.setItem("wedding-music-volume", String(value));
    if (!music.paused) music.volume = value;
  });

  music.addEventListener("play", updateMusicState);
  music.addEventListener("pause", updateMusicState);
}

const clickLayer = document.getElementById("clickLayer");

document.addEventListener("pointerdown", (event) => {
  if (!clickLayer || event.button !== 0) return;
  const petals = 7;

  for (let index = 0; index < petals; index += 1) {
    const petal = document.createElement("span");
    const angle = (Math.PI * 2 * index) / petals;
    const distance = 28 + Math.random() * 18;
    petal.className = "click-spark";
    petal.style.left = `${event.clientX}px`;
    petal.style.top = `${event.clientY}px`;
    petal.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    petal.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    petal.style.setProperty("--angle", `${Math.round((angle * 180) / Math.PI)}deg`);
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
  ".timeline time",
  ".timeline h3",
  ".timeline p",
  ".venue-panel h3",
  ".venue-panel p",
  ".attire-section h2",
  ".attire-section p",
  ".palette span",
  ".rsvp-copy h2",
  ".rsvp-copy p",
  ".gift-card span",
  ".gift-card strong",
  ".gift-modal h2",
  ".gift-modal p",
  ".memory-copy h2",
  ".memory-frame figcaption",
  ".site-footer p",
];

const editableElements = editableSelectors.flatMap((selector) =>
  Array.from(document.querySelectorAll(selector))
);

editableElements.forEach((element, index) => {
  const key = `wedding-admin-text-${index}`;
  element.dataset.adminKey = key;
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
