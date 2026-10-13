/* SITARA — Template Dokumen. Pengelolaan hanya untuk KEM001; daftar dapat dilihat semua kementerian. */
(function(){'use strict';
const API_URL='https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec';
const raw=sessionStorage.getItem('sitaraUser'); if(!raw){location.href='/login/index.html';return;}
let user; try{user=JSON.parse(raw)}catch(e){sessionStorage.removeItem('sitaraUser');location.href='/login/index.html';return;}
if(String(user.role||'').toLowerCase()!=='kementerian'||!user.kementerian_id){alert('Laman ini hanya tersedia untuk akun kementerian.');location.href='/login/index.html';return;}
const isAdmin=user.kementerian_id==='KEM001';
const $=id=>document.getElementById(id); const text=(id,v)=>{if($(id))$(id).textContent=v;};
text('currentDate',new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date()));
const name=user.nama_lengkap||user.nama||user.name||'Pengguna', initials=isAdmin?'KS':name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); text('profileName',name);text('profileRole',isAdmin?'Kemensetkab':'Kementerian');text('profileAvatar',initials);text('topbarAvatar',initials);
$('logoutButton')?.addEventListener('click',()=>{if(confirm('Apakah kamu yakin ingin keluar dari SITARA?')){sessionStorage.removeItem('sitaraUser');location.href='/login/index.html';}});
let templates=[]; const search=$('searchDocument'), category=$('filterCategory');
async function post(action,extra={}){const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,session_token:user.session_token,...extra})});return r.json();}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtDate(v){if(!v)return '-';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(d);}
function fmtSize(n){n=Number(n||0);return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(0)} KB`:`${(n/1048576).toFixed(1)} MB`;}
// URL dari backend kode.gs sudah dibentuk sesuai MIME type.
// Jangan mengubah URL export native Google Docs menjadi URL uc Google Drive,
// karena file Google Docs/Sheets/Slides perlu endpoint export masing-masing.
function getDirectDownloadUrl(value){
  const original=String(value||'').trim();
  if(!original)return '';
  try{
    const url=new URL(original);
    if(url.protocol!=='https:')return '';
    const host=url.hostname.toLowerCase();

    if(host==='drive.google.com'||host.endsWith('.drive.google.com')){
      // Backend sudah mengembalikan endpoint unduhan langsung.
      if(url.pathname==='/uc'&&url.searchParams.get('export')==='download'&&url.searchParams.get('id'))return original;

      // Hanya konversi URL pratinjau Drive yang masih berbentuk /file/d/ID/view.
      let id=url.searchParams.get('id');
      if(!id){
        const match=url.pathname.match(/\/file\/d\/([^/]+)/i);
        if(match)id=match[1];
      }
      if(id)return 'https://drive.google.com/uc?export=download&id='+encodeURIComponent(id);
      return original;
    }

    if(host==='docs.google.com'||host.endsWith('.docs.google.com')){
      // Pertahankan URL export yang memang disediakan backend.
      if(/\/export(?:\/|$)/i.test(url.pathname))return original;

      // Konversi hanya URL pratinjau native Google Workspace, berdasarkan jenis dokumen.
      const match=url.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/i);
      if(match){
        const type=match[1].toLowerCase(), id=match[2];
        if(type==='document')return 'https://docs.google.com/document/d/'+encodeURIComponent(id)+'/export?format=docx';
        if(type==='spreadsheets')return 'https://docs.google.com/spreadsheets/d/'+encodeURIComponent(id)+'/export?format=xlsx';
        if(type==='presentation')return 'https://docs.google.com/presentation/d/'+encodeURIComponent(id)+'/export/pptx';
      }
    }
    return original;
  }catch(_){return '';}
}
const TEMPLATE_CATEGORIES=['Proposal','Laporan Pertanggungjawaban','Surat','Sertifikat','Berita Acara / Pers','Administrasi Organisasi'];
function normalizeCategory(value){
  const raw=String(value||'').trim().toLocaleLowerCase('id-ID').replace(/\s+/g,' ');
  const aliases={
    'proposal':'proposal',
    'laporan':'laporan pertanggungjawaban','laporan pertanggungjawaban':'laporan pertanggungjawaban','lpj':'laporan pertanggungjawaban',
    'surat':'surat','sertifikat':'sertifikat',
    'berita acara':'berita acara / pers','pers':'berita acara / pers','berita acara / pers':'berita acara / pers',
    'administrasi organisasi':'administrasi organisasi','administrasi':'administrasi organisasi',
    'lainnya':'lainnya'
  };
  return aliases[raw]||raw||'lainnya';
}
function render(){const q=(search?.value||'').trim().toLowerCase(), cat=category?.value||'all';const filtered=templates.filter(t=>([t.title,t.category,t.description].join(' ').toLowerCase().includes(q))&&(cat==='all'||normalizeCategory(t.category)===cat));const grid=$('templateCards');grid.replaceChildren();filtered.forEach(t=>{const card=document.createElement('article');card.className='template-card';const icon=document.createElement('div');icon.className='template-file-icon';icon.innerHTML='<i data-lucide="file-text"></i>';const body=document.createElement('div');body.className='template-card-body';const h=document.createElement('h3');h.textContent=t.title||'Template tanpa nama';const p=document.createElement('p');p.textContent=t.description||'Template dokumen resmi SITARA.';const meta=document.createElement('div');meta.className='template-meta';meta.innerHTML=`<span>${esc(t.category||'Lainnya')}</span><span>${esc(fmtDate(t.updatedAt||t.date))}</span>${t.size?`<span>${esc(fmtSize(t.size))}</span>`:''}`;body.append(h,p,meta);const actions=document.createElement('div');actions.className='template-actions';if(t.downloadUrl){const directUrl=getDirectDownloadUrl(t.downloadUrl);if(directUrl){const a=document.createElement('a');a.className='download-btn';a.href=directUrl;a.rel='noopener';a.innerHTML='<i data-lucide="download"></i> Download';actions.appendChild(a);}else{const s=document.createElement('span');s.className='unavailable-label';s.textContent='Tautan unduhan tidak valid';actions.appendChild(s);}}else{const s=document.createElement('span');s.className='unavailable-label';s.textContent='File belum tersedia';actions.appendChild(s);}if(isAdmin){const edit=document.createElement('button');edit.className='template-action-secondary';edit.textContent='Edit';edit.onclick=()=>openEdit(t);actions.appendChild(edit);const del=document.createElement('button');del.className='template-action-danger';del.textContent='Hapus';del.setAttribute('aria-label',`Hapus template ${t.title||''}`);del.onclick=()=>deleteTemplate(t);actions.appendChild(del);}card.append(icon,body,actions);grid.appendChild(card);});$('emptyState').hidden=filtered.length>0;$('templateCards').hidden=!filtered.length;text('resultCount',`Menampilkan ${filtered.length} template`);text('totalFinal',String(templates.length));text('totalTersedia',String(templates.filter(t=>t.downloadUrl).length));text('totalKategori',String(new Set(templates.map(t=>String(t.category||'Lainnya').toLowerCase())).size));if(window.lucide)window.lucide.createIcons();}
async function load(){const grid=$('templateCards');if(!grid)return;grid.hidden=false;$('emptyState').hidden=true;grid.innerHTML='<div class="template-loading" role="status" aria-live="polite"><span class="template-spinner" aria-hidden="true"></span><span>Memuat template dokumen...</span></div>';try{const result=await post('getDocumentTemplates');if(!result.success)throw new Error(result.message||'Gagal memuat template.');templates=Array.isArray(result.data)?result.data:[];render();}catch(e){grid.hidden=false;$('emptyState').hidden=true;grid.innerHTML=`<div class="template-error" role="alert"><span>${esc(e.message||'Gagal memuat template.')}</span><button id="retryTemplates" class="template-action-secondary">Coba lagi</button></div>`;$('retryTemplates')?.addEventListener('click',load);}}
function openEdit(t){
  const name=prompt('Nama template:',t.title);if(name===null)return;
  const current=normalizeCategory(t.category);
  const options=TEMPLATE_CATEGORIES.map((c,i)=>`${i+1}. ${c}`).join('\n');
  const selected=TEMPLATE_CATEGORIES.findIndex(c=>normalizeCategory(c)===current);
  const defaultChoice=selected>=0?selected+1:1;
  const answer=prompt(`Pilih kategori dengan memasukkan nomor:\n${options}`,String(defaultChoice));
  if(answer===null)return;
  const index=Number(answer)-1;
  if(!Number.isInteger(index)||index<0||index>=TEMPLATE_CATEGORIES.length){alert('Pilihan kategori tidak valid.');return;}
  const cat=TEMPLATE_CATEGORIES[index];
  const desc=prompt('Deskripsi template:',t.description||'');if(desc===null)return;
  post('updateDocumentTemplate',{template_id:t.id,nama_template:name,kategori:cat,deskripsi:desc}).then(r=>{if(!r.success)throw new Error(r.message);alert(r.message);load();}).catch(e=>alert(e.message));
}
async function deleteTemplate(t){
  const ok = confirm(`Hapus template "${t.title}"?\n\nTemplate akan dihapus dari daftar SITARA dan spreadsheet, sedangkan file terkait dipindahkan ke Sampah Google Drive. Lanjutkan?`);
  if(!ok)return;
  try{
    const result = await post('deleteDocumentTemplate',{template_id:t.id});
    if(!result.success)throw new Error(result.message||'Gagal menghapus template.');
    alert(result.message||'Template berhasil dihapus.');
    await load();
  }catch(e){
    alert(e.message||'Terjadi kesalahan saat menghapus template.');
  }
}
function openTemplateModal(){const modal=$('templateUploadPanel');if(!modal)return;modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.classList.add('template-modal-open');setTimeout(()=>$('templateName')?.focus(),40);if(window.lucide)window.lucide.createIcons();}
function closeTemplateModal(){const modal=$('templateUploadPanel');if(!modal)return;modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('template-modal-open');}
$('addTemplateButton')?.addEventListener('click',openTemplateModal);
$('closeTemplateModal')?.addEventListener('click',closeTemplateModal);
$('templateUploadPanel')?.addEventListener('click',e=>{if(e.target.closest('[data-close-template-modal]'))closeTemplateModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('templateUploadPanel')?.classList.contains('is-open'))closeTemplateModal();});
$('cancelTemplateButton')?.addEventListener('click',()=>{$('templateUploadForm').reset();closeTemplateModal();});
$('templateUploadForm')?.addEventListener('submit',async e=>{e.preventDefault();const file=$('templateFile').files[0];if(!file){alert('Pilih file template terlebih dahulu.');return;}if(file.size>8*1024*1024){alert('Ukuran file maksimal 8 MB.');return;}const btn=$('saveTemplateButton');btn.disabled=true;btn.textContent='Mengunggah...';try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=reject;reader.readAsDataURL(file);});const result=await post('createDocumentTemplate',{nama_template:$('templateName').value,kategori:$('templateCategory').value,deskripsi:$('templateDescription').value,nama_file:file.name,mime_type:file.type||'application/octet-stream',file_base64:base64});if(!result.success)throw new Error(result.message||'Gagal menyimpan template.');alert(result.message);$('templateUploadForm').reset();closeTemplateModal();await load();}catch(err){alert(err.message||'Terjadi kesalahan saat mengunggah.');}finally{btn.disabled=false;btn.textContent='Simpan Template';}});
search?.addEventListener('input',render);category?.addEventListener('change',render);if(!isAdmin){$('adminTemplateTools')?.remove();$('templateUploadPanel')?.remove();}load();
})();
