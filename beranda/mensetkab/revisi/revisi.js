/* SITARA Mensetkab — Perlu Revisi. Data berasal dari backend; tidak ada kartu dummy. */
(function(){
  'use strict';
  const API_URL='https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec';
  const raw=sessionStorage.getItem('sitaraUser'); let user={};
  try{user=JSON.parse(raw||'{}')}catch(e){user={}}
  const $=id=>document.getElementById(id);
  let rows=[], active=null, loadError='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateValue=v=>{if(!v)return 0;const d=new Date(v);return Number.isNaN(d.getTime())?0:d.getTime()};
  const fmtDate=(v,withTime=false)=>{const d=new Date(v);if(!v||Number.isNaN(d.getTime()))return '-';return d.toLocaleDateString('id-ID',withTime?{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'numeric',month:'long',year:'numeric'})+(withTime?' WIB':'')};
  const getDownloadUrl=doc=>{
    const raw=String(doc?.url||doc?.file_url||'').trim();
    let id=String(doc?.drive_file_id||'').trim();
    if(!id&&raw){
      const patterns=[
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
        /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/
      ];
      for(const pattern of patterns){const match=raw.match(pattern);if(match){id=match[1];break}}
    }
    if(id)return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    return raw;
  };
  async function post(action,extra={},timeoutMs=0){
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    let timer=null;
    try{
      if(timeoutMs>0&&controller)timer=setTimeout(()=>controller.abort(),timeoutMs);
      const options={method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,session_token:user.session_token||user.token||'',...extra})};
      if(controller)options.signal=controller.signal;
      const res=await fetch(API_URL,options);
      if(!res.ok)throw new Error(`Server mengembalikan HTTP ${res.status}.`);
      return await res.json();
    }catch(error){
      if(error&&error.name==='AbortError')throw new Error('Permintaan melewati batas waktu 45 detik. Layanan SITARA mungkin sedang lambat. Silakan coba lagi.');
      if(error instanceof SyntaxError)throw new Error('Respons server tidak dapat dibaca. Silakan coba lagi.');
      throw error;
    }finally{if(timer)clearTimeout(timer)}
  }
  function normalizedType(v){const s=String(v||'').toLowerCase();if(s.includes('proposal'))return{cls:'type-proposal',icon:'file-text',label:v||'Dokumen'};if(s.includes('lpj')||s.includes('laporan'))return{cls:'type-lpj',icon:'file-text',label:v||'Dokumen'};if(s.includes('fasilitas')||s.includes('peminjaman'))return{cls:'type-facility',icon:'landmark',label:v||'Dokumen'};return{cls:'type-other',icon:'file',label:v||'Dokumen'}}
  function getFiltered(){const q=String($('revisiSearch').value||'').trim().toLocaleLowerCase('id-ID');const order=$('revisiSort').value;return rows.filter(r=>[r.judul,r.perihal,r.pengajuan_id,r.nomor_pengajuan,r.asal_kementerian,r.jenis,r.catatan_terakhir].join(' ').toLocaleLowerCase('id-ID').includes(q)).sort((a,b)=>order==='oldest'?dateValue(a.tanggal_pengajuan)-dateValue(b.tanggal_pengajuan):dateValue(b.tanggal_pengajuan)-dateValue(a.tanggal_pengajuan))}
  function render(){const host=$('revisiCards');if(loadError){host.innerHTML=`<div class="revisi-state"><i data-lucide="cloud-off"></i><strong>Data revisi belum dapat dimuat</strong><p>${esc(loadError)}</p><button type="button" id="revisiRetry">Coba lagi</button></div>`;$('revisiRetry').onclick=loadRows;icons();return}const data=getFiltered();if(!data.length){const searched=Boolean($('revisiSearch').value.trim());host.innerHTML=`<div class="revisi-state"><i data-lucide="${searched?'search-x':'files'}"></i><strong>${searched?'Pengajuan tidak ditemukan':'Belum ada pengajuan yang perlu direvisi'}</strong><p>${searched?'Coba kata kunci lain.':'Pengajuan yang diminta revisi oleh Ketua BEM akan ditampilkan di sini setelah tersedia.'}</p></div>`;icons();return}
    host.innerHTML=data.map(item=>{const type=normalizedType(item.jenis);const id=item.pengajuan_id||item.id;return `<article class="revisi-card"><div class="revisi-card-icon ${type.cls}"><i data-lucide="${type.icon}"></i></div><div class="revisi-card-main"><div class="revisi-tags"><span class="revisi-tag ${type.cls}">${esc(type.label)}</span><span class="revisi-tag status">Perlu Revisi</span></div><h3>${esc(item.judul||item.perihal||'Tanpa judul')}</h3><div class="revisi-origin"><i data-lucide="landmark"></i><span>${esc(item.asal_kementerian||'-')}</span></div></div><div class="revisi-card-menu"><button class="revisi-more" type="button" title="Lihat catatan revisi" data-note="${esc(id)}"><i data-lucide="more-vertical"></i></button></div><div class="revisi-card-meta"><span class="revisi-meta-item"><i data-lucide="calendar-days"></i>${esc(fmtDate(item.tanggal_pengajuan,true))}</span><span class="revisi-meta-separator"></span><span class="revisi-meta-item"><i data-lucide="files"></i>${Number(item.jumlah_dokumen||0)} dokumen</span></div><button type="button" class="revisi-open" aria-label="Lihat dan revisi ${esc(item.judul||item.pengajuan_id)}" data-open="${esc(id)}"><i data-lucide="arrow-right"></i></button></article>`}).join('');host.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.open)));host.querySelectorAll('[data-note]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.note,true)));icons()}
  function icons(){if(window.lucide)window.lucide.createIcons()}
  async function loadRows(){loadError='';$('revisiCards').innerHTML='<div class="revisi-state"><span class="revisi-spinner"></span><strong>Memuat pengajuan revisi...</strong></div>';try{const result=await post('getPerluRevisiMensetkab',{},45000);if(!result||!result.success)throw new Error(result?.message||'Gagal mengambil daftar revisi.');rows=Array.isArray(result.data)?result.data:[];render()}catch(e){loadError=e.message||'Layanan SITARA tidak dapat dihubungi. Periksa koneksi lalu coba lagi.';render()}}
  function closeModal(){
    const modal=$('revisiModal');
    if(modal)modal.hidden=true;
    document.body.style.overflow='';
    const form=$('revisiUploadForm');
    if(form){form.reset();form.hidden=true}
    const body=$('revisiModalBody');
    if(body)body.innerHTML='';
    const title=$('revisiModalTitle');
    if(title)title.textContent='Detail Pengajuan';
    const subtitle=$('revisiModalSubtitle');
    if(subtitle)subtitle.textContent='';
    active=null;
  }
  function showNotice(message){const n=$('revisiNotice');n.textContent=message;n.hidden=false;setTimeout(()=>{n.hidden=true},7000)}
  let openingDetail = false;
  async function openDetail(id,focusNote=false){
    if(openingDetail)return;
    const r=rows.find(x=>String(x.pengajuan_id||x.id)===String(id));
    if(!r)return;
    openingDetail=true;
    const openButtons=Array.from(document.querySelectorAll('[data-open],[data-note]'));
    openButtons.forEach(b=>{b.disabled=true;b.setAttribute('aria-busy','true')});
    $('revisiModalTitle').textContent='Memuat detail pengajuan';
    $('revisiModalSubtitle').textContent=String(id);
    $('revisiModalBody').innerHTML='<div class="revisi-state revisi-detail-loading"><span class="revisi-spinner" aria-hidden="true"></span><strong>Mengambil detail pengajuan...</strong><p>Mohon tunggu, data dan dokumen sedang dimuat.</p></div>';
    $('revisiUploadForm').hidden=true;
    $('revisiModal').hidden=false;
    document.body.style.overflow='hidden';
    try{
      const result=await post('getDetailPengajuanMensetkab',{pengajuan_id:id},45000);
      if(!result||!result.success)throw new Error(result?.message||'Detail pengajuan gagal dimuat.');
      const d=result.data||{};
      active={id:String(id),list:r,detail:d};
      $('revisiModalTitle').textContent=d.judul||r.judul||'Detail Pengajuan';
      $('revisiModalSubtitle').textContent=`${id} · ${d.asal_kementerian||r.asal_kementerian||'-'}`;
      const docs=Array.isArray(d.dokumen)?d.dokumen:[];
      const history=Array.isArray(d.riwayat)?d.riwayat:[];
      const lastRevision=history.find(h=>/ketua bem meminta revisi/i.test(String(h.aksi||''))||(/revisi/i.test(String(h.aksi||''))&&/ketua bem/i.test(String(h.dari_unit||''))));
      const note=d.catatan_terakhir||lastRevision?.catatan||'Tidak ada catatan revisi yang tercatat.';
      $('revisiModalBody').innerHTML=`<div class="revisi-detail-grid"><div class="revisi-detail-field"><span>Nomor Pengajuan</span><strong>${esc(id)}</strong></div><div class="revisi-detail-field"><span>Jenis Pengajuan</span><strong>${esc(d.jenis||r.jenis||'-')}</strong></div><div class="revisi-detail-field"><span>Asal Kementerian</span><strong>${esc(d.asal_kementerian||r.asal_kementerian||'-')}</strong></div><div class="revisi-detail-field"><span>Tanggal Pengajuan</span><strong>${esc(fmtDate(d.tanggal_pengajuan||r.tanggal_pengajuan,true))}</strong></div></div><div class="revisi-detail-note"><strong>Catatan revisi</strong><br>${esc(note)}</div><h4 class="revisi-doc-heading">Dokumen saat ini (${docs.length})</h4><div class="revisi-doc-list">${docs.length?docs.map(doc=>`<div class="revisi-doc-row"><div class="revisi-doc-name"><strong>${esc(doc.jenis||doc.jenis_dokumen||'Dokumen')}</strong><small>${esc(doc.nama_file||doc.nama||'Nama file tidak tersedia')} · versi ${Number(doc.versi_dokumen||1)}</small></div>${getDownloadUrl(doc)?`<a class="revisi-doc-link" href="${esc(getDownloadUrl(doc))}" download="${esc(doc.nama_file||doc.nama||"dokumen")}" rel="noopener">Download ↓</a>`:'<span class="revisi-doc-link">Tautan tidak tersedia</span>'}</div>`).join(''):'<p class="revisi-state">Belum ada dokumen yang terhubung.</p>'}</div>`;
      $('revisiUploadFields').innerHTML=docs.map((doc,i)=>`<div class="revisi-upload-field"><label for="revisiFile${i}">${esc(doc.jenis||doc.jenis_dokumen||`Dokumen ${i+1}`)} (opsional)</label><input type="file" id="revisiFile${i}" data-doc-type="${esc(doc.jenis||doc.jenis_dokumen||`Dokumen ${i+1}`)}" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><small>File terbaru: ${esc(doc.nama_file||doc.nama||'-')}</small></div>`).join('');
      $('revisiUploadNote').value='';
      $('revisiUploadForm').hidden=false;
      icons();
      if(focusNote)$('revisiModalBody').scrollIntoView({block:'start',behavior:'smooth'});
    }catch(e){
      $('revisiModalTitle').textContent='Detail belum dapat dimuat';
      $('revisiModalBody').innerHTML=`<div class="revisi-state revisi-detail-loading"><i data-lucide="cloud-off" aria-hidden="true"></i><strong>Gagal memuat detail pengajuan</strong><p>${esc(e.message||'Layanan SITARA sedang lambat atau tidak dapat dihubungi.')}</p><button type="button" id="revisiDetailRetry">Coba lagi</button></div>`;
      $('revisiUploadForm').hidden=true;
      $('revisiDetailRetry')?.addEventListener('click',()=>openDetail(id,focusNote));
      icons();
    }finally{
      openingDetail=false;
      openButtons.forEach(b=>{b.disabled=false;b.removeAttribute('aria-busy')});
    }
  }
    function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const value=String(reader.result||'');resolve(value.substring(value.indexOf(',')+1))};reader.onerror=()=>reject(new Error('Gagal membaca file '+file.name));reader.readAsDataURL(file)})}
  async function submitRevision(event){event.preventDefault();if(!active)return;const fields=Array.from($('revisiUploadFields').querySelectorAll('input[type=file]'));const selected=fields.filter(f=>f.files&&f.files[0]);if(!selected.length){showNotice('Pilih minimal satu dokumen hasil revisi.');return}let total=0;for(const f of selected){const file=f.files[0];const ext=(file.name.split('.').pop()||'').toLowerCase();if(!['doc','docx'].includes(ext)){showNotice(`File ${file.name} tidak sesuai. Unggah hanya dokumen Word (.doc atau .docx).`);return}if(file.size<=0||file.size>10*1024*1024){showNotice(`File ${file.name} kosong atau melebihi 10 MB.`);return}total+=file.size}if(total>25*1024*1024){showNotice('Total ukuran file maksimal 25 MB.');return}const btn=$('revisiSubmit');btn.disabled=true;btn.textContent='Mengunggah...';try{const docs=[];for(const field of selected){const file=field.files[0];docs.push({name:file.name,type:file.type||'application/octet-stream',size:file.size,data:await readFile(file),jenis_dokumen:field.dataset.docType})}const result=await post('kirimRevisiMensetkab',{pengajuan_id:active.id,dokumen:docs,catatan:$('revisiUploadNote').value.trim()});if(!result||!result.success)throw new Error(result?.message||'Dokumen revisi gagal dikirim.');closeModal();showNotice(result.message||'Dokumen hasil revisi berhasil dikirim kepada Ketua BEM.');await loadRows()}catch(e){showNotice(e.message||'Terjadi kesalahan saat mengirim revisi.')}finally{btn.disabled=false;btn.innerHTML='<i data-lucide="upload-cloud"></i> Kirim hasil revisi';icons()}}
  $('revisiSearch').addEventListener('input',render);$('revisiSort').addEventListener('change',render);$('revisiUploadForm').addEventListener('submit',submitRevision);document.querySelectorAll('[data-close-revisi]').forEach(el=>el.addEventListener('click',closeModal));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('revisiModal').hidden)closeModal()});
  // The shared shell owns profile, logout, and header date; no duplicate handlers here.
  document.documentElement.dataset.mensetkabPage='revisi';
  try{loadRows()}catch(error){loadError=error&&error.message?error.message:'Gagal memulai halaman Perlu Revisi.';render()}
})();
