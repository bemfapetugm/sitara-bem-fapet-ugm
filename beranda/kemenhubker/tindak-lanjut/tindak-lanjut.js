(function(){
  const session = JSON.parse(sessionStorage.getItem('sitaraUser') || '{}');
  const name = session.nama_lengkap || session.nama || session.name || 'Kementerian Hubungan Kerja Sama';
  const role = session.role || 'kementerian';
  const initials = String(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'KH';
  const dateText = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('currentDate').textContent = dateText;
  document.getElementById('pageDate').textContent = dateText;
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileRole').textContent = role === 'kementerian' ? 'Kementerian' : role;
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('topbarAvatar').textContent = initials;

  const DEMO = [
    {id:'BEM-202610-0007', title:'Studi Banding Himpunan Mahasiswa', kind:'Proposal', date:'2026-10-07T09:15:00', status:'approved', label:'Disetujui', desc:'Pengajuan telah disetujui dan dokumen final dapat diakses.'},
    {id:'BEM-202610-0006', title:'Pengabdian Masyarakat Desa Binaan', kind:'Proposal', date:'2026-10-06T14:20:00', status:'rejected', label:'Ditolak', desc:'Pengajuan ditolak. Silakan ajukan kembali dengan perbaikan sesuai catatan.'},
    {id:'BEM-202610-0005', title:'Kunjungan Industri Peternakan', kind:'Proposal', date:'2026-10-05T16:30:00', status:'revise', label:'Perlu Revisi', desc:'Terdapat catatan revisi. Silakan unggah dokumen yang telah diperbaiki.'},
    {id:'BEM-202609-0009', title:'Seminar Nasional Peternakan 2026', kind:'LPJ', date:'2026-09-28T11:10:00', status:'revise', label:'Perlu Revisi', desc:'Terdapat catatan revisi. Silakan unggah dokumen yang telah diperbaiki.'},
    {id:'BEM-202609-0004', title:'Webinar Inovasi Peternakan', kind:'Proposal', date:'2026-09-20T10:05:00', status:'approved', label:'Disetujui', desc:'Pengajuan telah disetujui dan dokumen final dapat diakses.'},
    {id:'BEM-202609-0003', title:'Pelatihan Public Speaking', kind:'Proposal', date:'2026-09-15T14:42:00', status:'rejected', label:'Ditolak', desc:'Pengajuan ditolak. Silakan ajukan kembali dengan perbaikan sesuai catatan.'},
    {id:'BEM-202609-0002', title:'Lomba Nasional Peternakan 2026', kind:'Proposal', date:'2026-09-12T09:18:00', status:'approved', label:'Disetujui', desc:'Pengajuan telah disetujui dan dokumen final dapat diakses.'},
    {id:'BEM-202609-0001', title:'Pelatihan Manajemen Organisasi', kind:'LPJ', date:'2026-09-10T13:25:00', status:'revise', label:'Perlu Revisi', desc:'Terdapat catatan revisi. Silakan unggah dokumen yang telah diperbaiki.'}
  ];

  let records = [];
  let activeFilter = 'all';
  let detailCache = {};

  function apiUrl(){
    return session.sitaraApiUrl || session.apiUrl || session.API_URL || localStorage.getItem('sitaraApiUrl') || window.SITARA_API_URL || '';
  }
  function fmtDate(v){
    if(!v) return '-';
    const d = new Date(v); if(isNaN(d)) return String(v);
    return d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  }
  function classify(x){
    const s = String(x.status_label || x.status || '').toLowerCase();
    if(s.includes('tolak')) return 'rejected';
    if(s.includes('revisi')) return 'revise';
    if(s.includes('setuju')) return 'approved';
    return '';
  }
  function normalize(x){
    const c = classify(x);
    if(!c) return null;
    return {id:x.id||x.pengajuan_id||x.nomor_pengajuan||'-',title:x.perihal||x.judul_pengajuan||x.judul||'Tanpa judul',kind:(x.jenis||x.jenis_pengajuan||'').toString().toLowerCase().includes('lpj')?'LPJ':'Proposal',date:x.tanggal_pengajuan||x.created_at||'',status:c,label:c==='approved'?'Disetujui':c==='revise'?'Perlu Revisi':'Ditolak',desc:c==='approved'?'Pengajuan telah disetujui dan dokumen final dapat diakses.':c==='revise'?'Terdapat catatan revisi. Silakan unggah dokumen yang telah diperbaiki.':'Pengajuan ditolak. Silakan ajukan kembali dengan perbaikan sesuai catatan.',raw:x};
  }
  async function loadData(){
    const url=apiUrl();
    if(!url){ records=DEMO.slice(); render(); return; }
    try{
      const token=session.session_token || session.token || '';
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'getPengajuan',session_token:token})});
      const json=await res.json();
      if(!json.success || !Array.isArray(json.data)) throw new Error(json.message || 'Data tidak tersedia');
      const normalized=json.data.map(normalize).filter(Boolean);
      records=normalized.length ? normalized : [];
      render();
    }catch(err){
      console.warn('Tindak lanjut memakai data tampilan contoh:',err);
      records=DEMO.slice(); render();
    }
  }
  function iconFor(status){ return status==='approved'?'file-check-2':status==='revise'?'file-pen-line':'file-x-2'; }
  function render(){
    const q=document.getElementById('searchInput').value.trim().toLowerCase();
    const month=document.getElementById('monthFilter').value;
    const filtered=records.filter(r=>{
      const hitFilter=activeFilter==='all'||r.status===activeFilter;
      const hitSearch=!q || (r.id+' '+r.title).toLowerCase().includes(q);
      const hitMonth=month==='all'||String(r.date).slice(0,7)===month;
      return hitFilter&&hitSearch&&hitMonth;
    }).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    const counts={all:records.length,approved:records.filter(x=>x.status==='approved').length,revise:records.filter(x=>x.status==='revise').length,rejected:records.filter(x=>x.status==='rejected').length};
    document.getElementById('statApproved').textContent=counts.approved; document.getElementById('statRevise').textContent=counts.revise; document.getElementById('statRejected').textContent=counts.rejected; document.getElementById('statTotal').textContent=counts.all;
    document.getElementById('countAll').textContent=counts.all; document.getElementById('countApproved').textContent=counts.approved; document.getElementById('countRevise').textContent=counts.revise; document.getElementById('countRejected').textContent=counts.rejected;
    const grid=document.getElementById('cardGrid');
    if(!filtered.length){grid.innerHTML='<div class="tl-empty"><i data-lucide="inbox"></i><h3>Tidak ada tindak lanjut</h3><p>Belum ada pengajuan yang sesuai dengan filter atau pencarian kamu.</p></div>'; drawIcons(); return;}
    grid.innerHTML=filtered.map((r,i)=>`<article class="tl-card ${r.status}">
      <div class="tl-card-top"><div><span class="tl-status">${r.label}</span><div class="tl-card-id">${esc(r.id)}</div><div class="tl-card-title">${esc(r.title)}</div><span class="tl-kind">${esc(r.kind)}</span></div><div class="tl-card-icon"><i data-lucide="${iconFor(r.status)}"></i></div></div>
      <div class="tl-meta"><i data-lucide="calendar-days"></i><span>${fmtDate(r.date)}</span></div>
      <div class="tl-desc">${esc(r.desc)}</div>
      <button class="tl-detail" data-id="${escAttr(r.id)}">Detail <i data-lucide="arrow-right"></i></button>
    </article>`).join('');
    grid.querySelectorAll('.tl-detail').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.id)));
    drawIcons();
  }
  async function openDetail(id){
    const item=records.find(x=>x.id===id); if(!item)return;
    const modal=document.getElementById('detailModal');
    document.getElementById('modalId').textContent=item.id;
    const title=document.getElementById('modalTitle'); title.textContent=item.title;
    const st=document.getElementById('modalStatus'); st.textContent=item.label; st.className='tl-status '+item.status;
    const body=document.getElementById('modalBody');
    body.innerHTML=`<div class="tl-detail-grid"><div class="tl-info"><small>Nomor Pengajuan</small><strong>${esc(item.id)}</strong></div><div class="tl-info"><small>Jenis Pengajuan</small><strong>${esc(item.kind)}</strong></div><div class="tl-info"><small>Tanggal Pengajuan</small><strong>${fmtDate(item.date)}</strong></div><div class="tl-info"><small>Status</small><strong>${esc(item.label)}</strong></div></div><div class="tl-section-title">Keterangan</div><div class="tl-info"><strong>${esc(item.desc)}</strong></div><div class="tl-section-title">Dokumen Final</div><div id="modalDocs"><div class="tl-loading" style="padding:18px">Memuat dokumen...</div></div><div class="tl-section-title">Riwayat Proses</div><div id="modalTimeline"><div class="tl-loading" style="padding:18px">Memuat riwayat...</div></div>`;
    modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); drawIcons();
    try{
      const url=apiUrl();
      if(!url) throw new Error('demo');
      const token=session.session_token || session.token || '';
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'getPengajuanDetail',session_token:token,pengajuan_id:id})});
      const json=await res.json(); if(!json.success) throw new Error(json.message||'Gagal');
      detailCache[id]=json.data; renderDetailData(json.data);
    }catch(e){
      document.getElementById('modalDocs').innerHTML='<div class="tl-info"><strong>Dokumen final akan ditampilkan di sini setelah tersedia.</strong></div>';
      document.getElementById('modalTimeline').innerHTML=`<div class="tl-timeline"><div class="tl-event"><strong>${esc(item.label)}</strong><span>${fmtDate(item.date)}</span><p>${esc(item.desc)}</p></div></div>`;
    }
  }
  function renderDetailData(data){
    const docs=Array.isArray(data.dokumen)?data.dokumen:[];
    const docsEl=document.getElementById('modalDocs');
    const usable=docs.filter(d=>d.url||d.file_url||d.drive_url||d.link||d.webViewLink);
    docsEl.innerHTML=docs.length?docs.map(d=>{const url=d.url||d.file_url||d.drive_url||d.link||d.webViewLink||''; const name=d.nama_dokumen||d.judul_dokumen||d.nama_file||d.file_name||d.jenis_dokumen||'Dokumen'; return `<div class="tl-doc"><span class="tl-doc-name">${esc(name)}</span>${url?`<a class="tl-download" href="${escAttr(url)}" target="_blank" rel="noopener"><i data-lucide="download"></i> Download</a>`:'<span style="font-size:10px;color:#8793a5">Belum tersedia</span>'}</div>`}).join(''):'<div class="tl-info"><strong>Belum ada dokumen final yang tersedia.</strong></div>';
    const hist=Array.isArray(data.riwayat)?data.riwayat.slice().reverse():[];
    document.getElementById('modalTimeline').innerHTML=hist.length?`<div class="tl-timeline">${hist.map(h=>`<div class="tl-event"><strong>${esc(h.aksi||h.status||'Pembaruan pengajuan')}</strong><span>${fmtDate(h.waktu)}</span>${h.catatan?`<p>${esc(h.catatan)}</p>`:''}</div>`).join('')}</div>`:'<div class="tl-info"><strong>Belum ada riwayat proses.</strong></div>';
    drawIcons();
  }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function escAttr(v){return esc(v).replace(/`/g,'&#96;');}
  function drawIcons(){if(window.lucide)window.lucide.createIcons();}

  document.querySelectorAll('.tl-filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tl-filter').forEach(x=>x.classList.remove('active'));btn.classList.add('active');activeFilter=btn.dataset.filter;render();}));
  document.getElementById('searchInput').addEventListener('input',render); document.getElementById('monthFilter').addEventListener('change',render);
  function closeModal(){document.getElementById('detailModal').classList.remove('show');document.getElementById('detailModal').setAttribute('aria-hidden','true');}
  document.getElementById('modalClose').addEventListener('click',closeModal); document.getElementById('modalCloseBottom').addEventListener('click',closeModal); document.getElementById('detailModal').addEventListener('click',e=>{if(e.target.id==='detailModal')closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  document.getElementById('logoutButton').addEventListener('click',function(){if(!confirm('Apakah kamu yakin ingin keluar dari SITARA?'))return;sessionStorage.removeItem('sitaraUser');location.href='../../../login/index.html';});
  drawIcons(); loadData();
})();
