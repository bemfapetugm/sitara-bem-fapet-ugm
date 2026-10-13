const API_URL = 'https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec';

const rawSession = sessionStorage.getItem('sitaraUser');
if (!rawSession) {
  window.location.href = '../../../login/index.html';
}
let user = {};
try {
  user = JSON.parse(rawSession || '{}');
} catch (error) {
  sessionStorage.removeItem('sitaraUser');
  window.location.href = '../../../login/index.html';
}
const role = String(user.role || '').trim().toLowerCase();
if (role && role !== 'mensetkab') {
  alert('Akses ditolak.');
  window.location.href = '../../../login/index.html';
}

let rows = [];
let loadError = '';
let sortOrder = 'newest';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function dateValue(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}
function formatDate(value) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';
}
function statusClass(value) {
  const s = String(value || '').toLowerCase();
  if (s.includes('revisi')) return 'pm-status-revision';
  if (s.includes('tolak')) return 'pm-status-rejected';
  if (s.includes('selesai') || s.includes('disetujui')) return 'pm-status-done';
  if (s.includes('menunggu') || s.includes('verifikasi') || s.includes('mensetkab')) return 'pm-status-pending';
  return 'pm-status-default';
}
function typeClass(value) {
  const s = String(value || '').toLowerCase();
  if (s.includes('proposal')) return 'pm-type-proposal';
  if (s.includes('lpj')) return 'pm-type-lpj';
  return 'pm-type-default';
}
async function post(action, extra = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, session_token: user.session_token || user.token || '', ...extra })
  });
  return response.json();
}
function filteredRows() {
  const query = String(document.getElementById('search')?.value || '').trim().toLocaleLowerCase('id-ID');
  return rows.filter(item => {
    const searchable = [item.judul, item.nomor_pengajuan, item.asal_kementerian, item.jenis, item.status_label]
      .map(value => String(value || '')).join(' ').toLocaleLowerCase('id-ID');
    return !query || searchable.includes(query);
  }).sort((a, b) => sortOrder === 'oldest'
    ? dateValue(a.tanggal_pengajuan) - dateValue(b.tanggal_pengajuan)
    : dateValue(b.tanggal_pengajuan) - dateValue(a.tanggal_pengajuan));
}
function render() {
  const body = document.getElementById('body');
  const data = filteredRows();
  document.getElementById('count').textContent = `${data.length} pengajuan${data.length === 1 ? '' : ''}`;
  if (loadError) {
    body.innerHTML = `<tr><td colspan="7"><div class="pm-empty pm-empty-error"><span class="pm-empty-icon" aria-hidden="true">!</span><strong>Data pengajuan belum dapat dimuat</strong><p>${esc(loadError)}</p><button type="button" class="pm-retry" id="retryLoad">Coba lagi</button></div></td></tr>`;
    document.getElementById('retryLoad')?.addEventListener('click', loadRows);
    return;
  }
  if (!data.length) {
    const searched = Boolean(String(document.getElementById('search')?.value || '').trim());
    body.innerHTML = `<tr><td colspan="7"><div class="pm-empty"><svg class="pm-empty-illustration" viewBox="0 0 120 120" role="img" aria-label="Tidak ada dokumen"><path d="M32 29h43l17 17v48a7 7 0 0 1-7 7H32a7 7 0 0 1-7-7V36a7 7 0 0 1 7-7Z" fill="#f8e9e7"/><path d="M75 29v18h17" fill="none" stroke="#d9a09a" stroke-width="3" stroke-linejoin="round"/><path d="M42 59h34M42 70h29M42 81h24" stroke="#c77870" stroke-width="4" stroke-linecap="round"/><path d="M20 43l-5-5m86 8 6-6m-7-15 3-7" stroke="#dba19b" stroke-width="3" stroke-linecap="round"/></svg><strong>${searched ? 'Tidak ditemukan pengajuan' : 'Belum ada pengajuan'}</strong><p>${searched ? 'Coba gunakan kata kunci lain.' : 'Saat ini belum ada pengajuan yang perlu diverifikasi oleh Mensetkab.'}</p></div></td></tr>`;
    return;
  }
  body.innerHTML = data.map((item, index) => `<tr>
    <td class="pm-number">${index + 1}</td>
    <td><div class="pm-title-cell"><strong>${esc(item.judul || item.perihal || 'Tanpa judul')}</strong><small>${esc(item.nomor_pengajuan || item.pengajuan_id || '-')}</small></div></td>
    <td>${esc(item.asal_kementerian || '-')}</td>
    <td><span class="pm-type ${typeClass(item.jenis)}">${esc(item.jenis || '-')}</span></td>
    <td class="pm-date">${formatDate(item.tanggal_pengajuan)}</td>
    <td><span class="pm-status ${statusClass(item.status_label || item.status)}">${esc(item.status_label || item.status || 'Menunggu verifikasi')}</span></td>
    <td><a class="pm-open" href="detail/index.html?id=${encodeURIComponent(item.pengajuan_id || item.id || '')}">Detail <span aria-hidden="true">→</span></a></td>
  </tr>`).join('');
}
async function loadRows() {
  loadError = '';
  const body = document.getElementById('body');
  body.innerHTML = '<tr><td colspan="7"><div class="pm-loading"><span class="pm-spinner" aria-hidden="true"></span>Memuat daftar pengajuan...</div></td></tr>';
  try {
    const result = await post('getPengajuanMasukMensetkab');
    if (!result || !result.success) throw new Error(result?.message || 'Gagal mengambil data pengajuan.');
    rows = Array.isArray(result.data) ? result.data : [];
    render();
  } catch (error) {
    loadError = error?.message || 'Terjadi kesalahan saat menghubungi layanan SITARA.';
    render();
  }
}
function initializeProfile() {
  const name = user.nama_lengkap || user.nama || 'Mensetkab';
  const initials = (name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('') || 'MS').toUpperCase();
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('topbarAvatar').textContent = initials;
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
document.getElementById('search').addEventListener('input', render);
document.getElementById('sortOrder').addEventListener('change', event => { sortOrder = event.target.value; render(); });
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Apakah Anda yakin ingin keluar dari SITARA?')) {
    sessionStorage.removeItem('sitaraUser');
    window.location.href = '../../../login/index.html';
  }
});
initializeProfile();
loadRows();
