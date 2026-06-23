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

  try {
    await bot.launch();
  } catch (err) {
    console.error("❌ Gagal menjalankan bot:", err.message);
    console.error("Pastikan botToken di config.js valid!");
    process.exit(1);
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
