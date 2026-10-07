const API_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const LOGIN_URL="/login/index.html";

const PAGE_SIZE=20;

let user=null;
let rows=[];
let currentPage=1;

try{
  user=JSON.parse(sessionStorage.getItem("sitaraUser")||"null");
}catch(e){}

if(!user || String(user.role||"").toLowerCase()!=="kementerian"){
  sessionStorage.removeItem("sitaraUser");
  window.location.href=LOGIN_URL;
}else{
  initialize();
}

function initialize(){
  const name=user.nama_lengkap||user.nama||"Kementerian Hubungan Kerja Sama";

  document.getElementById("profileName").textContent=name;
  document.getElementById("profileRole").textContent="Kementerian";
  document.getElementById("profileAvatar").textContent="KH";
  document.getElementById("topbarAvatar").textContent="KH";

  document.getElementById("currentDate").textContent=
    new Date().toLocaleDateString("id-ID",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });

  document.getElementById("logoutButton").addEventListener("click",logout);

  document.getElementById("historySearch").addEventListener("input",function(){
    currentPage=1;
    render();
  });

  document.getElementById("historyMonthFilter").addEventListener("change",function(){
    currentPage=1;
    render();
  });

  load();
}

function logout(){
  if(!confirm("Apakah Anda yakin ingin keluar dari SITARA?"))return;
  sessionStorage.removeItem("sitaraUser");
  window.location.href=LOGIN_URL;
}

async function load(){
  const box=document.getElementById("historyList");

  try{
    const response=await fetch(API_URL,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({
        action:"getRiwayatPengajuan",
        session_token:user.session_token
      })
    });

    const result=await response.json();

    if(!result.success){
      throw new Error(result.message||"Gagal memuat riwayat.");
    }

    rows=buildLatestSubmissionRows(
      Array.isArray(result.data)?result.data:[]
    );

    populateMonthFilter();
    currentPage=1;
    render();

  }catch(e){
    box.innerHTML=
      '<div class="history-error">'+
        '<strong>Gagal memuat riwayat</strong>'+
        '<span>'+esc(e.message)+'</span>'+
      '</div>';

    document.getElementById("historyFooter").style.display="none";
  }
}

/*
 * API mengembalikan seluruh aktivitas pada setiap pengajuan.
 * Tampilan ini hanya membutuhkan 1 baris per pengajuan:
 * aktivitas + status + waktu yang paling baru.
 */
function buildLatestSubmissionRows(source){
  const map=new Map();

  source.forEach(function(item){
    const id=String(item.pengajuan_id||"").trim();
    if(!id)return;

    const existing=map.get(id);

    if(!existing){
      map.set(id,item);
      return;
    }

    const oldTime=parseTime(existing.waktu);
    const newTime=parseTime(item.waktu);

    if(newTime>oldTime){
      map.set(id,item);
    }
  });

  return Array.from(map.values()).sort(function(a,b){
    return parseTime(b.waktu)-parseTime(a.waktu);
  });
}

function getFilteredRows(){
  const q=document.getElementById("historySearch").value.trim().toLowerCase();
  const monthValue=document.getElementById("historyMonthFilter").value;

  return rows.filter(function(x){
    const text=[
      x.pengajuan_id,
      x.perihal,
      x.jenis,
      x.aksi,
      x.status_riwayat,
      x.asal_kementerian
    ].join(" ").toLowerCase();

    const matchesSearch=!q || text.includes(q);
    const matchesMonth=!monthValue || getMonthKey(x.waktu)===monthValue;

    return matchesSearch && matchesMonth;
  });
}

function populateMonthFilter(){
  const select=document.getElementById("historyMonthFilter");
  if(!select)return;

  const previous=select.value;
  const keys={};

  rows.forEach(function(x){
    const key=getMonthKey(x.waktu);
    if(key)keys[key]=true;
  });

  const sortedKeys=Object.keys(keys).sort(function(a,b){
    return b.localeCompare(a);
  });

  select.innerHTML='<option value="">Semua Bulan</option>'+
    sortedKeys.map(function(key){
      return '<option value="'+esc(key)+'">'+
        esc(formatMonthYear(key))+
      '</option>';
    }).join("");

  if(previous && keys[previous]){
    select.value=previous;
  }else{
    // Mengikuti desain referensi: default ke bulan terbaru yang tersedia.
    select.value=sortedKeys.length ? sortedKeys[0] : "";
  }

  if(window.lucide)lucide.createIcons();
}

function getMonthKey(value){
  const d=parseDate(value);
  if(!d)return"";

  const year=d.getFullYear();
  const month=String(d.getMonth()+1).padStart(2,"0");
  return year+"-"+month;
}

function formatMonthYear(key){
  const parts=String(key).split("-");
  if(parts.length!==2)return key;

  const year=Number(parts[0]);
  const month=Number(parts[1]);
  if(!year || !month)return key;

  const monthNames=[
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];

  return monthNames[month-1]+" "+year;
}

function render(){
  const filtered=getFilteredRows();
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));

  if(currentPage>totalPages)currentPage=totalPages;

  const start=(currentPage-1)*PAGE_SIZE;
  const pageRows=filtered.slice(start,start+PAGE_SIZE);

  renderTable(pageRows,start);
  renderFooter(filtered.length,totalPages);
}

function renderTable(items,startIndex){
  const box=document.getElementById("historyList");

  if(!items.length){
    box.innerHTML=
      '<div class="history-empty">'+
        '<strong>Tidak ada riwayat pengajuan.</strong>'+
        '<span>Coba gunakan nomor agenda atau judul kegiatan yang berbeda.</span>'+
      '</div>';

    return;
  }

  box.innerHTML=
    '<div class="history-table-scroll">'+
      '<table class="history-table">'+
        '<colgroup>'+
          '<col class="col-no">'+
          '<col class="col-agenda">'+
          '<col class="col-title">'+
          '<col class="col-type">'+
          '<col class="col-activity">'+
          '<col class="col-time">'+
          '<col class="col-status">'+
        '</colgroup>'+
        '<thead>'+
          '<tr>'+
            '<th class="col-no">No.</th>'+
            '<th>Nomor Agenda</th>'+
            '<th>Judul Kegiatan</th>'+
            '<th>Jenis Pengajuan</th>'+
            '<th>Aktivitas Terakhir</th>'+
            '<th>Waktu</th>'+
            '<th>Status</th>'+
          '</tr>'+
        '</thead>'+
        '<tbody>'+
          items.map(function(x,index){
            return renderRow(x,startIndex+index+1);
          }).join("")+
        '</tbody>'+
      '</table>'+
    '</div>';
}

function renderRow(x,no){
  const status=String(x.status_riwayat||x.status||"").trim();

  return '<tr>'+
    '<td class="col-no"><span class="history-no">'+padNumber(no)+'</span></td>'+
    '<td><span class="history-agenda">'+esc(x.pengajuan_id||"-")+'</span></td>'+
    '<td><div class="history-title">'+esc(x.perihal||"Tanpa judul")+'</div></td>'+
    '<td><span class="history-type">'+esc(prettyJenis(x.jenis))+'</span></td>'+
    '<td><div class="history-activity">'+esc(activityLabel(x))+'</div></td>'+
    '<td>'+renderTime(x.waktu)+'</td>'+
    '<td><span class="history-status '+statusClass(status)+'">'+esc(statusLabel(status))+'</span></td>'+
  '</tr>';
}

function activityLabel(x){
  const action=String(x.aksi||"").trim();

  if(action){
    return action
      .replace(/Kemensetkab/g,"Kementerian Sekretariat Kabinet")
      .replace(/Mensetkab/g,"Menteri Sekretariat Kabinet");
  }

  const status=String(x.status_riwayat||x.status||"").trim();

  if(status){
    return statusLabel(status);
  }

  return "Belum ada aktivitas";
}

function prettyJenis(value){
  const s=String(value||"").trim();
  if(!s)return "-";

  return s
    .replace(/_/g," ")
    .replace(/\b\w/g,function(c){return c.toUpperCase();});
}

function renderTime(value){
  const d=parseDate(value);

  if(!d){
    return '<div class="history-time"><span class="time-date">-</span></div>';
  }

  return '<div class="history-time">'+
    '<span class="time-date">'+
      esc(d.toLocaleDateString("id-ID",{
        day:"numeric",
        month:"long",
        year:"numeric"
      }))+
    '</span>'+
    '<span class="time-hour">pukul '+
      esc(d.toLocaleTimeString("id-ID",{
        hour:"2-digit",
        minute:"2-digit"
      }))+
    '</span>'+
  '</div>';
}

function renderFooter(total,totalPages){
  const footer=document.getElementById("historyFooter");

  if(!total){
    footer.style.display="none";
    return;
  }

  footer.style.display="flex";

  const from=(currentPage-1)*PAGE_SIZE+1;
  const to=Math.min(currentPage*PAGE_SIZE,total);

  document.getElementById("historyCount").textContent=
    "Menampilkan "+from+"–"+to+" dari "+total+" pengajuan";

  const pagination=document.getElementById("historyPagination");

  let html=
    '<button class="history-page-btn" type="button" data-page="'+(currentPage-1)+'" aria-label="Halaman sebelumnya" '+(currentPage===1?"disabled":"")+'>'+
      '<i data-lucide="chevron-left"></i>'+
    '</button>';

  const pages=pageWindow(totalPages,currentPage);

  pages.forEach(function(page){
    if(page==="…"){
      html+='<span class="history-page-btn" style="border:none;cursor:default">…</span>';
      return;
    }

    html+=
      '<button class="history-page-btn '+(page===currentPage?"active":"")+'" type="button" data-page="'+page+'">'+
        page+
      '</button>';
  });

  html+=
    '<button class="history-page-btn" type="button" data-page="'+(currentPage+1)+'" aria-label="Halaman berikutnya" '+(currentPage===totalPages?"disabled":"")+'>'+
      '<i data-lucide="chevron-right"></i>'+
    '</button>';

  pagination.innerHTML=html;

  pagination.querySelectorAll("[data-page]").forEach(function(button){
    button.addEventListener("click",function(){
      if(button.disabled)return;

      const page=Number(button.dataset.page);

      if(!Number.isFinite(page)||page<1||page>totalPages)return;

      currentPage=page;
      render();

      const card=document.querySelector(".history-table-card");
      if(card)card.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });

  if(window.lucide)lucide.createIcons();
}

function pageWindow(totalPages,page){
  if(totalPages<=5){
    return Array.from({length:totalPages},function(_,i){return i+1;});
  }

  if(page<=3){
    return [1,2,3,"…",totalPages];
  }

  if(page>=totalPages-2){
    return [1,"…",totalPages-2,totalPages-1,totalPages];
  }

  return [1,"…",page,"…",totalPages];
}

function padNumber(n){
  return String(n).padStart(2,"0");
}

function parseDate(value){
  if(!value)return null;

  const d=new Date(value);

  if(Number.isNaN(d.getTime()))return null;

  return d;
}

function parseTime(value){
  const d=parseDate(value);
  return d?d.getTime():0;
}

function statusLabel(value){
  const s=String(value||"").trim().toLowerCase().replace(/\s+/g,"_");

  const map={
    diajukan:"Diajukan",
    menunggu_verifikasi:"Menunggu Verifikasi",
    perlu_verifikasi:"Perlu Verifikasi",
    revisi:"Perlu Revisi",
    menunggu_persetujuan_mensetkab:"Menunggu Persetujuan Mensetkab",
    menunggu_persetujuan_ketua:"Menunggu Persetujuan Ketua",
    menunggu_persetujuan:"Menunggu Persetujuan",
    dalam_proses:"Diproses",
    diproses:"Diproses",
    menunggu_eksternal:"Menunggu Pihak Eksternal",
    menunggu_hasil_eksternal:"Menunggu Hasil Eksternal",
    diajukan_ke_dpm:"Diajukan ke DPM",
    disetujui_dpm:"Disetujui DPM",
    diajukan_ke_fakultas:"Diajukan ke Fakultas",
    disetujui_fakultas:"Disetujui Fakultas",
    selesai:"Selesai",
    disetujui:"Disetujui",
    ditolak:"Ditolak"
  };

  return map[s]||value||"-";
}

function statusClass(value){
  const s=String(value||"").toLowerCase();

  if(s.includes("revisi"))return"status-revisi";
  if(s.includes("selesai")||s.includes("disetujui"))return"status-success";
  if(s.includes("tolak"))return"status-danger";
  if(s.includes("persetujuan")||s.includes("proses")||s.includes("diproses"))return"status-process";
  if(s.includes("dpm")||s.includes("fakultas")||s.includes("eksternal"))return"status-external";

  return"status-neutral";
}

function esc(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
