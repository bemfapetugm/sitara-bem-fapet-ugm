/* SITARA Kemenhubker — single shared sidebar component. Keep all sidebar markup here. */
(function () {
  'use strict';
  var script = document.currentScript;
  var rootUrl = new URL('../../', script.src);
  var appUrl = new URL('beranda/kemenhubker/', rootUrl);
  var pathname = window.location.pathname.toLowerCase();
  var current = 'dashboard';
  if (pathname.indexOf('/tambah-pengajuan/') !== -1) current = 'tambah';
  else if (pathname.indexOf('/tindak-lanjut/') !== -1) current = 'tindak';
  else if (pathname.indexOf('/riwayat-pengajuan/') !== -1) current = 'riwayat';
  else if (pathname.indexOf('/template-dokumen/') !== -1) current = 'template';
  else if (pathname.indexOf('/arsip-dokumen-final/') !== -1) current = 'arsip';
  var links = [
    { key:'dashboard', label:'Dashboard', icon:'house', href:'index.html', group:'MENU UTAMA' },
    { key:'tambah', label:'Tambah Pengajuan', icon:'file-plus-2', href:'tambah-pengajuan/index.html', group:'PENGAJUAN' },
    { key:'tindak', label:'Tindak Lanjut', icon:'file-search', href:'tindak-lanjut/index.html', group:'PENGAJUAN' },
    { key:'riwayat', label:'Riwayat Pengajuan', icon:'history', href:'riwayat-pengajuan/index.html', group:'PENGAJUAN' },
    { key:'template', label:'Template Dokumen', icon:'files', href:'template-dokumen/index.html', group:'DOKUMEN' },
    { key:'arsip', label:'Arsip Dokumen Final', icon:'folder', href:'arsip-dokumen-final/index.html', group:'DOKUMEN' }
  ];
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); }
  function render() {
    var aside = document.querySelector('aside.sidebar');
    if (!aside) return;
    aside.id = 'sitaraSidebar';
    aside.innerHTML = '<div class="sidebar-brand"><img src="' + new URL('assets/images/sitara-logo-horizontal.png', rootUrl).href + '" alt="SITARA — Sistem Integrasi Tata Birokrasi Mahasiswa"></div>' +
      '<nav class="sidebar-nav" aria-label="Navigasi utama">' + links.map(function (item, i) {
        var group = i === 0 || links[i-1].group !== item.group ? '<p class="nav-label">' + item.group + '</p>' : '';
        return group + '<a href="' + new URL(item.href, appUrl).href + '" class="nav-item' + (current === item.key ? ' active' : '') + '"' + (current === item.key ? ' aria-current="page"' : '') + '><span class="nav-icon"><i data-lucide="' + item.icon + '"></i></span><span>' + esc(item.label) + '</span></a>';
      }).join('') + '</nav>' +
      '<div class="sidebar-footer"><div class="user-profile"><div class="profile-avatar" id="profileAvatar">KH</div><div class="profile-info"><h4 id="profileName">Kementerian Hubungan Kerja Sama</h4><p id="profileRole">Kementerian</p></div></div><button type="button" class="logout-button" id="logoutButton">⇥ Keluar</button></div>';
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }
  render();
})();
