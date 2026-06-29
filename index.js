require("./lib/myfunc.js");
const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const config = require("./config");
const { startAutoBackup } = require("./autobackup");

const ticketDB = path.join(__dirname, "database/tickets.json");
const loadTickets = () => JSON.parse(fs.readFileSync(ticketDB));
const saveTickets = (d) => fs.writeFileSync(ticketDB, JSON.stringify(d, null, 2));

// Auto close tiket tidak aktif 24 jam
const AUTO_CLOSE_INTERVAL = 60 * 60 * 1000;
const INACTIVE_LIMIT = 24 * 60 * 60 * 1000;

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
        ticket.closed_reason = "auto_close_24h";
        changed = true;
        try {
          await bot.telegram.sendMessage(ticket.userId,
            `🔴 <b>Tiket #${ticket.id} Ditutup Otomatis</b>\n━━━━━━━━━━━━━━━━━━━━\n\nTidak ada aktivitas selama 24 jam.\nBuat tiket baru jika masih ada masalah:\n<code>${config.prefix}support [pesan]</code>`,
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

  // ===== Force update bot commands =====
  try {
    await bot.telegram.deleteMyCommands();
    await bot.telegram.setMyCommands([
      { command: "menu", description: "Tampilkan Menu Utama" },
      { command: "buycloud", description: "Beli VPS / RDP" },
      { command: "support", description: "Buat Tiket Support" }
    ]);
    console.log("• Bot commands updated");
  } catch (err) {
    console.warn("⚠️  Gagal update commands:", err.message);
  }

  // ===== Launch bot =====
  bot.launch({ dropPendingUpdates: true })
    .catch((err) => {
      console.error("❌ Bot launch error:", err.message);
      if (err.message && err.message.includes("409")) {
        console.error("   Ada instance bot lain yang masih jalan!");
        console.error("   Jalankan: pkill -f 'node index.js' lalu coba lagi");
      }
      process.exit(1);
    });

  console.log("• DIGICORE Bot Connected");

  startAutoBackup(bot);
  console.log("• Auto Backup aktif (setiap 6 jam)");

  setInterval(() => autoCloseTickets(bot), AUTO_CLOSE_INTERVAL);
  setTimeout(() => autoCloseTickets(bot), 30000);
  console.log("• Auto Close Tiket aktif (48 jam)");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
})();
