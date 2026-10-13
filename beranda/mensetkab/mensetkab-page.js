/* SITARA Mensetkab generic page bootstrap.
   Provides session guard, shared profile/date and logout only; no business/API logic. */
(function () {
  "use strict";
  const LOGIN_PATH = (function () {
    const path = window.location.pathname;
    const marker = "/mensetkab/";
    const i = path.toLowerCase().indexOf(marker);
    const base = i >= 0 ? path.slice(0, i) : "";
    return base + "/login/index.html";
  })();

  let user = null;
  try {
    const raw = sessionStorage.getItem("sitaraUser");
    if (!raw) {
      window.location.href = LOGIN_PATH;
      return;
    }
    user = JSON.parse(raw);
  } catch (error) {
    console.error("Data sesi SITARA tidak valid:", error);
    sessionStorage.removeItem("sitaraUser");
    window.location.href = LOGIN_PATH;
    return;
  }

  if (String(user.role || "").trim().toLowerCase() !== "mensetkab") {
    alert("Anda tidak memiliki akses ke halaman Mensetkab.");
    sessionStorage.removeItem("sitaraUser");
    window.location.href = LOGIN_PATH;
    return;
  }

  const name = user.nama_lengkap || user.nama || "Menteri Sekretariat Kabinet";
  const initials = String(name).trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase() || "MS";

  const profileName = document.getElementById("profileName");
  const profileRole = document.getElementById("profileRole");
  const profileAvatar = document.getElementById("profileAvatar");
  const topbarAvatar = document.getElementById("topbarAvatar");
  const currentDate = document.getElementById("currentDate");
  if (profileName) profileName.textContent = name;
  if (profileRole) profileRole.textContent = "Mensetkab";
  if (profileAvatar) profileAvatar.textContent = initials;
  if (topbarAvatar) topbarAvatar.textContent = initials;
  if (currentDate) currentDate.textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) logoutButton.addEventListener("click", function () {
    if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) return;
    sessionStorage.removeItem("sitaraUser");
    window.location.href = LOGIN_PATH;
  });
})();