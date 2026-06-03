const editPreview = document.getElementById("sitePreview");
const visitorPreview = document.getElementById("visitorPreview");
const login = document.getElementById("adminLogin");
const shell = document.getElementById("adminShell");
const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("adminLoginStatus");
const adminUser = document.getElementById("adminUser");
const adminPassword = document.getElementById("adminPassword");
const logoutButton = document.getElementById("adminLogout");
const saveAllButton = document.getElementById("adminSaveAll");
const saveStatus = document.getElementById("adminSaveStatus");
const clearButton = document.getElementById("adminClearChanges");
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
  ".gift-card span",
  ".gift-card strong",
  ".gift-modal h2",
  ".gift-modal p",
  ".memory-copy h2",
  ".memory-frame figcaption",
  ".site-footer p",
];

let editableElements = [];
let saveFieldElements = [];
let cropState = null;
let cropCloseTimer = null;
const cropContext = cropCanvas.getContext("2d");
const authKey = "wedding-admin-authenticated";
const pendingPhotos = new Map();
const modalAnimationDuration = 1500;

function getEditDocument() {
  return editPreview.contentDocument || editPreview.contentWindow.document;
}

function markPending() {
  saveStatus.textContent = "Há alterações não salvas.";
}

function refreshVisitorPreview() {
  visitorPreview.src = `index.html?preview=${Date.now()}`;
}

function unlockAdmin() {
  login.classList.add("is-hidden");
  shell.classList.remove("is-locked");
  sessionStorage.setItem(authKey, "true");
  editPreview.src = "index.html";
  refreshVisitorPreview();
}

function lockAdmin() {
  shell.classList.add("is-locked");
  login.classList.remove("is-hidden");
  sessionStorage.removeItem(authKey);
  editPreview.removeAttribute("src");
  visitorPreview.removeAttribute("src");
  adminPassword.value = "";
  adminUser.focus();
}

function collectEditableElements() {
  const doc = getEditDocument();
  editableElements = editableSelectors.flatMap((selector) => Array.from(doc.querySelectorAll(selector)));
  saveFieldElements = Array.from(doc.querySelectorAll("[data-save-field]"));
  doc.body.classList.add("admin-editing");

  editableElements.forEach((element, index) => {
    const key = `wedding-admin-text-${index}`;
    element.dataset.adminKey = key;
    const savedText = localStorage.getItem(key);
    if (savedText !== null) element.textContent = savedText;
    element.contentEditable = "true";
    element.spellcheck = true;
    element.addEventListener("input", markPending);
  });

  saveFieldElements.forEach((field) => {
    const key = `casamento-${field.dataset.saveField}`;
    field.value = localStorage.getItem(key) || "";
    field.addEventListener("input", markPending);
  });

  bindInlinePhotoUploads(doc);
}

function getFrameInfo(slot) {
  const doc = getEditDocument();
  const frame = doc.querySelector(`[data-photo-slot="${slot}"]`);
  const preview = doc.querySelector(`[data-photo-preview="${slot}"]`);
  const target = frame || preview;
  if (!target) return { aspect: 1, angle: 0 };
  const rect = target.getBoundingClientRect();
  const transform = doc.defaultView.getComputedStyle(target).transform;
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

function seedCropLeaves() {
  const burst = cropModal.querySelector(".leaf-burst");
  if (!burst) return;
  const rect = burst.getBoundingClientRect();
  const width = Math.max(rect.width, 360);
  const height = Math.max(rect.height, 260);

  Array.from(burst.children).forEach((leaf, index) => {
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

function openCropEditor(slot, dataUrl) {
  const image = new Image();
  image.addEventListener("load", () => {
    window.clearTimeout(cropCloseTimer);
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
    cropModal.classList.remove("is-closing");
    seedCropLeaves();
    cropModal.classList.add("is-open");
    cropModal.setAttribute("aria-hidden", "false");
  });
  image.src = dataUrl;
}

function closeCropEditor() {
  if (cropModal.classList.contains("is-closing")) return;
  window.clearTimeout(cropCloseTimer);
  cropModal.classList.remove("is-open");
  cropModal.classList.add("is-closing");
  cropCloseTimer = window.setTimeout(() => {
    cropModal.classList.remove("is-closing");
    cropModal.setAttribute("aria-hidden", "true");
    cropState = null;
  }, modalAnimationDuration);
}

function applyPendingPhoto(slot, dataUrl) {
  const doc = getEditDocument();
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
    const print = doc.createElement("figure");
    const clip = doc.createElement("span");
    const image = doc.createElement("img");
    print.className = "photo-print";
    clip.className = "photo-clip";
    image.alt = "Foto enviada";
    image.src = dataUrl;
    print.append(clip, image);
    previewBox.appendChild(print);
  }
}

function bindInlinePhotoUploads(doc) {
  const inputs = Array.from(doc.querySelectorAll("[data-photo-input], [data-admin-photo]"));
  inputs.forEach((input) => {
    if (input.dataset.adminBound === "true") return;
    input.dataset.adminBound = "true";
    input.addEventListener("change", () => {
      const slot = input.dataset.photoInput || input.dataset.adminPhoto;
      const file = input.files?.[0];
      input.value = "";
      if (!slot || !file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => openCropEditor(slot, String(reader.result)));
      reader.readAsDataURL(file);
    });
  });
}

function saveAllChanges() {
  editableElements.forEach((element) => {
    localStorage.setItem(element.dataset.adminKey, element.textContent.trim());
  });

  saveFieldElements.forEach((field) => {
    localStorage.setItem(`casamento-${field.dataset.saveField}`, field.value);
  });

  pendingPhotos.forEach((value, slot) => localStorage.setItem(`wedding-admin-photo-${slot}`, value));
  pendingPhotos.clear();
  saveStatus.textContent = "Todas as alterações foram salvas.";
  editPreview.contentWindow.location.reload();
  refreshVisitorPreview();
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

editPreview.addEventListener("load", collectEditableElements);

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
saveAllButton.addEventListener("click", saveAllChanges);

clearButton.addEventListener("click", () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("wedding-admin-") || key.startsWith("casamento-")) localStorage.removeItem(key);
  });
  saveStatus.textContent = "Edições salvas foram limpas.";
  editPreview.contentWindow.location.reload();
  refreshVisitorPreview();
});

document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.adminTab;
    document.querySelectorAll("[data-admin-tab]").forEach((item) => item.classList.toggle("is-active", item === tab));
    editPreview.classList.toggle("is-active", target === "edit");
    visitorPreview.classList.toggle("is-active", target === "view");
    if (target === "view") refreshVisitorPreview();
  });
});

if (sessionStorage.getItem(authKey) === "true") {
  unlockAdmin();
} else {
  lockAdmin();
}
