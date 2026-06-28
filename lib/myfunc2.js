require("./myfunc.js");
const config = require("../config.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const axios = require("axios");

async function createPanel(username, ramKey) {
  const email = `${username}@gmail.com`;
  const name = `${global.capital ? global.capital(username) : username} Server`;
  const password = `${username}001`;

  const resourceMap = {
    "1gb": { ram: "1000", disk: "1000", cpu: "40" },
    "2gb": { ram: "2000", disk: "1000", cpu: "60" },
    "3gb": { ram: "3000", disk: "2000", cpu: "80" },
    "4gb": { ram: "4000", disk: "2000", cpu: "100" },
    "5gb": { ram: "5000", disk: "3000", cpu: "120" },
    "6gb": { ram: "6000", disk: "3000", cpu: "140" },
    "7gb": { ram: "7000", disk: "4000", cpu: "160" },
    "8gb": { ram: "8000", disk: "4000", cpu: "180" },
    "9gb": { ram: "9000", disk: "5000", cpu: "200" },
    "10gb": { ram: "10000", disk: "5000", cpu: "220" },
    "unlimited": { ram: "0", disk: "0", cpu: "0" },
    "unli": { ram: "0", disk: "0", cpu: "0" }
  };

  const { ram, disk, cpu } = resourceMap[ramKey] || resourceMap["unli"];

  try {
    // ===== CREATE USER =====
    const f = await fetch(`${config.domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apikey}`
      },
      body: JSON.stringify({
        email,
        username,
        first_name: name,
        last_name: "Server",
        language: "en",
        password
      })
    });

    const data = await f.json();
    if (data.errors) {
      return { success: false, message: data.errors[0]?.detail || "Create user failed" };
    }

    const user = data.attributes;

    // ===== GET EGG =====
    const f1 = await fetch(
      `${config.domain}/api/application/nests/${config.nestid}/eggs/${config.egg}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apikey}`
        }
      }
    );

    const data2 = await f1.json();
    const startup_cmd = data2.attributes?.startup || "npm start";

    // ===== CREATE SERVER =====
    const f2 = await fetch(`${config.domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apikey}`
      },
      body: JSON.stringify({
        name,
        description: global.tanggal
          ? global.tanggal(Date.now())
          : new Date().toLocaleString(),
        user: user.id,
        egg: parseInt(config.egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
        startup: startup_cmd,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: { memory: ram, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 5 },
        deploy: {
          locations: [parseInt(config.loc)],
          dedicated_ip: false,
          port_range: []
        }
      })
    });

    const result = await f2.json();
    if (result.errors) {
      return { success: false, message: result.errors[0]?.detail || "Create server failed" };
    }

    const server = result.attributes;
    const domainClean = (config.domain || "").replace(/https?:\/\//g, "");

    return {
      success: true,
      data: {
        username,
        email,
        password,
        serverId: server.id,
        serverName: server.name,
        panelUrl: `https://${domainClean}`
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function createAdmin(username) {
  const uname = username.toLowerCase();
  const email = `${uname}@gmail.com`;
  const name = global.capital ? global.capital(uname) : uname;
  const password = `${uname}001`;

  const res = await fetch(`${config.domain}/api/application/users`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apikey}`,
    },
    body: JSON.stringify({
      email,
      username: uname,
      first_name: name,
      last_name: "Admin",
      root_admin: true,
      language: "en",
      password,
    }),
  });

  const data = await res.json();
  if (data.errors) {
    return { success: false, message: data.errors[0]?.detail || "Create admin failed" };
  }

  const user = data.attributes;
  const domainClean = (config.domain || "").replace(/https?:\/\//g, "");

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password,
    panel: `https://${domainClean}`,
    raw: user,
  };
}

function randomOrderId(prefix = "ORD") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/**
 * Create payment (OrderKuota / Pakasir)
 * Return: { type, amount, qris, orderId? }
 */
async function getVioletConfig(cfg) {
  const violet = cfg.violet || {};
  return {
    apiKey: violet.apiKey || violet.apikey || violet.api_key,
    secretKey: violet.secretKey || violet.secret_key,
    live: violet.live !== false,
    codePayment: violet.codePayment || violet.code_payment || "QRIS",
  };
}

function pick(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return undefined;
}

function ensureUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Create payment (OrderKuota / Pakasir / Violet)
 * Return: { type, amount, qris, orderId? }
 */
async function createPayment(type, amount, config, options = {}) {
  // ===== ORDERKUOTA =====
  if (type === "orderkuota") {
    const url = `https://skyzopedia-api.vercel.app/orderkuota/createpayment?apikey=skyy&amount=${amount}&username=${config.orderkuota.username}&token=${config.orderkuota.token}`;
    const { data } = await axios.get(url);

    const qris = data?.result?.imageqris?.url;
    if (!qris) throw new Error("Gagal membuat QRIS OrderKuota");

    return {
      type,
      amount,
      qris,
      raw: data
    };
  }

  // ===== VIOLET MEDIA PAY =====
  if (type === "violet") {
    const { apiKey, secretKey, live, codePayment } = await getVioletConfig(config);
    if (!apiKey || !secretKey) throw new Error("Konfigurasi payment gateway belum lengkap.");

    const refKode = randomOrderId("VIOLET").replace(/[^a-zA-Z0-9]/g, "");
    const endpoint = live
      ? "https://violetmediapay.com/api/live/create"
      : "https://violetmediapay.com/api/sanbox/create";

    const crypto = require("crypto");
    const nominal = Number(amount);
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(refKode + apiKey + String(nominal))
      .digest("hex");

    const body = new URLSearchParams();
    // Violet docs memakai api_key pada contoh balance, namun sebagian gateway memakai apikey.
    // Keduanya dikirim supaya kompatibel dengan variasi backend Violet.
    body.append("api_key", apiKey);
    body.append("apikey", apiKey);
    body.append("secret_key", secretKey);
    body.append("signature", signature);
    body.append("ref_kode", refKode);
    body.append("amount", String(nominal));
    body.append("nominal", String(nominal));

    // WAJIB sesuai dokumentasi Violet: channel_payment
    const channel = String(codePayment || "QRIS").trim().toUpperCase();
    body.append("channel_payment", channel);

    // Kirim juga alias lama sebagai fallback, tapi yang utama tetap channel_payment.
    body.append("code_payment", channel);
    body.append("payment_method", channel);

    body.append("cus_nama", options.customerName || config?.violet?.customerName || "Telegram User");
    body.append("cus_email", config?.violet?.customerEmail || "user@gmail.com");
    body.append("cus_phone", config?.violet?.customerPhone || "08123456789");
    body.append("produk", config?.violet?.productName || "Auto Order");

    const callbackUrl = config?.violet?.callbackUrl || config?.violet?.urlCallback || "https://example.com/callback";
    const redirectUrl = config?.violet?.redirectUrl || config?.violet?.urlRedirect || "https://example.com/redirect";
    const exp = new Date(Date.now() + 30 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const expiredTime = `${exp.getFullYear()}-${pad(exp.getMonth()+1)}-${pad(exp.getDate())} ${pad(exp.getHours())}:${pad(exp.getMinutes())}:${pad(exp.getSeconds())}`;

    body.append("url_callback", callbackUrl);
    body.append("url_redirect", redirectUrl);
    body.append("expired_time", Math.floor(Date.now() / 1000) + 1800);

    let res;
    try {
      res = await axios.post(endpoint, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        validateStatus: () => true,
        timeout: 30000,
      });
    } catch (err) {
      throw new Error(`Gagal koneksi ke payment gateway.`);
    }

    const response = res.data;
    const trx = Array.isArray(response?.data) ? response.data[0] : response?.data;

    if (!response?.status || !trx || String(trx.status || "").toLowerCase() === "invalid") {
      console.log("[VIOLET CREATE ERROR]", JSON.stringify(response, null, 2));
      const msg = pick(trx, ["message", "pesan", "status"]) || response?.message || `HTTP ${res.status}`;
      throw new Error(`Gagal membuat transaksi. Mohon coba lagi nanti.`);
    }

    const orderId = pick(trx, ["ref_kode", "ref_kode ", "ref", "ref "]) || refKode;
    const transactionId = pick(trx, ["id_reference", "id_reference ", "ref_id", "ref_id "]);
    const qris = ensureUrl(pick(trx, ["target", "target ", "qris", "qr_url", "qr_image"]));

    if (!qris && !trx.checkout_url) {
      console.log("[VIOLET CREATE ERROR - NO QR]", JSON.stringify(response, null, 2));
      throw new Error("Transaksi berhasil dibuat, tapi QRIS tidak ditemukan. Coba lagi.");
    }

    return {
      type,
      amount: nominal,
      orderId,
      transactionId,
      qris: qris || trx.checkout_url,
      checkoutUrl: trx.checkout_url,
      expiredAt: trx.expired_time,
      raw: response
    };
  }

  // ===== PAKASIR =====
  if (type === "pakasir") {
    const { slug, apiKey } = config.pakasir;
    const orderId = randomOrderId();

    const url = "https://app.pakasir.com/api/transactioncreate/qris";
    const body = {
      project: slug,
      order_id: orderId,
      amount,
      api_key: apiKey
    };

    const res = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" }
    });

    const payment = res.data?.payment;
    if (!payment?.payment_number)
      throw new Error("QR Pakasir tidak ditemukan");

    const qrString = payment.payment_number;

    // 👉 Generate QR image otomatis
    const qrDir = path.join(__dirname, "temp_qr");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const filePath = path.join(qrDir, `${orderId}.png`);
    await QRCode.toFile(filePath, qrString, {
      type: "png",
      width: 500,
      margin: 2
    });

    setTimeout(async () => {
      try {
        await fs.unlinkSync(filePath)
      } catch { }
    }, 60000)

    return {
      type,
      amount,
      orderId,
      qris: filePath, // 👉 path file PNG, bisa langsung replyWithPhoto
      expiredAt: payment.expired_at,
      raw: res.data
    };
  }

  // ===== PAYVALLS (pay.valls.cloud) =====
  if (type === "payvalls") {
    const { apiKey, baseUrl } = config.payvalls;
    if (!apiKey || !baseUrl) throw new Error("Konfigurasi PayValls belum lengkap.");

    const orderId = randomOrderId("PV");
    const res = await axios.post(`${baseUrl}/api/create-payment`, {
      amount,
      product_name: options.productName || "Auto Order",
      order_id: orderId,
      customer_name: options.customerName || "Telegram User"
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    });

    const result = res.data;
    if (!result.success) throw new Error(result.error || "Gagal membuat pembayaran PayValls");

    const tx = result.data;

    return {
      type,
      amount: tx.amount,
      orderId: tx.tx_id,
      transactionId: tx.tx_id,
      qris: null,
      paymentLink: tx.payment_link,
      paymentInfo: `Bayar TEPAT Rp ${tx.amount.toLocaleString("id-ID")} di ${tx.payment_link}`,
      expiredAt: tx.expires_at,
      raw: result
    };
  }

  throw new Error("Type payment tidak dikenal");
}

/**
 * Check payment status
 */
async function cekPaid(type, data, config, extra = {}) {
  // ===== ORDERKUOTA =====
  if (type === "orderkuota") {
    const cekUrl = `https://skyzopedia-api.vercel.app/orderkuota/mutasiqr?apikey=skyy&username=${config.orderkuota.username}&token=${config.orderkuota.token}`;
    const { data: res } = await axios.get(cekUrl);

    const list = res?.result || [];
    const { userId, orders, toRupiah } = extra;

    const found = list
      .filter(i => i.status === "IN")
      .find(i => toRupiah(i.kredit) === toRupiah(orders[userId]?.amount));

    return Boolean(found);
  }


  // ===== VIOLET MEDIA PAY =====
  if (type === "violet") {
    const { apiKey, secretKey, live } = await getVioletConfig(config);
    if (!apiKey || !secretKey) throw new Error("Konfigurasi payment gateway belum lengkap.");

    const base = live
      ? "https://violetmediapay.com/api/live"
      : "https://violetmediapay.com/api/sanbox";

    const endpoints = [
      `${base}/transactions`,
      `${base}/transaction`,
      `${base}/status`,
      `${base}/check-transaction`,
      `${base}/cek-transaksi`,
    ];

    const refs = [
      data.orderId,
      data.transactionId,
      data.ref,
      data.reference,
      data.merchant_ref,
      data.raw?.data?.ref,
      data.raw?.data?.ref_kode,
      data.raw?.data?.ref_id,
      data.raw?.data?.id_reference,
      data.raw?.data?.merchant_ref,
      data.raw?.data?.order_id
    ]
      .filter(Boolean)
      .map(v => String(v).trim())
      .filter(Boolean);

    const refUtama = refs[0] || "";
    const idReference = data.transactionId || data.raw?.data?.id_reference || data.raw?.data?.ref_id || "";

    const credentialSets = [
      { api_key: apiKey, secret_key: secretKey },
      { api_key: apiKey, secretkey: secretKey },
      { apikey: apiKey, secret_key: secretKey },
      { apikey: apiKey, secretkey: secretKey },
      { api_key: apiKey, secret: secretKey },
    ];

    const refParams = {
      ref_kode: refUtama,
      ref: refUtama,
      reference: refUtama,
      merchant_ref: refUtama,
      id_reference: idReference,
      ref_id: idReference,
      order_id: refUtama,
    };

    const responses = [];

    for (const endpoint of endpoints) {
      for (const creds of credentialSets) {
        const params = { ...creds, ...refParams };

        try {
          const getRes = await axios.get(endpoint, {
            params,
            validateStatus: () => true,
            timeout: 30000,
          });
          responses.push({ endpoint, method: "GET", status: getRes.status, data: getRes.data });
        } catch (err) {
          responses.push({ endpoint, method: "GET", error: err.message });
        }

        try {
          const body = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).trim() !== "") body.append(k, String(v));
          });
          const postRes = await axios.post(endpoint, body, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            validateStatus: () => true,
            timeout: 30000,
          });
          responses.push({ endpoint, method: "POST", status: postRes.status, data: postRes.data });
        } catch (err) {
          responses.push({ endpoint, method: "POST", error: err.message });
        }
      }
    }

    const normalizeAmount = (v) => {
      if (v === undefined || v === null || v === "") return 0;
      return Number(String(v).replace(/[^0-9]/g, ""));
    };

    const getAllValues = (obj) => {
      const values = [];
      const walk = (value) => {
        if (value === undefined || value === null) return;
        if (typeof value === "object") {
          Object.values(value).forEach(walk);
          return;
        }
        values.push(String(value).trim());
      };
      walk(obj);
      return values.filter(Boolean);
    };

    const flattenObjects = (value, output = []) => {
      if (!value) return output;
      if (Array.isArray(value)) {
        value.forEach(item => flattenObjects(item, output));
        return output;
      }
      if (typeof value === "object") {
        output.push(value);
        Object.values(value).forEach(item => {
          if (item && (Array.isArray(item) || typeof item === "object")) flattenObjects(item, output);
        });
      }
      return output;
    };

    const isInvalidResponse = (x) => {
      const text = getAllValues(x).join(" ").toLowerCase();
      return text.includes("invalid") || text.includes("api key salah") || text.includes("unauthorized");
    };

    const isPaidStatus = (x) => {
      const statusText = getAllValues(x).join(" ").toLowerCase();
      return (
        statusText.includes("success") ||
        statusText.includes("settlement") ||
        statusText.includes("paid") ||
        statusText.includes("berhasil") ||
        statusText.includes("sukses") ||
        statusText.includes("lunas") ||
        statusText.includes("completed") ||
        statusText.includes("complete") ||
        statusText.includes("done") ||
        statusText.includes("diterima") ||
        String(pick(x, ["status", "payment_status", "status_payment"])).toLowerCase() === "1"
      );
    };

    const amountMatches = (x) => {
      const candidates = [
        pick(x, ["amount", "nominal", "total", "total_bayar", "price", "harga", "gross_amount"]),
        ...getAllValues(x).filter(v => /^[Rp\s.,0-9]+$/i.test(v))
      ];
      const target = normalizeAmount(data.amount);
      return target > 0 && candidates.some(v => normalizeAmount(v) === target);
    };

    const validResponses = responses.filter(r => r.data && !isInvalidResponse(r.data));
    const allObjects = validResponses.flatMap(r => flattenObjects(r.data).map(obj => ({ obj, meta: r })));

    const transaksi = allObjects.find(({ obj }) => {
      const values = getAllValues(obj);
      const refMatch = refs.length > 0 && values.some(value =>
        refs.some(target => value === target || value.includes(target) || target.includes(value))
      );
      return refMatch || (amountMatches(obj) && isPaidStatus(obj));
    });

    if (!transaksi) {
      const sample = responses.slice(0, 6).map(r => ({
        endpoint: r.endpoint,
        method: r.method,
        status: r.status,
        data: r.data,
        error: r.error
      }));

      console.log("[VIOLET CHECK] transaksi belum ditemukan", {
        refs,
        amount: data.amount,
        validResponseCount: validResponses.length,
        sample
      });
      return false;
    }

    if (!isPaidStatus(transaksi.obj)) {
      console.log("[VIOLET CHECK] transaksi ditemukan tapi belum paid", {
        refs,
        amount: data.amount,
        endpoint: transaksi.meta.endpoint,
        method: transaksi.meta.method,
        transaksi: transaksi.obj
      });
      return false;
    }

    console.log("[VIOLET CHECK] pembayaran sukses", {
      refs,
      amount: data.amount,
      endpoint: transaksi.meta.endpoint,
      method: transaksi.meta.method
    });

    return true;
  }

  // ===== PAYVALLS (pay.valls.cloud) =====
  if (type === "payvalls") {
    const { apiKey, baseUrl } = config.payvalls;
    const txId = data.orderId || data.transactionId;

    try {
      const res = await axios.get(`${baseUrl}/api/check-status/${txId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        timeout: 15000
      });

      const result = res.data;
      if (result.success && result.data.status === "paid") {
        return true;
      }
    } catch (err) {
      // Silent fail, will retry
    }

    return false;
  }

  throw new Error("Type payment tidak dikenal");
}



module.exports = { createAdmin, createPanel, createPayment, cekPaid };
