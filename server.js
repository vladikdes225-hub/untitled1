const http = require("http");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const { existsSync } = require("fs");

const PORT = Number(process.env.PORT || 3001);
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ADMIN_API_TOKEN = String(process.env.ADMIN_API_TOKEN || "").trim();
const REQUIRE_ADMIN_TOKEN = String(process.env.REQUIRE_ADMIN_TOKEN || (IS_PRODUCTION ? "true" : "false")).trim().toLowerCase() === "true";
const CORS_ORIGINS_RAW = String(process.env.CORS_ORIGINS || "").trim();
const TRUST_PROXY = String(process.env.TRUST_PROXY || "").trim().toLowerCase() === "true";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_GLOBAL_MAX = Number(process.env.RATE_LIMIT_GLOBAL_MAX || 240);
const RATE_LIMIT_SUPPORT_MAX = Number(process.env.RATE_LIMIT_SUPPORT_MAX || 60);
const REQUEST_BODY_LIMIT_BYTES = Number(process.env.REQUEST_BODY_LIMIT_BYTES || 2_000_000);
const CSP_CONNECT_SRC_RAW = String(process.env.CSP_CONNECT_SRC || "").trim();
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const ADS_FILE = path.join(DATA_DIR, "ads.json");
const SELLERS_FILE = path.join(DATA_DIR, "sellers.json");
const SUPPORT_FILE = path.join(DATA_DIR, "support.json");
const ALLOWED_STATIC_FILES = new Set([
  "index.html",
  "404.html",
  "favicon.ico",
  "robots.txt",
  "site.webmanifest",
  "icon.png",
  "icon.svg"
]);
const ALLOWED_STATIC_PREFIXES = ["css/", "js/", "img/", "uploads/"];
const DEFAULT_CORS_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
]);
const rateLimitStore = new Map();
let missingAdminTokenWarningShown = false;

const DEFAULT_MANAGER = {
  name: "RXSEND",
  telegram: "RXSEND"
};

const DEFAULT_SELLERS = [
  {
    id: 1,
    name: "Анатолий Ч.",
    telegram: "RXSEND",
    managerName: "RXSEND",
    managerTelegram: "RXSEND"
  }
];

const DEFAULT_ADS = [
  {
    id: 1001,
    title: "iPhone 15 256GB новый",
    description: "Гарантия 12 месяцев, не вскрывался.",
    seller: "Анатолий Ч.",
    sellerId: 1,
    price: 53500,
    category: "Телефоны",
    condition: "new",
    rating: 5,
    source: "seed",
    createdAt: "2026-02-26T12:30:00.000Z"
  },
  {
    id: 1002,
    title: "iPhone Air 512GB",
    description: "Комплект полный, батарея 100%.",
    seller: "Анатолий Ч.",
    sellerId: 1,
    price: 79990,
    category: "Телефоны",
    condition: "new",
    rating: 5,
    source: "seed",
    createdAt: "2026-02-26T12:35:00.000Z"
  },
  {
    id: 1003,
    title: "iPhone 12 128GB",
    description: "Хорошее состояние, без сколов.",
    seller: "Анатолий Ч.",
    sellerId: 1,
    price: 13990,
    category: "Телефоны",
    condition: "used",
    rating: 5,
    source: "seed",
    createdAt: "2026-02-26T12:32:00.000Z"
  },
  {
    id: 1004,
    title: "iPhone 13 256GB Midnight",
    description: "Торг уместен, проверка при встрече.",
    seller: "Анатолий Ч.",
    sellerId: 1,
    price: 21700,
    category: "Телефоны",
    condition: "used",
    rating: 4.6,
    source: "seed",
    createdAt: "2026-02-26T12:04:00.000Z"
  },
  {
    id: 1005,
    title: "iPhone 12 Pro Max 256GB",
    description: "Оригинал, Face ID работает.",
    seller: "Анатолий Ч.",
    sellerId: 1,
    price: 22490,
    category: "Телефоны",
    condition: "used",
    rating: 5,
    source: "seed",
    createdAt: "2026-02-26T12:25:00.000Z"
  }
];

const DEFAULT_SUPPORT = [];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function parseCorsOrigins(raw) {
  if (!raw) {
    return new Set(DEFAULT_CORS_ORIGINS);
  }
  const list = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (list.includes("*")) {
    return new Set(["*"]);
  }
  return new Set(list);
}

const ALLOWED_CORS_ORIGINS = parseCorsOrigins(CORS_ORIGINS_RAW);
const CSP_CONNECT_SOURCES = CSP_CONNECT_SRC_RAW
  ? CSP_CONNECT_SRC_RAW.split(",").map((item) => item.trim()).filter(Boolean)
  : [];

function normalizeOrigin(origin) {
  const value = String(origin || "").trim();
  if (!value) {
    return "";
  }
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function isCorsOriginAllowed(origin) {
  if (!origin) {
    return true;
  }
  if (ALLOWED_CORS_ORIGINS.has("*")) {
    return true;
  }
  return ALLOWED_CORS_ORIGINS.has(origin);
}

function getClientIp(req) {
  if (TRUST_PROXY) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) {
      return forwarded;
    }
  }
  return String(req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown");
}

function applyRateLimit(req, res, bucket, limit, windowMs) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const existing = rateLimitStore.get(key);
  const entry = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing;

  entry.count += 1;
  rateLimitStore.set(key, entry);

  if (entry.resetAt <= now) {
    entry.resetAt = now + windowMs;
  }

  if (entry.count > limit) {
    const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);
    sendJson(res, 429, { error: "Too many requests." }, { "Retry-After": String(retryAfter) });
    return false;
  }
  return true;
}

function getTokenFromRequest(req) {
  const authHeader = String(req.headers.authorization || "").trim();
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearer && bearer[1]) {
    return bearer[1].trim();
  }
  return String(req.headers["x-api-token"] || "").trim();
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length || left.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function isAdminRequest(req) {
  if (!REQUIRE_ADMIN_TOKEN) {
    return true;
  }
  if (!ADMIN_API_TOKEN) {
    if (!missingAdminTokenWarningShown) {
      missingAdminTokenWarningShown = true;
      console.error("ADMIN_API_TOKEN is missing. Set ADMIN_API_TOKEN or disable REQUIRE_ADMIN_TOKEN.");
    }
    return false;
  }
  const token = getTokenFromRequest(req);
  return safeEqualText(token, ADMIN_API_TOKEN);
}

function requireAdmin(req, res) {
  if (isAdminRequest(req)) {
    return true;
  }
  sendJson(res, 401, { error: "Unauthorized." });
  return false;
}

function getVisitorId(req, payloadVisitorId = "") {
  const headerVisitorId = String(req.headers["x-visitor-id"] || "").trim();
  const bodyVisitorId = String(payloadVisitorId || "").trim();
  return sanitizeText(headerVisitorId || bodyVisitorId, 80);
}

function getCorsHeaders(req) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Token, X-Visitor-Id",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
  };
  const origin = normalizeOrigin(req && req.headers ? req.headers.origin : "");
  if (!origin) {
    headers["Access-Control-Allow-Origin"] = "*";
    return headers;
  }
  if (isCorsOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function getSecurityHeaders() {
  const connectSources = ["'self'", ...CSP_CONNECT_SOURCES].join(" ");
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    `connect-src ${connectSources}`,
    "form-action 'self'"
  ].join("; ");

  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": csp
  };

  if (IS_PRODUCTION) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  return headers;
}

function responseHeaders(res, extra = {}) {
  const req = res.__request || null;
  return {
    ...getSecurityHeaders(),
    ...getCorsHeaders(req),
    "X-Request-Id": String(res.__requestId || ""),
    ...extra
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...responseHeaders(res, extraHeaders),
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, statusCode, body, contentType, method = "GET") {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ""), "utf8");
  res.writeHead(statusCode, {
    ...responseHeaders(res),
    "Content-Type": contentType,
    "Content-Length": data.length
  });
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(data);
}

function createId() {
  return Date.now() + Math.floor(Math.random() * 1_000_000);
}

function normalizeTelegram(value) {
  const cleaned = String(value || "").trim().replace(/^@+/, "");
  return cleaned.slice(0, 50);
}

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  if (!existsSync(SELLERS_FILE)) {
    await fs.writeFile(SELLERS_FILE, `${JSON.stringify(DEFAULT_SELLERS, null, 2)}\n`, "utf8");
  }
  if (!existsSync(ADS_FILE)) {
    await fs.writeFile(ADS_FILE, `${JSON.stringify(DEFAULT_ADS, null, 2)}\n`, "utf8");
  }
  if (!existsSync(SUPPORT_FILE)) {
    await fs.writeFile(SUPPORT_FILE, `${JSON.stringify(DEFAULT_SUPPORT, null, 2)}\n`, "utf8");
  }
}

async function readJsonArray(filePath) {
  await ensureStorage();
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeJsonArray(filePath, arr) {
  await ensureStorage();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(arr, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
}

async function readAds() {
  return readJsonArray(ADS_FILE);
}

async function writeAds(ads) {
  await writeJsonArray(ADS_FILE, ads);
}

async function readSellers() {
  return readJsonArray(SELLERS_FILE);
}

async function writeSellers(sellers) {
  await writeJsonArray(SELLERS_FILE, sellers);
}

async function readSupportTickets() {
  return readJsonArray(SUPPORT_FILE);
}

async function writeSupportTickets(tickets) {
  await writeJsonArray(SUPPORT_FILE, tickets);
}

function sanitizeText(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

function buildSupportSnapshot(ticket, isAdmin = false) {
  if (!ticket) {
    return null;
  }
  return {
    id: ticket.id,
    visitorId: ticket.visitorId,
    visitorName: ticket.visitorName,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    operatorChatId: isAdmin ? ticket.operatorChatId || null : null
  };
}

function normalizeSupportMessages(messages, afterId = 0) {
  const minId = Number(afterId) || 0;
  const list = Array.isArray(messages) ? messages : [];
  return list
    .filter((item) => Number(item.id) > minId)
    .map((item) => ({
      id: Number(item.id),
      from: String(item.from || "system"),
      text: String(item.text || ""),
      createdAt: item.createdAt || new Date().toISOString()
    }));
}

function validateSupportRequestPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const visitorId = sanitizeText(payload.visitorId, 80);
  const visitorName = sanitizeText(payload.visitorName, 80) || "Guest";
  const initialMessage = sanitizeText(payload.message, 800);

  if (visitorId.length < 8) {
    return { ok: false, error: "visitorId is required." };
  }

  return {
    ok: true,
    data: { visitorId, visitorName, initialMessage }
  };
}

function validateSupportMessagePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const from = payload.from === "operator" ? "operator" : "visitor";
  const text = sanitizeText(payload.text, 1200);
  const operatorChatId = Number(payload.operatorChatId || 0) || null;
  const visitorId = sanitizeText(payload.visitorId, 80);

  if (text.length < 1) {
    return { ok: false, error: "Message text is required." };
  }

  return {
    ok: true,
    data: { from, text, operatorChatId, visitorId }
  };
}

function sendBodyParseError(res, error) {
  if (error && error.code === "PAYLOAD_TOO_LARGE") {
    sendJson(res, 413, { error: "Payload too large." });
    return;
  }
  sendJson(res, 400, { error: "Invalid JSON body." });
}

function requireVisitorAccess(req, res, expectedVisitorId = "", payloadVisitorId = "") {
  const visitorId = getVisitorId(req, payloadVisitorId);
  if (visitorId.length < 8) {
    sendJson(res, 400, { error: "visitorId is required." });
    return { ok: false, visitorId: "" };
  }
  if (expectedVisitorId && visitorId !== expectedVisitorId) {
    sendJson(res, 403, { error: "Forbidden." });
    return { ok: false, visitorId };
  }
  return { ok: true, visitorId };
}

function validateSellerPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Тело запроса должно быть объектом JSON." };
  }

  const name = String(payload.name || "").trim();
  const telegram = normalizeTelegram(payload.telegram);
  const managerName = String(payload.managerName || DEFAULT_MANAGER.name).trim() || DEFAULT_MANAGER.name;
  const managerTelegram = normalizeTelegram(payload.managerTelegram || DEFAULT_MANAGER.telegram);

  if (name.length < 2) {
    return { ok: false, error: "Имя продавца должно быть минимум 2 символа." };
  }
  if (telegram.length < 3) {
    return { ok: false, error: "Telegram продавца должен быть минимум 3 символа." };
  }
  if (managerTelegram.length < 3) {
    return { ok: false, error: "Telegram менеджера должен быть минимум 3 символа." };
  }

  return {
    ok: true,
    data: {
      id: createId(),
      name: name.slice(0, 60),
      telegram,
      managerName: managerName.slice(0, 60),
      managerTelegram
    }
  };
}

function validateAdPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Тело запроса должно быть объектом JSON." };
  }

  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim() || "Описание не указано.";
  const seller = String(payload.seller || "").trim();
  const sellerId = Number(payload.sellerId || 0);
  const sellerTelegram = normalizeTelegram(payload.sellerTelegram || DEFAULT_MANAGER.telegram);
  const managerName = String(payload.managerName || DEFAULT_MANAGER.name).trim() || DEFAULT_MANAGER.name;
  const managerTelegram = normalizeTelegram(payload.managerTelegram || DEFAULT_MANAGER.telegram);
  const price = Number(payload.price);
  const category = String(payload.category || "Телефоны").trim() || "Телефоны";
  const source = String(payload.source || "web").trim() || "web";
  const imageUrlsRaw = Array.isArray(payload.imageUrls)
    ? payload.imageUrls
    : typeof payload.imageUrl === "string" && payload.imageUrl.trim()
      ? [payload.imageUrl.trim()]
      : [];
  const imageUrls = imageUrlsRaw
    .filter((url) => typeof url === "string")
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((url) => url.slice(0, 250));
  const condition = payload.condition === "new" ? "new" : "used";

  if (title.length < 4) {
    return { ok: false, error: "Поле title должно содержать минимум 4 символа." };
  }
  if (!Number.isFinite(price) || price < 1) {
    return { ok: false, error: "Поле price должно быть числом больше 0." };
  }
  if (seller.length < 2) {
    return { ok: false, error: "Поле seller должно содержать минимум 2 символа." };
  }

  return {
    ok: true,
    data: {
      id: createId(),
      title: title.slice(0, 100),
      description: description.slice(0, 500),
      seller: seller.slice(0, 60),
      sellerId: Number.isFinite(sellerId) && sellerId > 0 ? sellerId : null,
      sellerTelegram,
      managerName: managerName.slice(0, 60),
      managerTelegram,
      price: Math.round(price),
      category: category.slice(0, 50),
      condition,
      rating: Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : 5,
      source: source.slice(0, 30),
      imageUrl: imageUrls[0] || "",
      imageUrls,
      createdAt: new Date().toISOString()
    }
  };
}

function formatAds(ads) {
  return [...ads].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function formatSellers(sellers) {
  return [...sellers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru"));
}

async function parseJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > REQUEST_BODY_LIMIT_BYTES) {
      const error = new Error("Payload too large");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function deleteAdImageIfNeeded(ad) {
  if (!ad) {
    return;
  }
  const urls = Array.isArray(ad.imageUrls) ? ad.imageUrls : [];
  const fallback = typeof ad.imageUrl === "string" && ad.imageUrl ? [ad.imageUrl] : [];
  const merged = [...new Set([...urls, ...fallback])];
  for (const url of merged) {
    if (!url.startsWith("/uploads/")) {
      continue;
    }
    const filename = path.basename(url);
    const filePath = path.join(UPLOADS_DIR, filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // ignore
    }
  }
}

async function handleApi(req, res, urlObj) {
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;
  if (req.method === "OPTIONS") {
    const origin = normalizeOrigin(req.headers.origin);
    if (origin && !isCorsOriginAllowed(origin)) {
      sendJson(res, 403, { error: "CORS origin is not allowed." });
      return true;
    }
    res.writeHead(204, {
      ...responseHeaders(res),
      "Content-Length": 0
    });
    res.end();
    return true;
  }

  if (!applyRateLimit(req, res, "global", RATE_LIMIT_GLOBAL_MAX, RATE_LIMIT_WINDOW_MS)) {
    return true;
  }

  if ((pathname === "/api/support/request" || pathname.startsWith("/api/support/requests")) &&
    !applyRateLimit(req, res, "support", RATE_LIMIT_SUPPORT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return true;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
    return true;
  }

  if (pathname === "/api/ads" && req.method === "GET") {
    const ads = await readAds();
    sendJson(res, 200, { items: formatAds(ads) });
    return true;
  }

  if (pathname === "/api/ads" && req.method === "POST") {
    if (!requireAdmin(req, res)) {
      return true;
    }
    let payload;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendBodyParseError(res, error);
      return true;
    }

    const validation = validateAdPayload(payload);
    if (!validation.ok) {
      sendJson(res, 400, { error: validation.error });
      return true;
    }

    const ads = await readAds();
    ads.push(validation.data);
    await writeAds(ads);
    sendJson(res, 201, { item: validation.data });
    return true;
  }

  if (pathname.startsWith("/api/ads/") && req.method === "DELETE") {
    if (!requireAdmin(req, res)) {
      return true;
    }
    const id = Number(pathname.split("/").pop());
    if (!Number.isFinite(id)) {
      sendJson(res, 400, { error: "Некорректный id." });
      return true;
    }

    const ads = await readAds();
    const target = ads.find((item) => Number(item.id) === id);
    if (!target) {
      sendJson(res, 404, { error: "Объявление не найдено." });
      return true;
    }

    const next = ads.filter((item) => Number(item.id) !== id);
    await writeAds(next);
    await deleteAdImageIfNeeded(target);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/sellers" && req.method === "GET") {
    const sellers = await readSellers();
    sendJson(res, 200, { items: formatSellers(sellers) });
    return true;
  }

  if (pathname === "/api/sellers" && req.method === "POST") {
    if (!requireAdmin(req, res)) {
      return true;
    }
    let payload;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendBodyParseError(res, error);
      return true;
    }

    const validation = validateSellerPayload(payload);
    if (!validation.ok) {
      sendJson(res, 400, { error: validation.error });
      return true;
    }

    const sellers = await readSellers();
    sellers.push(validation.data);
    await writeSellers(sellers);
    sendJson(res, 201, { item: validation.data });
    return true;
  }

  if (pathname.startsWith("/api/sellers/") && req.method === "DELETE") {
    if (!requireAdmin(req, res)) {
      return true;
    }
    const id = Number(pathname.split("/").pop());
    if (!Number.isFinite(id)) {
      sendJson(res, 400, { error: "Некорректный id." });
      return true;
    }

    const sellers = await readSellers();
    const next = sellers.filter((item) => Number(item.id) !== id);
    if (next.length === sellers.length) {
      sendJson(res, 404, { error: "Продавец не найден." });
      return true;
    }
    await writeSellers(next);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/support/requests" && req.method === "GET") {
    const statusFilter = sanitizeText(searchParams.get("status"), 20);
    const visitorIdFilter = sanitizeText(searchParams.get("visitorId"), 80);
    const isAdmin = isAdminRequest(req);
    const headerVisitorId = getVisitorId(req);
    const tickets = await readSupportTickets();
    let items = [...tickets];

    if (statusFilter) {
      items = items.filter((item) => item.status === statusFilter);
    }

    if (isAdmin) {
      if (visitorIdFilter) {
        items = items.filter((item) => item.visitorId === visitorIdFilter);
      }
    } else {
      const access = requireVisitorAccess(req, res, "", visitorIdFilter || headerVisitorId);
      if (!access.ok) {
        return true;
      }
      items = items.filter((item) => item.visitorId === access.visitorId);
    }

    items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    sendJson(res, 200, {
      items: items.map((item) => ({
        ...buildSupportSnapshot(item, isAdmin),
        lastMessage: isAdmin && Array.isArray(item.messages) && item.messages.length
          ? item.messages[item.messages.length - 1]
          : null
      }))
    });
    return true;
  }

  if (pathname === "/api/support/request" && req.method === "POST") {
    let payload;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendBodyParseError(res, error);
      return true;
    }

    const validation = validateSupportRequestPayload(payload);
    if (!validation.ok) {
      sendJson(res, 400, { error: validation.error });
      return true;
    }

    const now = new Date().toISOString();
    const { visitorId, visitorName, initialMessage } = validation.data;
    const access = requireVisitorAccess(req, res, "", visitorId);
    if (!access.ok) {
      return true;
    }
    const tickets = await readSupportTickets();
    const existing = tickets.find((item) =>
      item.visitorId === access.visitorId && ["pending", "approved"].includes(item.status)
    );

    if (existing) {
      sendJson(res, 200, { item: buildSupportSnapshot(existing) });
      return true;
    }

    const ticket = {
      id: createId(),
      visitorId: access.visitorId,
      visitorName,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      operatorChatId: null,
      messages: [
        {
          id: createId(),
          from: "system",
          text: "Support request created. Please wait for approval.",
          createdAt: now
        }
      ]
    };

    if (initialMessage) {
      ticket.messages.push({
        id: createId(),
        from: "visitor",
        text: initialMessage,
        createdAt: now
      });
    }

    tickets.push(ticket);
    await writeSupportTickets(tickets);
    sendJson(res, 201, { item: buildSupportSnapshot(ticket) });
    return true;
  }

  if (pathname.startsWith("/api/support/requests/") && req.method === "GET") {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 4) {
      const isAdmin = isAdminRequest(req);
      const ticketId = Number(segments[3]);
      if (!Number.isFinite(ticketId)) {
        sendJson(res, 400, { error: "Invalid support id." });
        return true;
      }
      const tickets = await readSupportTickets();
      const ticket = tickets.find((item) => Number(item.id) === ticketId);
      if (!ticket) {
        sendJson(res, 404, { error: "Support ticket not found." });
        return true;
      }
      if (!isAdmin) {
        const queryVisitorId = sanitizeText(searchParams.get("visitorId"), 80);
        const access = requireVisitorAccess(req, res, ticket.visitorId, queryVisitorId);
        if (!access.ok) {
          return true;
        }
      }
      const after = Number(searchParams.get("after") || 0);
      const messages = normalizeSupportMessages(ticket.messages, after);
      sendJson(res, 200, {
        item: buildSupportSnapshot(ticket, isAdmin),
        messages
      });
      return true;
    }
  }

  if (pathname.startsWith("/api/support/requests/") && req.method === "POST") {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 5 && segments[4] === "decision") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const ticketId = Number(segments[3]);
      if (!Number.isFinite(ticketId)) {
        sendJson(res, 400, { error: "Invalid support id." });
        return true;
      }

      let payload;
      try {
        payload = await parseJsonBody(req);
      } catch (error) {
        sendBodyParseError(res, error);
        return true;
      }

      const decision = payload && payload.decision === "approved" ? "approved" : payload && payload.decision === "denied" ? "denied" : "";
      const operatorChatId = Number(payload && payload.operatorChatId) || null;
      if (!decision) {
        sendJson(res, 400, { error: "decision must be approved or denied." });
        return true;
      }

      const tickets = await readSupportTickets();
      const ticket = tickets.find((item) => Number(item.id) === ticketId);
      if (!ticket) {
        sendJson(res, 404, { error: "Support ticket not found." });
        return true;
      }

      ticket.status = decision;
      ticket.updatedAt = new Date().toISOString();
      ticket.operatorChatId = operatorChatId;
      ticket.messages = Array.isArray(ticket.messages) ? ticket.messages : [];
      ticket.messages.push({
        id: createId(),
        from: "system",
        text: decision === "approved"
          ? "Support approved this chat. You can start messaging."
          : "Support denied this request.",
        createdAt: ticket.updatedAt
      });

      await writeSupportTickets(tickets);
      sendJson(res, 200, { item: buildSupportSnapshot(ticket, true) });
      return true;
    }

    if (segments.length === 5 && segments[4] === "message") {
      const ticketId = Number(segments[3]);
      if (!Number.isFinite(ticketId)) {
        sendJson(res, 400, { error: "Invalid support id." });
        return true;
      }

      let payload;
      try {
        payload = await parseJsonBody(req);
      } catch (error) {
        sendBodyParseError(res, error);
        return true;
      }

      const validation = validateSupportMessagePayload(payload);
      if (!validation.ok) {
        sendJson(res, 400, { error: validation.error });
        return true;
      }

      const tickets = await readSupportTickets();
      const ticket = tickets.find((item) => Number(item.id) === ticketId);
      if (!ticket) {
        sendJson(res, 404, { error: "Support ticket not found." });
        return true;
      }

      const { from, text, operatorChatId, visitorId } = validation.data;
      if (from === "operator") {
        if (!requireAdmin(req, res)) {
          return true;
        }
      } else {
        const access = requireVisitorAccess(req, res, ticket.visitorId, visitorId);
        if (!access.ok) {
          return true;
        }
      }

      if (ticket.status === "denied") {
        sendJson(res, 403, { error: "Support ticket is denied." });
        return true;
      }
      if (from === "operator" && ticket.status !== "approved") {
        sendJson(res, 403, { error: "Support ticket is not approved yet." });
        return true;
      }

      const createdAt = new Date().toISOString();
      const message = {
        id: createId(),
        from,
        text,
        createdAt
      };

      ticket.messages = Array.isArray(ticket.messages) ? ticket.messages : [];
      ticket.messages.push(message);
      ticket.updatedAt = createdAt;
      if (from === "operator" && operatorChatId) {
        ticket.operatorChatId = operatorChatId;
      }

      await writeSupportTickets(tickets);
      sendJson(res, 201, { item: buildSupportSnapshot(ticket, from === "operator"), message });
      return true;
    }
  }

  return false;
}

function isStaticPathAllowed(requestedPath) {
  if (ALLOWED_STATIC_FILES.has(requestedPath)) {
    return true;
  }
  return ALLOWED_STATIC_PREFIXES.some((prefix) => requestedPath.startsWith(prefix));
}

function resolveStaticPath(pathname) {
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const normalized = decodedPath.replace(/^\/+/, "").replace(/\\/g, "/");
  const requested = normalized || "index.html";
  if (!isStaticPathAllowed(requested)) {
    return null;
  }
  const filePath = path.resolve(ROOT_DIR, requested);
  if (!filePath.startsWith(ROOT_DIR)) {
    return null;
  }
  return filePath;
}

async function handleStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Метод не поддерживается." });
    return;
  }

  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    sendJson(res, 404, { error: "File not found." });
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    sendFile(res, 200, body, contentType, req.method);
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFoundPath = path.join(ROOT_DIR, "404.html");
      try {
        const body = await fs.readFile(notFoundPath);
        sendFile(res, 404, body, "text/html; charset=utf-8", req.method);
      } catch {
        sendJson(res, 404, { error: "Файл не найден." });
      }
      return;
    }
    sendJson(res, 500, { error: "Ошибка чтения файла." });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    res.__request = req;
    res.__requestId = crypto.randomUUID();

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    const handled = await handleApi(req, res, url);
    if (handled) {
      return;
    }

    await handleStatic(req, res, pathname);
  } catch {
    sendJson(res, 500, { error: "Внутренняя ошибка сервера." });
  }
});

if (IS_PRODUCTION && REQUIRE_ADMIN_TOKEN && !ADMIN_API_TOKEN) {
  console.error("ADMIN_API_TOKEN is required in production when REQUIRE_ADMIN_TOKEN=true.");
  process.exit(1);
}

if (IS_PRODUCTION && !CORS_ORIGINS_RAW) {
  console.warn("CORS_ORIGINS is empty in production. Configure explicit origins.");
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
