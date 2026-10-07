const API_URL='https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec';const raw=sessionStorage.getItem('sitaraUser');if(!raw)location.href='../../../login/index.html';let user;try{user=JSON.parse(raw)}catch(e){sessionStorage.removeItem('sitaraUser');location.href='../../../login/index.html'}const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const badge=s=>{const x=String(s||'').toLowerCase();let c='status-info';if(x.includes('selesai')||x.includes('disetujui'))c='status-success';else if(x.includes('revisi')||x.includes('menunggu'))c='status-warning';else if(x.includes('tolak'))c='status-danger';return `<span class="status-badge ${c}">${esc(s||'-')}</span>`};const date=v=>{const d=new Date(v);return v&&!isNaN(d)?d.toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-'};function isRelevantMensetkabActivity(x) {
    const action = String(x.aktivitas || x.aksi || "").toLowerCase();
    const from = String(x.dari_unit || "").toLowerCase();
    const to = String(x.ke_unit || "").toLowerCase();
    const status = String(x.status || x.status_label || "").toLowerCase();

    // Hanya aktivitas keputusan/lanjutan yang relevan bagi Mensetkab.
    // Aktivitas awal seperti "Pengajuan dibuat", "diperbaiki",
    // atau "dikirim ulang" tidak ditampilkan.
    const decisionOrForwarding =
        action.includes("diverifikasi dan diteruskan ke mensetkab") ||
        action.includes("menunggu persetujuan mensetkab") ||
        action.includes("disetujui mensetkab") ||
        action.includes("disetujui dan diteruskan ke ketua bem") ||
        action.includes("diteruskan ke ketua bem") ||
        action.includes("disetujui ketua bem") ||
        action.includes("diteruskan ke kemensetkab") ||
        status.includes("menunggu persetujuan mensetkab") ||
        status.includes("menunggu ketua") ||
        status.includes("disetujui ketua");

    const hasRelevantActor =
        from.includes("mensetkab") ||
        to.includes("mensetkab") ||
        from.includes("menteri sekretariat kabinet") ||
        to.includes("menteri sekretariat kabinet") ||
        from.includes("ketua bem") ||
        to.includes("ketua bem");

    return decisionOrForwarding && hasRelevantActor;
}

async function init(){const name=user.nama_lengkap||user.nama||'Mensetkab';const av=(name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('')||'MS').toUpperCase();document.getElementById('profileName').textContent=name;document.getElementById('profileAvatar').textContent=av;document.getElementById('topbarAvatar').textContent=av;document.getElementById('currentDate').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});try{const r=await(await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'getRiwayatMensetkab',session_token:user.session_token})})).json();if(!r.success)throw Error(r.message);const rows=(r.data||[]).filter(isRelevantMensetkabActivity);const render=()=>{const q=(document.getElementById('search').value||'').toLowerCase();const data=rows.filter(x=>(x.pengajuan_id+' '+x.aksi+' '+x.dari_unit+' '+x.ke_unit).toLowerCase().includes(q));document.getElementById('count').textContent=`${data.length} aktivitas`;document.getElementById('body').innerHTML=data.length?data.map(x=>`<tr><td><strong>${esc(x.pengajuan_id)}</strong></td><td>${esc(x.aksi)}</td><td>${esc(x.dari_unit)}</td><td>${esc(x.ke_unit)}</td><td>${badge(x.status)}</td><td>${date(x.waktu)}</td></tr>`).join(''):`<tr><td colspan="6" class="empty-state">Belum ada riwayat.</td></tr>`};document.getElementById('search').oninput=render;render()}catch(e){document.getElementById('body').innerHTML=`<tr><td colspan="6" class="empty-state">${esc(e.message)}</td></tr>`}}document.getElementById('logoutBtn').onclick=()=>{if(confirm('Apakah Anda yakin ingin keluar dari SITARA?')){sessionStorage.removeItem('sitaraUser');location.href='../../../login/index.html'}};init();