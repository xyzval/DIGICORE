const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const config = require("./config");

// Interval auto backup (dalam milidetik) — default: 6 jam
const BACKUP_INTERVAL = 6 * 60 * 60 * 1000;

const bulanIndo = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function getBackupFileName() {
  const tgl = new Date();
  const tanggal = tgl.getDate().toString().padStart(2, "0");
  const bulan = bulanIndo[tgl.getMonth()];
  const tahun = tgl.getFullYear();
  const jam = tgl.getHours().toString().padStart(2, "0");
  const menit = tgl.getMinutes().toString().padStart(2, "0");
  return `AutoBackup-${tanggal}-${bulan}-${tahun}_${jam}-${menit}`;
}

async function performBackup(bot) {
  const name = getBackupFileName();
  const zipPath = path.join(__dirname, `${name}.zip`);

  const exclude = [
    "node_modules", "package-lock.json", "yarn.lock",
    ".npm", ".cache", ".git", ".env",
    "install.sh", "DIGICORE"
  ];

  const filesToZip = fs.readdirSync(__dirname).filter((f) =>
    !exclude.includes(f) &&
    !f.startsWith(".") &&
    !f.endsWith(".zip") &&
    !f.endsWith(".log") &&
    f !== ""
  );

  if (!filesToZip.length) {
    console.error("[AutoBackup] Tidak ada file untuk di-backup.");
    return;
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", async () => {
      console.log(`[AutoBackup] Backup selesai: ${name}.zip (${archive.pointer()} bytes)`);

      try {
        await bot.telegram.sendDocument(
          config.ownerId,
          { source: zipPath },
          {
            caption:
              `🔄 <b>Auto Backup Berhasil!</b>\n\n` +
              `📁 File: ${name}.zip\n` +
              `📦 Size: ${(archive.pointer() / 1024).toFixed(1)} KB\n` +
              `🕐 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n` +
              `⏰ Next backup: 6 jam lagi`,
            parse_mode: "HTML"
          }
        );

        // Hapus file zip setelah terkirim
        fs.unlinkSync(zipPath);
        console.log(`[AutoBackup] File zip dihapus dari server.`);
        resolve(true);
      } catch (err) {
        console.error("[AutoBackup] Gagal kirim file backup:", err.message);
        // Tetap hapus file zip meski gagal kirim
        try { fs.unlinkSync(zipPath); } catch (e) {}
        reject(err);
      }
    });

    archive.on("error", (err) => {
      console.error("[AutoBackup] Archive error:", err);
      reject(err);
    });

    archive.pipe(output);

    for (let file of filesToZip) {
      const fullPath = path.join(__dirname, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // Skip node_modules di dalam subfolder
        archive.directory(fullPath, file, (entry) => {
          if (entry.name && entry.name.includes("node_modules")) return false;
          return entry;
        });
      } else {
        archive.file(fullPath, { name: file });
      }
    }

    archive.finalize();
  });
}

function startAutoBackup(bot) {
  console.log(`[AutoBackup] Auto backup aktif — interval: setiap 6 jam`);

  // Jalankan backup pertama 10 detik setelah bot start (opsional, bisa dihapus)
  setTimeout(async () => {
    try {
      await performBackup(bot);
    } catch (err) {
      console.error("[AutoBackup] Backup awal gagal:", err.message);
    }
  }, 10000);

  // Jalankan backup setiap 6 jam
  setInterval(async () => {
    try {
      await performBackup(bot);
    } catch (err) {
      console.error("[AutoBackup] Backup terjadwal gagal:", err.message);
    }
  }, BACKUP_INTERVAL);
}

module.exports = { startAutoBackup, performBackup };
