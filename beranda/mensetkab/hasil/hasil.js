/* SITARA — Hasil Ketua BEM. Read-only results for Mensetkab. */
(function () {
  "use strict";
  const API_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
  let user = {};
  try {
    user = JSON.parse(sessionStorage.getItem("sitaraUser") || "{}");
  } catch (e) {}
  const $ = (id) => document.getElementById(id);
  const state = {
    rows: [],
    filter: "semua",
    query: "",
    sort: "newest",
    loading: false,
  };
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const dateVal = (v) => {
    if (!v) return 0;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  };
  const fmtDate = (v, time = false) => {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString(
        "id-ID",
        time
          ? {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          : { day: "numeric", month: "long", year: "numeric" },
      ) + (time ? " WIB" : "")
    );
  };
  async function post(action, extra = {}, timeout = 45000) {
    const ctrl =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    let timer;
    try {
      if (ctrl) timer = setTimeout(() => ctrl.abort(), timeout);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action,
          // Samakan sumber autentikasi dengan halaman Perlu Revisi yang sudah berjalan.
          // Backend SITARA menerima session_token; token tetap disertakan untuk kompatibilitas.
          session_token: user.session_token || user.token || user.sessionToken || user.authToken || "",
          token: user.session_token || user.token || user.sessionToken || user.authToken || "",
          user_id: user.user_id || user.id || "",
          ...extra,
        }),
        signal: ctrl ? ctrl.signal : undefined,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error("Permintaan gagal (" + response.status + ").");
      if (result && result.success === false)
        throw new Error(result.message || "Permintaan tidak berhasil.");
      return result;
    } catch (e) {
      if (e.name === "AbortError")
        throw new Error("Permintaan terlalu lama. Silakan coba lagi.");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  function resultData(r) {
    return r?.data?.pengajuan || r?.data?.rows || r?.pengajuan || r?.data || [];
  }
  function normalize(raw) {
    const status = String(
      raw.status_keputusan || raw.status || raw.keputusan || "",
    ).toLowerCase();
    const rejection = status.includes("tolak") || status.includes("ditolak");
    const approved = status.includes("setuju") || status.includes("disetujui");
    if (!rejection && !approved) return null;
    return {
      ...raw,
      pengajuan_id: String(raw.pengajuan_id || raw.id || ""),
      judul: String(
        raw.judul ||
          raw.judul_pengajuan ||
          raw.title ||
          "Pengajuan tanpa judul",
      ),
      asal_kementerian: String(
        raw.asal_kementerian || raw.kementerian || raw.nama_kementerian || "-",
      ),
      jenis: String(raw.jenis || raw.jenis_pengajuan || "Dokumen"),
      status_keputusan: rejection ? "ditolak" : "disetujui",
      tanggal_pengajuan:
        raw.tanggal_pengajuan || raw.tanggal || raw.waktu_keputusan || "",
      tanggal_keputusan:
        raw.tanggal_keputusan || raw.waktu_keputusan || raw.waktu || "",
      catatan_penolakan:
        raw.catatan_penolakan || raw.catatan_keputusan || raw.catatan || "",
      dokumen: Array.isArray(raw.dokumen) ? raw.dokumen : [],
    };
  }
  function iconType(row) {
    const t = row.jenis.toLowerCase();
    return t.includes("lpj")
      ? "lpj"
      : t.includes("fasilitas")
        ? "fasilitas"
        : "proposal";
  }
  function visibleRows() {
    let rows = state.rows.filter(
      (r) => state.filter === "semua" || r.status_keputusan === state.filter,
    );
    const q = state.query.trim().toLowerCase();
    if (q)
      rows = rows.filter((r) =>
        [r.judul, r.asal_kementerian, r.jenis, r.pengajuan_id]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    // Urutkan berdasarkan waktu keputusan Ketua BEM, bukan waktu pengajuan dibuat.
    rows.sort((a, b) =>
      state.sort === "title"
        ? a.judul.localeCompare(b.judul, "id")
        : state.sort === "oldest"
          ? dateVal(a.tanggal_keputusan || a.tanggal_pengajuan) - dateVal(b.tanggal_keputusan || b.tanggal_pengajuan)
          : dateVal(b.tanggal_keputusan || b.tanggal_pengajuan) - dateVal(a.tanggal_keputusan || a.tanggal_pengajuan),
    );
    return rows;
  }
  function updateCounts() {
    $("countSemua").textContent = state.rows.length;
    $("countDisetujui").textContent = state.rows.filter(
      (r) => r.status_keputusan === "disetujui",
    ).length;
    $("countDitolak").textContent = state.rows.filter(
      (r) => r.status_keputusan === "ditolak",
    ).length;
  }
  function showMessage(text, error = false) {
    const box = $("hasilMessage");
    box.hidden = false;
    box.classList.toggle("error", error);
    box.innerHTML = error
      ? `<i data-lucide="alert-circle"></i><strong>${esc(text)}</strong><button type="button" class="hasil-retry" id="hasilRetry">Coba lagi</button>`
      : `<span class="hasil-spinner"></span><strong>${esc(text)}</strong>`;
    $("hasilGrid").hidden = true;
    if (window.lucide) lucide.createIcons();
    const retry = $("hasilRetry");
    if (retry) retry.addEventListener("click", loadRows);
  }
  function render() {
    updateCounts();
    const rows = visibleRows(),
      grid = $("hasilGrid"),
      msg = $("hasilMessage");
    if (!rows.length) {
      msg.hidden = false;
      msg.classList.remove("error");
      msg.innerHTML = `<i data-lucide="${state.query ? "search-x" : "clipboard-list"}"></i><strong>${state.query ? "Tidak ada pengajuan yang cocok dengan pencarian." : state.filter === "semua" ? "Belum ada pengajuan yang telah diputuskan Ketua BEM." : "Belum ada pengajuan yang " + (state.filter === "disetujui" ? "disetujui" : "ditolak") + " Ketua BEM."}</strong>`;
      grid.hidden = true;
      if (window.lucide) lucide.createIcons();
      return;
    }
    msg.hidden = true;
    grid.hidden = false;
    grid.innerHTML = rows
      .map((r) => {
        const rejected = r.status_keputusan === "ditolak",
          type = iconType(r),
          docCount = Number(r.jumlah_dokumen ?? r.dokumen.length ?? 0);
        return `<article class="hasil-card">
        <div class="hasil-type-icon ${type}"><i data-lucide="${type === "fasilitas" ? "landmark" : "file-text"}"></i></div>
        <div class="hasil-card-main"><div class="hasil-badges"><span class="hasil-badge ${type === "lpj" ? "type-lpj" : type === "fasilitas" ? "type-fasilitas" : ""}">${esc(r.jenis)}</span><span class="hasil-badge ${rejected ? "status-rejected" : "status-approved"}">${rejected ? "Ditolak" : "Disetujui"}</span></div>
        <h3>${esc(r.judul)}</h3><div class="hasil-ministry"><i data-lucide="landmark"></i><span>${esc(r.asal_kementerian)}</span></div></div>
        <div class="hasil-decision ${rejected ? "rejected" : ""}"><strong><i data-lucide="${rejected ? "x-circle" : "check-circle"}"></i>${rejected ? "Ditolak" : "Disetujui"}</strong>oleh Ketua BEM<br>pada ${esc(fmtDate(r.tanggal_keputusan || r.tanggal_pengajuan))}</div>
        <div class="hasil-card-footer"><span title="Tanggal dan waktu keputusan Ketua BEM"><i data-lucide="calendar-days"></i>${esc(fmtDate(r.tanggal_keputusan || r.tanggal_pengajuan, true))}</span><span><i data-lucide="file-text"></i>${docCount} dokumen</span></div>
        <button class="hasil-open" type="button" data-detail="${esc(r.pengajuan_id)}" aria-label="Lihat detail ${esc(r.judul)}"><i data-lucide="arrow-right"></i></button>
      </article>`;
      })
      .join("");
    grid
      .querySelectorAll("[data-detail]")
      .forEach((b) =>
        b.addEventListener("click", () => openDetail(b.dataset.detail)),
      );
    if (window.lucide) lucide.createIcons();
  }
  function downloadUrl(doc) {
    const raw = String(doc.file_url || doc.url || "").trim();
    let id = String(doc.drive_file_id || "").trim();
    if (!id && raw) {
      const m =
        raw.match(/drive\.google\.com\/file\/d\/([^/?]+)/) ||
        raw.match(
          /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([^/?]+)/,
        ) ||
        raw.match(/[?&]id=([^&]+)/);
      if (m) id = m[1];
    }
    return id
      ? "https://drive.google.com/uc?export=download&id=" +
          encodeURIComponent(id)
      : raw;
  }
  async function openDetail(id) {
    const row = state.rows.find((r) => r.pengajuan_id === id);
    if (!row) return;
    const modal = $("hasilModalBackdrop"),
      content = $("hasilModalContent");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector(".hasil-modal").classList.add("is-loading");
    content.innerHTML = `
      <div class="hasil-detail-loading" role="status" aria-live="polite">
        <div class="hasil-loading-illustration" aria-hidden="true">
          <div class="hasil-loading-halo"></div>
          <div class="hasil-loading-paper hasil-loading-paper-back"></div>
          <div class="hasil-loading-paper hasil-loading-paper-front">
            <span></span><span></span><span></span>
          </div>
          <div class="hasil-loading-lens"><i></i></div>
          <span class="hasil-loading-orbit orbit-one"></span>
          <span class="hasil-loading-orbit orbit-two"></span>
          <div class="hasil-loading-shadow"></div>
        </div>
        <h2>Memuat detail pengajuan...</h2>
        <p>Mohon tunggu sebentar, data sedang dipersiapkan.</p>
        <div class="hasil-loading-dots" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    try {
      let detail = row;
      const res = await post("getDetailHasilKetuaBEMMensetkab", {
        pengajuan_id: id,
      });
      const d = res.data || res;
      detail = {
        ...row,
        ...d,
        dokumen: Array.isArray(d.dokumen) ? d.dokumen : row.dokumen,
      };
      modal.querySelector(".hasil-modal").classList.remove("is-loading");
      content.innerHTML = detailMarkup(detail);
    } catch (e) {
      // If the list endpoint already supplied detail/documents, keep the modal useful and show a clear notice.
      modal.querySelector(".hasil-modal").classList.remove("is-loading");
      content.innerHTML =
        detailMarkup(row) +
        (row.dokumen.length
          ? ""
          : `<p class="hasil-empty-doc">Detail tambahan belum dapat dimuat: ${esc(e.message)}</p>`);
    }
    if (window.lucide) lucide.createIcons();
  }
  function detailMarkup(r) {
    const rejected = r.status_keputusan === "ditolak";
    const docs = r.dokumen || [];
    return `<h2 id="hasilModalTitle">${esc(r.judul)}</h2><p class="hasil-modal-subtitle">${esc(r.pengajuan_id)} · ${esc(r.asal_kementerian)}</p>
      <div class="hasil-detail-section"><h3>Informasi Pengajuan</h3><div class="hasil-info-grid">
      ${info("Jenis Pengajuan", r.jenis)}${info("Asal Kementerian", r.asal_kementerian)}${info("Tanggal Pengajuan", fmtDate(r.tanggal_pengajuan, true))}${info("Status Keputusan", rejected ? "Ditolak — Final" : "Disetujui")}${info("Tanggal Keputusan", fmtDate(r.tanggal_keputusan || r.tanggal_pengajuan, true))}</div></div>
      ${rejected ? `<div class="hasil-detail-section"><h3>Catatan Penolakan</h3><div class="hasil-rejection-note">${esc(r.catatan_penolakan || "Tidak ada catatan penolakan yang tersimpan.")}</div></div>` : ""}
      <div class="hasil-detail-section"><h3>Dokumen Pengajuan (${docs.length})</h3>${
        docs.length
          ? docs
              .map((doc) => {
                const url = downloadUrl(doc);
                return `<div class="hasil-doc"><div class="hasil-doc-icon"><i data-lucide="file-text"></i></div><div class="hasil-doc-main"><strong>${esc(doc.jenis_dokumen || doc.jenis || doc.nama_file || "Dokumen")}</strong><small>${esc(doc.nama_file || doc.file_name || "Dokumen pengajuan")}${doc.versi ? ` · versi ${esc(doc.versi)}` : ""}</small></div>${url ? `<a class="hasil-download" href="${esc(url)}" target="_blank" rel="noopener"><i data-lucide="download"></i>Download</a>` : ""}</div>`;
              })
              .join("")
          : '<p class="hasil-empty-doc">Tidak ada dokumen yang tercatat.</p>'
      }</div>`;
  }
  function info(label, value) {
    return `<div class="hasil-info"><small>${esc(label)}</small><strong>${esc(value || "-")}</strong></div>`;
  }
  function closeModal() {
    $("hasilModalBackdrop").hidden = true;
    document.body.style.overflow = "";
  }
  async function loadRows() {
    state.loading = true;
    showMessage("Memuat hasil keputusan Ketua BEM...");
    try {
      const res = await post("getHasilKetuaBEMMensetkab", {}, 45000);
      const list = resultData(res);
      state.rows = (Array.isArray(list) ? list : [])
        .map(normalize)
        .filter(Boolean);
      render();
    } catch (e) {
      showMessage(e.message || "Hasil keputusan gagal dimuat.", true);
    } finally {
      state.loading = false;
    }
  }
  document.querySelectorAll("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      state.filter = b.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((x) => x.classList.toggle("active", x === b));
      render();
    }),
  );
  $("hasilSearch").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });
  $("hasilSort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });
  $("hasilModalClose").addEventListener("click", closeModal);
  $("hasilModalBackdrop").addEventListener("click", (e) => {
    if (e.target === $("hasilModalBackdrop")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("hasilModalBackdrop").hidden) closeModal();
  });
  $("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("sitaraUser");
    window.location.href = "../../../login/index.html";
  });
  loadRows();
})();
