const LOGIN_URL = "/login/index.html";
const REVIEW_PATCH_VERSION = "20261007-01";
const DRAFT_KEY = "sitaraProposalDraft";
const DOCUMENT_SELECTION_KEY = "sitaraDraftDokumen";
const KEEP_UPLOAD_DRAFT_KEY = "sitaraKeepUploadDraft";
const DB_NAME = "SITARAProposalWorkflow";
const DB_VERSION = 1;
const STORE_NAME = "files";
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";

const ALL_DOCS = [
  ["proposal", "Proposal Kegiatan"],
  ["form", "Form Kegiatan"],
  ["pencairan", "Surat Pencairan Dana"],
  ["peminjaman", "Peminjaman Fasilitas"],
];

let user = null;
let db = null;
let files = {};
let DOCS = [];

document.addEventListener("DOMContentLoaded", async () => {
  user = checkSession();
  if (!user) return;

  initUser();
  initLogout();

  const draft = readDraft();
  if (!draft) {
    alert(
      "Data informasi proposal belum tersedia. Kembali ke tahap Isi Informasi."
    );
    location.href = "../index.html";
    return;
  }

  DOCS = getSelectedDocuments();

  if (!DOCS.length) {
    alert(
      "Belum ada dokumen yang dipilih pada tahap Tambah Pengajuan. Silakan pilih dokumen terlebih dahulu."
    );
    location.href = "../../index.html";
    return;
  }

  db = await openDB();
  await refreshFiles();

  render(draft);

  const selectedStep = document.getElementById("selectedDocumentsStep");
  if (selectedStep) {
    selectedStep.textContent =
      DOCS.length === 1
        ? DOCS[0][1]
        : DOCS.length + " dokumen dipilih";
  }

  document
    .querySelectorAll(".confirm")
    .forEach((checkbox) =>
      checkbox.addEventListener("change", () => {
        updateSend();
      })
    );

  document.getElementById("sendProposal").onclick = submitProposal;

  document.getElementById("editInfo").onclick = () => {
    location.href = "../index.html";
  };

  /*
   * Upload.js membersihkan IndexedDB ketika halaman upload dibuka,
   * kecuali flag ini ada. Karena pengguna sedang kembali untuk
   * mengedit/mengecek dokumen yang sudah diunggah, pertahankan file.
   */
  const goToUpload = (event) => {
    event.preventDefault();
    sessionStorage.setItem(KEEP_UPLOAD_DRAFT_KEY, "1");
    location.href = "../upload/index.html";
  };

  const editDocs = document.getElementById("editDocs");
  if (editDocs) {
    editDocs.addEventListener("click", goToUpload);
  }

  const backToUpload = document.querySelector(
    '.workflow-actions a[href="../upload/index.html"]'
  );
  if (backToUpload) {
    backToUpload.addEventListener("click", goToUpload);
  }
});

function checkSession() {
  try {
    const raw = sessionStorage.getItem("sitaraUser");

    if (!raw) {
      location.href = LOGIN_URL;
      return null;
    }

    const current = JSON.parse(raw);

    if (
      !current?.session_token ||
      String(current.role || "").toLowerCase() !== "kementerian"
    ) {
      location.href = LOGIN_URL;
      return null;
    }

    return current;
  } catch (error) {
    location.href = LOGIN_URL;
    return null;
  }
}

function initUser() {
  const name =
    user.nama_lengkap ||
    user.nama ||
    user.name ||
    "Kementerian Hubungan Kerja Sama";

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "KH";

  document.getElementById("profileName").textContent = name;
  document.getElementById("profileAvatar").textContent = initials;
  document.getElementById("topbarAvatar").textContent = initials;

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
    if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) {
      return;
    }

    sessionStorage.removeItem("sitaraUser");
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(DOCUMENT_SELECTION_KEY);
    sessionStorage.removeItem(KEEP_UPLOAD_DRAFT_KEY);

    clearAllFiles().finally(() => {
      location.href = LOGIN_URL;
    });
  };
}

function readDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch (error) {
    return null;
  }
}

/*
 * Satu sumber kebenaran untuk daftar dokumen:
 * Tambah Pengajuan -> sitaraDraftDokumen.
 *
 * Upload dan Review tidak membuat daftar dokumen sendiri.
 */
function getSelectedDocuments() {
  try {
    const raw = sessionStorage.getItem(DOCUMENT_SELECTION_KEY);
    if (!raw) return [];

    const saved = JSON.parse(raw);

    if (
      !saved ||
      saved.group !== "proposal" ||
      !Array.isArray(saved.documents)
    ) {
      return [];
    }

    const selectedIds = new Set(
      saved.documents
        .filter(
          (item) =>
            item &&
            item.group === "proposal" &&
            typeof item.doc === "string"
        )
        .map((item) => item.doc)
    );

    return ALL_DOCS
      .filter(([id]) => selectedIds.has(id))
      .map(([id, title]) => [id, title, true]);
  } catch (error) {
    console.warn("Pilihan dokumen tidak dapat dibaca:", error);
    return [];
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll() {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME)
      .objectStore(STORE_NAME)
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function refreshFiles() {
  files = {};

  const storedFiles = await getAll();

  storedFiles.forEach((file) => {
    if (file && file.id != null) {
      files[String(file.id)] = file;
    }
  });
}

function clearAllFiles() {
  if (!db) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function render(draft) {
  const value = (id) => draft[id] || "-";

  /*
   * Informasi diambil langsung dari draft yang dibuat oleh
   * tahap Isi Informasi Proposal.
   *
   * Agenda Kode sengaja tidak ditampilkan karena field tersebut
   * sudah dihapus dari halaman Isi Informasi.
   */
  document.getElementById("infoGrid").innerHTML = `
    <div class="info-col">
      <div class="info-item">
        <div class="info-label">Jenis Dokumen</div>
        <div class="info-value">Proposal Kegiatan</div>
      </div>
      <div class="info-item">
        <div class="info-label">Nama Kegiatan</div>
        <div class="info-value">${esc(value("judulProposal"))}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Deskripsi Singkat</div>
        <div class="info-value">${esc(value("deskripsiKegiatan"))}</div>
      </div>
    </div>

    <div class="info-col">
      <div class="info-item">
        <div class="info-label">Tanggal Pelaksanaan</div>
        <div class="info-value">${esc(
          formatDate(value("tanggalPelaksanaan"))
        )}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tempat Pelaksanaan</div>
        <div class="info-value">${esc(value("tempatPelaksanaan"))}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Sumber Dana</div>
        <div class="info-value">${esc(value("sumberDana"))}</div>
      </div>
    </div>

    <div class="info-col">
      <div class="person">
        <div class="person-icon">♙</div>
        <strong>Penanggung Jawab</strong>
      </div>
      <div class="person-row">
        <b>Nama</b>: ${esc(value("penanggungJawab"))}
      </div>
      <div class="person-row">
        <b>Jabatan</b>: ${esc(value("jabatan"))}
      </div>
      <div class="person-row">
        <b>No. WhatsApp</b>: ${esc(value("kontakPenanggungJawab"))}
      </div>
    </div>
  `;

  const tbody = document.getElementById("docTable");
  tbody.innerHTML = "";

  DOCS.forEach(([id, title], index) => {
    const file = files[String(id)];
    const validWord = file ? isWordFile(file.name) : false;
    const uploaded = Boolean(file && validWord);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        ${esc(title)}
        <span class="pill req">Wajib</span>
      </td>
      <td class="doc-status ${uploaded ? "" : "missing"}">
        ${uploaded ? "● Sudah diunggah" : "◷ Belum diunggah"}
      </td>
      <td>
        ${
          uploaded
            ? `<span class="file-cell">
                 <span class="pdf-mark">▣</span>
                 ${esc(file.name)}
               </span>`
            : "-"
        }
      </td>
      <td>${uploaded ? size(file.size) : "-"}</td>
      <td>
        ${
          uploaded
            ? `<button class="download-btn" data-id="${esc(id)}">↓ Download</button>`
            : "-"
        }
      </td>
    `;

    tbody.appendChild(row);
  });

  tbody
    .querySelectorAll(".download-btn")
    .forEach((button) => {
      button.onclick = () => downloadFile(button.dataset.id);
    });

  const uploadedCount = DOCS.filter(([id]) => {
    const file = files[String(id)];
    return Boolean(file && isWordFile(file.name));
  }).length;

  document.getElementById("summary").innerHTML = `
    <div class="summary-item">
      <small>Jenis Dokumen</small>
      <strong>Proposal Kegiatan</strong>
    </div>
    <div class="summary-item">
      <small>Nama Kegiatan</small>
      <strong>${esc(value("judulProposal"))}</strong>
    </div>
    <div class="summary-item">
      <small>Tanggal Pelaksanaan</small>
      <strong>${esc(formatDate(value("tanggalPelaksanaan")))}</strong>
    </div>
    <div class="summary-item">
      <small>Tempat Pelaksanaan</small>
      <strong>${esc(value("tempatPelaksanaan"))}</strong>
    </div>
    <div class="summary-item">
      <small>Jumlah Dokumen</small>
      <strong>${uploadedCount} dari ${DOCS.length} dokumen diunggah</strong>
    </div>
  `;

  updateSend();
}

async function updateSend() {
  /*
   * Validasi selalu berdasarkan dokumen yang dipilih di Tambah Pengajuan
   * dan file yang benar-benar tersimpan di IndexedDB.
   */
  const checks = [...document.querySelectorAll(".confirm")].every(
    (checkbox) => checkbox.checked
  );

  if (!DOCS.length) {
    document.getElementById("sendProposal").disabled = true;
    return false;
  }

  await refreshFiles();

  const required = DOCS.every(([id]) => {
    const file = files[String(id)];
    return Boolean(file && isWordFile(file.name));
  });

  document.getElementById("sendProposal").disabled = !(checks && required);

  return checks && required;
}

function isWordFile(name) {
  const lower = String(name || "").toLowerCase();
  return lower.endsWith(".doc") || lower.endsWith(".docx");
}

function formatDate(value) {
  if (!value || value === "-") return "-";

  const date = new Date(value + "T00:00:00");

  return isNaN(date)
    ? "-"
    : date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

function size(bytes) {
  return bytes < 1048576
    ? Math.max(1, Math.round(bytes / 1024)) + " KB"
    : (bytes / 1048576).toFixed(1) + " MB";
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (match) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[match]
  );
}

async function downloadFile(id) {
  const file = files[String(id)];

  if (!file || !isWordFile(file.name)) return;

  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.name;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function submitProposal() {
  const button = document.getElementById("sendProposal");

  if (button.disabled) return;

  button.disabled = true;
  button.textContent = "Mengirim...";

  try {
    /*
     * Ambil ulang isi IndexedDB sebelum validasi.
     * Ini mencegah state `files` lama menyebabkan dokumen dianggap hilang.
     */
    await refreshFiles();

    const draft = readDraft();

    if (!draft) {
      throw new Error("Data informasi proposal tidak ditemukan.");
    }

    const missing = DOCS.filter(([id]) => {
      const file = files[String(id)];
      return !file || !isWordFile(file.name);
    });

    if (missing.length) {
      const names = missing.map(([, title]) => title).join(", ");
      throw new Error(
        "Dokumen belum lengkap: " + names +
        ". Pastikan file sudah tersimpan pada tahap Unggah Dokumen."
      );
    }

    const documents = [];

    for (const [id, title] of DOCS) {
      const file = files[String(id)];

      documents.push(await fileData(file, title));
    }

    const payload = {
      action: "createPengajuan",
      session_token: user.session_token,

      jenis_pengajuan: "Proposal",
      sumber_dana: draft.sumberDana || "",

      kementerian_id: user.kementerian_id || "",
      kementerian:
        user.nama_unit ||
        user.nama_kementerian ||
        "Kementerian Hubungan Kerja Sama",
      pengaju_user_id: user.user_id || "",

      tanggal_pengajuan:
        draft.tanggalPengajuan ||
        new Date().toISOString().slice(0, 10),

      penanggung_jawab: draft.penanggungJawab || "",
      jabatan_penanggung_jawab: draft.jabatan || "",
      kontak_penanggung_jawab: draft.kontakPenanggungJawab || "",

      judul_proposal: draft.judulProposal || "",
      judul_pengajuan: draft.judulProposal || "",

      tanggal_pelaksanaan: draft.tanggalPelaksanaan || "",
      tanggal_kegiatan: draft.tanggalPelaksanaan || "",

      tempat_pelaksanaan: draft.tempatPelaksanaan || "",
      tempat_kegiatan: draft.tempatPelaksanaan || "",

      deskripsi_kegiatan: draft.deskripsiKegiatan || "",
      catatan: draft.catatan || "",

      /*
       * Hanya dokumen yang dipilih di Tambah Pengajuan
       * dan benar-benar diunggah pada tahap Upload.
       */
      dokumen: documents,
    };

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Pengajuan gagal dikirim.");
    }

    const pengajuanId = result.data?.pengajuan_id || "-";

    /*
     * Setelah berhasil submit, seluruh state sementara
     * dibersihkan supaya pengajuan baru dimulai dari nol.
     */
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(DOCUMENT_SELECTION_KEY);
    sessionStorage.removeItem(KEEP_UPLOAD_DRAFT_KEY);

    await clearAllFiles();

    alert(
      "Pengajuan berhasil dikirim.\n\n" +
        "Nomor Pengajuan: " +
        pengajuanId +
        "\n\n" +
        "Pengajuan akan diproses oleh Kementerian Sekretariat Kabinet."
    );

    location.href = "../../index.html";
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "Terjadi kesalahan saat mengirim pengajuan."
    );

    button.disabled = false;
    button.textContent = "➤  Kirim Pengajuan";
  }
}

async function fileData(file, jenis) {
  return {
    jenis_dokumen: jenis,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    data: await blobBase64(file.blob),
  };
}

function blobBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");

      if (comma < 0) {
        reject(new Error("Gagal membaca file."));
        return;
      }

      resolve(result.slice(comma + 1));
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca file."));
    };

    reader.readAsDataURL(blob);
  });
}
