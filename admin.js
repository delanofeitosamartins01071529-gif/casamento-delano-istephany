const preview = document.getElementById("sitePreview");
const login = document.getElementById("adminLogin");
const shell = document.getElementById("adminShell");
const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("adminLoginStatus");
const adminUser = document.getElementById("adminUser");
const adminPassword = document.getElementById("adminPassword");
const logoutButton = document.getElementById("adminLogout");
const editToggle = document.getElementById("adminEditMode");
const saveAllButton = document.getElementById("adminSaveAll");
const saveStatus = document.getElementById("adminSaveStatus");
const clearButton = document.getElementById("adminClearChanges");
const uploadList = document.getElementById("adminUploadList");
const cropModal = document.getElementById("cropModal");
const cropCanvas = document.getElementById("cropCanvas");
const cropZoom = document.getElementById("cropZoom");
const cropSave = document.getElementById("cropSave");
const cropCancel = document.getElementById("cropCancel");
const cropCancelTop = document.getElementById("cropCancelTop");
const cropCancelBackdrop = document.getElementById("cropCancelBackdrop");

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
  ".site-footer p",
];

const photoSlots = [
  ["historia-encontro", "História - O encontro"],
  ["historia-pedido", "História - O pedido"],
  ["historia-grande-dia", "História - O grande dia"],
  ["memoria-01", "Quadro 01"],
  ["memoria-02", "Quadro 02"],
  ["memoria-03", "Quadro 03"],
  ["memoria-04", "Quadro 04"],
  ["memoria-05", "Quadro 05"],
  ["memoria-06", "Quadro 06"],
  ["memoria-07", "Quadro 07"],
  ["memoria-08", "Quadro 08"],
  ["memoria-09", "Quadro 09"],
  ["memoria-10", "Quadro 10"],
  ["memoria-11", "Quadro 11"],
  ["memoria-12", "Quadro 12"],
  ["memoria-14", "Quadro 13"],
];

let editableElements = [];
let cropState = null;
const cropContext = cropCanvas.getContext("2d");
const authKey = "wedding-admin-authenticated";
const pendingText = new Map();
const pendingPhotos = new Map();
const pendingPhotoCollections = new Map();

function unlockAdmin() {
  login.classList.add("is-hidden");
  shell.classList.remove("is-locked");
  sessionStorage.setItem(authKey, "true");
  preview.src = "index.html";
}

function lockAdmin() {
  shell.classList.add("is-locked");
  login.classList.remove("is-hidden");
  sessionStorage.removeItem(authKey);
  preview.removeAttribute("src");
  adminPassword.value = "";
  adminUser.focus();
}

function getPreviewDocument() {
  return preview.contentDocument || preview.contentWindow.document;
}

function collectEditableElements() {
  const doc = getPreviewDocument();
  editableElements = editableSelectors.flatMap((selector) => Array.from(doc.querySelectorAll(selector)));
  editableElements.forEach((element, index) => {
    const key = `wedding-admin-text-${index}`;
    element.dataset.adminKey = key;
    const savedText = pendingText.get(key) ?? localStorage.getItem(key);
    if (savedText !== null) element.textContent = savedText;
    element.addEventListener("input", () => {
      pendingText.set(key, element.textContent.trim());
      markPending();
    });
  });

  doc.querySelectorAll("[data-save-field]").forEach((field) => {
    const key = `casamento-${field.dataset.saveField}`;
    field.value = pendingText.get(key) ?? localStorage.getItem(key) ?? "";
    field.addEventListener("input", () => {
      pendingText.set(key, field.value);
      markPending();
    });
  });

  doc.querySelectorAll("[data-photo-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const key = input.dataset.photoInput;
      const storageKey = `casamento-photos-${key}`;
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

      pendingPhotoCollections.set(storageKey, JSON.stringify(photos));
      markPending();
    });
  });
}

function markPending() {
  if (saveStatus) saveStatus.textContent = "Há alterações não salvas.";
}

function setEditMode(enabled) {
  const doc = getPreviewDocument();
  doc.body.classList.toggle("admin-editing", enabled);
  editableElements.forEach((element) => {
    element.contentEditable = String(enabled);
    element.spellcheck = enabled;
  });
}

function getFrameInfo(slot) {
  const frame = getPreviewDocument().querySelector(`[data-photo-slot="${slot}"]`);
  if (!frame) return { aspect: 1, angle: 0 };
  const rect = frame.getBoundingClientRect();
  const transform = getPreviewDocument().defaultView.getComputedStyle(frame).transform;
  let angle = 0;

  if (transform && transform !== "none") {
    const values = transform.match(/matrix\(([^)]+)\)/)?.[1].split(",").map(Number);
    if (values?.length >= 2) angle = Math.atan2(values[1], values[0]) * (180 / Math.PI);
  }

  return {
    aspect: Math.max(rect.width, 1) / Math.max(rect.height, 1),
    angle,
  };
}

function sizeCropCanvas(aspect) {
  if (aspect >= 1) {
    cropCanvas.width = 1200;
    cropCanvas.height = Math.round(1200 / aspect);
  } else {
    cropCanvas.height = 1200;
    cropCanvas.width = Math.round(1200 * aspect);
  }
}

function drawCrop() {
  if (!cropState) return;
  const { image, zoom, offsetX, offsetY } = cropState;
  const baseScale = Math.max(cropCanvas.width / image.naturalWidth, cropCanvas.height / image.naturalHeight);
  const scale = baseScale * zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (cropCanvas.width - drawWidth) / 2 + offsetX;
  const y = (cropCanvas.height - drawHeight) / 2 + offsetY;

  cropContext.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropContext.fillStyle = "#fbfaf6";
  cropContext.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropContext.drawImage(image, x, y, drawWidth, drawHeight);
}

function openCropEditor(slot, dataUrl) {
  const image = new Image();
  image.addEventListener("load", () => {
    const frameInfo = getFrameInfo(slot);
    sizeCropCanvas(frameInfo.aspect);
    cropCanvas.style.setProperty("--crop-angle", `${frameInfo.angle}deg`);
    cropZoom.value = "1";
    cropState = {
      slot,
      image,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
    };
    drawCrop();
    cropModal.classList.add("is-open");
    cropModal.setAttribute("aria-hidden", "false");
  });
  image.src = dataUrl;
}

function closeCropEditor() {
  cropModal.classList.remove("is-open");
  cropModal.setAttribute("aria-hidden", "true");
  cropState = null;
}

function renderUploads() {
  uploadList.innerHTML = "";
  photoSlots.forEach(([slot, label]) => {
    const row = document.createElement("label");
    row.className = "admin-upload-row";
    row.innerHTML = `<span>${label}</span><input type="file" accept="image/*" />`;
    const input = row.querySelector("input");
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => openCropEditor(slot, String(reader.result)));
      reader.readAsDataURL(file);
    });
    uploadList.appendChild(row);
  });
}

function applyPendingPhoto(slot, dataUrl) {
  const doc = getPreviewDocument();
  const frame = doc.querySelector(`[data-photo-slot="${slot}"]`);
  const frameImage = frame?.querySelector("img");
  if (frame && frameImage) {
    frameImage.src = dataUrl;
    frame.classList.add("has-image");
    return;
  }

  const previewBox = doc.querySelector(`[data-photo-preview="${slot}"]`);
  if (previewBox) {
    previewBox.innerHTML = "";
    const image = doc.createElement("img");
    image.alt = "Foto enviada";
    image.src = dataUrl;
    previewBox.appendChild(image);
  }
}

cropZoom.addEventListener("input", () => {
  if (!cropState) return;
  cropState.zoom = Number(cropZoom.value);
  drawCrop();
});

cropCanvas.addEventListener("pointerdown", (event) => {
  if (!cropState) return;
  cropCanvas.setPointerCapture(event.pointerId);
  cropState.dragging = true;
  cropState.lastX = event.clientX;
  cropState.lastY = event.clientY;
});

cropCanvas.addEventListener("pointermove", (event) => {
  if (!cropState?.dragging) return;
  const scaleX = cropCanvas.width / cropCanvas.getBoundingClientRect().width;
  const scaleY = cropCanvas.height / cropCanvas.getBoundingClientRect().height;
  cropState.offsetX += (event.clientX - cropState.lastX) * scaleX;
  cropState.offsetY += (event.clientY - cropState.lastY) * scaleY;
  cropState.lastX = event.clientX;
  cropState.lastY = event.clientY;
  drawCrop();
});

cropCanvas.addEventListener("pointerup", () => {
  if (cropState) cropState.dragging = false;
});

cropSave.addEventListener("click", () => {
  if (!cropState) return;
  const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.92);
  pendingPhotos.set(cropState.slot, dataUrl);
  applyPendingPhoto(cropState.slot, dataUrl);
  markPending();
  closeCropEditor();
});

[cropCancel, cropCancelTop, cropCancelBackdrop].forEach((button) => {
  button.addEventListener("click", closeCropEditor);
});

preview.addEventListener("load", () => {
  collectEditableElements();
  setEditMode(editToggle.checked);
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (adminUser.value.trim() === "davi" && adminPassword.value === "isadora") {
    loginStatus.textContent = "";
    unlockAdmin();
    return;
  }
  loginStatus.textContent = "Usuário ou senha incorretos.";
});

logoutButton.addEventListener("click", lockAdmin);

editToggle.addEventListener("change", () => setEditMode(editToggle.checked));

saveAllButton.addEventListener("click", () => {
  pendingText.forEach((value, key) => localStorage.setItem(key, value));
  pendingPhotos.forEach((value, slot) => localStorage.setItem(`wedding-admin-photo-${slot}`, value));
  pendingPhotoCollections.forEach((value, key) => localStorage.setItem(key, value));
  pendingText.clear();
  pendingPhotos.clear();
  pendingPhotoCollections.clear();
  saveStatus.textContent = "Todas as alterações foram salvas.";
  preview.contentWindow.location.reload();
});

clearButton.addEventListener("click", () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("wedding-admin-")) localStorage.removeItem(key);
  });
  preview.contentWindow.location.reload();
});

renderUploads();

if (sessionStorage.getItem(authKey) === "true") {
  unlockAdmin();
} else {
  lockAdmin();
}
