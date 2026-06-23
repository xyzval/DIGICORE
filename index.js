require("./lib/myfunc.js");
const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const config = require("./config");
const { startAutoBackup } = require("./autobackup");

const ticketDB = path.join(__dirname, "database/tickets.json");
const loadTickets = () => JSON.parse(fs.readFileSync(ticketDB));
const saveTickets = (d) => fs.writeFileSync(ticketDB, JSON.stringify(d, null, 2));

// Auto close tiket tidak aktif 48 jam
const AUTO_CLOSE_INTERVAL = 60 * 60 * 1000;
const INACTIVE_LIMIT = 48 * 60 * 60 * 1000;

async function autoCloseTickets(bot) {
  try {
    if (!fs.existsSync(ticketDB)) return;
    const tickets = loadTickets();
    const now = Date.now();
    let changed = false;
    for (const ticket of tickets) {
      if (ticket.status !== "open") continue;
      const lastTime = new Date(ticket.last_activity || ticket.created_at).getTime();
      if (now - lastTime >= INACTIVE_LIMIT) {
        ticket.status = "closed";
        ticket.closed_at = new Date().toISOString();
        ticket.closed_reason = "auto_close_48h";
        changed = true;
        try {
          await bot.telegram.sendMessage(ticket.userId,
            `🔴 <b>Tiket #${ticket.id} Ditutup Otomatis</b>\n\nTidak ada aktivitas selama 48 jam.\nBuat tiket baru jika masih ada masalah:\n<code>${config.prefix}ticket [pesan]</code>`,
            { parse_mode: "HTML" });
        } catch (e) {}
      }
    }
    if (changed) saveTickets(tickets);
  } catch (err) { console.error("[AutoClose]", err.message); }
}

(async () => {
  const bot = new Telegraf(config.botToken);

  require("./bot")(bot);

  // ===== Drop pending updates & handle conflict =====
  try {
    // Hapus webhook jika ada (mencegah konflik polling vs webhook)
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log("• Webhook cleared, pending updates dropped");
  } catch (err) {
    console.warn("⚠️  Gagal clear webhook:", err.message);
  }

  // Tunggu sebentar supaya session lama expired
  await new Promise(r => setTimeout(r, 2000));

  try {
    await bot.launch({ dropPendingUpdates: true });
  } catch (err) {
    if (err.message && err.message.includes("409")) {
      console.error("❌ Error 409: Ada instance bot lain yang masih berjalan!");
      console.error("   Solusi:");
      console.error("   1. Matikan semua proses bot yang lain (kill process)");
      console.error("   2. Pastikan hanya 1 instance bot yang running");
      console.error("   3. Cek apakah token ini dipakai di bot/server lain");
      console.error("");
      console.error("   Retrying dalam 10 detik...");
      await new Promise(r => setTimeout(r, 10000));
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch({ dropPendingUpdates: true });
      } catch (err2) {
        console.error("❌ Retry gagal:", err2.message);
        console.error("   STOP semua instance bot lain lalu jalankan ulang!");
        process.exit(1);
      }
    } else {
      console.error("❌ Gagal menjalankan bot:", err.message);
      console.error("   Pastikan botToken di config.js valid!");
      process.exit(1);
    }
  }

  await bot.telegram.setMyCommands([
    { command: "menu", description: "Tampilkan Menu Utama" },
    { command: "buyvps", description: "Beli VPS / RDP" },
    { command: "ticket", description: "Buat Tiket Support" }
  ]);
  console.log("• DIGICORE Bot Connected");

  startAutoBackup(bot);
  console.log("• Auto Backup aktif (setiap 6 jam)");

  setInterval(() => autoCloseTickets(bot), AUTO_CLOSE_INTERVAL);
  setTimeout(() => autoCloseTickets(bot), 30000);
  console.log("• Auto Close Tiket aktif (48 jam)");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
})();
