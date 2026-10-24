const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const eventId = params.get("kegiatan_id");
let user = null, eventData = null, formUrl = "";
try { user = JSON.parse(sessionStorage.getItem("sitaraUser") || "null"); } catch (_) {}
function esc(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtDate(v){if(!v)return "—";const s=String(v).trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"});const d=new Date(s);return isNaN(d)?s:d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"});}
function fmtTime(v){if(v==null||v==="")return "—";const s=String(v).trim(),m=s.match(/(?:T|\s)(\d{2}):(\d{2})(?::\d{2})?/);if(m&&/1899/.test(s))return m[1]+":"+m[2];const hm=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);if(hm)return hm[1].padStart(2,"0")+":"+hm[2];const d=new Date(s);return isNaN(d)?s:d.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Jakarta"});}
async function api(action,payload={}){const r=await fetch(API_URL,{method:"POST",body:JSON.stringify({action,session_token:user?.session_token,...payload})});return r.json();}
function buildUrl(token){const u=location.hostname==="sitara.bemfptugm.web.id"?new URL("https://sitara.bemfptugm.web.id/beranda/kemensetkab/presensi/peserta.html"):new URL("peserta.html",new URL("./",location.href));u.searchParams.set("token",token);return u.href;}
function detailCard(icon,label,value){return `<div class="detail"><div class="detail-icon">${icon}</div><div class="detail-copy"><span>${label}</span><strong>${value}</strong></div></div>`;}
function render(e){eventData=e;formUrl=buildUrl(e.token_qr);const qr="https://api.qrserver.com/v1/create-qr-code/?format=png&size=560x560&margin=12&data="+encodeURIComponent(formUrl);const closed=e.status!=="aktif";$("content").className="content";$("content").innerHTML=`<section><span class="eyebrow">DETAIL KEGIATAN</span><h2 class="title">${esc(e.nama_kegiatan||"Kegiatan")}</h2><p class="description">Pindai QR Code menggunakan kamera ponsel untuk membuka formulir presensi kegiatan ini.</p><div class="details">${detailCard('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 12h5M10 16h5"/></svg>','Jenis kegiatan',esc((e.jenis_kegiatan||"eksternal").toLowerCase()==="internal"?"Internal":"Eksternal"))}${detailCard('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V4h10v17M14 9h6v12M2 21h20M8 8h2M8 12h2M8 16h2M17 13h1M17 17h1"/></svg>','Kementerian / Instansi',esc(e.penyelenggara||"—"))}${detailCard('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/></svg>','Tanggal',esc(fmtDate(e.tanggal_kegiatan)))}${detailCard('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>','Lokasi',esc(e.lokasi||"—"))}${detailCard('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>','Waktu kegiatan',esc(fmtTime(e.waktu_mulai))+"–"+esc(fmtTime(e.waktu_selesai)))}${detailCard('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>','Periode check-in',esc(fmtTime(e.checkin_mulai))+"–"+esc(fmtTime(e.checkin_selesai)))}</div><div class="status ${closed?"closed":""}"><span class="dot"></span>${closed?"Presensi tidak berstatus aktif":"Kegiatan berstatus aktif"}</div></section><section class="qr-panel"><div class="qr-frame"><img id="qrImage" src="${qr}" alt="QR Code presensi" /></div><h3 class="qr-title">Pindai untuk Presensi</h3><p class="qr-help">Arahkan kamera ponsel ke QR Code. Jangan membagikan token secara terpisah.</p><div class="actions"><button class="btn" id="fullscreen">Layar penuh</button><button class="btn" id="print">Cetak</button></div><p class="token">ID kegiatan: ${esc(e.kegiatan_id||"")}</p></section>`;$("fullscreen").onclick=toggleFullscreen;$("print").onclick=()=>window.print();$("qrImage").onerror=()=>{$("qrImage").alt="QR gagal dimuat. Periksa koneksi internet.";};}
async function toggleFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch(_){alert("Mode layar penuh tidak tersedia di browser ini.");}}
function requestSessionFromOpener(){
  if(user?.session_token) return Promise.resolve(user);
  if(!window.opener) return Promise.resolve(null);
  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;window.removeEventListener("message",onMessage);resolve(value);};
    const onMessage=event=>{
      if(event.origin!==location.origin||event.data?.type!=="SITARA_QR_SESSION"||!event.data.user?.session_token)return;
      user=event.data.user;
      try{sessionStorage.setItem("sitaraUser",JSON.stringify(user));}catch(_){}
      finish(user);
    };
    window.addEventListener("message",onMessage);
    window.opener.postMessage({type:"SITARA_QR_REQUEST_SESSION"},location.origin);
    setTimeout(()=>finish(null),2500);
  });
}
async function init(){if(!user?.session_token) await requestSessionFromOpener();if(!user?.session_token){$("content").innerHTML='<strong>Sesi login tidak ditemukan.</strong>Silakan login ke SITARA terlebih dahulu, lalu buka laman QR dari menu Presensi Kegiatan.';return;}if(!eventId){$("content").innerHTML='<strong>Kegiatan tidak dipilih.</strong>Buka laman ini melalui tombol Tampilkan QR pada kegiatan yang diinginkan.';return;}try{const r=await api("presensiListKegiatan");if(!r.success)throw Error(r.message||"Daftar kegiatan tidak dapat dimuat.");const e=(r.data||[]).find(x=>String(x.kegiatan_id)===String(eventId));if(!e)throw Error("Kegiatan tidak ditemukan atau akses tidak tersedia.");render(e);}catch(e){$("content").innerHTML='<strong>QR tidak dapat ditampilkan.</strong>'+esc(e.message||"Terjadi kesalahan saat memuat kegiatan.");}}
init();