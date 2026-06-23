module.exports = {
  botToken: "8966186137:AAHHGwe2VmVEPJZeF5pkdB05nFRFwQjhfs8",
  menuImage: "https://files.catbox.moe/svl8hj.jpg",
  prefix: "/",
  ownerName: "DIGICORE",
  ownerUsername: "fitzmeee",
  ownerId: "7903948335",
  channelLink: "",

  // 👉 Pilih: "orderkuota", "pakasir", atau "violet"
  paymentGateway: "violet",

  // ===== Violet Config =====
  violet: {
    apiKey: "zD1jSaZqpLdivH58tcmsgnwAloA0y63",
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
    slug: "",
    apiKey: ""
  },

  // Info payment manual (opsional)
  payment: {
    qris: "",
    dana: "",
    ovo: "",
    gopay: ""
  },

  // ===== Maintenance Mode =====
  maintenance: false
};
