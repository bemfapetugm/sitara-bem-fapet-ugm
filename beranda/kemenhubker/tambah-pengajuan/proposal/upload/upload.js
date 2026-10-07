const LOGIN_URL = "/login/index.html",
  DB_NAME = "SITARAProposalWorkflow",
  DB_VERSION = 1,
  STORE_NAME = "files",
  MAX_SIZE = 10 * 1024 * 1024;
const STORAGE_KEY = "sitaraDraftDokumen",
  KEEP_UPLOAD_DRAFT_KEY = "sitaraKeepUploadDraft";

/*
 * Daftar dokumen yang tersedia di tahap Tambah Pengajuan.
 * Hanya dokumen yang benar-benar dipilih pengguna yang akan
 * ditampilkan pada tahap Unggah Dokumen.
 */
const ALL_DOCS = [
  {
    id: "proposal",
    title: "Proposal Kegiatan",
    desc: "Dokumen utama proposal kegiatan yang diajukan.",
  },
  {
    id: "form",
    title: "Form Kegiatan",
    desc: "Formulir pendukung informasi kegiatan.",
  },
  {
    id: "pencairan",
    title: "Surat Pencairan Dana",
    desc: "Pengajuan pencairan dana kegiatan yang telah disetujui.",
  },
  {
    id: "peminjaman",
    title: "Peminjaman Fasilitas",
    desc: "Pengajuan peminjaman fasilitas untuk kegiatan.",
  },
];

let user = null,
  db = null,
  files = {},
  DOCS = [];

document.addEventListener("DOMContentLoaded", async () => {
  user = checkSession();
  if (!user) return;

  initUser();
  initLogout();
  db = await openDB();

  /*
   * File upload hanya dipertahankan ketika pengguna memang
   * sengaja melanjutkan ke halaman Tinjau.
   * Refresh / masuk ulang / pindah menu akan memulai kosong.
   */
  const keepDraft = sessionStorage.getItem(KEEP_UPLOAD_DRAFT_KEY) === "1";
  sessionStorage.removeItem(KEEP_UPLOAD_DRAFT_KEY);

  if (!keepDraft) {
    await clearAllFiles();
  }

  DOCS = getSelectedDocuments();
  await render();

  document.getElementById("nextReview").onclick = () => {
    sessionStorage.setItem(KEEP_UPLOAD_DRAFT_KEY, "1");
    location.href = "../review/index.html";
  };
});

function checkSession() {
  try {
    const r = sessionStorage.getItem("sitaraUser");
    if (!r) {
      location.href = LOGIN_URL;
      return null;
    }
    const u = JSON.parse(r);
    if (
      !u?.session_token ||
      String(u.role || "").toLowerCase() !== "kementerian"
    ) {
      location.href = LOGIN_URL;
      return null;
    }
    return u;
  } catch (e) {
    location.href = LOGIN_URL;
    return null;
  }
}

function initUser() {
  const n =
      user.nama_lengkap ||
      user.nama ||
      user.name ||
      "Kementerian Hubungan Kerja Sama",
    i =
      n
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase() || "KH";
  document.getElementById("profileName").textContent = n;
  document.getElementById("profileAvatar").textContent = i;
  document.getElementById("topbarAvatar").textContent = i;
  document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
}

function initLogout() {
  document.getElementById("logoutButton").onclick = () => {
    if (confirm("Apakah Anda yakin ingin keluar dari SITARA?")) {
      sessionStorage.removeItem("sitaraUser");
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(KEEP_UPLOAD_DRAFT_KEY);
      clearAllFiles().finally(() => (location.href = LOGIN_URL));
    }
  };
}

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE_NAME))
        r.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function getAll() {
  return new Promise((res, rej) => {
    const r = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function clearAllFiles() {
  if (!db) return Promise.resolve();
  return new Promise((res, rej) => {
    const r = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .clear();
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

function put(v) {
  return new Promise((res, rej) => {
    const r = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(v);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

function del(id) {
  return new Promise((res, rej) => {
    const r = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

function getSelectedDocuments() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const saved = JSON.parse(raw);
    if (!saved || saved.group !== "proposal" || !Array.isArray(saved.documents))
      return [];

    const selectedIds = new Set(
      saved.documents
        .filter((item) => item && item.group === "proposal")
        .map((item) => String(item.doc || "")),
    );

    return ALL_DOCS.filter((doc) => selectedIds.has(doc.id)).map((doc) => ({
      ...doc,
      required: true,
    }));
  } catch (error) {
    console.warn("Pilihan dokumen tidak dapat dibaca:", error);
    return [];
  }
}

async function render() {
  files = {};
  (await getAll()).forEach((x) => (files[x.id] = x));

  const list = document.getElementById("documentList");
  list.innerHTML = "";

  DOCS.forEach((d) => {
    const f = files[d.id],
      row = document.createElement("div");
    row.className = "upload-row";
    row.innerHTML = `<div class="doc-info"><div class="doc-icon">▤</div><div class="doc-copy"><div class="doc-title"><strong>${esc(d.title)}</strong><span class="badge required">Wajib</span></div><p class="doc-desc">${esc(d.desc)}</p></div></div><div class="file-pick"><div class="pick-button">☁ &nbsp; Pilih File</div><input class="file-input" type="file" accept=".doc,.docx" data-id="${d.id}"><div class="pick-hint">Format: Word (.doc/.docx) • Maks. 10 MB</div></div><div class="file-state ${f ? "uploaded" : "empty"}" data-state="${d.id}">${f ? stateHtml(f) : "<span>☁ &nbsp; Belum ada file yang diunggah</span>"}</div>`;
    list.appendChild(row);
    row.querySelector(".file-input").onchange = (e) =>
      handleFile(d, e.target.files[0]);
    if (f) wire(row, f);
  });

  updateNext();
}

async function handleFile(d, file) {
  if (!file) return;
  const ext = file.name.toLowerCase().split(".").pop();
  // Semua dokumen pada tahap ini wajib menggunakan Microsoft Word.
  if (!["doc", "docx"].includes(ext)) {
    alert("Format file wajib Word (.doc atau .docx). PDF dan format lain tidak diperbolehkan.");
    return;
  }
  if (file.size > MAX_SIZE) {
    alert("Ukuran file maksimal 10 MB per dokumen.");
    return;
  }
  await put({
    id: d.id,
    name: file.name,
    size: file.size,
    type: file.type || mime(ext),
    blob: file,
    updated_at: new Date().toISOString(),
  });
  await render();
}

function stateHtml(f){
    return `<span class="file-mark">▣</span>
    <div class="file-meta">
        <strong>${esc(f.name)}</strong>
        <span>${size(f.size)}</span>
    </div>
    <div class="file-actions">
        <span class="status-ok">●</span>
        <button class="icon-btn view" type="button" title="Lihat">👁</button>
        <button class="icon-btn delete" type="button" title="Hapus">🗑</button>
    </div>`
}

function wire(row, f) {
  row.querySelector(".view").onclick = () => {
    const u = URL.createObjectURL(f.blob);
    window.open(u, "_blank");
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  };
  row.querySelector(".delete").onclick = async () => {
    if (confirm("Hapus file " + f.name + "?")) {
      await del(f.id);
      await render();
    }
  };
}

function updateNext() {
  const button = document.getElementById("nextReview");
  if (!button) return;

  /* Semua dokumen yang dipilih di awal otomatis Wajib. */
  button.disabled =
    DOCS.length === 0 || !DOCS.every((x) => Boolean(files[x.id]));
}

function size(n) {
  return n < 1048576
    ? Math.max(1, Math.round(n / 1024)) + " KB"
    : (n / 1048576).toFixed(1) + " MB";
}

function mime(e) {
  return e === "pdf"
    ? "application/pdf"
    : e === "doc"
      ? "application/msword"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}
