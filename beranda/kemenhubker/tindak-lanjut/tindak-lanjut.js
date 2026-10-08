(function () {
  const API_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
  const session = JSON.parse(sessionStorage.getItem("sitaraUser") || "{}");
  const name =
    session.nama_lengkap ||
    session.nama ||
    session.name ||
    "Kementerian Hubungan Kerja Sama";
  const role = session.role || "kementerian";
  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "KH";
  const dateText = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  document.getElementById("currentDate").textContent = dateText;
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileRole").textContent =
    role === "kementerian" ? "Kementerian" : role;
  document.getElementById("profileAvatar").textContent = initials;
  document.getElementById("topbarAvatar").textContent = initials;

  let records = [];
  let activeFilter = "all";
  let detailCache = {};
  let revisionFiles = [];

  function apiUrl() {
    return API_URL;
  }
  function fmtDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d)) return String(v);

    return (
      d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
  function classify(x) {
    const status = String(x.status || "")
      .trim()
      .toLowerCase();
    const label = String(x.status_label || "")
      .trim()
      .toLowerCase();
    const s = status + " " + label;

    if (status === "selesai" || s.includes("selesai") || s.includes("setuju")) {
      return "approved";
    }
    if (status === "revisi" || s.includes("revisi")) {
      return "revise";
    }
    if (status === "ditolak" || s.includes("tolak")) {
      return "rejected";
    }

    return "";
  }

  function normalize(x) {
    const c = classify(x);
    if (!c) return null;

    const id = x.nomor_pengajuan || x.id || x.pengajuan_id || "-";
    const title = x.perihal || x.judul_pengajuan || x.judul || "Tanpa judul";
    const kind = String(x.jenis || x.jenis_pengajuan || "")
      .toLowerCase()
      .includes("lpj")
      ? "LPJ"
      : "Proposal";

    const desc =
      x.catatan_terakhir ||
      (c === "approved"
        ? "Pengajuan telah disetujui dan dokumen final dapat diakses."
        : c === "revise"
          ? "Terdapat catatan revisi. Silakan unggah dokumen yang telah diperbaiki."
          : "Pengajuan ditolak. Silakan ajukan kembali dengan perbaikan sesuai catatan.");

    return {
      id,
      title,
      kind,
      // Tanggal pada kartu Tindak Lanjut harus mengikuti tanggal/waktu
      // perubahan status terakhir, bukan tanggal pengajuan awal.
      // Untuk backend SITARA saat ini, timestamp perubahan status tersimpan
      // pada updated_at / update_at.
      date:
        x.updated_at ||
        x.update_at ||
        x.tanggal_update ||
        x.status_updated_at ||
        x.tanggal_pengajuan ||
        x.created_at ||
        "",
      status: c,
      label:
        c === "approved"
          ? "Disetujui"
          : c === "revise"
            ? "Perlu Revisi"
            : "Ditolak",
      desc,
      raw: x,
    };
  }

  async function loadData() {
    const grid = document.getElementById("cardGrid");

    try {
      const token = session.session_token || session.token || "";

      if (!token) {
        throw new Error(
          "Session token SITARA tidak tersedia. Silakan login kembali.",
        );
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "getPengajuan",
          session_token: token,
        }),
      });

      if (!res.ok) {
        throw new Error("Server mengembalikan HTTP " + res.status);
      }

      const json = await res.json();

      if (!json.success || !Array.isArray(json.data)) {
        throw new Error(json.message || "Data pengajuan tidak tersedia.");
      }

      // Backend SITARA sudah memfilter berdasarkan kementerian_id
      // dari session kementerian yang sedang login.
      records = json.data.map(normalize).filter(Boolean);

      // Bulan pada dropdown dibuat otomatis dari tanggal pengajuan
      // yang benar-benar dikembalikan API SITARA.
      if (window.sitaraRefreshMonthFilter) {
        window.sitaraRefreshMonthFilter();
      }

      render();
    } catch (err) {
      console.error("Gagal memuat data Tindak Lanjut:", err);
      records = [];

      if (window.sitaraRefreshMonthFilter) {
        window.sitaraRefreshMonthFilter();
      }

      grid.innerHTML =
        '<div class="tl-empty">' +
        '<i data-lucide="triangle-alert"></i>' +
        "<h3>Data tindak lanjut belum dapat dimuat</h3>" +
        "<p>" +
        esc(err.message || "Terjadi kesalahan saat mengambil data SITARA.") +
        "</p>" +
        "</div>";

      // Tetap reset statistik ke 0 tanpa memasukkan data dummy.
      document.getElementById("statTotal").textContent = "0";
      document.getElementById("statApproved").textContent = "0";
      document.getElementById("statRevise").textContent = "0";
      document.getElementById("statRejected").textContent = "0";
      document.getElementById("countAll").textContent = "0";
      document.getElementById("countApproved").textContent = "0";
      document.getElementById("countRevise").textContent = "0";
      document.getElementById("countRejected").textContent = "0";
      drawIcons();
    }
  }

  function iconFor(status) {
    return status === "approved"
      ? "file-check-2"
      : status === "revise"
        ? "file-pen-line"
        : "file-x-2";
  }
  function render() {
    const q = document.getElementById("searchInput").value.trim().toLowerCase();
    const month = document.getElementById("monthFilter").value;
    const filtered = records
      .filter((r) => {
        const hitFilter = activeFilter === "all" || r.status === activeFilter;
        const hitSearch =
          !q || (r.id + " " + r.title).toLowerCase().includes(q);
        const hitMonth =
          month === "all" || String(r.date).slice(0, 7) === month;
        return hitFilter && hitSearch && hitMonth;
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const counts = {
      all: records.length,
      approved: records.filter((x) => x.status === "approved").length,
      revise: records.filter((x) => x.status === "revise").length,
      rejected: records.filter((x) => x.status === "rejected").length,
    };
    document.getElementById("statApproved").textContent = counts.approved;
    document.getElementById("statRevise").textContent = counts.revise;
    document.getElementById("statRejected").textContent = counts.rejected;
    document.getElementById("statTotal").textContent = counts.all;
    document.getElementById("countAll").textContent = counts.all;
    document.getElementById("countApproved").textContent = counts.approved;
    document.getElementById("countRevise").textContent = counts.revise;
    document.getElementById("countRejected").textContent = counts.rejected;
    const grid = document.getElementById("cardGrid");
    if (!filtered.length) {
      grid.innerHTML =
        '<div class="tl-empty"><i data-lucide="inbox"></i><h3>Tidak ada tindak lanjut</h3><p>Belum ada pengajuan yang sesuai dengan filter atau pencarian kamu.</p></div>';
      drawIcons();
      return;
    }
    grid.innerHTML = filtered
      .map(
        (r, i) => `<article class="tl-card ${r.status}">
      <div class="tl-card-top"><div><span class="tl-status">${r.label}</span><div class="tl-card-id">${esc(r.id)}</div><div class="tl-card-title">${esc(r.title)}</div><span class="tl-kind">${esc(r.kind)}</span></div><div class="tl-card-icon"><i data-lucide="${iconFor(r.status)}"></i></div></div>
      <div class="tl-meta"><i data-lucide="calendar-days"></i><span>${fmtDate(r.date)}</span></div>
      <div class="tl-desc">${esc(r.desc)}</div>
      <button class="tl-detail" data-id="${escAttr(r.id)}">Detail <i data-lucide="arrow-right"></i></button>
    </article>`,
      )
      .join("");
    grid
      .querySelectorAll(".tl-detail")
      .forEach((b) =>
        b.addEventListener("click", () => openDetail(b.dataset.id)),
      );
    drawIcons();
  }
  async function openDetail(id) {
    const item = records.find((x) => x.id === id);
    if (!item) return;

    const modal = document.getElementById("detailModal");
    const modalFoot = document.getElementById("modalFoot");
    const actionArea = document.getElementById("modalApprovedAction");
    const reviseActionArea = document.getElementById("modalReviseAction");
    const completeButton = document.getElementById("markCompleteButton");
    const revisionButton = document.getElementById("submitRevisionButton");
    const raw = item.raw || {};
    revisionFiles = [];

    document.getElementById("modalId").textContent = item.id;
    document.getElementById("modalTitle").textContent = item.title;

    // Subtitle modal harus menampilkan jenis pengajuan + status tindak lanjut.
    // Jangan tampilkan kode kementerian/tahap internal (mis. KEM003).
    const subtitleParts = [
      item.kind,
      item.label,
    ].filter(Boolean);
    document.getElementById("modalSubtitle").textContent =
      subtitleParts.join(" • ");

    const st = document.getElementById("modalStatus");
    st.textContent = item.label;
    st.className = "tl-status " + item.status;

    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="tl-detail-grid">
        ${detailInfo("Nomor Agenda", item.id)}
        ${detailInfo("Jenis Pengajuan", item.kind)}
        ${detailInfo("Tanggal Pengajuan", fmtDate(raw.tanggal_pengajuan || item.date))}
        ${detailInfo(
          item.status === "revise"
            ? "Tanggal Pengajuan Revisi"
            : item.status === "rejected"
              ? "Tanggal Penolakan"
              : "Tanggal Persetujuan",
          fmtDate(
            raw.updated_at ||
              raw.update_at ||
              "",
          ),
        )}
        ${detailInfo("Agenda / Perihal", raw.agenda_kegiatan || raw.perihal || raw.deskripsi_kegiatan || raw.judul_pengajuan || item.title, true)}
        ${detailInfo("Penanggung Jawab", getPenanggungJawab(raw) || "-", true)}
        ${detailInfo("Kementerian", raw.kementerian || raw.nama_kementerian || name || "Kementerian Hubungan Kerja Sama", true)}
      </div>

      ${
        item.status === "approved"
          ? `
        <div class="tl-section-title">Dokumen Final dari KEMENSETKAB</div>
        <div class="tl-final-banner">
          <i data-lucide="circle-check"></i>
          <div>
            <strong>Pengajuan telah disetujui.</strong>
            <span>Dokumen final yang tersedia merupakan dokumen hasil finalisasi dari pihak Fakultas melalui Kementerian Sekretariat Kabinet.</span>
          </div>
        </div>
        <div id="modalDocs"><div class="tl-loading" style="padding:18px">Memuat dokumen final...</div></div>
      `
          : item.status === "revise"
            ? `
        <div class="tl-section-title">Keterangan</div>
        <div class="tl-info"><strong>${esc(item.desc)}</strong></div>
        <div class="tl-section-title">Dokumen dari KEMENSETKAB</div>
        <div class="tl-section-note">Dokumen di bawah merupakan dokumen yang menjadi acuan revisi. Setelah diperbaiki, pilih file penggantinya lalu kirim kembali dengan nomor agenda yang sama.</div>
        <div id="modalDocs"><div class="tl-loading" style="padding:18px">Memuat dokumen...</div></div>
        <div id="revisionUploadArea"></div>
      `
            : `
        <div class="tl-section-title">Keterangan</div>
        <div class="tl-info"><strong>${esc(item.desc)}</strong></div>
      `
      }

      <div class="tl-section-title">Riwayat Proses</div>
      <div id="modalTimeline"><div class="tl-loading" style="padding:18px">Memuat riwayat...</div></div>
    `;

    actionArea.hidden = !["approved", "rejected"].includes(item.status);
    if (reviseActionArea) reviseActionArea.hidden = item.status !== "revise";
    modalFoot.classList.toggle(
      "complete-only",
      item.status === "approved" || item.status === "rejected",
    );
    modalFoot.classList.toggle("revise-only", item.status === "revise");

    if (completeButton) {
      completeButton.disabled = false;
      completeButton.innerHTML = '<i data-lucide="check"></i> Tandai Selesai';
    }
    if (revisionButton) {
      revisionButton.disabled = false;
      revisionButton.innerHTML = '<i data-lucide="send"></i> Kirim Revisi';
    }

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("tl-modal-open");
    drawIcons();

    try {
      const token = session.session_token || session.token || "";
      const res = await fetch(apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "getPengajuanDetail",
          session_token: token,
          pengajuan_id: id,
        }),
      });

      if (!res.ok) throw new Error("Server mengembalikan HTTP " + res.status);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal memuat detail.");

      detailCache[id] = json.data;

      renderDetailData(json.data);

      // Backend dapat mengembalikan data utama di dalam `pengajuan`.
      // Gunakan data tersebut bila Penanggung Jawab tidak ada pada record awal.
      const detailPengajuan = json.data?.pengajuan || json.data || {};
      const penanggungJawab =
        getPenanggungJawab(detailPengajuan) || getPenanggungJawab(raw);
      const penanggungField = body.querySelector(
        '[data-field="penanggung-jawab"] strong',
      );

      if (penanggungField && penanggungJawab) {
        penanggungField.textContent = penanggungJawab;
      }

      // Sumber tanggal status pada modul Tindak Lanjut berasal dari
      // kolom updated_at pada record pengajuan. Saat status berubah
      // menjadi "Revisi", backend menyimpan timestamp perubahan tersebut
      // ke updated_at. Jangan mengambil tanggal revisi dari UI/timeline.
      const approvalTimestamp =
        json.data?.pengajuan?.update_at ||
        json.data?.pengajuan?.updated_at ||
        json.data?.update_at ||
        json.data?.updated_at ||
        raw.update_at ||
        raw.updated_at ||
        "";

      const dateFieldSelector =
        item.status === "revise"
          ? '[data-field="tanggal-pengajuan-revisi"] strong'
          : item.status === "rejected"
            ? '[data-field="tanggal-penolakan"] strong'
            : '[data-field="tanggal-persetujuan"] strong';

      const approvalField = body.querySelector(dateFieldSelector);

      if (approvalField && approvalTimestamp) {
        approvalField.textContent = fmtDate(approvalTimestamp);
      }
    } catch (e) {
      console.warn("Detail tambahan tidak dapat dimuat:", e);
      const docs = document.getElementById("modalDocs");
      const timeline = document.getElementById("modalTimeline");

      if (docs)
        docs.innerHTML =
          '<div class="tl-info"><strong>Dokumen final belum dapat dimuat.</strong><small style="display:block;margin-top:4px;color:#8290a4">Silakan coba lagi beberapa saat kemudian.</small></div>';
      if (timeline)
        timeline.innerHTML = `<div class="tl-timeline"><div class="tl-event"><strong>${esc(item.label)}</strong><span>${fmtDate(item.date)}</span><p>${esc(item.desc)}</p></div></div>`;

      const dateFieldSelector =
        item.status === "revise"
          ? '[data-field="tanggal-pengajuan-revisi"] strong'
          : item.status === "rejected"
            ? '[data-field="tanggal-penolakan"] strong'
            : '[data-field="tanggal-persetujuan"] strong';

      const approvalField = body.querySelector(dateFieldSelector);

      if (approvalField) {
        const currentValue = approvalField.textContent.trim();
        if (!currentValue || currentValue === "-") {
          approvalField.textContent = "Belum dapat dimuat";
        }
      }

      drawIcons();
    }
  }

  function detailInfo(label, value, wide = false) {
    const field = String(label || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return `<div class="tl-info${wide ? " tl-info-wide" : ""}" data-field="${field}">
      <small>${esc(label)}</small>
      <strong>${esc(value || "-")}</strong>
    </div>`;
  }

  function firstValue(...values) {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }
    return "";
  }

  function getPenanggungJawab(source) {
    const x = source || {};

    // Mendukung beberapa nama kolom yang mungkin dikembalikan backend.
    return firstValue(
      x.penanggung_jawab,
      x.penanggungjawab,
      x.penanggungJawab,
      x.nama_penanggung_jawab,
      x.nama_penanggungjawab,
      x.namaPenanggungJawab,
      x.pic,
      x.nama_pic,
      x.nama_pic_pengajuan,
      x.penanggung,
      x.pic_nama,
      x.data?.penanggung_jawab,
      x.data?.penanggungjawab,
      x.data?.nama_penanggung_jawab,
      x.data?.pic,
    );
  }

  function documentIcon(name) {
    return String(name || "")
      .toLowerCase()
      .endsWith(".pdf")
      ? "file-text"
      : "file";
  }

  function renderDetailData(data) {
    let docs = Array.isArray(data?.dokumen) ? data.dokumen : [];
    const currentId = document.getElementById("modalId")?.textContent?.trim() || "";
    const currentItem = records.find((x) => x.id === currentId);
    if (currentItem?.status === "revise") {
      const latestByType = {};
      docs.forEach((d, index) => {
        const type = String(d.jenis_dokumen || d.nama_dokumen || d.nama_file || ("Dokumen " + index)).trim();
        const t = new Date(d.uploaded_at || d.updated_at || 0).getTime();
        if (!latestByType[type] || t >= latestByType[type].__time) {
          latestByType[type] = { ...d, __time: t };
        }
      });
      docs = Object.values(latestByType).map((d) => {
        delete d.__time;
        return d;
      });
      docs.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));
    }

    const docsEl = document.getElementById("modalDocs");

    if (currentItem?.status === "rejected") {
      if (docsEl) docsEl.innerHTML = "";
    } else if (docsEl) {
      docsEl.innerHTML = docs.length
        ? docs
            .map((d) => {
              const url =
                d.url ||
                d.file_url ||
                d.drive_url ||
                d.link ||
                d.webViewLink ||
                "";
              const name =
                d.nama_dokumen ||
                d.judul_dokumen ||
                d.nama_file ||
                d.file_name ||
                d.jenis_dokumen ||
                "Dokumen Final";
              const meta = [
                d.mime_type || "",
                d.ukuran_file || d.ukuran || "",
                fmtDate(d.uploaded_at || d.updated_at || data.updated_at || ""),
              ]
                .filter(Boolean)
                .join(" • ");

              return `<div class="tl-doc">
              <div class="tl-doc-main">
                <div class="tl-doc-icon"><i data-lucide="${documentIcon(name)}"></i></div>
                <div class="tl-doc-text">
                  <span class="tl-doc-name">${esc(name)}</span>
                  <span class="tl-doc-meta">${esc(meta || "Dokumen final")}</span>
                </div>
              </div>
              ${
                url
                  ? `<a class="tl-download" href="${escAttr(url)}" target="_blank" rel="noopener"><i data-lucide="download"></i> Download</a>`
                  : `<span style="font-size:10.5px;color:#8793a5">Belum tersedia</span>`
              }
            </div>`;
            })
            .join("")
        : '<div class="tl-info"><strong>Belum ada dokumen final yang tersedia.</strong></div>';
    }

    if (currentItem?.status === "revise") {
      renderRevisionUploader(docs);
    }

    const hist = Array.isArray(data?.riwayat)
      ? data.riwayat.slice().reverse()
      : [];
    const timelineEl = document.getElementById("modalTimeline");

    if (timelineEl) {
      timelineEl.innerHTML = hist.length
        ? `<div class="tl-timeline">${hist.map((h) => `<div class="tl-event"><strong>${esc(h.aksi || h.status || "Pembaruan pengajuan")}</strong><span>${fmtDate(h.waktu)}</span>${h.catatan ? `<p>${esc(h.catatan)}</p>` : ""}</div>`).join("")}</div>`
        : '<div class="tl-info"><strong>Belum ada riwayat proses.</strong></div>';
    }

    drawIcons();
  }


  function renderRevisionUploader(docs) {
    const host = document.getElementById("revisionUploadArea");
    if (!host) return;

    if (!docs.length) {
      host.innerHTML = `
        <div class="tl-revision-upload">
          <div class="tl-revision-upload-head">
            <i data-lucide="triangle-alert"></i>
            <div>
              <strong>Dokumen revisi belum tersedia</strong>
              <span>Belum ada dokumen yang dapat dijadikan acuan revisi.</span>
            </div>
          </div>
        </div>`;
      drawIcons();
      return;
    }

    host.innerHTML = `
      <div class="tl-revision-upload">
        <div class="tl-revision-upload-head">
          <i data-lucide="upload-cloud"></i>
          <div>
            <strong>Unggah dokumen hasil revisi</strong>
            <span>Unggah hanya dokumen yang telah diperbaiki. Dokumen yang tidak dipilih tidak akan diubah.</span>
          </div>
        </div>
        ${docs.map((d, index) => {
          const name = d.nama_dokumen || d.judul_dokumen || d.nama_file || d.file_name || d.jenis_dokumen || "Dokumen";
          const type = d.jenis_dokumen || name;
          const safeType = escAttr(type);
          return `
            <div class="tl-revision-file">
              <div class="tl-revision-file-main">
                <div class="tl-revision-file-icon"><i data-lucide="${documentIcon(name)}"></i></div>
                <div>
                  <span class="tl-revision-file-name">${esc(name)}</span>
                  <span class="tl-revision-file-meta">Versi saat ini · pilih file pengganti bila direvisi</span>
                </div>
              </div>
              <input
                class="tl-revision-file-input"
                type="file"
                data-revision-index="${index}"
                data-jenis-dokumen="${safeType}"
                data-current-name="${escAttr(name)}"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </div>`;
        }).join("")}
        <div class="tl-revision-selected" id="revisionSelectedCount">Belum ada dokumen revisi dipilih.</div>
        <div class="tl-revision-hint">Wajib file Microsoft Word (.doc atau .docx). Maksimal 10 MB per file dan 25 MB total. Nomor agenda tetap menggunakan <strong>${esc(currentItemId())}</strong>.</div>
      </div>`;

    host.querySelectorAll(".tl-revision-file-input").forEach((input) => {
      input.addEventListener("change", updateRevisionSelection);
    });
    drawIcons();
  }

  function currentItemId() {
    return document.getElementById("modalId")?.textContent?.trim() || "-";
  }

  function updateRevisionSelection() {
    const inputs = Array.from(document.querySelectorAll(".tl-revision-file-input"));
    revisionFiles = inputs
      .filter((input) => input.files && input.files[0])
      .map((input) => ({
        file: input.files[0],
        jenis_dokumen: input.dataset.jenisDokumen || input.dataset.jenisDokumen,
        index: Number(input.dataset.revisionIndex || 0)
      }));

    const total = revisionFiles.reduce((sum, item) => sum + item.file.size, 0);
    const el = document.getElementById("revisionSelectedCount");
    if (el) {
      el.innerHTML = revisionFiles.length
        ? `<strong>${revisionFiles.length} dokumen</strong> dipilih · ${(total / 1024 / 1024).toFixed(2)} MB`
        : "Belum ada dokumen revisi dipilih. File wajib Microsoft Word (.doc/.docx).";
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = () => reject(new Error("Gagal membaca file " + file.name));
      reader.readAsDataURL(file);
    });
  }

  async function submitRevision() {
    const id = currentItemId();
    const item = records.find((x) => x.id === id);
    if (!item || item.status !== "revise") return;

    updateRevisionSelection();

    if (!revisionFiles.length) {
      alert("Pilih minimal satu dokumen hasil revisi terlebih dahulu.");
      return;
    }

    // Dokumen revisi WAJIB berupa Microsoft Word (.doc / .docx).
    const WORD_EXTENSIONS = [".doc", ".docx"];
    const WORD_MIME_TYPES = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const invalidWord = revisionFiles.find((item) => {
      const name = String(item.file.name || "").toLowerCase().trim();
      const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
      const mime = String(item.file.type || "").toLowerCase().trim();

      // Browser tertentu dapat mengosongkan MIME type, jadi ekstensi tetap
      // menjadi pemeriksaan utama.
      return !WORD_EXTENSIONS.includes(ext) &&
             !WORD_MIME_TYPES.includes(mime);
    });

    if (invalidWord) {
      alert(
        `File "${invalidWord.file.name}" tidak dapat dikirim.\n\n` +
        "Dokumen hasil revisi wajib berupa file Microsoft Word (.doc atau .docx)."
      );
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
    const totalSize = revisionFiles.reduce((sum, item) => sum + item.file.size, 0);

    const tooLarge = revisionFiles.find((item) => item.file.size > MAX_FILE_SIZE);
    if (tooLarge) {
      alert(`File "${tooLarge.file.name}" melebihi batas 10 MB.`);
      return;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      alert("Total ukuran dokumen revisi melebihi batas 25 MB.");
      return;
    }

    if (!confirm("Kirim dokumen hasil revisi kembali ke Kementerian Sekretariat Kabinet?\n\nNomor agenda tetap " + id + ".")) {
      return;
    }

    const button = document.getElementById("submitRevisionButton");
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i data-lucide="loader-circle"></i> Mengirim...';
      drawIcons();
    }

    try {
      const token = session.session_token || session.token || "";
      const dokumen = [];

      for (const item of revisionFiles) {
        dokumen.push({
          name: item.file.name,
          type: item.file.type || "application/octet-stream",
          size: item.file.size,
          data: await readFileAsBase64(item.file),
          jenis_dokumen: item.jenis_dokumen || "Dokumen"
        });
      }

      const res = await fetch(apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "kirimUlangPengajuan",
          session_token: token,
          pengajuan_id: id,
          dokumen
        })
      });

      if (!res.ok) throw new Error("Server mengembalikan HTTP " + res.status);

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Gagal mengirim ulang pengajuan.");
      }

      alert("Dokumen revisi berhasil dikirim kembali ke Kementerian Sekretariat Kabinet.");
      closeModal();

      // Setelah dikirim ulang, pengajuan tidak lagi berada di menu Tindak Lanjut.
      records = records.filter((x) => x.id !== id);
      render();
    } catch (err) {
      console.error("Gagal mengirim dokumen revisi:", err);
      alert("Dokumen revisi belum dapat dikirim.\n\n" + (err.message || "Terjadi kesalahan pada server."));
      if (button) {
        button.disabled = false;
        button.innerHTML = '<i data-lucide="send"></i> Kirim Revisi';
        drawIcons();
      }
    }
  }

  async function markApprovedComplete() {
    const id = document.getElementById("modalId")?.textContent?.trim();
    const item = records.find((x) => x.id === id);
    if (
      !id ||
      !item ||
      !["approved", "rejected"].includes(item.status)
    )
      return;

    if (
      !confirm(
        "Tandai pengajuan ini sebagai selesai?\n\nSetelah ditandai selesai, pengajuan tidak akan muncul lagi di menu Tindak Lanjut.",
      )
    )
      return;

    const button = document.getElementById("markCompleteButton");
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i data-lucide="loader-circle"></i> Menyimpan...';
      drawIcons();
    }

    try {
      const token = session.session_token || session.token || "";
      const res = await fetch(apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "tandaiTindakLanjutSelesai",
          session_token: token,
          pengajuan_id: id,
        }),
      });

      const json = await res.json();
      if (!json.success)
        throw new Error(
          json.message || "Server belum menyediakan proses penandaan selesai.",
        );

      records = records.filter((x) => x.id !== id);
      closeModal();
      render();
    } catch (err) {
      console.error("Gagal menandai pengajuan selesai:", err);
      if (button) {
        button.disabled = false;
        button.innerHTML = '<i data-lucide="check"></i> Tandai Selesai';
        drawIcons();
      }
      alert(
        "Pengajuan belum dapat ditandai selesai.\n\n" +
          (err.message || "Terjadi kesalahan pada server."),
      );
    }
  }

  function esc(v) {
    return String(v ?? "").replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  }
  function escAttr(v) {
    return esc(v).replace(/`/g, "&#96;");
  }
  function drawIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function setupMonthDropdown() {
    const select = document.getElementById("monthFilter");
    if (!select || select.dataset.customized === "true") return;

    select.dataset.customized = "true";
    select.classList.add("tl-native-select");

    const host = document.createElement("div");
    host.className = "tl-month-custom";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "tl-month-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "tl-month-menu";
    menu.setAttribute("role", "listbox");

    host.appendChild(trigger);
    host.appendChild(menu);

    const wrapper = select.parentElement;
    wrapper.insertBefore(host, select);

    function syncCurrent() {
      const current = Array.from(select.options).find(
        (o) => o.value === select.value,
      );

      if (!current) {
        select.value = "all";
      }

      const active = Array.from(select.options).find(
        (o) => o.value === select.value,
      );

      trigger.textContent = active ? active.textContent : "Semua Bulan";

      menu.querySelectorAll(".tl-month-option").forEach((item) => {
        const isActive = item.dataset.value === select.value;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    function rebuildOptions() {
      // Preserve the current selection when possible.
      const previous = select.value || "all";

      select.innerHTML = "";
      menu.innerHTML = "";

      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "Semua Bulan";
      select.appendChild(allOption);

      const monthMap = new Map();

      records.forEach((record) => {
        if (!record.date) return;

        const d = new Date(record.date);
        if (isNaN(d)) return;

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        if (!monthMap.has(key)) {
          monthMap.set(
            key,
            d.toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            }),
          );
        }
      });

      // Terbaru → terlama.
      Array.from(monthMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label.charAt(0).toUpperCase() + label.slice(1);
          select.appendChild(option);
        });

      // Render custom menu dari option yang baru terbentuk.
      Array.from(select.options).forEach((option) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "tl-month-option";
        item.dataset.value = option.value;
        item.textContent = option.textContent;
        item.setAttribute("role", "option");

        item.addEventListener("click", () => {
          select.value = option.value;
          syncCurrent();

          host.classList.remove("open");
          trigger.setAttribute("aria-expanded", "false");

          // Gunakan filter existing.
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });

        menu.appendChild(item);
      });

      // Jika bulan yang sedang dipilih masih ada, pertahankan.
      // Jika tidak, kembali ke Semua Bulan.
      if (
        previous !== "all" &&
        Array.from(select.options).some((o) => o.value === previous)
      ) {
        select.value = previous;
      } else {
        select.value = "all";
      }

      syncCurrent();
    }

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const open = host.classList.toggle("open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", (event) => {
      if (!host.contains(event.target)) {
        host.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        host.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    // Expose a small updater for the real-data loader.
    window.sitaraRefreshMonthFilter = rebuildOptions;

    // Initial render; it will be rebuilt again after API data arrives.
    rebuildOptions();
  }

  setupMonthDropdown();

  document.querySelectorAll(".tl-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tl-filter")
        .forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      render();
    }),
  );
  document.getElementById("searchInput").addEventListener("input", render);
  document.getElementById("monthFilter").addEventListener("change", render);
  function closeModal() {
    document.getElementById("detailModal").classList.remove("show");
    document.getElementById("detailModal").setAttribute("aria-hidden", "true");
    document.body.classList.remove("tl-modal-open");
  }
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document
    .getElementById("modalCloseBottom")
    .addEventListener("click", closeModal);
  document
    .getElementById("markCompleteButton")
    .addEventListener("click", markApprovedComplete);
  document
    .getElementById("submitRevisionButton")
    .addEventListener("click", submitRevision);
  document.getElementById("detailModal").addEventListener("click", (e) => {
    if (e.target.id === "detailModal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  document
    .getElementById("logoutButton")
    .addEventListener("click", function () {
      if (!confirm("Apakah kamu yakin ingin keluar dari SITARA?")) return;
      sessionStorage.removeItem("sitaraUser");
      location.href = "../../../login/index.html";
    });
  drawIcons();
  loadData();
})();
