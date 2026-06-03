const preview = document.getElementById("sitePreview");
const editToggle = document.getElementById("adminEditMode");
const clearButton = document.getElementById("adminClearChanges");
const uploadList = document.getElementById("adminUploadList");

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

const photoSlots = [
  ["memoria-01", "Foto especial"],
  ["memoria-02", "Nós dois"],
  ["memoria-03", "Família e amigos"],
  ["memoria-04", "Nosso carinho"],
  ["memoria-05", "Um detalhe bonito"],
  ["memoria-06", "Um sorriso"],
  ["memoria-07", "Pré-wedding"],
  ["memoria-08", "Com os padrinhos"],
  ["memoria-09", "Detalhes"],
  ["memoria-10", "Nosso lugar favorito"],
  ["memoria-11", "Um abraço"],
  ["memoria-12", "A celebração"],
  ["memoria-14", "Detalhe do dia"],
];

let editableElements = [];

function getPreviewDocument() {
  return preview.contentDocument || preview.contentWindow.document;
}

function collectEditableElements() {
  const doc = getPreviewDocument();
  editableElements = editableSelectors.flatMap((selector) => Array.from(doc.querySelectorAll(selector)));
  editableElements.forEach((element, index) => {
    const key = `wedding-admin-text-${index}`;
    element.dataset.adminKey = key;
    const savedText = localStorage.getItem(key);
    if (savedText !== null) element.textContent = savedText;
    element.addEventListener("input", () => localStorage.setItem(key, element.textContent.trim()));
  });
}

function setEditMode(enabled) {
  const doc = getPreviewDocument();
  doc.body.classList.toggle("admin-editing", enabled);
  editableElements.forEach((element) => {
    element.contentEditable = String(enabled);
    element.spellcheck = enabled;
  });
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
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        localStorage.setItem(`wedding-admin-photo-${slot}`, String(reader.result));
        preview.contentWindow.location.reload();
      });
      reader.readAsDataURL(file);
    });
    uploadList.appendChild(row);
  });
}

preview.addEventListener("load", () => {
  collectEditableElements();
  setEditMode(editToggle.checked);
});

editToggle.addEventListener("change", () => setEditMode(editToggle.checked));

clearButton.addEventListener("click", () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("wedding-admin-")) localStorage.removeItem(key);
  });
  preview.contentWindow.location.reload();
});

renderUploads();
