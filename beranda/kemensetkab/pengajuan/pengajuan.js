// ==========================================
// SITARA
// KEMENTERIAN SEKRETARIAT KABINET
// PENGAJUAN MASUK JAVASCRIPT
// ==========================================


// ==========================================
// API CONFIG
// ==========================================

const API_URL =
"https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";



// ==========================================
// CEK SESSION
// ==========================================


const sessionData =
    sessionStorage.getItem(
        "sitaraUser"
    );


if(!sessionData){


    window.location.href =
        "../../../login/index.html";


}
else{


    try{


        const user =
            JSON.parse(sessionData);



        if(
            user.role !== "kementerian" ||
            user.kementerian_id !== "KEM001"
        ){


            alert(
                "Anda tidak memiliki akses halaman ini."
            );


            sessionStorage.removeItem(
                "sitaraUser"
            );


            window.location.href =
                "../../../login/index.html";


        }
        else{


            initializePengajuan(user);


        }



    }
    catch(error){


        console.error(
            "Session error:",
            error
        );


        sessionStorage.removeItem(
            "sitaraUser"
        );


        window.location.href =
            "../../../login/index.html";


    }


}



// ==========================================
// INISIALISASI
// ==========================================


function initializePengajuan(user){


    displayCurrentDate();


    displayUserProfile(
        user
    );


    initializeLogout();


    loadPengajuan(
        user
    );


}





// ==========================================
// LOAD DATA PENGAJUAN
// ==========================================


async function loadPengajuan(user){


    try{


        const response =
            await fetch(
                API_URL,
                {

                    method:"POST",

                    body:JSON.stringify({

                        action:
                        "getPengajuanMasukKemensetkab",


                        session_token:
                        user.session_token


                    })

                }
            );



        const result =
            await response.json();



        console.log(
            "Data Pengajuan:",
            result
        );



        if(!result.success){


            console.error(
                result.message
            );


            return;


        }



        renderPengajuanCard(
            result.data
        );



    }
    catch(error){


        console.error(
            "Load pengajuan error:",
            error
        );


    }


}

// ==========================================
// RENDER SUBMISSION CARD
// ==========================================


function renderPengajuanCard(data){


    const container =
        document.getElementById(
            "pengajuanContainer"
        );



    if(!container)
        return;



    if(
        !data ||
        data.length === 0
    ){


        container.innerHTML = `

            <div class="empty-state">

                Belum ada pengajuan masuk.

            </div>

        `;


        return;


    }



    container.innerHTML = "";



    data.forEach(
        function(item){



            const card = `


            <div class="submission-card">


                <div class="submission-header">


                    <div>


                        <div class="submission-number">

                            ${item.nomor_pengajuan || "-"}

                        </div>



                        <h3>

                            ${item.perihal || "-"}

                        </h3>



                        <p>

                            ${item.asal_kementerian || "-"}

                        </p>


                    </div>




                    <span class="submission-type">

                        ${item.jenis || "-"}

                    </span>


                </div>




                <div class="submission-footer">


                    <div class="submission-meta">


                        <span>

                            📅 
                            ${formatTanggal(item.tanggal_pengajuan)}

                        </span>



                        <span class="status">

                            ${item.status_label || item.status || "-"}

                        </span>


                    </div>

                    <button
                        class="detail-button"
                        onclick="lihatDetail('${item.nomor_pengajuan}')"
                    >
                        Lihat Detail →
                    </button>

                </div>


            </div>


            `;



            container.innerHTML += card;



        }

    );


}

// ==========================================
// LIHAT DETAIL PENGAJUAN
// ==========================================

function lihatDetail(id){

    window.location.href =
        "detail/index.html?id=" + id;

}

// ==========================================
// FORMAT TANGGAL
// ==========================================


function formatTanggal(date){


    if(!date)
        return "-";


    const tanggal =
        new Date(date);



    return tanggal.toLocaleDateString(
        "id-ID",
        {

            day:"numeric",

            month:"long",

            year:"numeric"

        }
    );


}

// ==========================================
// CURRENT DATE
// ==========================================


function displayCurrentDate(){


    const element =
        document.getElementById(
            "currentDate"
        );



    if(!element)
        return;



    element.textContent =
        new Date()
        .toLocaleDateString(
            "id-ID",
            {

                weekday:"long",

                day:"numeric",

                month:"long",

                year:"numeric"

            }
        );


}





// ==========================================
// USER PROFILE
// ==========================================


function displayUserProfile(user){


    const name =
        user.nama_lengkap ||
        user.nama ||
        "Pengguna";



    const initial =
        name
        .substring(0,2)
        .toUpperCase();



    const profileName =
        document.getElementById(
            "profileName"
        );


    const profileRole =
        document.getElementById(
            "profileRole"
        );


    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );


    const topbarAvatar =
        document.getElementById(
            "topbarAvatar"
        );



    if(profileName)
        profileName.textContent =
            name;



    if(profileRole)
        profileRole.textContent =
            "Kementerian";



    if(profileAvatar)
        profileAvatar.textContent =
            initial;



    if(topbarAvatar)
        topbarAvatar.textContent =
            initial;


}





// ==========================================
// LOGOUT
// ==========================================


function initializeLogout(){


    const button =
        document.getElementById(
            "logoutButton"
        );



    if(!button)
        return;



    button.addEventListener(
        "click",
        function(){


            const confirmLogout =
                confirm(
                    "Apakah kamu yakin ingin keluar dari SITARA?"
                );



            if(!confirmLogout)
                return;



            sessionStorage.removeItem(
                "sitaraUser"
            );



            window.location.href =
                "../../../login/index.html";


        }
    );


}