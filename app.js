const tanggalInput = document.querySelector("#tanggal");
const tilawahInput = document.querySelector("#tilawah");
const tombolSimpan = document.querySelector("#simpan");
const pesan = document.querySelector("#pesan");
const daftarIbadahWadah = document.querySelector("#daftar-ibadah");
const tilawahCard = document.querySelector("#tilawah-card");
const formIbadah = document.querySelector("#form-ibadah");
const namaIbadahInput = document.querySelector("#nama-ibadah");
const kelompokIbadahInput = document.querySelector("#kelompok-ibadah");
const daftarIbadahKelola = document.querySelector("#daftar-ibadah-kelola");
const tombolSimpanIbadah = document.querySelector("#simpan-ibadah");
const tombolBatalEditIbadah = document.querySelector("#batal-edit-ibadah");
const pesanKelolaIbadah = document.querySelector("#pesan-kelola-ibadah");
const kunciDaftarIbadah = "jurnal-ibadah-daftar-kegiatan";
const urutanKelompok = [
  "Salat dan sunnah",
  "Salat Rawatib",
  "Al-Qur’an dan dzikir",
  "Amal kebaikan",
];
const daftarIbadahBawaan = [
  { id: "salat", nama: "Salat 5 waktu", kelompok: "Salat dan sunnah" },
  { id: "tahajud", nama: "Tahajud 1/3 malam", kelompok: "Salat dan sunnah" },
  { id: "witir", nama: "Witir setelah Isya", kelompok: "Salat dan sunnah" },
  { id: "dhuha", nama: "Dhuha", kelompok: "Salat dan sunnah" },
  { id: "shaum", nama: "Shaum", kelompok: "Salat dan sunnah" },
  { id: "rawatib_subuh", nama: "Qabla Subuh", kelompok: "Salat Rawatib" },
  { id: "rawatib_dzuhur", nama: "Qabla Dzuhur", kelompok: "Salat Rawatib" },
  { id: "rawatib_bada_dzuhur", nama: "Ba’da Dzuhur", kelompok: "Salat Rawatib" },
  { id: "rawatib_maghrib", nama: "Ba’da Maghrib", kelompok: "Salat Rawatib" },
  { id: "rawatib_isya", nama: "Ba’da Isya", kelompok: "Salat Rawatib" },
  { id: "dzikir_pagi", nama: "Dzikir pagi", kelompok: "Al-Qur’an dan dzikir" },
  { id: "dzikir_petang", nama: "Dzikir petang", kelompok: "Al-Qur’an dan dzikir" },
  { id: "ratib", nama: "Ratib", kelompok: "Al-Qur’an dan dzikir" },
  { id: "almulk", nama: "Al-Mulk setelah Isya / sebelum tidur", kelompok: "Al-Qur’an dan dzikir" },
  { id: "murajaah", nama: "Muraja’ah / Ziyadah", kelompok: "Al-Qur’an dan dzikir" },
  { id: "sedekah", nama: "Sedekah / Infak", kelompok: "Amal kebaikan" },
];
let daftarIbadah;
try {
  const daftarTersimpan = localStorage.getItem(kunciDaftarIbadah);
  daftarIbadah = daftarTersimpan === null
    ? daftarIbadahBawaan.map((item) => ({ ...item }))
    : JSON.parse(daftarTersimpan);
  if (!Array.isArray(daftarIbadah)) throw new Error("Format daftar ibadah tidak valid");
} catch {
  daftarIbadah = daftarIbadahBawaan.map((item) => ({ ...item }));
}
let idSedangDiedit = null;
let cloudMode = false;
let cloudContext = null;
let cloudActivities = [];
let cloudRangeRecords = new Map();
let idTilawahCloud = null;
localStorage.removeItem("jurnal-ibadah-waktu-pengingat");

function ambilKotakCentang() {
  return daftarIbadahWadah.querySelectorAll('input[type="checkbox"]');
}

function simpanDaftarIbadah() {
  localStorage.setItem(kunciDaftarIbadah, JSON.stringify(daftarIbadah));
}

function buatIDIbadah() {
  return `khusus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function renderDaftarIbadah() {
  daftarIbadahWadah.replaceChildren();

  urutanKelompok.forEach((kelompok) => {
    const anggota = daftarIbadah.filter((item) => item.kelompok === kelompok);
    if (!anggota.length) return;

    const bagian = document.createElement("section");
    bagian.className = "jurnal-kelompok";
    const header = document.createElement("div");
    header.className = "jurnal-kelompok-header";
    const judul = document.createElement("h3");
    judul.textContent = kelompok;
    header.append(judul);
    bagian.append(header);

    if (kelompok === "Al-Qur’an dan dzikir") bagian.append(tilawahCard);

    const daftar = document.createElement("div");
    daftar.className = "jurnal-grid";

    anggota.forEach((item) => {
      const label = document.createElement("label");
      label.className = "ibadah-item";
      const kotak = document.createElement("input");
      kotak.type = "checkbox";
      kotak.name = item.id;
      const teks = document.createElement("span");
      teks.textContent = item.nama;
      label.append(kotak, teks);
      daftar.append(label);
    });

    bagian.append(daftar);
    daftarIbadahWadah.append(bagian);
  });

  daftarIbadah.forEach((item) => {
    if (urutanKelompok.includes(item.kelompok)) return;
    item.kelompok = urutanKelompok[0];
  });
}

function renderDaftarIbadahKelola() {
  daftarIbadahKelola.replaceChildren();

  daftarIbadah.forEach((item) => {
    const baris = document.createElement("li");
    const info = document.createElement("div");
    info.className = "daftar-ibadah-info";
    const nama = document.createElement("strong");
    nama.textContent = item.nama;
    const kelompok = document.createElement("span");
    kelompok.textContent = item.kelompok;
    info.append(nama, kelompok);

    const aksi = document.createElement("div");
    aksi.className = "daftar-ibadah-aksi";
    const tombolEdit = document.createElement("button");
    tombolEdit.type = "button";
    tombolEdit.textContent = "Edit";
    tombolEdit.addEventListener("click", () => {
      idSedangDiedit = item.id;
      namaIbadahInput.value = item.nama;
      kelompokIbadahInput.value = item.kelompok;
      tombolSimpanIbadah.textContent = "Simpan perubahan";
      tombolBatalEditIbadah.hidden = false;
      pesanKelolaIbadah.textContent = `Mengubah: ${item.nama}`;
      namaIbadahInput.focus();
    });

    const tombolHapus = document.createElement("button");
    tombolHapus.type = "button";
    tombolHapus.textContent = "Hapus";
    tombolHapus.addEventListener("click", () => {
      const setuju = window.confirm(`Hapus “${item.nama}” dari daftar dan dari catatan tersimpan di perangkat ini?`);
      if (!setuju) return;

      Object.keys(localStorage).forEach((kunci) => {
        if (!kunci.startsWith("jurnal-ibadah-") || kunci === kunciDaftarIbadah) return;
        try {
          const jurnal = JSON.parse(localStorage.getItem(kunci));
          if (Object.prototype.hasOwnProperty.call(jurnal || {}, item.id)) {
            delete jurnal[item.id];
            localStorage.setItem(kunci, JSON.stringify(jurnal));
          }
        } catch {
          // Lewati nilai lokal yang bukan catatan jurnal berbentuk JSON.
        }
      });

      daftarIbadah = daftarIbadah.filter((kegiatan) => kegiatan.id !== item.id);
      simpanDaftarIbadah();
      renderDaftarIbadah();
      renderDaftarIbadahKelola();
      muatJurnal();
      tandaiRekapPerluDibuatUlang();
      if (idSedangDiedit === item.id) resetFormIbadah();
      pesanKelolaIbadah.textContent = `“${item.nama}” telah dihapus.`;
    });

    aksi.append(tombolEdit, tombolHapus);
    baris.append(info, aksi);
    daftarIbadahKelola.append(baris);
  });
}

function resetFormIbadah() {
  idSedangDiedit = null;
  formIbadah.reset();
  tombolSimpanIbadah.textContent = "Tambah ibadah";
  tombolBatalEditIbadah.hidden = true;
}

formIbadah.addEventListener("submit", (event) => {
  event.preventDefault();
  const nama = namaIbadahInput.value.trim();
  const kelompok = kelompokIbadahInput.value;
  if (!nama) return;

  const sudahAda = daftarIbadah.some((item) =>
    item.id !== idSedangDiedit && item.nama.toLocaleLowerCase() === nama.toLocaleLowerCase()
  );
  if (sudahAda) {
    pesanKelolaIbadah.textContent = "Nama ibadah itu sudah ada di daftar.";
    return;
  }

  if (idSedangDiedit) {
    const kegiatan = daftarIbadah.find((item) => item.id === idSedangDiedit);
    if (kegiatan) Object.assign(kegiatan, { nama, kelompok });
    pesanKelolaIbadah.textContent = "Perubahan ibadah disimpan.";
  } else {
    daftarIbadah.push({ id: buatIDIbadah(), nama, kelompok });
    pesanKelolaIbadah.textContent = "Ibadah baru ditambahkan.";
  }

  simpanDaftarIbadah();
  renderDaftarIbadah();
  renderDaftarIbadahKelola();
  resetFormIbadah();
  muatJurnal();
  tandaiRekapPerluDibuatUlang();
});

tombolBatalEditIbadah.addEventListener("click", resetFormIbadah);

renderDaftarIbadah();
renderDaftarIbadahKelola();

function tanggalHariIni() {
  const sekarang = new Date();
  const waktuLokal = new Date(
    sekarang.getTime() - sekarang.getTimezoneOffset() * 60000
  );

  return waktuLokal.toISOString().slice(0, 10);
}

function kunciUntukTanggal(tanggal) {
  return `jurnal-ibadah-${tanggal}`;
}

async function muatJurnal() {
  const tanggal = tanggalInput.value;
  if (cloudMode && cloudContext) {
    try {
      const jurnalCloud = await window.jurnalCloud.loadDay(
        cloudContext.membership.id,
        cloudContext.membership.community_id,
        tanggal
      );
      cloudRangeRecords.set(tanggal, jurnalCloud);
      ambilKotakCentang().forEach((kotak) => {
        kotak.checked = Boolean(jurnalCloud[kotak.name]);
      });
      tilawahInput.value = jurnalCloud[idTilawahCloud] ?? 0;
      pesan.textContent = Object.keys(jurnalCloud).length
        ? "Jurnal akun ini dimuat dari database."
        : "Belum ada jurnal tersimpan untuk tanggal ini.";
    } catch (error) {
      pesan.textContent = `Jurnal gagal dimuat: ${error.message}`;
    }
    return;
  }

  const tersimpan = localStorage.getItem(kunciUntukTanggal(tanggal));
  const jurnal = tersimpan ? JSON.parse(tersimpan) : {};

  ambilKotakCentang().forEach((kotak) => {
    kotak.checked = Boolean(jurnal[kotak.name]);
  });

  tilawahInput.value = jurnal.tilawah ?? 0;
  pesan.textContent = tersimpan ? "Jurnal tanggal ini dimuat." : "";
}

tanggalInput.value = tanggalHariIni();
muatJurnal();

tanggalInput.addEventListener("change", muatJurnal);

tombolSimpan.addEventListener("click", async () => {
  const tanggal = tanggalInput.value;

  if (!tanggal) {
    pesan.textContent = "Pilih tanggal jurnal terlebih dahulu.";
    return;
  }

  const jurnal = {
    tilawah: Number(tilawahInput.value) || 0,
  };

  ambilKotakCentang().forEach((kotak) => {
    jurnal[kotak.name] = kotak.checked;
  });

  if (cloudMode && cloudContext) {
    tombolSimpan.disabled = true;
    pesan.textContent = "Menyimpan jurnal ke akun…";
    try {
      const nilaiCloud = { ...jurnal };
      nilaiCloud[idTilawahCloud] = nilaiCloud.tilawah;
      delete nilaiCloud.tilawah;
      await window.jurnalCloud.saveDay(
        cloudContext.membership.id,
        cloudContext.membership.community_id,
        tanggal,
        cloudActivities,
        nilaiCloud
      );
      cloudRangeRecords.set(tanggal, nilaiCloud);
      pesan.textContent = "Jurnal berhasil disimpan ke akun.";
    } catch (error) {
      pesan.textContent = `Jurnal gagal disimpan: ${error.message}`;
    } finally {
      tombolSimpan.disabled = false;
    }
    return;
  }

  localStorage.setItem(kunciUntukTanggal(tanggal), JSON.stringify(jurnal));
  pesan.textContent = "Jurnal berhasil disimpan.";
});

const rekapDari = document.querySelector("#rekap-dari");
const rekapSampai = document.querySelector("#rekap-sampai");
const hasilRekap = document.querySelector("#hasil-rekap");
const namaPdfInput = document.querySelector("#nama-pdf");
const tombolCetakRekap = document.querySelector("#cetak-rekap");
const dokumenRekap = document.querySelector("#dokumen-rekap");
let rentangRekapCetak = null;

function tandaiRekapPerluDibuatUlang() {
  hasilRekap.replaceChildren();
  tombolCetakRekap.hidden = true;
  rentangRekapCetak = null;
}

namaPdfInput.value = localStorage.getItem("jurnal-ibadah-nama-pdf") || "";
namaPdfInput.addEventListener("input", () => {
  localStorage.setItem("jurnal-ibadah-nama-pdf", namaPdfInput.value.trim());
});

const tanggalAkhirDefault = tanggalHariIni();
const tanggalMulaiDefault = new Date(`${tanggalAkhirDefault}T00:00:00Z`);
tanggalMulaiDefault.setUTCDate(tanggalMulaiDefault.getUTCDate() - 6);

rekapDari.value = tanggalMulaiDefault.toISOString().slice(0, 10);
rekapSampai.value = tanggalAkhirDefault;

[rekapDari, rekapSampai].forEach((input) => {
  input.addEventListener("change", () => {
    tombolCetakRekap.hidden = true;
    rentangRekapCetak = null;
  });
});

document.querySelector("#buat-rekap").addEventListener("click", async () => {
  const mulai = rekapDari.value;
  const sampai = rekapSampai.value;

  hasilRekap.replaceChildren();
  tombolCetakRekap.hidden = true;
  rentangRekapCetak = null;

  if (!mulai || !sampai || mulai > sampai) {
    hasilRekap.textContent = "Pilih rentang tanggal yang benar.";
    return;
  }

  if (cloudMode && cloudContext) {
    const tombolBuatRekap = document.querySelector("#buat-rekap");
    tombolBuatRekap.disabled = true;
    hasilRekap.textContent = "Memuat rekap dari database…";
    try {
      cloudRangeRecords = await window.jurnalCloud.loadRange(
        cloudContext.membership.id,
        cloudContext.membership.community_id,
        mulai,
        sampai
      );
    } catch (error) {
      hasilRekap.textContent = `Rekap gagal dimuat: ${error.message}`;
      tombolBuatRekap.disabled = false;
      return;
    }
    tombolBuatRekap.disabled = false;
    hasilRekap.replaceChildren();
  }

  rentangRekapCetak = { mulai, sampai };
  tombolCetakRekap.hidden = false;

  let jumlahHari = 0;
  let hariTersimpan = 0;
  let totalTilawah = 0;
  const hitungan = {};
  const tanggalKegiatan = {};

  ambilKotakCentang().forEach((kotak) => {
    hitungan[kotak.name] = 0;
    tanggalKegiatan[kotak.name] = [];
  });

  const tanggal = new Date(`${mulai}T00:00:00Z`);
  const tanggalAkhir = new Date(`${sampai}T00:00:00Z`);

  while (tanggal <= tanggalAkhir) {
    const tanggalTeks = tanggal.toISOString().slice(0, 10);
    const jurnalCloud = cloudMode ? cloudRangeRecords.get(tanggalTeks) : undefined;
    const tersimpan = cloudMode
      ? (jurnalCloud ? JSON.stringify(jurnalCloud) : null)
      : localStorage.getItem(kunciUntukTanggal(tanggalTeks));

    jumlahHari += 1;

    if (tersimpan) {
      const jurnal = JSON.parse(tersimpan);
      hariTersimpan += 1;
      totalTilawah += Number(cloudMode ? jurnal[idTilawahCloud] : jurnal.tilawah) || 0;

      ambilKotakCentang().forEach((kotak) => {
        if (jurnal[kotak.name]) {
          hitungan[kotak.name] += 1;
          tanggalKegiatan[kotak.name].push(tanggalTeks);
        }
      });
    }

    tanggal.setUTCDate(tanggal.getUTCDate() + 1);
  }

  const formatTanggalRekap = (nilai) => {
    const tanggalLokal = new Date(`${nilai}T00:00:00Z`);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(tanggalLokal);
  };

  const formatHariTanggalRekap = (nilai) => {
    const tanggalLokal = new Date(`${nilai}T00:00:00Z`);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(tanggalLokal);
  };

  const periode = document.createElement("p");
  periode.className = "rekap-periode";
  periode.textContent = `${formatTanggalRekap(mulai)} sampai ${formatTanggalRekap(sampai)}`;
  hasilRekap.append(periode);

  const ringkasan = document.createElement("div");
  ringkasan.className = "rekap-ringkasan";

  const buatMetrik = (judul, nilai, keterangan) => {
    const kartu = document.createElement("article");
    kartu.className = "rekap-metrik";

    const label = document.createElement("span");
    label.className = "rekap-metrik-label";
    label.textContent = judul;

    const angka = document.createElement("strong");
    angka.className = "rekap-metrik-nilai";
    angka.textContent = nilai;

    const catatan = document.createElement("span");
    catatan.className = "rekap-metrik-catatan";
    catatan.textContent = keterangan;

    kartu.append(label, angka, catatan);
    ringkasan.append(kartu);
  };

  buatMetrik("Hari terisi", `${hariTersimpan} / ${jumlahHari}`, "hari dengan jurnal tersimpan");
  buatMetrik("Total tilawah", `${totalTilawah}`, "lembar dalam rentang ini");
  hasilRekap.append(ringkasan);

  const daftarKegiatan = document.createElement("div");
  daftarKegiatan.className = "rekap-daftar";

  const judulKegiatan = document.createElement("h3");
  judulKegiatan.textContent = "Rincian kegiatan";
  daftarKegiatan.append(judulKegiatan);

  const petunjukKegiatan = document.createElement("p");
  petunjukKegiatan.className = "rekap-petunjuk";
  petunjukKegiatan.textContent = "Ketuk satu kegiatan untuk melihat tanggalnya.";
  daftarKegiatan.append(petunjukKegiatan);

  const kegiatan = document.createElement("div");
  kegiatan.className = "rekap-kegiatan";

  ambilKotakCentang().forEach((kotak) => {
    const kartu = document.createElement("article");
    kartu.className = "rekap-kegiatan-item";

    const tombolRincian = document.createElement("button");
    tombolRincian.type = "button";
    tombolRincian.className = "rekap-kegiatan-tombol";
    tombolRincian.setAttribute("aria-expanded", "false");

    const bagianAtas = document.createElement("div");
    bagianAtas.className = "rekap-kegiatan-header";

    const nama = document.createElement("span");
    nama.className = "rekap-kegiatan-nama";
    nama.textContent = kotak.closest("label").textContent.trim();

    const jumlah = document.createElement("span");
    jumlah.className = "rekap-kegiatan-jumlah";
    jumlah.textContent = `${hitungan[kotak.name]} / ${jumlahHari} hari`;

    const panah = document.createElement("span");
    panah.className = "rekap-kegiatan-panah";
    panah.setAttribute("aria-hidden", "true");
    panah.textContent = "⌄";
    bagianAtas.append(nama, jumlah, panah);

    const persentase = Math.round((hitungan[kotak.name] / jumlahHari) * 100);
    const jalur = document.createElement("div");
    jalur.className = "rekap-progress";

    const isi = document.createElement("div");
    isi.className = "rekap-progress-isi";
    isi.style.width = `${persentase}%`;
    isi.setAttribute("role", "progressbar");
    isi.setAttribute("aria-valuenow", String(persentase));
    isi.setAttribute("aria-valuemin", "0");
    isi.setAttribute("aria-valuemax", "100");
    isi.setAttribute("aria-label", `${nama.textContent}: ${persentase}%`);

    jalur.append(isi);
    tombolRincian.append(bagianAtas, jalur);

    const rincianTanggal = document.createElement("div");
    rincianTanggal.className = "rekap-kegiatan-detail";
    rincianTanggal.hidden = true;

    const daftarTanggal = tanggalKegiatan[kotak.name];
    if (daftarTanggal.length) {
      const labelTanggal = document.createElement("p");
      labelTanggal.textContent = "Dicentang pada:";

      const daftarTanggalVertikal = document.createElement("ul");
      daftarTanggalVertikal.className = "rekap-tanggal-list";

      daftarTanggal.forEach((tanggalDicentang) => {
        const itemTanggal = document.createElement("li");
        itemTanggal.textContent = formatHariTanggalRekap(tanggalDicentang);
        daftarTanggalVertikal.append(itemTanggal);
      });

      rincianTanggal.append(labelTanggal, daftarTanggalVertikal);
    } else {
      rincianTanggal.textContent = "Belum dicentang dalam rentang tanggal ini.";
    }

    tombolRincian.addEventListener("click", () => {
      const terbuka = tombolRincian.getAttribute("aria-expanded") === "true";
      tombolRincian.setAttribute("aria-expanded", String(!terbuka));
      rincianTanggal.hidden = terbuka;
    });

    kartu.append(tombolRincian, rincianTanggal);
    kegiatan.append(kartu);
  });

  daftarKegiatan.append(kegiatan);
  hasilRekap.append(daftarKegiatan);
});

function buatRentangTanggal(mulai, sampai) {
  const tanggal = new Date(`${mulai}T00:00:00Z`);
  const tanggalAkhir = new Date(`${sampai}T00:00:00Z`);
  const hasil = [];

  while (tanggal <= tanggalAkhir) {
    hasil.push(tanggal.toISOString().slice(0, 10));
    tanggal.setUTCDate(tanggal.getUTCDate() + 1);
  }

  return hasil;
}

function buatLembarRekap({ mulai, sampai }) {
  const semuaTanggal = buatRentangTanggal(mulai, sampai);
  const kelompokBulan = new Map();

  semuaTanggal.forEach((tanggal) => {
    const kunciBulan = tanggal.slice(0, 7);
    if (!kelompokBulan.has(kunciBulan)) kelompokBulan.set(kunciBulan, []);
    kelompokBulan.get(kunciBulan).push(tanggal);
  });

  const namaUntuk = (tanggal, opsi) => new Intl.DateTimeFormat("id-ID", {
    ...opsi,
    timeZone: "UTC",
  }).format(new Date(`${tanggal}T00:00:00Z`));

  const barisAktivitas = [];
  let nomorAktivitas = 1;
  urutanKelompok.forEach((kelompok) => {
    const anggota = daftarIbadah.filter((item) => item.kelompok === kelompok);
    if (!anggota.length && kelompok !== "Al-Qur’an dan dzikir") return;
    barisAktivitas.push({ type: "group", name: kelompok });

    if (kelompok === "Al-Qur’an dan dzikir") {
      barisAktivitas.push({ type: "tilawah", number: String(nomorAktivitas++), name: "Tilawah Al-Qur’an (jumlah lembar)" });
    }

    anggota.forEach((item) => {
      barisAktivitas.push({
        type: "activity",
        number: String(nomorAktivitas++),
        name: item.nama,
        key: item.id,
      });
    });
  });

  dokumenRekap.replaceChildren();

  kelompokBulan.forEach((tanggalBulan, bulan) => {
    const halaman = document.createElement("article");
    halaman.className = "lembar-rekap-bulan";

    const nama = document.createElement("p");
    nama.className = "lembar-rekap-nama";
    const namaPengguna = namaPdfInput.value.trim() || localStorage.getItem("jurnal-ibadah-nama-pdf")?.trim() || "";
    nama.textContent = namaPengguna ? `Nama: ${namaPengguna}` : "Nama: ______________________________";
    halaman.append(nama);

    const judul = document.createElement("h1");
    judul.textContent = "JURNAL IBADAH HARIAN";
    halaman.append(judul);

    const meta = document.createElement("div");
    meta.className = "lembar-rekap-meta";
    const periode = document.createElement("span");
    periode.textContent = `PERIODE: ${namaUntuk(tanggalBulan[0], { day: "numeric", month: "long", year: "numeric" })} – ${namaUntuk(tanggalBulan.at(-1), { day: "numeric", month: "long", year: "numeric" })}`;
    meta.append(periode);
    halaman.append(meta);

    const bulanLabel = document.createElement("h2");
    bulanLabel.textContent = namaUntuk(`${bulan}-01`, { month: "long", year: "numeric" });
    halaman.append(bulanLabel);

    const tabel = document.createElement("table");
    tabel.className = "tabel-rekap-cetak";

    const lebarNama = document.createElement("colgroup");
    const colNomor = document.createElement("col");
    colNomor.className = "kolom-nomor";
    const colNama = document.createElement("col");
    colNama.className = "kolom-amal";
    lebarNama.append(colNomor, colNama);
    tanggalBulan.forEach(() => lebarNama.append(document.createElement("col")));
    tabel.append(lebarNama);

    const thead = document.createElement("thead");
    const barisTanggal = document.createElement("tr");
    const no = document.createElement("th");
    no.rowSpan = 2;
    no.textContent = "NO";
    const amal = document.createElement("th");
    amal.rowSpan = 2;
    amal.textContent = "AMAL YAUMI";
    const tanggalHeader = document.createElement("th");
    tanggalHeader.colSpan = tanggalBulan.length;
    tanggalHeader.textContent = "TANGGAL";
    barisTanggal.append(no, amal, tanggalHeader);
    thead.append(barisTanggal);

    const barisHari = document.createElement("tr");
    tanggalBulan.forEach((tanggal) => {
      const sel = document.createElement("th");
      sel.textContent = String(Number(tanggal.slice(-2)));
      sel.title = namaUntuk(tanggal, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      barisHari.append(sel);
    });
    thead.append(barisHari);
    tabel.append(thead);

    const tbody = document.createElement("tbody");
    barisAktivitas.forEach((aktivitas) => {
      const baris = document.createElement("tr");
      if (aktivitas.type === "group") baris.className = "baris-subkelompok";

      const nomor = document.createElement("td");
      nomor.textContent = aktivitas.number || "";
      const namaAktivitas = document.createElement("td");
      namaAktivitas.textContent = aktivitas.name;
      baris.append(nomor, namaAktivitas);

      tanggalBulan.forEach((tanggal) => {
        const sel = document.createElement("td");
        sel.className = "sel-rekap-cetak";
        const jurnalCloud = cloudMode ? cloudRangeRecords.get(tanggal) : undefined;
        const tersimpan = cloudMode
          ? (jurnalCloud ? JSON.stringify(jurnalCloud) : null)
          : localStorage.getItem(kunciUntukTanggal(tanggal));
        const jurnal = tersimpan ? JSON.parse(tersimpan) : {};

        if (aktivitas.type === "activity" && jurnal[aktivitas.key]) {
          sel.textContent = "✓";
          sel.classList.add("selesai");
        } else if (aktivitas.type === "tilawah" && Number(cloudMode ? jurnal[idTilawahCloud] : jurnal.tilawah) > 0) {
          sel.textContent = String(Number(cloudMode ? jurnal[idTilawahCloud] : jurnal.tilawah));
          sel.classList.add("tilawah-terisi");
        }

        baris.append(sel);
      });

      tbody.append(baris);
    });
    tabel.append(tbody);
    halaman.append(tabel);

    const catatan = document.createElement("p");
    catatan.className = "lembar-rekap-catatan";
    catatan.textContent = "✓ Ibadah telah dilakukan. Angka pada Tilawah menunjukkan jumlah lembar.";
    halaman.append(catatan);

    dokumenRekap.append(halaman);
  });
}

tombolCetakRekap.addEventListener("click", () => {
  if (!rentangRekapCetak) return;

  buatLembarRekap(rentangRekapCetak);
  const judulSebelumnya = document.title;
  document.title = `Rekap-Jurnal-Ibadah-${rentangRekapCetak.mulai}-${rentangRekapCetak.sampai}`;
  window.print();
  document.title = judulSebelumnya;
});

const tabNavigasi = document.querySelectorAll('[role="tab"]');

tabNavigasi.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabNavigasi.forEach((item) => {
      const aktif = item === tab;
      item.setAttribute("aria-selected", String(aktif));
      document.getElementById(item.getAttribute("aria-controls")).hidden = !aktif;
    });
  });
});

async function tampilkanJurnalSantri(membership, profile) {
  const setupDetail = document.querySelector("#setup-detail");
  const setupMessage = document.querySelector("#setup-message");
  const main = document.querySelector("main");
  setupDetail.textContent = "Memuat daftar ibadah komunitas…";
  try {
    const activities = await window.jurnalCloud.loadActivities(membership.community_id);
    cloudActivities = activities;
    idTilawahCloud = activities.find((activity) => activity.input_type === "quantity")?.id || null;
    daftarIbadah = activities
      .filter((activity) => activity.input_type === "checkbox")
      .map((activity) => ({ id: activity.id, nama: activity.name, kelompok: activity.group_name }));
    cloudMode = true;
    cloudContext = { membership };
    document.querySelector(".kelola-ibadah").hidden = true;
    tilawahCard.hidden = !idTilawahCloud;
    namaPdfInput.value = profile?.display_name || "";
    renderDaftarIbadah();
    renderDaftarIbadahKelola();
    main.hidden = false;
    setupMessage.hidden = true;
    await muatJurnal();
  } catch (error) {
    setupDetail.textContent = `Jurnal santri gagal dimuat: ${error.message}`;
    setupMessage.hidden = false;
  }
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.getRegistration("./").then(async (registration) => {
    if (!registration) return;

    const subscription = await registration.pushManager?.getSubscription();
    if (subscription) await subscription.unsubscribe();
    await registration.unregister();
  }).catch((error) => {
    console.error("Pembersihan notifikasi lama gagal:", error);
  });
}
