# DIGICORE — VPS & RDP Auto Order Bot

Telegram bot otomatis untuk penjualan VPS dan RDP dengan pembayaran QRIS instan.

---

## Fitur

| Fitur | Keterangan |
|-------|-----------|
| 💻 Auto Order VPS/RDP | Pembelian otomatis dengan QRIS |
| 🔔 Notif Order Real-time | Owner dapat notifikasi setiap ada penjualan |
| ⚠️ Notif Stok Menipis | Otomatis alert saat stok ≤ 2 |
| 🔄 Auto Backup | Backup otomatis setiap 6 jam ke Telegram |
| ⭐ Rating & Review | User bisa review setelah transaksi |
| 🎫 Ticket Support | Sistem tiket keluhan dengan reply langsung |
| 🔴 Auto Close Tiket | Tiket tidak aktif 48 jam otomatis ditutup |
| 🚫 Blacklist/Ban | Ban user bermasalah |
| 🔧 Maintenance Mode | Pause order saat update/restock |
| 📈 Statistik | Monitor revenue, transaksi, user |
| 📢 Broadcast | Kirim pesan ke semua user |

---

## Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/xyzval/DIGICORE.git
cd DIGICORE
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi

Edit file `config.js`:

```javascript
module.exports = {
  botToken: "TOKEN_BOT_DARI_BOTFATHER",
  prefix: "/",
  ownerName: "NAMA_TOKO",
  ownerUsername: "USERNAME_TELEGRAM_ANDA",
  ownerId: "ID_TELEGRAM_ANDA",

  paymentGateway: "violet",
  violet: {
    apiKey: "API_KEY_VIOLET",
    secretKey: "SECRET_KEY_VIOLET",
    live: true,
    codePayment: "QRIS"
  }
};
```

### 4. Jalankan Bot

```bash
# Development
node index.js

# Production (dengan PM2)
pm2 start index.js --name digicore
```

---

## Command

### User

| Command | Fungsi |
|---------|--------|
| `/menu` atau `/start` | Tampilkan menu utama |
| `/buyvps` | Beli VPS / RDP |
| `/profile` | Lihat profil & total spent |
| `/history` | Riwayat transaksi |
| `/review` | Lihat review pelanggan |
| `/ticket [pesan]` | Buat tiket keluhan |
| `/cektiket` | Lihat daftar tiket |
| `/cektiket [ID]` | Lihat detail percakapan tiket |

### Owner

| Command | Fungsi |
|---------|--------|
| `/stats` | Statistik revenue & transaksi |
| `/backup` | Backup manual ke Telegram |
| `/broadcast [pesan]` | Kirim pesan ke semua user |
| `/maintenance on/off` | Aktifkan/nonaktifkan maintenance |
| `/addstockvps` | Tambah stok VPS/RDP |
| `/delstockvps` | Hapus stok VPS/RDP |
| `/getstockvps` | Lihat semua stok |
| `/userlist` | Daftar semua user |
| `/ban @username [alasan]` | Ban user |
| `/unban @username` | Unban user |
| `/banlist` | Daftar user yang di-ban |
| `/tickets` | Lihat tiket terbuka |
| `/reply [ID] [pesan]` | Balas tiket |
| `/closeticket [ID]` | Tutup tiket |

---

## Cara Menambah Stok VPS/RDP

### Format:
```
/addstockvps kategori|keterangan|data akun|harga
```

### Contoh:
```
/addstockvps 2vCPU 8GB RAM 550SSD|Ubuntu 24.04 - SG|IP: 103.xx.xx.xx:22
User: root
Password: xxxx123|35000
```

### Penjelasan:
- **kategori** — Nama grup (misal: `2vCPU 8GB RAM 550SSD`)
- **keterangan** — Deskripsi OS & lokasi (misal: `Ubuntu 24.04 - SG`)
- **data akun** — Info yang dikirim ke pembeli (IP, user, password)
- **harga** — Harga dalam angka tanpa titik/Rp (misal: `35000`)

> Jika kategori + keterangan + harga sama, stok ditambahkan ke grup yang sudah ada.

---

## Sistem Tiket

### User:
- Buat tiket: `/ticket VPS tidak bisa diakses`
- Cek tiket: `/cektiket`
- Balas tiket: **Reply langsung** pesan balasan admin

### Owner:
- Lihat tiket: `/tickets`
- Balas tiket: **Reply langsung** pesan notif tiket, atau `/reply 001 pesan`
- Tutup tiket: `/closeticket 001`
- Tiket otomatis ditutup setelah **48 jam** tidak aktif

---

## Fitur Otomatis

| Fitur | Interval |
|-------|----------|
| Auto Backup | Setiap 6 jam + 10 detik setelah start |
| Auto Close Tiket | Cek setiap 1 jam, close setelah 48 jam |
| Notif Stok Menipis | Setiap ada transaksi berhasil |
| Notif Order ke Owner | Real-time setiap pembayaran berhasil |

---

## Struktur File

```
DIGICORE/
├── index.js            # Entry point + auto close tiket
├── bot.js              # Logic utama bot
├── config.js           # Konfigurasi bot
├── autobackup.js       # Auto backup setiap 6 jam
├── package.json
├── lib/
│   ├── myfunc.js       # Helper functions
│   └── myfunc2.js      # Payment handler (Violet/Pakasir)
├── price/
│   └── vps.js          # Daftar harga VPS
└── database/
    ├── users.json       # Data user
    ├── vps.json         # Stok VPS/RDP
    ├── reviews.json     # Review pelanggan
    ├── blacklist.json   # Daftar user banned
    └── tickets.json     # Data tiket support
```

---

## Payment Gateway

Bot ini mendukung:
- **Violet Media Pay** (QRIS) — Recommended
- **Pakasir** (QRIS)
- **OrderKuota** (QRIS)

Ubah `paymentGateway` di `config.js` untuk mengganti.

---

## License

Private use only. Do not redistribute.
