module.exports = {
  botToken: "8966186137:AAFCRWAu4h0mQch8FJ1xr9dC4whc1dw5x0s",
  prefix: "/",
  ownerName: "DIGICORE",
  ownerUsername: "",
  ownerId: "7903948335",
  channelLink: "",

  // ===== Panel Pterodactyl (untuk createPanel/createAdmin) =====
  domain: "",
  apikey: "",
  nestid: "1",
  egg: "1",
  loc: "1",

  // 👉 Pilih: "orderkuota", "pakasir", "violet", atau "payvalls"
  paymentGateway: "pakasir",

  // ===== PayValls (pay.valls.cloud) Config =====
  payvalls: {
    apiKey: "PAY-a55079cc9c36149055ba1ff4912e9165",  // Ganti dengan API Key dari /addmerchant
    baseUrl: "https://pay.valls.cloud"
  },

  // ===== Violet Config =====
  violet: {
    apiKey: "peli",
    secretKey: "yv4u1e7s9pAZxhA3q2LnmH6dbfgi0L8arjlzwtkBoCDPScJ5",
    live: true,
    codePayment: "QRIS",
    callbackUrl: "https://example.com/callback",
    redirectUrl: "https://example.com/redirect"
  },

  // ===== OrderKuota Config =====
  orderkuota: {
    username: "",
    token: ""
  },

  // ===== Pakasir Config =====
  pakasir: {
    slug: "digicore",
    apiKey: "aRai7I6sFpvh2OzBQmodDC6tU5KW2dTe"
  },

  // Info payment manual
  payment: {
    qris: "./database/qris.jpg",   // Path foto QRIS statis
    dana: "",
    ovo: "",
    gopay: ""
  },

  // ===== Garansi =====
  garansiMarkup: 10000,  // Tambahan harga garansi premium (Rp)
  garansiDays: 30,       // Masa garansi premium (hari)
  garansiBaseDays: 12,   // Masa garansi dasar/tanpa tambahan (hari)

  // ===== Maintenance Mode =====
  maintenance: false
};
