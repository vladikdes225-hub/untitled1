const path = require("path");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_API_TOKEN = String(process.env.ADMIN_API_TOKEN || "").trim();
const LOCAL_API_BASE = `http://127.0.0.1:${Number(process.env.PORT || 3001)}`;
const ADS_API_BASE = String(process.env.ADS_API_BASE || LOCAL_API_BASE).trim().replace(/\/+$/, "");
const SUPPORT_API_BASE = String(process.env.SUPPORT_API_BASE || ADS_API_BASE).trim().replace(/\/+$/, "");
const TELEGRAM_API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "";
const TELEGRAM_FILE_BASE = BOT_TOKEN ? `https://api.telegram.org/file/bot${BOT_TOKEN}` : "";
const PAGE_SIZE = 6;
const SUPPORT_SYNC_MS = Number(process.env.SUPPORT_SYNC_MS || 3500);
const DEFAULT_SELLER_TELEGRAM = "RXSEND";
const DEFAULT_MANAGER_NAME = "RXSEND";
const DEFAULT_MANAGER_TELEGRAM = "RXSEND";
const AUTH_PASSWORD = String(process.env.BOT_AUTH_PASSWORD || "").trim();
const AUTH_MAX_FAILS = Number(process.env.BOT_AUTH_MAX_FAILS || 5);
const AUTH_LOCK_MS = Number(process.env.BOT_AUTH_LOCK_MS || 5 * 60 * 1000);

const CATEGORIES = [
  "\u0412\u0441\u0435",
  "\u0422\u0435\u043B\u0435\u0444\u043E\u043D\u044B",
  "\u041D\u0430\u0443\u0448\u043D\u0438\u043A\u0438",
  "\u0427\u0430\u0441\u044B",
  "\u041F\u043B\u0430\u043D\u0448\u0435\u0442\u044B",
  "\u041D\u043E\u0443\u0442\u0431\u0443\u043A\u0438",
  "\u041A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u044B",
  "\u041A\u043E\u043D\u0441\u043E\u043B\u0438",
  "\u041A\u043E\u043B\u043E\u043D\u043A\u0438",
  "\u0411\u0435\u0437 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438"
];

if (!BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}

if (!AUTH_PASSWORD) {
  console.error("Missing BOT_AUTH_PASSWORD environment variable.");
  process.exit(1);
}

if (!ADMIN_API_TOKEN) {
  console.error("Missing ADMIN_API_TOKEN environment variable.");
  process.exit(1);
}

const sessions = new Map();
const authState = new Map();
const supportReplyMode = new Map();
const supportCursorByChat = new Map();
let lastSupportSyncAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(text, max) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}...`;
}

function normalizeCondition(text) {
  const value = text.trim().toLowerCase();
  if (["\u043D\u043E\u0432\u044B\u0439", "new", "n"].includes(value)) {
    return "new";
  }
  if (["\u0431/\u0443", "\u0431\u0443", "used", "u"].includes(value)) {
    return "used";
  }
  return null;
}

function categoryRows(includeAll = true) {
  const items = includeAll ? CATEGORIES : CATEGORIES.filter((item) => item !== "\u0412\u0441\u0435");
  const rows = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3));
  }
  return rows;
}

function categoryByIndex(index) {
  return CATEGORIES[index] || "\u0412\u0441\u0435";
}

async function tgRequest(method, payload = {}) {
  const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Telegram HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return tgRequest("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

async function editMessage(chatId, messageId, text, extra = {}) {
  return tgRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...extra
  });
}

async function answerCallbackQuery(callbackQueryId, text = "") {
  await tgRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text
  });
}

function withAdminHeaders(headers = {}) {
  return {
    ...headers,
    "X-API-Token": ADMIN_API_TOKEN
  };
}

function apiUrl(base, endpoint) {
  return `${base}${endpoint}`;
}

async function fetchWithFallback(base, endpoint, options = {}) {
  const primaryUrl = apiUrl(base, endpoint);
  try {
    return await fetch(primaryUrl, options);
  } catch (primaryError) {
    if (base === LOCAL_API_BASE) {
      throw new Error(`Network error for ${primaryUrl}: ${primaryError.message}`);
    }

    const localUrl = apiUrl(LOCAL_API_BASE, endpoint);
    try {
      return await fetch(localUrl, options);
    } catch (localError) {
      throw new Error(
        `Network error for ${primaryUrl}: ${primaryError.message}; local fallback ${localUrl}: ${localError.message}`
      );
    }
  }
}

async function fetchAdsFromSite() {
  const response = await fetchWithFallback(ADS_API_BASE, "/api/ads", {
    headers: withAdminHeaders()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Ads API HTTP ${response.status}`);
  }
  return Array.isArray(data.items) ? data.items : [];
}

async function postAdToSite(payload) {
  const response = await fetchWithFallback(ADS_API_BASE, "/api/ads", {
    method: "POST",
    headers: withAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Ads API HTTP ${response.status}`);
  }

  return data.item;
}

async function deleteAdFromSite(id) {
  const response = await fetchWithFallback(ADS_API_BASE, `/api/ads/${id}`, {
    method: "DELETE",
    headers: withAdminHeaders()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Ads API HTTP ${response.status}`);
  }
}

async function fetchSupportRequests(status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetchWithFallback(SUPPORT_API_BASE, `/api/support/requests${query}`, {
    headers: withAdminHeaders()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Support API HTTP ${response.status}`);
  }
  return Array.isArray(data.items) ? data.items : [];
}

async function fetchSupportTicket(id, after = 0) {
  const response = await fetchWithFallback(
    SUPPORT_API_BASE,
    `/api/support/requests/${id}?after=${Number(after) || 0}`,
    {
    headers: withAdminHeaders()
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Support API HTTP ${response.status}`);
  }
  return {
    item: data.item || null,
    messages: Array.isArray(data.messages) ? data.messages : []
  };
}

async function postSupportDecision(id, decision, operatorChatId) {
  const response = await fetchWithFallback(SUPPORT_API_BASE, `/api/support/requests/${id}/decision`, {
    method: "POST",
    headers: withAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ decision, operatorChatId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Support API HTTP ${response.status}`);
  }
  return data.item;
}

async function postSupportOperatorMessage(id, text, operatorChatId) {
  const response = await fetchWithFallback(SUPPORT_API_BASE, `/api/support/requests/${id}/message`, {
    method: "POST",
    headers: withAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      from: "operator",
      text,
      operatorChatId
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Support API HTTP ${response.status}`);
  }
  return data.message || null;
}

function formatSupportStatus(status) {
  if (status === "pending") {
    return "pending";
  }
  if (status === "approved") {
    return "approved";
  }
  if (status === "denied") {
    return "denied";
  }
  return String(status || "unknown");
}

function supportCursorKey(chatId, ticketId) {
  return `${chatId}:${ticketId}`;
}

function startSession(chatId) {
  sessions.set(chatId, {
    step: "category",
    data: {
      imageUrls: [],
      year: null
    }
  });
}

function stopSession(chatId) {
  sessions.delete(chatId);
}

function getAuth(chatId) {
  if (!authState.has(chatId)) {
    authState.set(chatId, {
      ok: false,
      fails: 0,
      lockedUntil: 0
    });
  }
  return authState.get(chatId);
}

function isAuthorized(chatId) {
  return getAuth(chatId).ok;
}

function resetAuth(chatId) {
  authState.set(chatId, {
    ok: false,
    fails: 0,
    lockedUntil: 0
  });
}

function authSecondsLeft(chatId) {
  const auth = getAuth(chatId);
  const diff = auth.lockedUntil - Date.now();
  return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

function authorizeByPassword(chatId, input) {
  const auth = getAuth(chatId);
  const now = Date.now();

  if (auth.lockedUntil > now) {
    return { ok: false, reason: "locked", seconds: Math.ceil((auth.lockedUntil - now) / 1000) };
  }

  if (String(input) === AUTH_PASSWORD) {
    auth.ok = true;
    auth.fails = 0;
    auth.lockedUntil = 0;
    authState.set(chatId, auth);
    return { ok: true };
  }

  auth.ok = false;
  auth.fails += 1;

  if (auth.fails >= AUTH_MAX_FAILS) {
    auth.fails = 0;
    auth.lockedUntil = now + AUTH_LOCK_MS;
    authState.set(chatId, auth);
    return { ok: false, reason: "locked", seconds: Math.ceil(AUTH_LOCK_MS / 1000) };
  }

  authState.set(chatId, auth);
  return { ok: false, reason: "invalid", attemptsLeft: Math.max(AUTH_MAX_FAILS - auth.fails, 0) };
}

function getPrompt(step) {
  if (step === "category") {
    return "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E \u0442\u043E\u0432\u0430\u0440\u0430.";
  }
  if (step === "brand") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0431\u0440\u0435\u043D\u0434 \u0442\u043E\u0432\u0430\u0440\u0430 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: Apple, Sony).";
  }
  if (step === "model") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u044C \u0442\u043E\u0432\u0430\u0440\u0430.";
  }
  if (step === "year") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0433\u043E\u0434 \u0432\u044B\u043F\u0443\u0441\u043A\u0430 (1970-2100) \u0438\u043B\u0438 '-' \u0435\u0441\u043B\u0438 \u043D\u0435 \u043D\u0443\u0436\u0435\u043D.";
  }
  if (step === "memory") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u043C\u044F\u0442\u044C/\u043E\u0431\u044A\u0435\u043C (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 128GB) \u0438\u043B\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 '-' \u0435\u0441\u043B\u0438 \u043D\u0435 \u043D\u0443\u0436\u043D\u043E.";
  }
  if (step === "condition") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: \u041D\u043E\u0432\u044B\u0439 \u0438\u043B\u0438 \u0411/\u0423.";
  }
  if (step === "price") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0446\u0435\u043D\u0443 \u0432 \u0440\u0443\u0431\u043B\u044F\u0445 (\u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0438\u0441\u043B\u043E).";
  }
  if (step === "seller") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u0440\u043E\u0434\u0430\u0432\u0446\u0430.";
  }
  if (step === "description") {
    return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u0438\u043B\u0438 '-').";
  }
  if (step === "photo") {
    return "\u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043E\u0434\u043D\u043E \u0438\u043B\u0438 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E (\u043C\u043E\u0436\u043D\u043E \u0430\u043B\u044C\u0431\u043E\u043C\u043E\u043C). \u041A\u043E\u0433\u0434\u0430 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u0435, \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 /done. \u0414\u043B\u044F \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u0431\u0435\u0437 \u0444\u043E\u0442\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 '-'.";
  }
  return "";
}

async function askStep(chatId, step) {
  const prompt = getPrompt(step);
  if (step === "category") {
    await sendMessage(chatId, prompt, {
      reply_markup: {
        keyboard: categoryRows(false),
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return;
  }

  if (step === "condition") {
    await sendMessage(chatId, prompt, {
      reply_markup: {
        keyboard: [["\u041D\u043E\u0432\u044B\u0439", "\u0411/\u0423"]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return;
  }

  await sendMessage(chatId, prompt, { reply_markup: { remove_keyboard: true } });
}

function buildTitle(data) {
  return `${data.brand} ${data.model}${data.memory ? ` ${data.memory}` : ""} ${data.condition === "new" ? "\u043D\u043E\u0432\u044B\u0439" : "\u0431/\u0443"}`;
}

function imageContentTypeByExt(ext = "") {
  const normalized = String(ext || "").toLowerCase();
  if (normalized === ".png") {
    return "image/png";
  }
  if (normalized === ".webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

async function uploadImageToSite(buffer, ext = ".jpg") {
  const response = await fetchWithFallback(ADS_API_BASE, "/api/uploads", {
    method: "POST",
    headers: withAdminHeaders({
      "Content-Type": imageContentTypeByExt(ext),
      "X-File-Ext": ext
    }),
    body: buffer
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Upload API HTTP ${response.status}`);
  }
  if (!data || typeof data.url !== "string" || !data.url.trim()) {
    throw new Error("Upload API returned empty url.");
  }
  return data.url.trim();
}

async function downloadPhotoFromTelegram(fileId) {
  const fileInfo = await tgRequest("getFile", { file_id: fileId });
  if (!fileInfo || !fileInfo.file_path) {
    throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0443\u0442\u044C \u043A \u0444\u0430\u0439\u043B\u0443.");
  }

  const response = await fetch(`${TELEGRAM_FILE_BASE}/${fileInfo.file_path}`);
  if (!response.ok) {
    throw new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0444\u0430\u0439\u043B\u0430 (${response.status}).`);
  }

  const ext = (path.extname(fileInfo.file_path) || ".jpg").toLowerCase();
  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadImageToSite(buffer, ext);
}

async function sendCategoryMenu(chatId, mode = "catalog", messageId = null) {
  const text = `\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 (${mode === "delete" ? "\u0440\u0435\u0436\u0438\u043C \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F" : "\u0440\u0435\u0436\u0438\u043C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430"})`;
  const keyboard = {
    inline_keyboard: [
      ...categoryRows(true).map((row) =>
        row.map((name) => ({ text: name, callback_data: `cat:${mode}:${CATEGORIES.indexOf(name)}:0` }))
      ),
      [{ text: "\u041C\u0435\u043D\u044E", callback_data: "cmd:menu" }]
    ]
  };

  if (messageId) {
    await editMessage(chatId, messageId, text, { reply_markup: keyboard });
    return;
  }
  await sendMessage(chatId, text, { reply_markup: keyboard });
}

async function sendMainMenu(chatId, messageId = null) {
  const text = "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E";
  const keyboard = {
    inline_keyboard: [
      [
        { text: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433", callback_data: "menu:catalog" },
        { text: "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435", callback_data: "menu:delete" }
      ],
      [
        { text: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C", callback_data: "cmd:newad" },
        { text: "\u0412\u044B\u0439\u0442\u0438", callback_data: "cmd:logout" }
      ],
      [
        { text: "\u0422\u0435\u0445\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", callback_data: "cmd:support" }
      ]
    ]
  };

  if (messageId) {
    await editMessage(chatId, messageId, text, { reply_markup: keyboard });
    return;
  }
  await sendMessage(chatId, text, { reply_markup: keyboard });
}

async function sendSupportMenu(chatId, messageId = null) {
  const pending = await fetchSupportRequests("pending");
  const approved = await fetchSupportRequests("approved");

  const pendingRows = pending.slice(0, 8).map((item) => ([
    { text: `Approve #${item.id}`, callback_data: `sup:approve:${item.id}` },
    { text: `Deny #${item.id}`, callback_data: `sup:deny:${item.id}` }
  ]));

  const approvedRows = approved.slice(0, 8).map((item) => ([
    { text: `Open #${item.id}`, callback_data: `sup:open:${item.id}` }
  ]));

  const lines = [
    "Support queue",
    `Pending: ${pending.length}`,
    `Approved: ${approved.length}`,
    "",
    ...pending.slice(0, 6).map((item) => `PENDING #${item.id} ${item.visitorName || "Guest"}`),
    ...approved.slice(0, 6).map((item) => `APPROVED #${item.id} ${item.visitorName || "Guest"}`)
  ];

  const keyboard = {
    inline_keyboard: [
      ...pendingRows,
      ...approvedRows,
      [
        { text: "Refresh", callback_data: "sup:refresh" },
        { text: "Menu", callback_data: "cmd:menu" }
      ]
    ]
  };

  const text = lines.join("\\n");
  if (messageId) {
    await editMessage(chatId, messageId, text, { reply_markup: keyboard });
    return;
  }
  await sendMessage(chatId, text, { reply_markup: keyboard });
}

async function openSupportThread(chatId, ticketId) {
  const details = await fetchSupportTicket(ticketId, 0);
  if (!details.item) {
    throw new Error("Support ticket not found.");
  }

  supportReplyMode.set(chatId, Number(ticketId));
  const allMessages = Array.isArray(details.messages) ? details.messages : [];
  const lastMessageId = allMessages.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  supportCursorByChat.set(supportCursorKey(chatId, ticketId), lastMessageId);

  const history = allMessages.slice(-8).map((item) => {
    const from = item.from === "operator" ? "You" : item.from === "visitor" ? "Client" : "System";
    return `${from}: ${String(item.text || "").slice(0, 400)}`;
  });

  await sendMessage(
    chatId,
    [
      `Dialog #${details.item.id}`,
      `Status: ${formatSupportStatus(details.item.status)}`,
      "Reply mode enabled: send plain text to reply to client.",
      "Use /leave to exit this mode.",
      "",
      ...history
    ].join("\\n")
  );
}

async function syncSupportReplySessions() {
  const now = Date.now();
  if (now - lastSupportSyncAt < SUPPORT_SYNC_MS) {
    return;
  }
  lastSupportSyncAt = now;

  for (const [chatId, ticketId] of supportReplyMode.entries()) {
    const key = supportCursorKey(chatId, ticketId);
    const after = Number(supportCursorByChat.get(key) || 0);
    try {
      const details = await fetchSupportTicket(ticketId, after);
      if (!details.item) {
        supportReplyMode.delete(chatId);
        supportCursorByChat.delete(key);
        await sendMessage(chatId, `Dialog #${ticketId} not found. Reply mode disabled.`);
        continue;
      }

      const incoming = details.messages.filter((msg) => msg.from === "visitor");
      for (const msg of details.messages) {
        const id = Number(msg.id) || 0;
        if (id > (supportCursorByChat.get(key) || 0)) {
          supportCursorByChat.set(key, id);
        }
      }

      if (details.item.status === "denied") {
        supportReplyMode.delete(chatId);
        supportCursorByChat.delete(key);
        await sendMessage(chatId, `Dialog #${ticketId} denied. Reply mode disabled.`);
        continue;
      }

      for (const msg of incoming) {
        await sendMessage(chatId, `Client #${ticketId}: ${msg.text}`);
      }
    } catch (error) {
      await sendMessage(chatId, `Sync error #${ticketId}: ${error.message}`);
    }
  }
}

async function sendCatalog(chatId, options, messageId = null) {
  const { mode, categoryIndex } = options;
  const ads = await fetchAdsFromSite();
  const category = categoryByIndex(categoryIndex);
  const filtered = category === "\u0412\u0441\u0435" ? ads : ads.filter((item) => item.category === category);

  if (!filtered.length) {
    const emptyText = `\u041A\u0430\u0442\u0430\u043B\u043E\u0433 "${category}" \u043F\u0443\u0441\u0442.`;
    const keyboard = {
      inline_keyboard: [[{ text: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438", callback_data: `menu:${mode}` }]]
    };
    if (messageId) {
      await editMessage(chatId, messageId, emptyText, { reply_markup: keyboard });
    } else {
      await sendMessage(chatId, emptyText, { reply_markup: keyboard });
    }
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(options.page || 0, 0), totalPages - 1);
  const start = page * PAGE_SIZE;
  const items = filtered.slice(start, start + PAGE_SIZE);
  const lines = items.map((item, idx) => `${start + idx + 1}. #${item.id} ${truncate(item.title, 34)} - ${item.price} \u20BD`);
  const text = `\u041A\u0430\u0442\u0430\u043B\u043E\u0433: ${category}\n\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 ${page + 1}/${totalPages}\n\n${lines.join("\n")}`;

  const keyboard = {
    inline_keyboard: [
      ...items.map((item) => [{ text: `\u041E\u0442\u043A\u0440\u044B\u0442\u044C #${item.id}`, callback_data: `view:${mode}:${categoryIndex}:${page}:${item.id}` }]),
      [
        { text: "\u2B05\uFE0F", callback_data: `page:${mode}:${categoryIndex}:${page - 1}` },
        { text: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438", callback_data: `menu:${mode}` },
        { text: "\u041C\u0435\u043D\u044E", callback_data: "cmd:menu" },
        { text: "\u27A1\uFE0F", callback_data: `page:${mode}:${categoryIndex}:${page + 1}` }
      ]
    ]
  };

  if (messageId) {
    await editMessage(chatId, messageId, text, { reply_markup: keyboard });
    return;
  }
  await sendMessage(chatId, text, { reply_markup: keyboard });
}

function adDetailsText(item) {
  const conditionLabel = item.condition === "new" ? "\u041D\u043E\u0432\u044B\u0439" : "\u0411/\u0423";
  const yearLabel = Number.isFinite(Number(item.year)) ? String(Math.round(Number(item.year))) : "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D";
  const created = item.createdAt ? new Date(item.createdAt).toLocaleString("ru-RU") : "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
  return [
    `#${item.id} ${item.title}`,
    `\u0426\u0435\u043D\u0430: ${item.price} \u20BD`,
    `\u041F\u0440\u043E\u0434\u0430\u0432\u0435\u0446: ${item.seller}`,
    `\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F: ${item.category}`,
    `\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: ${conditionLabel}`,
    `\u0413\u043E\u0434: ${yearLabel}`,
    `\u0414\u0430\u0442\u0430: ${created}`,
    "",
    `${item.description || "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E."}`
  ].join("\n");
}

async function showAdDetails(chatId, messageId, mode, categoryIndex, page, adId) {
  const ads = await fetchAdsFromSite();
  const ad = ads.find((item) => Number(item.id) === Number(adId));
  if (!ad) {
    await editMessage(chatId, messageId, "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0438\u043B\u0438 \u0443\u0436\u0435 \u0443\u0434\u0430\u043B\u0435\u043D.", {
      reply_markup: { inline_keyboard: [[{ text: "\u041D\u0430\u0437\u0430\u0434", callback_data: `page:${mode}:${categoryIndex}:${page}` }]] }
    });
    return;
  }

  const buttons = [
    [{ text: "\u041D\u0430\u0437\u0430\u0434", callback_data: `page:${mode}:${categoryIndex}:${page}` }],
    [{ text: "\u041C\u0435\u043D\u044E", callback_data: "cmd:menu" }]
  ];
  if (mode === "delete") {
    buttons.unshift([{ text: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435", callback_data: `delete:${mode}:${categoryIndex}:${page}:${ad.id}` }]);
  }

  await editMessage(chatId, messageId, adDetailsText(ad), {
    reply_markup: { inline_keyboard: buttons }
  });
}

async function finalizeSession(chatId) {
  const session = sessions.get(chatId);
  if (!session) {
    return;
  }

  const payload = {
    title: buildTitle(session.data),
    description: session.data.description,
    seller: session.data.seller,
    sellerTelegram: DEFAULT_SELLER_TELEGRAM,
    managerName: DEFAULT_MANAGER_NAME,
    managerTelegram: DEFAULT_MANAGER_TELEGRAM,
    price: session.data.price,
    year: session.data.year,
    condition: session.data.condition,
    category: session.data.category,
    source: "telegram",
    imageUrls: session.data.imageUrls
  };

  try {
    const item = await postAdToSite(payload);
    await sendMessage(
      chatId,
      `\u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E.\nID: ${item.id}\n${item.title}\n\u0426\u0435\u043D\u0430: ${item.price} \u20BD\n\u0413\u043E\u0434: ${item.year || "-"}\n\u0424\u043E\u0442\u043E: ${session.data.imageUrls.length}`
    );
  } catch (error) {
    await sendMessage(chatId, `\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438: ${error.message}`);
  }
  stopSession(chatId);
}

async function handleCreateSessionMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const session = sessions.get(chatId);
  if (!session) {
    return;
  }

  if (session.step === "category") {
    if (!CATEGORIES.includes(text) || text === "\u0412\u0441\u0435") {
      await sendMessage(chatId, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E \u043A\u043D\u043E\u043F\u043A\u043E\u0439.");
      return;
    }
    session.data.category = text;
    session.step = "brand";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "brand") {
    if (text.length < 2) {
      await sendMessage(chatId, "\u0411\u0440\u0435\u043D\u0434 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439.");
      return;
    }
    session.data.brand = text;
    session.step = "model";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "model") {
    if (text.length < 2) {
      await sendMessage(chatId, "\u041C\u043E\u0434\u0435\u043B\u044C \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u0430\u044F.");
      return;
    }
    session.data.model = text;
    session.step = "year";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "year") {
    if (text === "-") {
      session.data.year = null;
      session.step = "memory";
      await askStep(chatId, session.step);
      return;
    }
    const year = Number(text.replace(/\s+/g, ""));
    if (!Number.isFinite(year) || year < 1970 || year > 2100) {
      await sendMessage(chatId, "\u0413\u043E\u0434 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0432 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0435 1970-2100 \u0438\u043B\u0438 '-'.");
      return;
    }
    session.data.year = Math.round(year);
    session.step = "memory";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "memory") {
    session.data.memory = text === "-" ? "" : text;
    session.step = "condition";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "condition") {
    const condition = normalizeCondition(text);
    if (!condition) {
      await sendMessage(chatId, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u041D\u043E\u0432\u044B\u0439 \u0438\u043B\u0438 \u0411/\u0423.");
      return;
    }
    session.data.condition = condition;
    session.step = "price";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "price") {
    const price = Number(text.replace(/\s+/g, ""));
    if (!Number.isFinite(price) || price < 1) {
      await sendMessage(chatId, "\u0426\u0435\u043D\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0447\u0438\u0441\u043B\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u0435 0.");
      return;
    }
    session.data.price = Math.round(price);
    session.step = "seller";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "seller") {
    if (text.length < 2) {
      await sendMessage(chatId, "\u0418\u043C\u044F \u043F\u0440\u043E\u0434\u0430\u0432\u0446\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435.");
      return;
    }
    session.data.seller = text;
    session.step = "description";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "description") {
    session.data.description = text === "-" ? "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E." : text;
    session.step = "photo";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "photo") {
    if (text === "-") {
      session.data.imageUrls = [];
      await finalizeSession(chatId);
      return;
    }
    await sendMessage(chatId, "\u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0444\u043E\u0442\u043E (\u043C\u043E\u0436\u043D\u043E \u0441\u0440\u0430\u0437\u0443 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E) \u0438 \u043F\u043E\u0441\u043B\u0435 \u044D\u0442\u043E\u0433\u043E /done, \u043B\u0438\u0431\u043E '-' \u0431\u0435\u0437 \u0444\u043E\u0442\u043E.");
  }
}

async function handleCreateSessionPhoto(message) {
  const chatId = message.chat.id;
  const session = sessions.get(chatId);
  if (!session || session.step !== "photo") {
    return;
  }

  const photoList = Array.isArray(message.photo) ? message.photo : [];
  if (!photoList.length) {
    return;
  }

  const biggest = photoList[photoList.length - 1];
  try {
    const imageUrl = await downloadPhotoFromTelegram(biggest.file_id);
    session.data.imageUrls.push(imageUrl);
    session.data.imageUrls = session.data.imageUrls.slice(0, 12);
    await sendMessage(chatId, `\u0424\u043E\u0442\u043E \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E (${session.data.imageUrls.length}). \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0435\u0449\u0451 \u0444\u043E\u0442\u043E \u0438\u043B\u0438 /done.`);
  } catch (error) {
    await sendMessage(chatId, `\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0444\u043E\u0442\u043E: ${error.message}`);
  }
}

async function handleStart(chatId) {
  await sendMessage(
    chatId,
    [
      "\u0411\u043E\u0442 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u043E\u043C.",
      "\u041A\u043E\u043C\u0430\u043D\u0434\u044B:",
      "/login - \u0432\u043E\u0439\u0442\u0438 \u043F\u043E \u043F\u0430\u0440\u043E\u043B\u044E",
      "/logout - \u0437\u0430\u043A\u0440\u044B\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F",
      "/newad - \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435",
      "/catalog - \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0442\u043E\u0432\u0430\u0440\u043E\u0432",
      "/delete - \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0434\u043B\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F",
      "/support - \u0437\u0430\u044F\u0432\u043A\u0438 \u0442\u0435\u0445\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0438",
      "/leave - \u0432\u044B\u0439\u0442\u0438 \u0438\u0437 \u0440\u0435\u0436\u0438\u043C\u0430 \u043E\u0442\u0432\u0435\u0442\u043E\u0432",
      "/done - \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0444\u043E\u0442\u043E",
      "/cancel - \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0432\u0432\u043E\u0434"
    ].join("\n")
  );
  await sendMainMenu(chatId);
}

async function handleMessage(message) {
  if (!message || !message.chat) {
    return;
  }

  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  if (text === "/start") {
    stopSession(chatId);
    await handleStart(chatId);
    if (!isAuthorized(chatId)) {
      await sendMessage(chatId, "\u0414\u043E\u0441\u0442\u0443\u043F \u043A \u0431\u043E\u0442\u0443 \u0437\u0430\u043A\u0440\u044B\u0442 \u043F\u0430\u0440\u043E\u043B\u0435\u043C. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 /login.");
    }
    return;
  }

  if (text === "/menu") {
    stopSession(chatId);
    if (!isAuthorized(chatId)) {
      await sendMessage(chatId, "\u0411\u043E\u0442 \u0437\u0430\u0449\u0438\u0449\u0451\u043D. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 /login, \u0437\u0430\u0442\u0435\u043C \u043F\u0430\u0440\u043E\u043B\u044C.");
      return;
    }
    await sendMainMenu(chatId);
    return;
  }

  if (text === "/logout") {
    stopSession(chatId);
    resetAuth(chatId);
    supportReplyMode.delete(chatId);
    await sendMessage(chatId, "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043A\u0440\u044B\u0442. \u0414\u043B\u044F \u0432\u0445\u043E\u0434\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 /login.");
    return;
  }

  if (text === "/login") {
    if (isAuthorized(chatId)) {
      await sendMessage(chatId, "\u0412\u044B \u0443\u0436\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u044B.");
      return;
    }
    const seconds = authSecondsLeft(chatId);
    if (seconds > 0) {
      await sendMessage(chatId, `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043E\u0448\u0438\u0431\u043E\u043A. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 ${seconds} \u0441\u0435\u043A.`);
      return;
    }
    await sendMessage(chatId, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C \u043E\u0434\u043D\u0438\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C.");
    return;
  }

  if (!isAuthorized(chatId)) {
    if (text && !text.startsWith("/")) {
      const authResult = authorizeByPassword(chatId, text);
      if (authResult.ok) {
        await sendMessage(chatId, "\u0414\u043E\u0441\u0442\u0443\u043F \u043E\u0442\u043A\u0440\u044B\u0442. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B: /support /newad /catalog /delete /logout");
        return;
      }
      if (authResult.reason === "locked") {
        await sendMessage(chatId, `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043E\u0448\u0438\u0431\u043E\u043A. \u0411\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430 \u043D\u0430 ${authResult.seconds} \u0441\u0435\u043A.`);
        return;
      }
      await sendMessage(chatId, `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C. \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043F\u044B\u0442\u043E\u043A: ${authResult.attemptsLeft}.`);
      return;
    }

    await sendMessage(chatId, "\u0411\u043E\u0442 \u0437\u0430\u0449\u0438\u0449\u0451\u043D. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 /login, \u0437\u0430\u0442\u0435\u043C \u043F\u0430\u0440\u043E\u043B\u044C.");
    return;
  }

  if (text === "/cancel") {
    stopSession(chatId);
    await sendMessage(chatId, "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u0432\u043E\u0434 \u043E\u0442\u043C\u0435\u043D\u0435\u043D.");
    return;
  }

  if (text === "/newad") {
    startSession(chatId);
    await sendMessage(chatId, "\u041D\u0430\u0447\u0438\u043D\u0430\u0435\u043C \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F.");
    await askStep(chatId, "category");
    return;
  }

  if (text === "/catalog") {
    stopSession(chatId);
    await sendCategoryMenu(chatId, "catalog");
    return;
  }

  if (text === "/delete") {
    stopSession(chatId);
    await sendCategoryMenu(chatId, "delete");
    return;
  }

  if (text === "/support") {
    stopSession(chatId);
    await sendSupportMenu(chatId);
    return;
  }

  if (text === "/leave") {
    const currentTicketId = supportReplyMode.get(chatId);
    if (currentTicketId) {
      supportReplyMode.delete(chatId);
      await sendMessage(chatId, `\u0420\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u0430 \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D (#${currentTicketId}).`);
      return;
    }
    await sendMessage(chatId, "\u0420\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u0430 \u043D\u0435 \u0430\u043A\u0442\u0438\u0432\u0435\u043D.");
    return;
  }

  const session = sessions.get(chatId);
  if (text === "/done" && session && session.step === "photo") {
    await finalizeSession(chatId);
    return;
  }

  if (!session && !text.startsWith("/") && supportReplyMode.has(chatId)) {
    const ticketId = supportReplyMode.get(chatId);
    try {
      await postSupportOperatorMessage(ticketId, text, chatId);
      await sendMessage(chatId, `\u041E\u0442\u0432\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u0432 \u0434\u0438\u0430\u043B\u043E\u0433 #${ticketId}.`);
    } catch (error) {
      await sendMessage(chatId, `\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438: ${error.message}`);
    }
    return;
  }

  if (session) {
    if (Array.isArray(message.photo) && message.photo.length) {
      await handleCreateSessionPhoto(message);
      return;
    }
    await handleCreateSessionMessage(message);
    return;
  }

  if (Array.isArray(message.photo) && message.photo.length) {
    await sendMessage(chatId, "\u0414\u043B\u044F \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u0444\u043E\u0442\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /newad.");
    return;
  }

  await sendMessage(chatId, "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /menu, /support, /newad, /catalog, /delete \u0438\u043B\u0438 /logout.");
}

async function handleCallbackQuery(query) {
  if (!query || !query.message || !query.data) {
    return;
  }

  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  if (!isAuthorized(chatId)) {
    await answerCallbackQuery(query.id, "\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u043E\u043B\u044C");
    await sendMessage(chatId, "\u0414\u043E\u0441\u0442\u0443\u043F \u043A \u043A\u043D\u043E\u043F\u043A\u0430\u043C \u0437\u0430\u043A\u0440\u044B\u0442. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 /login \u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C.");
    return;
  }

  try {
    if (data.startsWith("cmd:")) {
      const [, command] = data.split(":");

      if (command === "menu") {
        stopSession(chatId);
        await sendMainMenu(chatId, messageId);
        await answerCallbackQuery(query.id);
        return;
      }

      if (command === "newad") {
        stopSession(chatId);
        startSession(chatId);
        await answerCallbackQuery(query.id, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F");
        await sendMessage(chatId, "\u041D\u0430\u0447\u0438\u043D\u0430\u0435\u043C \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F.");
        await askStep(chatId, "category");
        return;
      }

      if (command === "logout") {
        stopSession(chatId);
        resetAuth(chatId);
        supportReplyMode.delete(chatId);
        await answerCallbackQuery(query.id, "\u0412\u044B\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D");
        await sendMainMenu(chatId, messageId);
        await sendMessage(chatId, "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043A\u0440\u044B\u0442. \u0414\u043B\u044F \u0432\u0445\u043E\u0434\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 /login.");
        return;
      }

      if (command === "support") {
        await sendSupportMenu(chatId, messageId);
        await answerCallbackQuery(query.id);
        return;
      }
    }

    if (data.startsWith("sup:")) {
      const [, action, rawId] = data.split(":");
      if (action === "refresh") {
        await sendSupportMenu(chatId, messageId);
        await answerCallbackQuery(query.id);
        return;
      }

      const ticketId = Number(rawId);
      if (!Number.isFinite(ticketId)) {
        await answerCallbackQuery(query.id, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 ID");
        return;
      }

      if (action === "approve") {
        await postSupportDecision(ticketId, "approved", chatId);
        await answerCallbackQuery(query.id, "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0434\u043E\u0431\u0440\u0435\u043D");
        await openSupportThread(chatId, ticketId);
        await sendSupportMenu(chatId);
        return;
      }

      if (action === "deny") {
        await postSupportDecision(ticketId, "denied", chatId);
        await answerCallbackQuery(query.id, "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D");
        await sendSupportMenu(chatId, messageId);
        return;
      }

      if (action === "open") {
        await answerCallbackQuery(query.id, "\u0414\u0438\u0430\u043B\u043E\u0433 \u043E\u0442\u043A\u0440\u044B\u0442");
        await openSupportThread(chatId, ticketId);
        return;
      }
    }

    if (data.startsWith("menu:")) {
      const [, mode] = data.split(":");
      await sendCategoryMenu(chatId, mode, messageId);
      await answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith("cat:")) {
      const [, mode, categoryIndex, page] = data.split(":");
      await sendCatalog(
        chatId,
        { mode, categoryIndex: Number(categoryIndex), page: Number(page || 0) },
        messageId
      );
      await answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith("page:")) {
      const [, mode, categoryIndex, page] = data.split(":");
      await sendCatalog(
        chatId,
        { mode, categoryIndex: Number(categoryIndex), page: Number(page || 0) },
        messageId
      );
      await answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith("view:")) {
      const [, mode, categoryIndex, page, adId] = data.split(":");
      await showAdDetails(chatId, messageId, mode, Number(categoryIndex), Number(page), Number(adId));
      await answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith("delete:")) {
      const [, mode, categoryIndex, page, adId] = data.split(":");
      await deleteAdFromSite(Number(adId));
      await sendCatalog(chatId, { mode, categoryIndex: Number(categoryIndex), page: Number(page) }, messageId);
      await answerCallbackQuery(query.id, "\u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E");
      return;
    }

    await answerCallbackQuery(query.id);
  } catch (error) {
    await answerCallbackQuery(query.id, "\u041E\u0448\u0438\u0431\u043A\u0430");
    await sendMessage(chatId, `\u041E\u0448\u0438\u0431\u043A\u0430: ${error.message}`);
  }
}

async function startPolling() {
  let offset = 0;
  console.log("Telegram bot started.");

  while (true) {
    try {
      const updates = await tgRequest("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"]
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          await handleMessage(update.message);
        } else if (update.callback_query) {
          await handleCallbackQuery(update.callback_query);
        }
      }

      await syncSupportReplySessions();
    } catch (error) {
      console.error("Polling error:", error.message);
      await sleep(3000);
    }
  }
}

startPolling();


