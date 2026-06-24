require("./lib/myfunc.js");
const config = require("./config");
const { createPayment, cekPaid } = require("./lib/myfunc2.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const prefix = config.prefix || "/";

// Database paths
const userDB = path.join(__dirname, "/database/users.json");
const vpsDB = path.join(__dirname, "/database/vps.json");
const reviewDB = path.join(__dirname, "/database/reviews.json");
const blacklistDB = path.join(__dirname, "/database/blacklist.json");
const ticketDB = path.join(__dirname, "/database/tickets.json");
const claimDB = path.join(__dirname, "/database/claims.json");
const orders = {};
const pendingReviews = {};

// Inisialisasi database
if (!fs.existsSync(userDB)) fs.writeFileSync(userDB, "[]");
if (!fs.existsSync(vpsDB)) fs.writeFileSync(vpsDB, "{}");
if (!fs.existsSync(reviewDB)) fs.writeFileSync(reviewDB, "[]");
if (!fs.existsSync(blacklistDB)) fs.writeFileSync(blacklistDB, "[]");
if (!fs.existsSync(ticketDB)) fs.writeFileSync(ticketDB, "[]");
if (!fs.existsSync(claimDB)) fs.writeFileSync(claimDB, "[]");

// Load/Save functions
const loadUsers = () => JSON.parse(fs.readFileSync(userDB));
const saveUsers = (d) => fs.writeFileSync(userDB, JSON.stringify(d, null, 2));
const loadVps = () => JSON.parse(fs.readFileSync(vpsDB));
const saveVps = (d) => fs.writeFileSync(vpsDB, JSON.stringify(d, null, 2));
const loadReviews = () => JSON.parse(fs.readFileSync(reviewDB));
const saveReviews = (d) => fs.writeFileSync(reviewDB, JSON.stringify(d, null, 2));
const loadBlacklist = () => JSON.parse(fs.readFileSync(blacklistDB));
const saveBlacklist = (d) => fs.writeFileSync(blacklistDB, JSON.stringify(d, null, 2));
const loadTickets = () => JSON.parse(fs.readFileSync(ticketDB));
const saveTickets = (d) => fs.writeFileSync(ticketDB, JSON.stringify(d, null, 2));
const loadClaims = () => JSON.parse(fs.readFileSync(claimDB));
const saveClaims = (d) => fs.writeFileSync(claimDB, JSON.stringify(d, null, 2));
const isBlacklisted = (userId) => {
    const blacklist = loadBlacklist();
    return blacklist.some(b => String(b.id) === String(userId));
};


// Helper functions
const isInactiveUser = (user) => user && typeof user === "object" && ["dead", "inactive"].includes(user.status);
const isDeadUserError = (error) => {
    const msg = String(error?.description || error?.message || "").toLowerCase();
    return msg.includes("bot was blocked") || msg.includes("chat not found") ||
        msg.includes("user is deactivated") || msg.includes("forbidden");
};
const markUserDead = (users, targetId, error) => {
    const idx = users.findIndex(u => String((u && u.id) || u) === String(targetId));
    if (idx === -1) return false;
    const deadData = { status: "dead", dead_at: new Date().toISOString(), dead_reason: String(error?.description || error?.message || "").slice(0, 200) };
    if (users[idx] && typeof users[idx] === "object") {
        if (users[idx].status === "dead") return false;
        users[idx] = { ...users[idx], ...deadData };
    } else { users[idx] = { id: users[idx], ...deadData }; }
    return true;
};

function getTotalOrderUsers() {
    try { const users = loadUsers(); return Array.isArray(users) ? users.length : Object.keys(users).length; } catch { return 0; }
}
function randomNumber(length = 5) { const min = Math.pow(10, length - 1); return Math.floor(min + Math.random() * (Math.pow(10, length) - min)).toString(); }
function generateRandomFee(min = 100, max = 200) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function toRupiah(angka) { return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function escapeHtml(text) { return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

global.startTime = Date.now();
function fmtDur(ms) { const s = Math.floor(ms / 1000) % 60; const m = Math.floor(ms / 6e4) % 60; const h = Math.floor(ms / 36e5) % 24; const d = Math.floor(ms / 864e5); return `${d} hari ${h} jam ${m} menit`; }
function fmtBytes(b) { if (!b) return "0 Bytes"; const u = 1024, s = ["Bytes", "KB", "MB", "GB"], i = Math.floor(Math.log(b) / Math.log(u)); return `${(b / Math.pow(u, i)).toFixed(2)} ${s[i]}`; }
function getRuntimeBot() { return fmtDur(Date.now() - global.startTime); }


const isOwner = (ctx) => {
    const fromId = ctx.from?.id || ctx.callbackQuery?.from?.id;
    return fromId && fromId.toString() === config.ownerId;
};

// Menu texts
const menuTextBot = (ctx) => {
    const reviews = loadReviews();
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";
    const vpsData = loadVps();
    const totalVpsStock = Object.values(vpsData).reduce((sum, items) => sum + items.reduce((s, i) => s + (i.accounts ? i.accounts.length : 0), 0), 0);

    return `◈ 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄
━━━━━━━━━━━━━━━━━━━━
𝘝𝘗𝘚 & 𝘙𝘋𝘗 𝘗𝘳𝘰𝘷𝘪𝘥𝘦𝘳

Halo, @${ctx.from.username || "—"}

📊 Dashboard
╔═══════════════════╗
║ 📦 ${getTotalOrderUsers()} Orders${" ".repeat(Math.max(0, 10 - String(getTotalOrderUsers()).length))}║
║ ⭐ ${avgRating} Rating${" ".repeat(Math.max(0, 9 - avgRating.length))}║
║ 💻 ${totalVpsStock} VPS Ready${" ".repeat(Math.max(0, 7 - String(totalVpsStock).length))}║
╚═══════════════════╝

🏷️ Layanan:
• VPS Dedicated (Linux/Windows)
• RDP Full Admin
• Custom Spec Available

━━━━━━━━━━━━━━━━━━━━
🛡️ Trusted • ⚡ Instan • 💎 Premium

/${config.prefix === "/" ? "" : config.prefix}info • /riwayat • /rating • /support`;
};

const menuTextOwn = () => `<blockquote>( ⸙‌ ) 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄 — 𝐎𝐰𝐧𝐞𝐫 𝐌𝐞𝐧𝐮

⟢ 𝐕𝐞𝐫𝐬𝐢𝐨𝐧  : 1.0
⟢ 𝐑𝐮𝐧𝐭𝐢𝐦𝐞  : ${getRuntimeBot()}
━━━━━━━━━━━━━━━━

▢ ${config.prefix}stats
▢ ${config.prefix}backup
▢ ${config.prefix}broadcast
▢ ${config.prefix}maintenance
▢ ${config.prefix}editgaransi
▢ ${config.prefix}addstockvps
▢ ${config.prefix}delstockvps
▢ ${config.prefix}getstockvps
▢ ${config.prefix}userlist
▢ ${config.prefix}ban
▢ ${config.prefix}unban
▢ ${config.prefix}banlist
▢ ${config.prefix}tickets
▢ ${config.prefix}reply
▢ ${config.prefix}closeticket
▢ ${config.prefix}claims
▢ ${config.prefix}approve
▢ ${config.prefix}reject
▢ ${config.prefix}sendclaim
▢ ${config.prefix}update
</blockquote>`;

const mainKeyboard = (ctx) => {
    const keyboard = [
        [{ text: "Order VPS/RDP", callback_data: "buy_vps" }],
        // [{ text: "⭐ Review", callback_data: "show_review" }, { text: "🎫 Support", callback_data: "show_ticket" }],
        [{ text: "🛡️ Sistem Garansi", callback_data: "snk_menu" }]
    ];
    if (isOwner(ctx)) keyboard.push([{ text: "🕊️ Owner Menu", callback_data: "owner_menu" }]);
    return { inline_keyboard: keyboard };
};


const snkText = `<b>Syarat & Ketentuan DIGICORE</b>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>Garansi:</b>
- Garansi aktif 1x replace sejak tanggal pembelian.
- Masa garansi sesuai paket yang dibeli.`;

// Load/save garansi text (editable by owner)
const garansiFile = path.join(__dirname, "database/garansi.txt");
function loadGaransiText() {
    if (fs.existsSync(garansiFile)) return fs.readFileSync(garansiFile, "utf-8");
    return snkText;
}
function saveGaransiText(text) {
    fs.writeFileSync(garansiFile, text, "utf-8");
}

function addUser(userData) {
    const users = loadUsers();
    if (!users.find(u => u.id === userData.id)) { users.push(userData); saveUsers(users); }
}

function updateUserHistory(userId, transaction) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        if (!users[idx].history) users[idx].history = [];
        users[idx].history.push({ ...transaction, timestamp: new Date().toISOString() });
        saveUsers(users);
    }
}

// Cek stok menipis & notif owner
async function checkLowStock(bot) {
    const vpsData = loadVps();
    const lowItems = [];
    for (const [category, items] of Object.entries(vpsData)) {
        for (const item of items) {
            if (item.accounts && item.accounts.length <= 2 && item.accounts.length > 0) {
                lowItems.push({ category, description: item.description, stock: item.accounts.length });
            }
        }
    }
    if (lowItems.length > 0) {
        let msg = `⚠️ <b>STOK MENIPIS!</b>\n\n`;
        lowItems.forEach(i => { msg += `💻 ${escapeHtml(i.category)} - ${escapeHtml(i.description)}\n📦 Sisa: ${i.stock}\n\n`; });
        msg += `Segera restock!`;
        try { await bot.telegram.sendMessage(config.ownerId, msg, { parse_mode: "HTML" }); } catch (e) { console.error("[LowStock]", e.message); }
    }
}


module.exports = (bot) => {

    // ===== TEXT HANDLER =====
    bot.on("text", async (ctx) => {
        const msg = ctx.message;
        const body = (msg.text || "").trim();
        const isCmd = body.startsWith(prefix);
        const args = body.split(/ +/).slice(1);
        const text = args.join(" ");
        const command = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : body.toLowerCase();
        const fromId = ctx.from.id;
        const userName = ctx.from.username || ctx.from.first_name;

        // Add user
        if (fromId) addUser({ id: fromId, username: userName, first_name: ctx.from.first_name, last_name: ctx.from.last_name || "", join_date: new Date().toISOString(), total_spent: 0, history: [] });

        // Blacklist check
        if (isBlacklisted(fromId) && isCmd) return ctx.reply("🚫 Anda telah di-blacklist dan tidak dapat menggunakan bot ini.");

        // Maintenance check
        if (config.maintenance && !isOwner(ctx) && isCmd) {
            const allowedInMaint = ["menu", "start", "profile", "history", "support", "ticket", "cektiket", "myticket", "tiket", "claimgaransi", "claim", "cekclaim", "myclaim"];
            if (!allowedInMaint.includes(command)) return ctx.reply("🔧 Bot sedang dalam pemeliharaan.\nSilakan coba lagi nanti.");
        }

        // Owner reply ticket via reply message
        if (!isCmd && isOwner(ctx) && ctx.message.reply_to_message) {
            const replyText = ctx.message.reply_to_message.text || "";
            const match = replyText.match(/Tiket #(\d+)|#(\d{3})/);
            if (match) {
                const tid = match[1] || match[2];
                const tickets = loadTickets();
                const idx = tickets.findIndex(t => t.id === tid && t.status === "open");
                if (idx !== -1) {
                    tickets[idx].replies.push({ from: "admin", message: body, timestamp: new Date().toISOString() });
                    tickets[idx].last_activity = new Date().toISOString();
                    saveTickets(tickets);
                    try { await ctx.telegram.sendMessage(tickets[idx].userId, `💬 <b>Balasan Tiket #${tid}</b>\n\n💬 <b>Admin:</b>\n${escapeHtml(body)}\n\n<i>Reply pesan ini untuk membalas.</i>`, { parse_mode: "HTML" }); } catch (e) {}
                    return ctx.reply(`✅ Balasan terkirim ke tiket <b>#${tid}</b>`, { parse_mode: "HTML" });
                }
            }
        }

        // User reply ticket via reply message
        if (!isCmd && !isOwner(ctx) && ctx.message.reply_to_message) {
            const replyText = ctx.message.reply_to_message.text || "";
            const match = replyText.match(/Tiket #(\d+)|#(\d{3})/);
            if (match) {
                const tid = match[1] || match[2];
                const tickets = loadTickets();
                const idx = tickets.findIndex(t => t.id === tid && t.userId === fromId && t.status === "open");
                if (idx !== -1) {
                    tickets[idx].replies.push({ from: "user", message: body, timestamp: new Date().toISOString() });
                    tickets[idx].last_activity = new Date().toISOString();
                    saveTickets(tickets);
                    await ctx.reply(`✅ Balasan tiket <b>#${tid}</b> terkirim!`, { parse_mode: "HTML" });
                    try { await ctx.telegram.sendMessage(config.ownerId, `💬 <b>BALASAN TIKET #${tid}</b>\n\n👤 @${escapeHtml(userName)}\n📝 ${escapeHtml(body)}\n\n<i>Reply pesan ini untuk membalas.</i>`, { parse_mode: "HTML" }); } catch (e) {}
                    return;
                }
            }
        }

        // Review comment handler
        if (pendingReviews[fromId] && pendingReviews[fromId].rating && !isCmd) {
            const pending = pendingReviews[fromId];
            const reviews = loadReviews();
            reviews.push({ userId: fromId, username: userName, product: pending.product, type: pending.type, rating: pending.rating, comment: body, amount: pending.amount, timestamp: new Date().toISOString() });
            saveReviews(reviews);
            delete pendingReviews[fromId];
            return ctx.reply(`✅ Review tersimpan!\n\n${"⭐".repeat(pending.rating)} (${pending.rating}/5)\n📦 ${escapeHtml(pending.product)}\n💬 ${escapeHtml(body)}\n\nTerima kasih! 🙏`, { parse_mode: "HTML" });
        }


        switch (command) {
            case "menu": case "start": {
                return ctx.reply(menuTextBot(ctx), { parse_mode: "HTML", reply_markup: mainKeyboard(ctx) });
            }

            case "info": case "profile": {
                const users = loadUsers();
                const user = users.find(u => u.id === fromId);
                if (!user) return ctx.reply("❌ User tidak ditemukan.");
                const profileText = `<b>👤 Profile</b>\n\n<b>📛 Nama:</b> ${escapeHtml(user.first_name || "")} ${escapeHtml(user.last_name || "")}\n<b>🆔 ID:</b> <code>${user.id}</code>\n<b>📧 Username:</b> @${escapeHtml(user.username || "-")}\n<b>📅 Join:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}\n<b>💰 Total Spent:</b> Rp${toRupiah(user.total_spent || 0)}\n<b>📊 Transaksi:</b> ${user.history ? user.history.length : 0}`;
                return ctx.reply(profileText, { parse_mode: "HTML" });
            }

            case "riwayat": case "history": {
                const users = loadUsers();
                const user = users.find(u => u.id === fromId);
                if (!user || !user.history || user.history.length === 0) return ctx.reply("Belum ada riwayat transaksi.");
                let hText = "📋 <b>Riwayat Transaksi</b>\n\n";
                [...user.history].reverse().slice(0, 10).forEach((t, i) => {
                    hText += `<b>${i + 1}. ${escapeHtml(t.product)}</b>\n💰 Rp${toRupiah(t.amount)} | 📅 ${new Date(t.timestamp).toLocaleDateString('id-ID')}\n\n`;
                });
                return ctx.reply(hText, { parse_mode: "HTML" });
            }

            case "rating": case "review": case "reviews": {
                const reviews = loadReviews();
                if (reviews.length === 0) return ctx.reply("Belum ada review.");
                const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
                let rText = `<b>📝 Review Pelanggan</b>\n\n${"⭐".repeat(Math.round(avg))} <b>${avg}/5</b> (${reviews.length} review)\n━━━━━━━━━━━━━━━━\n\n`;
                [...reviews].reverse().slice(0, 10).forEach(r => {
                    rText += `${"⭐".repeat(r.rating)} <b>(${r.rating}/5)</b>\n👤 ${escapeHtml(r.username || "Anonim")}\n📦 ${escapeHtml(r.product)}\n`;
                    if (r.comment) rText += `💬 "${escapeHtml(r.comment)}"\n`;
                    rText += `📅 ${new Date(r.timestamp).toLocaleDateString('id-ID')}\n\n`;
                });
                return ctx.reply(rText, { parse_mode: "HTML" });
            }


            // ===== BUY VPS =====
            case "buycloud": case "buyvps": {
                const vpsData = loadVps();
                const categories = Object.keys(vpsData);
                if (categories.length === 0) return ctx.reply("Stok VPS/RDP sedang kosong.");
                const btns = categories.map(cat => {
                    const totalStok = vpsData[cat].reduce((s, i) => s + (i.accounts ? i.accounts.length : 0), 0);
                    return [{ text: `${cat} • ${totalStok} tersedia`, callback_data: `vps_category_buy|${cat}` }];
                });
                return ctx.reply(`◈ 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄 — 𝐎𝐫𝐝𝐞𝐫\n━━━━━━━━━━━━━━━━━━━━\n\nPilih kategori server:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } });
            }

            // ===== STATS (OWNER) =====
            case "stats": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const users = loadUsers();
                const reviews = loadReviews();
                const vpsData = loadVps();
                const totalVpsStock = Object.values(vpsData).reduce((sum, items) => sum + items.reduce((s, i) => s + (i.accounts ? i.accounts.length : 0), 0), 0);
                const totalSpent = users.reduce((s, u) => s + (u.total_spent || 0), 0);
                const today = new Date().toLocaleDateString('id-ID');
                const todayOrders = users.reduce((count, u) => { if (!u.history) return count; return count + u.history.filter(h => new Date(h.timestamp).toLocaleDateString('id-ID') === today).length; }, 0);
                const todayRevenue = users.reduce((sum, u) => { if (!u.history) return sum; return sum + u.history.filter(h => new Date(h.timestamp).toLocaleDateString('id-ID') === today).reduce((s, h) => s + (h.amount || 0), 0); }, 0);
                const newUsersToday = users.filter(u => new Date(u.join_date).toLocaleDateString('id-ID') === today).length;
                const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";

                const statsText = `📈 <b>STATISTIK DIGICORE</b>\n\n` +
                    `━━ 📅 Hari Ini ━━\n` +
                    `💰 Revenue: Rp${toRupiah(todayRevenue)}\n` +
                    `🛒 Transaksi: ${todayOrders}\n` +
                    `👤 User Baru: ${newUsersToday}\n\n` +
                    `━━ 📊 Total ━━\n` +
                    `💰 Revenue: Rp${toRupiah(totalSpent)}\n` +
                    `👤 Total User: ${users.length}\n` +
                    `📦 Stok VPS: ${totalVpsStock}\n` +
                    `⭐ Rating: ${avgRating}/5 (${reviews.length})\n` +
                    `⏱️ Uptime: ${getRuntimeBot()}\n` +
                    `🔧 Maintenance: ${config.maintenance ? "ON" : "OFF"}`;
                return ctx.reply(statsText, { parse_mode: "HTML" });
            }

            // ===== MAINTENANCE MODE =====
            case "maintenance": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (text === "on") { config.maintenance = true; return ctx.reply("🔧 Maintenance mode <b>AKTIF</b>.\nUser tidak bisa order.", { parse_mode: "HTML" }); }
                if (text === "off") { config.maintenance = false; return ctx.reply("✅ Maintenance mode <b>NONAKTIF</b>.\nBot kembali normal.", { parse_mode: "HTML" }); }
                return ctx.reply(`Status: ${config.maintenance ? "🔧 ON" : "✅ OFF"}\n\nGunakan:\n<code>${config.prefix}maintenance on</code>\n<code>${config.prefix}maintenance off</code>`, { parse_mode: "HTML" });
            }

            // ===== EDIT GARANSI (OWNER) =====
            case "editgaransi": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text) {
                    const current = loadGaransiText();
                    return ctx.reply(`🛡️ <b>Sistem Garansi Saat Ini:</b>\n\n${current}\n\n━━━━━━━━━━━━━━━━━━━━\n<b>Cara edit:</b>\n<code>${config.prefix}editgaransi [teks baru]</code>\n\n<i>Tips: Gunakan HTML tags (bold, italic)\n&lt;b&gt;bold&lt;/b&gt; • &lt;i&gt;italic&lt;/i&gt;</i>`, { parse_mode: "HTML" });
                }
                saveGaransiText(text);
                return ctx.reply(`✅ <b>Sistem Garansi berhasil diubah!</b>\n\n━━━━━━━━━━━━━━━━━━━━\n${text}`, { parse_mode: "HTML" });
            }


            // ===== USERLIST =====
            case "userlist": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const users = loadUsers();
                if (users.length === 0) return ctx.reply("Belum ada user.");
                let uText = `<b>📊 Total Users: ${users.length}</b>\n\n`;
                users.slice(0, 20).forEach((u, i) => { uText += `<b>${i + 1}. ${escapeHtml(u.first_name || "")}</b>\n<code>${u.id}</code> | @${escapeHtml(u.username || "-")} | Rp${toRupiah(u.total_spent || 0)}\n\n`; });
                if (users.length > 20) uText += `<i>...dan ${users.length - 20} lainnya</i>`;
                return ctx.reply(uText, { parse_mode: "HTML" });
            }

            // ===== BAN =====
            case "ban": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text) return ctx.reply(`Format: ${config.prefix}ban @username [alasan]`);
                const users = loadUsers();
                const input = text.split(" ")[0].replace("@", "").trim();
                const target = users.find(u => String(u.id) === input || (u.username && u.username.toLowerCase() === input.toLowerCase()));
                if (!target) return ctx.reply("❌ User tidak ditemukan.");
                if (isBlacklisted(target.id)) return ctx.reply("⚠️ User sudah di-blacklist.");
                const blacklist = loadBlacklist();
                blacklist.push({ id: target.id, username: target.username || "", first_name: target.first_name || "", reason: args.slice(1).join(" ") || "Tidak ada alasan", banned_at: new Date().toISOString() });
                saveBlacklist(blacklist);
                return ctx.reply(`🚫 <b>User Banned!</b>\n👤 ${escapeHtml(target.first_name)} | @${escapeHtml(target.username || "-")}\n🆔 <code>${target.id}</code>\n📝 ${escapeHtml(args.slice(1).join(" ") || "Tidak ada alasan")}`, { parse_mode: "HTML" });
            }

            // ===== UNBAN =====
            case "unban": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text) return ctx.reply(`Format: ${config.prefix}unban @username`);
                const input2 = text.replace("@", "").trim();
                const bl = loadBlacklist();
                const idx = bl.findIndex(b => String(b.id) === input2 || (b.username && b.username.toLowerCase() === input2.toLowerCase()));
                if (idx === -1) return ctx.reply("❌ User tidak ada di blacklist.");
                const removed = bl.splice(idx, 1)[0];
                saveBlacklist(bl);
                return ctx.reply(`✅ <b>Unbanned!</b> @${escapeHtml(removed.username || "-")}`, { parse_mode: "HTML" });
            }

            // ===== BANLIST =====
            case "banlist": case "blacklist": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const bl2 = loadBlacklist();
                if (bl2.length === 0) return ctx.reply("✅ Tidak ada user di blacklist.");
                let bText = `🚫 <b>Blacklist</b> (${bl2.length})\n\n`;
                bl2.forEach((b, i) => { bText += `${i + 1}. ${escapeHtml(b.first_name || "?")} | @${escapeHtml(b.username || "-")} | <code>${b.id}</code>\n📝 ${escapeHtml(b.reason)}\n\n`; });
                return ctx.reply(bText, { parse_mode: "HTML" });
            }


            // ===== SUPPORT/TICKET =====
            case "support": case "ticket": {
                if (!text) return ctx.reply(`🎫 <b>Buat Tiket Support:</b>\n<code>${config.prefix}support [pesan keluhan]</code>\n\nContoh: <code>${config.prefix}support VPS saya tidak bisa diakses</code>`, { parse_mode: "HTML" });
                const tickets = loadTickets();
                const ticketId = String(tickets.length + 1).padStart(3, "0");
                tickets.push({ id: ticketId, userId: fromId, username: userName, first_name: ctx.from.first_name || "", message: text, status: "open", replies: [], created_at: new Date().toISOString(), last_activity: new Date().toISOString(), closed_at: null });
                saveTickets(tickets);
                await ctx.reply(`🎫 <b>Tiket #${ticketId} Dibuat!</b>\n\n📝 ${escapeHtml(text)}\n⏳ Admin akan segera merespons.\n\n<i>Cek status: <code>${config.prefix}cektiket</code></i>`, { parse_mode: "HTML" });
                try { await ctx.telegram.sendMessage(config.ownerId, `🔔 <b>TIKET BARU! #${ticketId}</b>\n\n👤 @${escapeHtml(userName)} (<code>${fromId}</code>)\n📝 ${escapeHtml(text)}\n\n<i>Reply pesan ini untuk membalas.</i>`, { parse_mode: "HTML" }); } catch (e) {}
                return;
            }

            // ===== CEK TIKET =====
            case "cektiket": case "myticket": case "tiket": {
                const tickets = loadTickets();
                const myT = tickets.filter(t => t.userId === fromId);
                if (myT.length === 0) return ctx.reply("Belum ada tiket.");
                if (text) {
                    const t = myT.find(t2 => t2.id === text.replace("#", ""));
                    if (!t) return ctx.reply("❌ Tiket tidak ditemukan.");
                    let d = `🎫 <b>Tiket #${t.id}</b> ${t.status === "open" ? "🟢" : "🔴"}\n\n📝 ${escapeHtml(t.message)}\n📅 ${new Date(t.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n━━━━━━━━━━━━━━━━\n\n👤 <b>Anda:</b> ${escapeHtml(t.message)}\n\n`;
                    t.replies.forEach(r => { d += `${r.from === "admin" ? "👨‍💻 <b>Admin</b>" : "👤 <b>Anda</b>"} — ${new Date(r.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n${escapeHtml(r.message)}\n\n`; });
                    if (t.status === "open") d += `<i>Reply pesan ini untuk membalas.</i>`;
                    return ctx.reply(d, { parse_mode: "HTML" });
                }
                let tText = `🎫 <b>Tiket Anda</b>\n\n`;
                [...myT].reverse().slice(0, 5).forEach(t => { tText += `<b>#${t.id}</b> ${t.status === "open" ? "🟢" : "🔴"} | 💬 ${t.replies.length}\n📝 ${escapeHtml(t.message.substring(0, 40))}...\n\n`; });
                tText += `<i>Detail: <code>${config.prefix}cektiket [ID]</code></i>`;
                return ctx.reply(tText, { parse_mode: "HTML" });
            }

            // ===== TICKETS (OWNER) =====
            case "tickets": case "allticket": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const tickets = loadTickets().filter(t => t.status === "open");
                if (tickets.length === 0) return ctx.reply("✅ Tidak ada tiket terbuka.");
                let tText = `🎫 <b>Tiket Terbuka</b> (${tickets.length})\n\n`;
                [...tickets].reverse().slice(0, 10).forEach(t => { tText += `<b>#${t.id}</b> 👤 @${escapeHtml(t.username)} | 💬 ${t.replies.length}\n📝 ${escapeHtml(t.message.substring(0, 50))}\n\n`; });
                return ctx.reply(tText, { parse_mode: "HTML" });
            }

            // ===== REPLY TICKET =====
            case "reply": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text || !text.includes(" ")) return ctx.reply(`Format: <code>${config.prefix}reply [ID] [pesan]</code>`, { parse_mode: "HTML" });
                const [tid, ...msgParts] = text.split(" ");
                const replyMsg = msgParts.join(" ");
                const tickets = loadTickets();
                const idx = tickets.findIndex(t => t.id === tid.replace("#", "") && t.status === "open");
                if (idx === -1) return ctx.reply("❌ Tiket tidak ditemukan / sudah ditutup.");
                tickets[idx].replies.push({ from: "admin", message: replyMsg, timestamp: new Date().toISOString() });
                tickets[idx].last_activity = new Date().toISOString();
                saveTickets(tickets);
                try { await ctx.telegram.sendMessage(tickets[idx].userId, `💬 <b>Balasan Tiket #${tickets[idx].id}</b>\n\n💬 <b>Admin:</b>\n${escapeHtml(replyMsg)}\n\n<i>Reply pesan ini untuk membalas.</i>`, { parse_mode: "HTML" }); } catch (e) {}
                return ctx.reply(`✅ Balasan terkirim ke tiket <b>#${tid}</b>`, { parse_mode: "HTML" });
            }

            // ===== CLOSE TICKET =====
            case "closeticket": case "tutuptiket": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text) return ctx.reply(`Format: <code>${config.prefix}closeticket [ID]</code>`, { parse_mode: "HTML" });
                const tickets = loadTickets();
                const idx = tickets.findIndex(t => t.id === text.replace("#", ""));
                if (idx === -1) return ctx.reply("❌ Tiket tidak ditemukan.");
                tickets[idx].status = "closed"; tickets[idx].closed_at = new Date().toISOString();
                saveTickets(tickets);
                try { await ctx.telegram.sendMessage(tickets[idx].userId, `🔴 <b>Tiket #${text} Ditutup</b>\n\nJika masih ada masalah, buat tiket baru.`, { parse_mode: "HTML" }); } catch (e) {}
                return ctx.reply(`✅ Tiket <b>#${text}</b> ditutup.`, { parse_mode: "HTML" });
            }


            // ===== CLAIM GARANSI (USER) =====
            case "claimgaransi": case "claim": {
                if (!text) return ctx.reply(`🛡️ <b>Claim Garansi:</b>\n<code>${config.prefix}claimgaransi [alasan]</code>\n\nContoh: <code>${config.prefix}claimgaransi VPS mati tidak bisa diakses</code>`, { parse_mode: "HTML" });
                const users = loadUsers();
                const user = users.find(u => u.id === fromId);
                if (!user || !user.history || user.history.length === 0) return ctx.reply("❌ Anda belum pernah order. Tidak ada garansi aktif.");

                // Cek apakah ada pembelian yang masih dalam masa garansi
                const now = Date.now();
                const activeOrders = user.history.filter(h => {
                    const garansiDays = h.garansiDays || (h.hasGaransi ? (config.garansiDays || 30) : (config.garansiBaseDays || 12));
                    const orderTime = new Date(h.timestamp).getTime();
                    const expiry = orderTime + (garansiDays * 24 * 60 * 60 * 1000);
                    return now <= expiry;
                });

                if (activeOrders.length === 0) return ctx.reply("❌ Tidak ada garansi aktif.\n\nMasa garansi sudah habis.");

                // Cek apakah sudah pernah claim untuk order terakhir
                const claims = loadClaims();
                const lastOrder = activeOrders[activeOrders.length - 1];
                const alreadyClaimed = claims.find(c => c.userId === fromId && c.product === lastOrder.product && c.orderTimestamp === lastOrder.timestamp && c.status !== "rejected");
                if (alreadyClaimed) return ctx.reply(`⚠️ Anda sudah memiliki claim aktif untuk <b>${escapeHtml(lastOrder.product)}</b>.\n\nStatus: ${alreadyClaimed.status === "pending" ? "⏳ Menunggu" : alreadyClaimed.status === "approved" ? "✅ Disetujui" : "❌ Ditolak"}\n\nCek: <code>${config.prefix}cekclaim</code>`, { parse_mode: "HTML" });

                const claimId = String(claims.length + 1).padStart(3, "0");
                const orderTime = new Date(lastOrder.timestamp).getTime();
                const expiryDate = new Date(orderTime + (GARANSI_DAYS * 24 * 60 * 60 * 1000));

                claims.push({
                    id: claimId,
                    userId: fromId,
                    username: userName,
                    product: lastOrder.product,
                    amount: lastOrder.amount,
                    orderTimestamp: lastOrder.timestamp,
                    garansiExpiry: expiryDate.toISOString(),
                    reason: text,
                    status: "pending",
                    adminReply: null,
                    newAccount: null,
                    created_at: new Date().toISOString(),
                    resolved_at: null
                });
                saveClaims(claims);

                await ctx.reply(`🛡️ <b>Claim Garansi #${claimId} Dibuat!</b>\n\n📦 Produk: ${escapeHtml(lastOrder.product)}\n📝 Alasan: ${escapeHtml(text)}\n⏳ Garansi berlaku sampai: ${expiryDate.toLocaleDateString("id-ID")}\n\n⏳ Menunggu persetujuan admin.\n\nCek status: <code>${config.prefix}cekclaim</code>`, { parse_mode: "HTML" });

                // Notif ke owner
                try {
                    await ctx.telegram.sendMessage(config.ownerId,
                        `🛡️ <b>CLAIM GARANSI BARU! #${claimId}</b>\n\n` +
                        `👤 @${escapeHtml(userName)} (<code>${fromId}</code>)\n` +
                        `📦 Produk: ${escapeHtml(lastOrder.product)}\n` +
                        `💰 Harga: Rp${toRupiah(lastOrder.amount)}\n` +
                        `📅 Beli: ${new Date(lastOrder.timestamp).toLocaleDateString("id-ID")}\n` +
                        `📝 Alasan: ${escapeHtml(text)}\n\n` +
                        `✅ <code>${config.prefix}approve ${claimId}</code>\n` +
                        `❌ <code>${config.prefix}reject ${claimId} [alasan]</code>`,
                        { parse_mode: "HTML" });
                } catch (e) {}
                return;
            }

            // ===== CEK CLAIM (USER) =====
            case "cekclaim": case "myclaim": {
                const claims = loadClaims();
                const myClaims = claims.filter(c => c.userId === fromId);
                if (myClaims.length === 0) return ctx.reply("Belum ada claim garansi.");

                if (text) {
                    const c = myClaims.find(c2 => c2.id === text.replace("#", ""));
                    if (!c) return ctx.reply("❌ Claim tidak ditemukan.");
                    const statusIcon = c.status === "pending" ? "⏳" : c.status === "approved" ? "✅" : "❌";
                    let detail = `🛡️ <b>Claim #${c.id}</b> ${statusIcon}\n\n` +
                        `📦 Produk: ${escapeHtml(c.product)}\n` +
                        `📝 Alasan: ${escapeHtml(c.reason)}\n` +
                        `📅 Diajukan: ${new Date(c.created_at).toLocaleDateString("id-ID")}\n` +
                        `🛡️ Garansi sampai: ${new Date(c.garansiExpiry).toLocaleDateString("id-ID")}\n` +
                        `📊 Status: <b>${c.status.toUpperCase()}</b>\n`;
                    if (c.adminReply) detail += `\n💬 Admin: ${escapeHtml(c.adminReply)}`;
                    if (c.newAccount) detail += `\n\n🔑 <b>Akun Pengganti:</b>\n<code>${escapeHtml(c.newAccount)}</code>`;
                    return ctx.reply(detail, { parse_mode: "HTML" });
                }

                let cText = `🛡️ <b>Claim Garansi Anda</b>\n\n`;
                [...myClaims].reverse().slice(0, 5).forEach(c => {
                    const statusIcon = c.status === "pending" ? "⏳" : c.status === "approved" ? "✅" : "❌";
                    cText += `<b>#${c.id}</b> ${statusIcon} | ${escapeHtml(c.product)}\n📝 ${escapeHtml(c.reason.substring(0, 40))}...\n\n`;
                });
                cText += `<i>Detail: <code>${config.prefix}cekclaim [ID]</code></i>`;
                return ctx.reply(cText, { parse_mode: "HTML" });
            }

            // ===== CLAIMS LIST (OWNER) =====
            case "claims": case "allclaim": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const claims = loadClaims();
                const pending = claims.filter(c => c.status === "pending");
                if (pending.length === 0) return ctx.reply("✅ Tidak ada claim pending.");
                let cText = `🛡️ <b>Claim Pending</b> (${pending.length})\n\n`;
                [...pending].reverse().slice(0, 10).forEach(c => {
                    cText += `<b>#${c.id}</b> 👤 @${escapeHtml(c.username)}\n📦 ${escapeHtml(c.product)}\n📝 ${escapeHtml(c.reason.substring(0, 50))}\n✅ <code>${config.prefix}approve ${c.id}</code> | ❌ <code>${config.prefix}reject ${c.id}</code>\n\n`;
                });
                return ctx.reply(cText, { parse_mode: "HTML" });
            }

            // ===== APPROVE CLAIM (OWNER) =====
            case "approve": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text) return ctx.reply(`Format: <code>${config.prefix}approve [ID] [akun pengganti]</code>\n\nContoh: <code>${config.prefix}approve 001 IP: 1.2.3.4\\nUser: root\\nPass: abc123</code>`, { parse_mode: "HTML" });
                const parts = text.split(" ");
                const claimId = parts[0].replace("#", "");
                const newAccount = parts.slice(1).join(" ") || null;

                const claims = loadClaims();
                const idx = claims.findIndex(c => c.id === claimId);
                if (idx === -1) return ctx.reply("❌ Claim tidak ditemukan.");
                if (claims[idx].status !== "pending") return ctx.reply(`⚠️ Claim #${claimId} sudah di-${claims[idx].status}.`);

                claims[idx].status = "approved";
                claims[idx].newAccount = newAccount;
                claims[idx].resolved_at = new Date().toISOString();
                saveClaims(claims);

                // Notif ke user
                let userMsg = `✅ <b>Claim Garansi #${claimId} DISETUJUI!</b>\n\n📦 Produk: ${escapeHtml(claims[idx].product)}\n`;
                if (newAccount) {
                    userMsg += `\n🔑 <b>Akun Pengganti:</b>\n<blockquote>${escapeHtml(newAccount)}</blockquote>\n`;
                } else {
                    userMsg += `\n⏳ Admin akan mengirim akun pengganti segera.\nGunakan <code>${config.prefix}cekclaim ${claimId}</code> untuk cek update.`;
                }
                try { await ctx.telegram.sendMessage(claims[idx].userId, userMsg, { parse_mode: "HTML" }); } catch (e) {}

                return ctx.reply(`✅ Claim <b>#${claimId}</b> approved!${newAccount ? " Akun pengganti terkirim." : " Kirim akun nanti: " + config.prefix + "sendclaim " + claimId + " [data akun]"}`, { parse_mode: "HTML" });
            }

            // ===== REJECT CLAIM (OWNER) =====
            case "reject": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text) return ctx.reply(`Format: <code>${config.prefix}reject [ID] [alasan]</code>`, { parse_mode: "HTML" });
                const parts2 = text.split(" ");
                const claimId2 = parts2[0].replace("#", "");
                const reason = parts2.slice(1).join(" ") || "Tidak memenuhi syarat garansi";

                const claims = loadClaims();
                const idx2 = claims.findIndex(c => c.id === claimId2);
                if (idx2 === -1) return ctx.reply("❌ Claim tidak ditemukan.");
                if (claims[idx2].status !== "pending") return ctx.reply(`⚠️ Claim #${claimId2} sudah di-${claims[idx2].status}.`);

                claims[idx2].status = "rejected";
                claims[idx2].adminReply = reason;
                claims[idx2].resolved_at = new Date().toISOString();
                saveClaims(claims);

                // Notif ke user
                try {
                    await ctx.telegram.sendMessage(claims[idx2].userId,
                        `❌ <b>Claim Garansi #${claimId2} DITOLAK</b>\n\n📦 Produk: ${escapeHtml(claims[idx2].product)}\n📝 Alasan: ${escapeHtml(reason)}\n\nHubungi admin jika ada pertanyaan.`,
                        { parse_mode: "HTML" });
                } catch (e) {}

                return ctx.reply(`❌ Claim <b>#${claimId2}</b> ditolak. User sudah dinotifikasi.`, { parse_mode: "HTML" });
            }

            // ===== SEND CLAIM ACCOUNT (OWNER) =====
            case "sendclaim": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text || !text.includes(" ")) return ctx.reply(`Format: <code>${config.prefix}sendclaim [ID] [data akun]</code>`, { parse_mode: "HTML" });
                const parts3 = text.split(" ");
                const claimId3 = parts3[0].replace("#", "");
                const accountData = parts3.slice(1).join(" ");

                const claims = loadClaims();
                const idx3 = claims.findIndex(c => c.id === claimId3);
                if (idx3 === -1) return ctx.reply("❌ Claim tidak ditemukan.");
                if (claims[idx3].status !== "approved") return ctx.reply("⚠️ Claim belum di-approve.");

                claims[idx3].newAccount = accountData;
                saveClaims(claims);

                // Kirim ke user
                try {
                    await ctx.telegram.sendMessage(claims[idx3].userId,
                        `🔑 <b>Akun Pengganti (Garansi #${claimId3})</b>\n\n📦 Produk: ${escapeHtml(claims[idx3].product)}\n\n<blockquote>${escapeHtml(accountData)}</blockquote>\n\nTerima kasih telah menggunakan DIGICORE! 🙏`,
                        { parse_mode: "HTML" });
                } catch (e) {}

                return ctx.reply(`✅ Akun pengganti terkirim ke user untuk claim <b>#${claimId3}</b>`, { parse_mode: "HTML" });
            }


            // ===== UPDATE BOT (OWNER) =====
            case "update": case "upgrade": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const statusMsg = await ctx.reply("🔄 <b>Updating bot...</b>\n\n⏳ Pulling latest code dari GitHub...", { parse_mode: "HTML" });

                const { exec } = require("child_process");
                const runCmd = (cmd) => new Promise((resolve) => {
                    exec(cmd, { cwd: __dirname, timeout: 30000 }, (err, stdout, stderr) => {
                        resolve({ error: err, stdout: stdout?.trim() || "", stderr: stderr?.trim() || "" });
                    });
                });

                // Step 1: Git fetch & reset
                const fetch = await runCmd("git fetch origin fix/bug-fixes-error-handling");
                if (fetch.error) {
                    return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, `❌ <b>Update Gagal!</b>\n\n<code>${escapeHtml(fetch.stderr || fetch.error.message)}</code>`, { parse_mode: "HTML" });
                }

                const pull = await runCmd("git reset --hard origin/fix/bug-fixes-error-handling");
                if (pull.error) {
                    return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, `❌ <b>Update Gagal!</b>\n\n<code>${escapeHtml(pull.stderr || pull.error.message)}</code>`, { parse_mode: "HTML" });
                }

                // Step 2: Install dependencies jika ada perubahan
                await runCmd("npm install --production 2>/dev/null");

                // Step 3: Notify success
                const log = await runCmd("git log --oneline -3");
                await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null,
                    `✅ <b>Update Berhasil!</b>\n\n` +
                    `📦 Latest commits:\n<code>${escapeHtml(log.stdout)}</code>\n\n` +
                    `🔄 Bot akan restart dalam 3 detik...`,
                    { parse_mode: "HTML" });

                // Step 4: Restart via PM2
                setTimeout(async () => {
                    try {
                        const restart = await runCmd("pm2 restart DIGICORE");
                        if (restart.error) {
                            // Fallback: restart manual
                            process.exit(0);
                        }
                    } catch (e) {
                        process.exit(0);
                    }
                }, 3000);
                break;
            }


            // ===== ADD STOCK VPS =====
            case "addstockvps": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text.includes("|")) return ctx.reply(`Format:\n<code>${config.prefix}addstockvps kategori|keterangan|data akun|harga</code>\n<code>${config.prefix}addstockvps kategori|keterangan|data akun|harga garansi|harga no garansi</code>\n\nContoh 1 harga (markup otomatis +Rp${toRupiah(config.garansiMarkup || 10000)}):\n<code>${config.prefix}addstockvps 2vCPU 8GB RAM|Ubuntu 24.04 - SG|IP: 1.2.3.4\\nUser: root\\nPass: xxx|25000</code>\n\nContoh 2 harga (manual):\n<code>${config.prefix}addstockvps 2vCPU 8GB RAM|Ubuntu 24.04 - SG|IP: 1.2.3.4\\nUser: root\\nPass: xxx|35000|25000</code>`, { parse_mode: "HTML" });
                const parts = text.split("|").map(v => v.trim());
                if (parts.length < 4) return ctx.reply("Format tidak valid! Minimal: kategori|keterangan|data akun|harga");
                const category = parts[0];
                const description = parts[1];
                const accountData = parts[2];
                let priceGaransi, priceNoGaransi;

                if (parts.length >= 5 && !isNaN(parseInt(parts[3])) && !isNaN(parseInt(parts[4]))) {
                    // Manual 2 harga
                    priceGaransi = parseInt(parts[3]);
                    priceNoGaransi = parseInt(parts[4]);
                } else {
                    // 1 harga → auto markup
                    priceNoGaransi = parseInt(parts[3]);
                    priceGaransi = priceNoGaransi + (config.garansiMarkup || 10000);
                }

                if (!category || !description || !accountData || isNaN(priceNoGaransi)) return ctx.reply("Data tidak valid!");
                const vpsData = loadVps();
                if (!vpsData[category]) vpsData[category] = [];
                let existing = vpsData[category].find(i => i.description.toLowerCase() === description.toLowerCase() && i.priceNoGaransi === priceNoGaransi);
                if (existing) { existing.accounts.push(accountData); existing.stock = existing.accounts.length; }
                else { vpsData[category].push({ description, price: priceGaransi, priceGaransi, priceNoGaransi, stock: 1, accounts: [accountData], added_date: new Date().toISOString() }); }
                saveVps(vpsData);
                const totalInCat = vpsData[category].reduce((s, i) => s + i.accounts.length, 0);
                return ctx.reply(`✅ <b>Stock VPS Berhasil ditambahkan!</b>\n\n📁 Kategori: ${escapeHtml(category)}\n📝 Keterangan: ${escapeHtml(description)}\n🛡️ Harga Garansi: Rp${toRupiah(priceGaransi)}\n⚡ Harga No Garansi: Rp${toRupiah(priceNoGaransi)}\n📦 Total stok kategori: ${totalInCat}`, { parse_mode: "HTML" });
            }

            // ===== DEL STOCK VPS =====
            case "delstockvps": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const vpsData = loadVps();
                const cats = Object.keys(vpsData);
                if (cats.length === 0) return ctx.reply("Tidak ada stok VPS.");
                const btns = cats.map(c => [{ text: `💻 ${c} (${vpsData[c].reduce((s, i) => s + i.accounts.length, 0)})`, callback_data: `delvps_cat|${c}` }]);
                return ctx.reply("Pilih kategori untuk hapus:", { reply_markup: { inline_keyboard: btns } });
            }

            // ===== GET STOCK VPS =====
            case "getstockvps": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const vpsData = loadVps();
                const cats = Object.keys(vpsData);
                if (cats.length === 0) return ctx.reply("Stok VPS kosong.");
                let sText = `💻 <b>Stok VPS/RDP</b>\n\n`;
                cats.forEach(c => {
                    const items = vpsData[c];
                    sText += `<b>📁 ${escapeHtml(c)}</b>\n`;
                    items.forEach(i => { sText += `├ ${escapeHtml(i.description)} | Rp${toRupiah(i.price)} | 📦 ${i.accounts.length}\n`; });
                    sText += `\n`;
                });
                return ctx.reply(sText, { parse_mode: "HTML" });
            }


            // ===== BROADCAST =====
            case "broadcast": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const replyMsg = ctx.message.reply_to_message;
                const bcText = text;
                if (!replyMsg && !bcText) return ctx.reply(`Cara: ${config.prefix}broadcast [pesan]\nAtau reply pesan dengan ${config.prefix}broadcast`);
                const users = loadUsers();
                const activeUsers = users.filter(u => !isInactiveUser(u) && !isBlacklisted(u.id));
                if (activeUsers.length === 0) return ctx.reply("❌ Tidak ada user aktif.");
                const statusMsg = await ctx.reply(`🚀 Broadcast dimulai... 0/${activeUsers.length}`);
                let success = 0, failed = 0;
                for (let i = 0; i < activeUsers.length; i++) {
                    const uid = activeUsers[i].id;
                    try {
                        if (replyMsg) await ctx.telegram.copyMessage(uid, ctx.chat.id, replyMsg.message_id);
                        else await ctx.telegram.sendMessage(uid, bcText);
                        success++;
                    } catch (e) { failed++; if (isDeadUserError(e)) markUserDead(users, uid, e); }
                    if ((i + 1) % 10 === 0) try { await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, `🚀 Progress: ${i + 1}/${activeUsers.length}\n✅ ${success} | ❌ ${failed}`); } catch {}
                    await new Promise(r => setTimeout(r, 250));
                }
                saveUsers(users);
                return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, `✅ Broadcast Selesai!\n\n📊 Total: ${activeUsers.length}\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`);
            }

            // ===== BACKUP =====
            case "backup": case "backupsc": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                try {
                    await ctx.reply("🔄 Backup Processing...");
                    const archiver = require('archiver');
                    const tgl = new Date();
                    const name = `DIGICORE-Backup-${tgl.getDate()}-${tgl.getMonth() + 1}-${tgl.getFullYear()}`;
                    const exclude = ["node_modules", "package-lock.json", ".git", ".cache"];
                    const files = fs.readdirSync(__dirname).filter(f => !exclude.includes(f) && !f.startsWith('.') && !f.endsWith('.zip'));
                    if (!files.length) return ctx.reply("❌ Tidak ada file.");
                    const output = fs.createWriteStream(`./${name}.zip`);
                    const archive = archiver("zip", { zlib: { level: 9 } });
                    output.on('close', async () => {
                        try { await ctx.telegram.sendDocument(config.ownerId, { source: `./${name}.zip` }, { caption: `✅ <b>Backup selesai!</b>\n📁 ${name}.zip`, parse_mode: "HTML" }); fs.unlinkSync(`./${name}.zip`); } catch (e) { await ctx.reply("❌ Gagal kirim backup."); }
                    });
                    archive.on('error', () => ctx.reply("❌ Error backup."));
                    archive.pipe(output);
                    for (let f of files) { const s = fs.statSync(f); s.isDirectory() ? archive.directory(f, f) : archive.file(f, { name: f }); }
                    await archive.finalize();
                } catch (e) { await ctx.reply("❌ Error backup: " + e.message); }
                break;
            }

            default: break;
        }
    });


    // ===== CALLBACK HANDLERS =====
    bot.action("buy_vps", async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        const vpsData = loadVps();
        const categories = Object.keys(vpsData);
        if (categories.length === 0) return ctx.reply("Stok VPS/RDP sedang kosong.");
        const btns = categories.map(cat => {
            const totalStok = vpsData[cat].reduce((s, i) => s + (i.accounts ? i.accounts.length : 0), 0);
            return [{ text: `${cat} • ${totalStok} tersedia`, callback_data: `vps_category_buy|${cat}` }];
        });
        return ctx.reply(`◈ 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄 — 𝐎𝐫𝐝𝐞𝐫\n━━━━━━━━━━━━━━━━━━━━\n\nPilih kategori server:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } });
    });

    bot.action("show_review", async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        const reviews = loadReviews();
        if (reviews.length === 0) return ctx.reply("Belum ada review.");
        const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
        let rText = `<b>📝 Review Pelanggan</b>\n\n${"⭐".repeat(Math.round(avg))} <b>${avg}/5</b> (${reviews.length} review)\n━━━━━━━━━━━━━━━━\n\n`;
        [...reviews].reverse().slice(0, 10).forEach(r => {
            rText += `${"⭐".repeat(r.rating)} <b>(${r.rating}/5)</b>\n👤 ${escapeHtml(r.username || "Anonim")}\n📦 ${escapeHtml(r.product)}\n`;
            if (r.comment) rText += `💬 "${escapeHtml(r.comment)}"\n`;
            rText += `📅 ${new Date(r.timestamp).toLocaleDateString('id-ID')}\n\n`;
        });
        return ctx.reply(rText, { parse_mode: "HTML" });
    });
    bot.action("show_ticket", async (ctx) => { try { await ctx.answerCbQuery(); } catch {} ctx.reply(`Buat tiket: <code>${config.prefix}support [pesan]</code>\nCek tiket: <code>${config.prefix}cektiket</code>`, { parse_mode: "HTML" }); });
    bot.action("owner_menu", async (ctx) => { try { await ctx.answerCbQuery(); } catch {} return ctx.reply(menuTextOwn(), { parse_mode: "HTML" }); });
    bot.action("snk_menu", async (ctx) => { try { await ctx.answerCbQuery(); } catch {} return ctx.reply(loadGaransiText(), { parse_mode: "HTML" }); });

    bot.action("cancel_order", async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        const userId = ctx.from.id;
        if (orders[userId]) { try { if (orders[userId].qrMessageId) await ctx.telegram.deleteMessage(orders[userId].chatId, orders[userId].qrMessageId); } catch {} delete orders[userId]; }
        return ctx.reply("❌ Order dibatalkan.");
    });

    // VPS category buy
    bot.action(/vps_category_buy\|(.+)/, async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        const category = ctx.match[1];
        const vpsData = loadVps();
        const items = vpsData[category];
        if (!items || items.length === 0) return ctx.reply("❌ Stok kosong.");
        const btns = items.map((item, i) => [{ text: `${item.description} • stok ${item.accounts.length}`, callback_data: `vps_buy_item|${category}|${i}` }]);
        btns.push([{ text: "↩️ Kembali", callback_data: "buy_vps" }]);
        return ctx.editMessageText(`◈ 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄 — ${escapeHtml(category)}\n━━━━━━━━━━━━━━━━━━━━\n\nPilih server:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } });
    });

    // VPS buy item - show warranty options
    bot.action(/vps_buy_item\|(.+)/, async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const vpsData = loadVps();
        const items = vpsData[category];
        if (!items || !items[index]) return ctx.reply("❌ Item tidak ditemukan!");
        const item = items[index];
        if (!item.accounts || item.accounts.length === 0) return ctx.reply("❌ Stok habis!");

        const priceGaransi = item.priceGaransi || item.price;
        const priceNoGaransi = item.priceNoGaransi || item.price;

        const btns = [
            [{ text: `🛡️ Garansi ${config.garansiDays || 30} Hari • Rp${toRupiah(priceGaransi)}`, callback_data: `vps_pay|${category}|${index}|garansi` }],
            [{ text: `⚡ Garansi ${config.garansiBaseDays || 12} Hari • Rp${toRupiah(priceNoGaransi)}`, callback_data: `vps_pay|${category}|${index}|nogaransi` }],
            [{ text: "↩️ Kembali", callback_data: `vps_category_buy|${category}` }]
        ];

        return ctx.editMessageText(`◈ 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄\n━━━━━━━━━━━━━━━━━━━━\n\n📦 ${escapeHtml(item.description)}\n\nPilih paket:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } });
    });

    // VPS pay - process payment after warranty choice
    bot.action(/vps_pay\|(.+)/, async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        await ctx.deleteMessage();
        const [category, indexStr, warrantyType] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const vpsData = loadVps();
        const items = vpsData[category];
        if (!items || !items[index]) return ctx.reply("❌ Item tidak ditemukan!");
        const item = items[index];
        if (!item.accounts || item.accounts.length === 0) return ctx.reply("❌ Stok habis!");

        const hasGaransi = warrantyType === "garansi";
        const basePrice = hasGaransi ? (item.priceGaransi || item.price) : (item.priceNoGaransi || item.price);
        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const price = basePrice + fee;
        const name = `VPS ${category} (${item.description})`;
        const garansiDaysUsed = hasGaransi ? (config.garansiDays || 30) : (config.garansiBaseDays || 12);
        const paketLabel = hasGaransi ? `🛡️ Garansi ${garansiDaysUsed} Hari` : `⚡ Garansi ${garansiDaysUsed} Hari`;
        const paymentType = config.paymentGateway;

        let pay;
        try {
            pay = await createPayment(paymentType, price, config, { customerName: `@${ctx.from.username || ctx.from.first_name}` });
        } catch (err) {
            console.error("[CREATE PAYMENT ERROR]", err.message);
            return ctx.reply(`❌ Gagal membuat pembayaran: ${err.message}`);
        }

        orders[userId] = { type: "vps_stock", category, itemIndex: index, name, description: item.description, amount: price, fee, orderId: pay.orderId || null, transactionId: pay.transactionId || null, paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000, hasGaransi, garansiDays: garansiDaysUsed, paketLabel };

        let qrMsg;
        try {
            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
            qrMsg = await ctx.replyWithPhoto(photo, { caption: `📦 Produk: ${name}\n${paketLabel}\n💰 Harga: Rp${toRupiah(price)} (Fee Rp${fee})\n⏳ Expired QRIS: 6 Menit\n\nScan QRIS untuk pembayaran.`, parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
        } catch (err) {
            console.error("[SEND QR ERROR]", err.message);
            delete orders[userId];
            return ctx.reply(`❌ Gagal mengirim QRIS: ${err.message}`);
        }
        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });


    // ===== RATING HANDLERS =====
    bot.action(/^rate\|(.+)$/, async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        const userId = ctx.from.id;
        const rating = ctx.match[1];
        const pending = pendingReviews[userId];
        if (!pending) return ctx.editMessageText("⚠️ Tidak ada transaksi untuk di-review.");
        if (rating === "skip") { delete pendingReviews[userId]; return ctx.editMessageText("⏭️ Review dilewati. Terima kasih!"); }
        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum)) return;
        pendingReviews[userId].rating = ratingNum;
        await ctx.editMessageText(`${"⭐".repeat(ratingNum)}\n\nRating <b>${ratingNum}/5</b> untuk <b>${escapeHtml(pending.product)}</b>\n\n💬 Tulis komentar (opsional):`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "⏭️ Simpan Tanpa Komentar", callback_data: "rate_save_no_comment" }]] } });
    });

    bot.action("rate_save_no_comment", async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        const userId = ctx.from.id;
        const pending = pendingReviews[userId];
        if (!pending || !pending.rating) return ctx.editMessageText("⚠️ Tidak ada review pending.");
        const reviews = loadReviews();
        reviews.push({ userId, username: ctx.from.username || ctx.from.first_name, product: pending.product, type: pending.type, rating: pending.rating, comment: "", amount: pending.amount, timestamp: new Date().toISOString() });
        saveReviews(reviews);
        delete pendingReviews[userId];
        return ctx.editMessageText(`✅ Review tersimpan!\n${"⭐".repeat(pending.rating)} (${pending.rating}/5)\n📦 ${escapeHtml(pending.product)}\nTerima kasih! 🙏`, { parse_mode: "HTML" });
    });

    // Delete VPS stock handler
    bot.action(/delvps_cat\|(.+)/, async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        if (!isOwner(ctx)) return;
        const category = ctx.match[1];
        const vpsData = loadVps();
        if (!vpsData[category]) return ctx.editMessageText("❌ Kategori tidak ditemukan.");
        const items = vpsData[category];
        const btns = items.map((item, i) => [{ text: `${item.description} (stok ${item.accounts.length})`, callback_data: `delvps_item|${category}|${i}` }]);
        btns.push([{ text: "🗑️ Hapus Semua Kategori", callback_data: `delvps_all|${category}` }]);
        return ctx.editMessageText(`Pilih item untuk hapus dari <b>${escapeHtml(category)}</b>:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } });
    });

    bot.action(/delvps_item\|(.+)/, async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        if (!isOwner(ctx)) return;
        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const vpsData = loadVps();
        if (!vpsData[category] || !vpsData[category][index]) return ctx.editMessageText("❌ Tidak ditemukan.");
        const item = vpsData[category][index];
        item.accounts.shift(); item.stock = item.accounts.length;
        if (item.accounts.length === 0) { vpsData[category].splice(index, 1); if (vpsData[category].length === 0) delete vpsData[category]; }
        saveVps(vpsData);
        return ctx.editMessageText(`✅ 1 akun dihapus dari ${escapeHtml(category)} - ${escapeHtml(item.description)}`, { parse_mode: "HTML" });
    });

    bot.action(/delvps_all\|(.+)/, async (ctx) => {
        try { await ctx.answerCbQuery(); } catch {}
        if (!isOwner(ctx)) return;
        const category = ctx.match[1];
        const vpsData = loadVps();
        delete vpsData[category];
        saveVps(vpsData);
        return ctx.editMessageText(`✅ Kategori <b>${escapeHtml(category)}</b> berhasil dihapus.`, { parse_mode: "HTML" });
    });


    // ===== PAYMENT CHECK =====
    function startCheck(userId, ctx) {
        let count = 0;
        const intv = setInterval(async () => {
            count++;
            if (count > 52) { clearInterval(intv); delete orders[userId]; return; }
            const order = orders[userId];
            if (!order) { clearInterval(intv); return; }
            if (Date.now() > order.expireAt) {
                clearInterval(intv);
                try { if (order.qrMessageId) await ctx.telegram.deleteMessage(order.chatId, order.qrMessageId); } catch {}
                await ctx.telegram.sendMessage(order.chatId, "⏳ Order expired. Silakan order ulang.");
                delete orders[userId]; return;
            }

            let paid = false;
            try { paid = await cekPaid(order.paymentType, order, config, { userId, orders, toRupiah }); } catch (e) { return; }
            if (!paid) return;

            clearInterval(intv);
            const o = orders[userId];
            if (!o) return;

            // Update history
            updateUserHistory(userId, { product: o.name, amount: o.amount, type: o.type, hasGaransi: o.hasGaransi || false, garansiDays: o.garansiDays || (config.garansiBaseDays || 12) });
            const users = loadUsers();
            const uIdx = users.findIndex(u => u.id === userId);
            if (uIdx !== -1) { users[uIdx].total_spent = (users[uIdx].total_spent || 0) + o.amount; saveUsers(users); }

            // Konfirmasi pembayaran
            await ctx.telegram.sendMessage(o.chatId, `✅ Pembayaran Berhasil!\n\n📦 Produk: ${o.name}\n💰 Harga: Rp${toRupiah(o.amount)}`, { parse_mode: "Markdown" });
            try { if (o.qrMessageId) await ctx.telegram.deleteMessage(o.chatId, o.qrMessageId); } catch {}
            delete orders[userId];

            // ===== NOTIF ORDER KE OWNER =====
            try {
                const buyer = users.find(u => u.id === userId);
                await ctx.telegram.sendMessage(config.ownerId,
                    `🔔 <b>ORDER BERHASIL!</b>\n\n` +
                    `👤 @${escapeHtml(buyer?.username || "unknown")} (<code>${userId}</code>)\n` +
                    `📦 ${escapeHtml(o.name)}\n` +
                    `💰 Rp${toRupiah(o.amount)}\n` +
                    `🕐 ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
                    { parse_mode: "HTML" });
            } catch (e) {}

            // ===== KIRIM VPS =====
            if (o.type === "vps_stock") {
                const vpsData = loadVps();
                if (vpsData[o.category] && vpsData[o.category][o.itemIndex]) {
                    const item = vpsData[o.category][o.itemIndex];
                    const sentVps = item.accounts.shift();
                    item.stock = item.accounts.length;
                    if (item.stock <= 0) { vpsData[o.category].splice(o.itemIndex, 1); if (vpsData[o.category].length === 0) delete vpsData[o.category]; }
                    saveVps(vpsData);

                    // Loading animasi
                    const steps = [
                        { pct: 0, status: '🔄 Inisialisasi server...' },
                        { pct: 20, status: '🖥️ Mengalokasikan resource...' },
                        { pct: 40, status: '💿 Menginstal sistem operasi...' },
                        { pct: 60, status: '🌐 Mengkonfigurasi jaringan...' },
                        { pct: 80, status: '🔐 Menyiapkan kredensial...' },
                        { pct: 100, status: '✅ Server siap digunakan!' },
                    ];
                    const buildBar = (pct) => {
                        const filled = Math.round(pct / 10);
                        return '▓'.repeat(filled) + '░'.repeat(10 - filled);
                    };
                    const buildText = (s) => `◈ 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄 — 𝐏𝐫𝐨𝐯𝐢𝐬𝐢𝐨𝐧𝐢𝐧𝐠\n━━━━━━━━━━━━━━━━━━━━\n\n💻 ${o.name}\n\n${buildBar(s.pct)}  ${s.pct}%\n\n${s.status}\n\n━━━━━━━━━━━━━━━━━━━━\n⏳ Mohon tunggu sebentar...`;
                    let loadMsgId = null;
                    try { const lm = await ctx.telegram.sendMessage(o.chatId, buildText(steps[0])); loadMsgId = lm.message_id; } catch {}
                    for (let i = 1; i < steps.length; i++) {
                        await new Promise(r => setTimeout(r, 2000));
                        if (loadMsgId) try { await ctx.telegram.editMessageText(o.chatId, loadMsgId, null, buildText(steps[i])); } catch {}
                    }
                    await new Promise(r => setTimeout(r, 1000));
                    if (loadMsgId) try { await ctx.telegram.deleteMessage(o.chatId, loadMsgId); } catch {}

                    // Parse VPS data
                    const getVal = (label) => { const line = String(sentVps).split("\n").find(v => v.toLowerCase().startsWith(label.toLowerCase() + ":")); return line ? line.split(":").slice(1).join(":").trim() : "-"; };
                    const ip = getVal("IP"); const port = getVal("PORT"); const user = getVal("USER"); const password = getVal("PASSWORD");

                    const garansiDaysOrder = o.garansiDays || (o.hasGaransi ? (config.garansiDays || 30) : (config.garansiBaseDays || 12));
                    const garansiInfo = `\n🛡️ Paket     : Garansi ${garansiDaysOrder} Hari\n\n━━━ 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐬𝐢 ━━━\n\n📅 Tanggal    : ${new Date().toLocaleDateString("id-ID")}\n🛡️ Garansi    : ${garansiDaysOrder} Hari\n⚠️ Claim      : /claimgaransi`;

                    const vpsText = `<blockquote>◈ 𝐃𝐈𝐆𝐈𝐂𝐎𝐑𝐄 — 𝐎𝐫𝐝𝐞𝐫 𝐂𝐨𝐧𝐟𝐢𝐫𝐦𝐞𝐝\n\n┏━━━━━━━━━━━━━━━━━━━┓\n┃  ✅ PEMBAYARAN SUKSES\n┗━━━━━━━━━━━━━━━━━━━┛\n\n⟢ Produk  : ${escapeHtml(o.name)}\n⟢ Harga   : Rp${toRupiah(o.amount)}${garansiInfo}\n\n━━━ 𝐀𝐤𝐬𝐞𝐬 𝐒𝐞𝐫𝐯𝐞𝐫 ━━━\n\n🌐 IP       : ${ip}\n🔌 Port     : ${port}\n👤 User     : ${user}\n🔑 Pass     : ${password}\n\nTerima kasih telah mempercayai DIGICORE 🙏</blockquote>`;
                    try { await ctx.telegram.sendMessage(o.chatId, vpsText, { parse_mode: "HTML" }); } catch (e) {
                        await ctx.telegram.sendMessage(o.chatId, `✅ VPS/RDP BERHASIL\n\nData:\n${sentVps}\n\nTerima kasih!`);
                    }

                    // Cek stok menipis
                    await checkLowStock(bot);
                }
            }

            // ===== PROMPT RATING =====
            try {
                await new Promise(r => setTimeout(r, 3000));
                pendingReviews[userId] = { product: o.name, type: o.type, amount: o.amount, chatId: o.chatId, timestamp: new Date().toISOString() };
                await ctx.telegram.sendMessage(o.chatId, `⭐ <b>Bagaimana pengalaman Anda?</b>\n\nProduk: <b>${escapeHtml(o.name)}</b>\n\nBerikan rating:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "⭐ 1", callback_data: "rate|1" }, { text: "⭐ 2", callback_data: "rate|2" }, { text: "⭐ 3", callback_data: "rate|3" }, { text: "⭐ 4", callback_data: "rate|4" }, { text: "⭐ 5", callback_data: "rate|5" }], [{ text: "⏭️ Lewati", callback_data: "rate|skip" }]] } });
            } catch (e) {}

        }, 7000);
    }

    return bot;
};
