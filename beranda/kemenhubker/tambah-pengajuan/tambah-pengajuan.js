/* =========================================================
   SITARA — TAMBAH PENGAJUAN
   Pemilihan dokumen sebelum masuk ke formulir pengajuan
========================================================= */

const LOGIN_URL = "/login/index.html";

const STORAGE_KEY = "sitaraDraftDokumen";

let currentUser = null;
let selectedDocuments = [];
let selectedGroup = null;

document.addEventListener("DOMContentLoaded", function () {
    currentUser = checkSession();

    if (!currentUser) {
        return;
    }

    initializePage(currentUser);
    initializeDocumentSelection();
    restoreSelection();
});

function checkSession() {
    const sessionData = sessionStorage.getItem("sitaraUser");

    if (!sessionData) {
        window.location.href = LOGIN_URL;
        return null;
    }

    try {
        const user = JSON.parse(sessionData);

        if (!user || !user.session_token) {
            sessionStorage.removeItem("sitaraUser");
            window.location.href = LOGIN_URL;
            return null;
        }

        const role = String(user.role || "")
            .trim()
            .toLowerCase();

        if (role !== "kementerian") {
            alert("Anda tidak memiliki akses ke halaman pengajuan.");
            window.location.href = LOGIN_URL;
            return null;
        }

        return user;
    } catch (error) {
        console.error("Session error:", error);
        sessionStorage.removeItem("sitaraUser");
        window.location.href = LOGIN_URL;
        return null;
    }
}

function initializePage(user) {
    const name =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        user.nama_unit ||
        "Kementerian Hubungan Kerja Sama";

    const initials =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function (part) {
                return part.charAt(0);
            })
            .join("")
            .toUpperCase() || "KH";

    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");
    const profileAvatar = document.getElementById("profileAvatar");
    const topbarAvatar = document.getElementById("topbarAvatar");
    const currentDate = document.getElementById("currentDate");
    const logoutButton = document.getElementById("logoutButton");

    if (profileName) {
        profileName.textContent = name;
    }

    if (profileRole) {
        profileRole.textContent = "Kementerian";
    }

    if (profileAvatar) {
        profileAvatar.textContent = initials;
    }

    if (topbarAvatar) {
        topbarAvatar.textContent = initials;
    }

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) {
                return;
            }

            sessionStorage.removeItem("sitaraUser");
            sessionStorage.removeItem(STORAGE_KEY);
            window.location.href = LOGIN_URL;
        });
    }
}

function initializeDocumentSelection() {
    const cards = document.querySelectorAll(".document-card");
    const nextButton = document.getElementById("nextButton");
    const clearButton = document.getElementById("clearSelection");

    cards.forEach(function (card) {
        card.addEventListener("click", function () {
            if (card.classList.contains("disabled")) {
                return;
            }

            toggleDocument(card);
        });
    });

    if (nextButton) {
        nextButton.addEventListener("click", continueToInformation);
    }

    if (clearButton) {
        clearButton.addEventListener("click", clearSelection);
    }

    updateSelectionUI();
}

function toggleDocument(card) {
    const group = card.dataset.group;
    const doc = card.dataset.doc;

    const existingIndex = selectedDocuments.findIndex(function (item) {
        return item.doc === doc;
    });

    if (existingIndex >= 0) {
        selectedDocuments.splice(existingIndex, 1);
    } else {
        // Halaman ini saat ini hanya menyediakan alur Proposal.
        if (group !== "proposal") {
            return;
        }

        selectedGroup = "proposal";

        selectedDocuments.push({
            doc: doc,
            group: group,
            title: card.dataset.title || "",
            description: card.dataset.description || ""
        });
    }

    if (selectedDocuments.length === 0) {
        selectedGroup = null;
    } else {
        selectedGroup = selectedDocuments[0].group;
    }

    saveSelection();
    updateSelectionUI();
}

function updateSelectionUI() {
    const cards = document.querySelectorAll(".document-card");
    const nextButton = document.getElementById("nextButton");
    const summaryCount = document.getElementById("summaryCount");
    const summaryBody = document.getElementById("summaryBody");
    const summaryEmpty = document.getElementById("summaryEmpty");
    const summaryFooter = document.getElementById("summaryFooter");
    const summaryType = document.getElementById("summaryType");

    cards.forEach(function (card) {
        const doc = card.dataset.doc;
        const group = card.dataset.group;

        const selected = selectedDocuments.some(function (item) {
            return item.doc === doc;
        });

        card.classList.toggle("selected", selected);

        // Saat ini hanya kartu Proposal yang tersedia.
        const disabled = group !== "proposal";
        card.classList.toggle("disabled", Boolean(disabled));
        card.setAttribute("aria-pressed", selected ? "true" : "false");
    });

    if (summaryCount) {
        const count = selectedDocuments.length;
        summaryCount.textContent =
            count === 0
                ? "0 dokumen dipilih"
                : count + (count === 1 ? " dokumen dipilih" : " dokumen dipilih");
    }

    if (nextButton) {
        nextButton.disabled = selectedDocuments.length === 0;
    }

    if (summaryType) {
        summaryType.textContent = selectedGroup === "proposal"
            ? "Jenis: Proposal"
            : "Jenis: —";
    }

    if (!summaryBody) {
        return;
    }

    const oldList = summaryBody.querySelector(".summary-list");
    if (oldList) {
        oldList.remove();
    }

    if (selectedDocuments.length === 0) {
        if (summaryEmpty) {
            // Paksa state kosong tampil hanya saat belum ada dokumen.
            summaryEmpty.hidden = false;
            summaryEmpty.style.display = "flex";
        }

        if (summaryFooter) {
            summaryFooter.hidden = true;
        }

        return;
    }

    if (summaryEmpty) {
        // CSS .summary-empty menggunakan display:flex, sehingga hidden
        // dipastikan dengan display:none saat dokumen sudah dipilih.
        summaryEmpty.hidden = true;
        summaryEmpty.style.display = "none";
    }

    if (summaryFooter) {
        summaryFooter.hidden = false;
    }

    const list = document.createElement("div");
    list.className = "summary-list";

    selectedDocuments.forEach(function (item) {
        const row = document.createElement("div");
        row.className = "summary-item";

        const icon = document.createElement("div");
        icon.className = "summary-item-icon";
        icon.textContent = "✓";

        const copy = document.createElement("div");
        copy.className = "summary-item-copy";

        const title = document.createElement("strong");
        title.textContent = item.title;

        const description = document.createElement("span");
        description.textContent = item.description;

        copy.appendChild(title);
        copy.appendChild(description);

        row.appendChild(icon);
        row.appendChild(copy);
        list.appendChild(row);
    });

    summaryBody.appendChild(list);
}

function saveSelection() {
    try {
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                group: selectedGroup,
                documents: selectedDocuments
            })
        );
    } catch (error) {
        console.warn("Draft dokumen tidak dapat disimpan:", error);
    }
}

function restoreSelection() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return;
        }

        const saved = JSON.parse(raw);

        if (!saved || saved.group !== "proposal" || !Array.isArray(saved.documents)) {
            sessionStorage.removeItem(STORAGE_KEY);
            return;
        }

        selectedGroup = "proposal";
        selectedDocuments = saved.documents.filter(function (item) {
            return item && item.group === "proposal";
        });

        if (!selectedDocuments.length) {
            selectedGroup = null;
            sessionStorage.removeItem(STORAGE_KEY);
        }

        updateSelectionUI();
    } catch (error) {
        console.warn("Draft dokumen tidak dapat dipulihkan:", error);
        sessionStorage.removeItem(STORAGE_KEY);
    }
}

function clearSelection() {
    selectedDocuments = [];
    selectedGroup = null;

    sessionStorage.removeItem(STORAGE_KEY);
    updateSelectionUI();
}

/* =========================================================
   BERSIHKAN DRAFT SAAT MENINGGALKAN TAMBAH PENGAJUAN
========================================================= */

/*
 * Draft pemilihan dokumen bersifat sementara.
 *
 * Refresh halaman                  -> draft dihapus.
 * Pindah ke menu lain              -> draft dihapus.
 * Kembali ke Dashboard             -> draft dihapus.
 * Keluar/logout                    -> draft dihapus.
 * Lanjut ke Isi Informasi Proposal -> draft dipertahankan.
 */
window.addEventListener(
    "pagehide",
    function () {

        if (
            window.__sitaraKeepDocumentDraft === true
        ) {
            return;
        }

        sessionStorage.removeItem(
            STORAGE_KEY
        );
    }
);


/*
 * Jika browser mengembalikan halaman dari back/forward cache,
 * jangan tampilkan pilihan dokumen lama.
 */
window.addEventListener(
    "pageshow",
    function (event) {

        if (
            event.persisted
        ) {
            selectedDocuments = [];
            selectedGroup = null;

            sessionStorage.removeItem(
                STORAGE_KEY
            );

            updateSelectionUI();
        }
    }
);


function continueToInformation() {
    if (!selectedDocuments.length) {
        return;
    }

    /*
     * Pertahankan pilihan hanya ketika pengguna sengaja
     * melanjutkan ke tahap Isi Informasi.
     */
    window.__sitaraKeepDocumentDraft = true;

    const group = selectedGroup;

    /*
     * Simpan pilihan sebelum pindah halaman.
     * Halaman proposal/LPJ dapat membaca STORAGE_KEY
     * jika nantinya ingin menyesuaikan field upload.
     */
    saveSelection();

    if (group === "proposal") {
        window.location.href = "proposal/index.html";
        return;
    }

    // Alur LPJ belum tersedia. Saat ini hanya Proposal yang dapat dilanjutkan.
    return;
}
