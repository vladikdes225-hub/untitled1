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

const CATEGORY_ITEMS = [
  { id: "all", ru: "Все", pl: "Wszystkie" },
  { id: "phones", ru: "Телефоны", pl: "Telefony" },
  { id: "headphones", ru: "Наушники", pl: "Sluchawki" },
  { id: "watches", ru: "Часы", pl: "Zegarki" },
  { id: "tablets", ru: "Планшеты", pl: "Tablety" },
  { id: "laptops", ru: "Ноутбуки", pl: "Laptopy" },
  { id: "computers", ru: "Компьютеры", pl: "Komputery" },
  { id: "consoles", ru: "Консоли", pl: "Konsole" },
  { id: "speakers", ru: "Колонки", pl: "Glosniki" },
  { id: "uncat", ru: "Без категории", pl: "Bez kategorii" }
];

const I18N = {
  pl: {
    menu: "Menu",
    mainMenu: "Menu glowne",
    catalog: "Katalog",
    delete: "Usuwanie",
    deny: "Odrzuc",
    add: "Dodaj",
    logout: "Wyloguj",
    support: "Wsparcie",
    approve: "Zatwierdz",
    refresh: "Odswiez",
    categories: "Kategorie",
    back: "Wroc",
    open: "Otworz",
    close: "Zamknij",
    done: "Gotowe",
    chooseCatalogMode: "Wybierz katalog ({mode})",
    modeDelete: "tryb usuwania",
    modeCatalog: "tryb przegladu",
    supportQueue: "Kolejka wsparcia",
    pending: "Oczekuje",
    approved: "Zatwierdzone",
    guest: "Gosc",
    dialog: "Dialog",
    status: "Status",
    replyModeOn: "Tryb odpowiedzi wlaczony: wyslij tekst, aby odpisac klientowi.",
    useLeave: "Uzyj /leave aby wyjsc z tego trybu.",
    client: "Klient",
    you: "Ty",
    system: "System",
    notFoundDialog: "Dialog #{id} nie znaleziony. Tryb odpowiedzi wylaczony.",
    deniedDialog: "Dialog #{id} odrzucony. Tryb odpowiedzi wylaczony.",
    syncError: "Blad synchronizacji #{id}: {message}",
    categoryEmpty: "Katalog \"{category}\" jest pusty.",
    catalogTitle: "Katalog: {category}",
    page: "Strona {current}/{total}",
    itemNotFound: "Towar nie znaleziony lub juz usuniety.",
    deleted: "Ogloszenie usuniete",
    published: "Ogloszenie opublikowane.\nID: {id}\n{title}\nCena: {price} ₽\nRok: {year}\nZdjecia: {photos}",
    publishError: "Blad publikacji: {message}",
    chooseCategoryBtn: "Wybierz kategorie przyciskiem.",
    shortBrand: "Marka jest za krotka.",
    shortModel: "Model jest za krotki.",
    invalidYear: "Rok musi byc w zakresie 1970-2100 lub '-'.",
    invalidCondition: "Wpisz tylko Nowy lub Uzywany.",
    invalidPrice: "Cena musi byc liczba wieksza od 0.",
    shortSeller: "Imie sprzedawcy jest za krotkie.",
    photoInstruction: "Wyslij zdjecie (mozna kilka) i potem /done, albo '-' bez zdjec.",
    photoAdded: "Zdjecie dodane ({count}). Wyslij kolejne lub /done.",
    photoUploadError: "Blad przesylania zdjecia: {message}",
    startText: "Bot zarzadzania katalogiem.\nKomendy:\n/start\n/login\n/logout\n/newad\n/catalog\n/delete\n/support\n/leave\n/done\n/cancel\n/lang",
    accessLockedStart: "Dostep do bota jest chroniony haslem. Wyslij /login.",
    botProtected: "Bot jest chroniony. Wyslij /login, potem haslo.",
    accessClosed: "Dostep zamkniety. Aby wejsc, wyslij /login.",
    alreadyAuthorized: "Juz jestes zalogowany.",
    tooManyErrorsRetry: "Za duzo bledow. Sprobuj ponownie za {seconds} s.",
    enterPassword: "Wpisz haslo jedna wiadomoscia.",
    accessOpened: "Dostep otwarty. Dostepne komendy: /support /newad /catalog /delete /logout /lang",
    tooManyErrorsLocked: "Za duzo bledow. Blokada na {seconds} s.",
    invalidPassword: "Nieprawidlowe haslo. Pozostalo prob: {attempts}.",
    canceled: "Biezace wprowadzanie anulowane.",
    creatingAd: "Rozpoczynamy tworzenie ogloszenia.",
    replyModeOff: "Tryb odpowiedzi wylaczony (#{id}).",
    replyModeNotActive: "Tryb odpowiedzi nieaktywny.",
    replySent: "Odpowiedz wyslana do dialogu #{id}.",
    sendError: "Blad wysylki: {message}",
    useNewAdForPhoto: "Aby opublikowac zdjecie, uzyj /newad.",
    fallbackHelp: "Uzyj /menu, /support, /newad, /catalog, /delete, /logout lub /lang.",
    passwordRequired: "Wymagane haslo",
    noAccessButtons: "Dostep do przyciskow zamkniety. Wyslij /login i haslo.",
    creatingAdCallback: "Tworzenie ogloszenia",
    loggedOut: "Wylogowano",
    invalidId: "Niepoprawny ID",
    requestApproved: "Zgloszenie zatwierdzone",
    requestDenied: "Zgloszenie odrzucone",
    dialogOpened: "Dialog otwarty",
    callbackError: "Blad",
    genericError: "Blad: {message}",
    langChoose: "Wybierz jezyk:",
    langSet: "Jezyk ustawiony: {lang}",
    langPL: "Polski",
    langRU: "Rosyjski",
    promptCategory: "Wybierz kategorie towaru.",
    promptBrand: "Wpisz marke towaru (np. Apple, Sony).",
    promptModel: "Wpisz model towaru.",
    promptYear: "Wpisz rok produkcji (1970-2100) lub '-' jesli pominac.",
    promptMemory: "Wpisz pamiec/pojemnosc (np. 128GB) lub '-' jesli pominac.",
    promptCondition: "Wpisz stan: Nowy lub Uzywany.",
    promptPrice: "Wpisz cene w rublach (tylko liczba).",
    promptSeller: "Wpisz imie sprzedawcy.",
    promptDescription: "Wpisz opis (lub '-').",
    promptPhoto: "Wyslij jedno lub kilka zdjec. Gdy skonczycz, wyslij /done. Aby publikowac bez zdjec, wyslij '-'.",
    conditionNew: "Nowy",
    conditionUsed: "Uzywany",
    conditionLabelNew: "Nowy",
    conditionLabelUsed: "Uzywany",
    dateUnknown: "nieznana",
    descriptionFallback: "Opis nie podany.",
    yearFallback: "nie podano",
    labelPrice: "Cena",
    labelSeller: "Sprzedawca",
    labelCategory: "Kategoria",
    labelCondition: "Stan",
    labelYear: "Rok",
    labelDate: "Data"
  },
  ru: {
    menu: "Меню",
    mainMenu: "Главное меню",
    catalog: "Каталог",
    delete: "Удаление",
    deny: "Отклонить",
    add: "Добавить",
    logout: "Выйти",
    support: "Техподдержка",
    approve: "Одобрить",
    refresh: "Обновить",
    categories: "Категории",
    back: "Назад",
    open: "Открыть",
    close: "Закрыть",
    done: "Готово",
    chooseCatalogMode: "Выберите каталог ({mode})",
    modeDelete: "режим удаления",
    modeCatalog: "режим просмотра",
    supportQueue: "Очередь поддержки",
    pending: "Ожидают",
    approved: "Одобрены",
    guest: "Гость",
    dialog: "Диалог",
    status: "Статус",
    replyModeOn: "Режим ответа включен: отправьте текст, чтобы ответить клиенту.",
    useLeave: "Используйте /leave, чтобы выйти из режима.",
    client: "Клиент",
    you: "Вы",
    system: "Система",
    notFoundDialog: "Диалог #{id} не найден. Режим ответа выключен.",
    deniedDialog: "Диалог #{id} отклонен. Режим ответа выключен.",
    syncError: "Ошибка синхронизации #{id}: {message}",
    categoryEmpty: "Каталог \"{category}\" пуст.",
    catalogTitle: "Каталог: {category}",
    page: "Страница {current}/{total}",
    itemNotFound: "Товар не найден или уже удален.",
    deleted: "Объявление удалено",
    published: "Объявление опубликовано.\nID: {id}\n{title}\nЦена: {price} ₽\nГод: {year}\nФото: {photos}",
    publishError: "Ошибка публикации: {message}",
    chooseCategoryBtn: "Выберите категорию кнопкой.",
    shortBrand: "Бренд слишком короткий.",
    shortModel: "Модель слишком короткая.",
    invalidYear: "Год должен быть в диапазоне 1970-2100 или '-'.",
    invalidCondition: "Введите только Новый или Б/У.",
    invalidPrice: "Цена должна быть числом больше 0.",
    shortSeller: "Имя продавца слишком короткое.",
    photoInstruction: "Отправьте фото (можно несколько) и потом /done, либо '-' без фото.",
    photoAdded: "Фото добавлено ({count}). Отправьте ещё фото или /done.",
    photoUploadError: "Ошибка загрузки фото: {message}",
    startText: "Бот управления каталогом.\nКоманды:\n/start\n/login\n/logout\n/newad\n/catalog\n/delete\n/support\n/leave\n/done\n/cancel\n/lang",
    accessLockedStart: "Доступ к боту закрыт паролем. Отправьте /login.",
    botProtected: "Бот защищен. Отправьте /login, затем пароль.",
    accessClosed: "Доступ закрыт. Для входа отправьте /login.",
    alreadyAuthorized: "Вы уже авторизованы.",
    tooManyErrorsRetry: "Слишком много ошибок. Повторите через {seconds} сек.",
    enterPassword: "Введите пароль одним сообщением.",
    accessOpened: "Доступ открыт. Доступные команды: /support /newad /catalog /delete /logout /lang",
    tooManyErrorsLocked: "Слишком много ошибок. Блокировка на {seconds} сек.",
    invalidPassword: "Неверный пароль. Осталось попыток: {attempts}.",
    canceled: "Текущий ввод отменен.",
    creatingAd: "Начинаем создание объявления.",
    replyModeOff: "Режим ответа отключен (#{id}).",
    replyModeNotActive: "Режим ответа не активен.",
    replySent: "Ответ отправлен в диалог #{id}.",
    sendError: "Ошибка отправки: {message}",
    useNewAdForPhoto: "Для публикации фото используйте /newad.",
    fallbackHelp: "Используйте /menu, /support, /newad, /catalog, /delete, /logout или /lang.",
    passwordRequired: "Нужен пароль",
    noAccessButtons: "Доступ к кнопкам закрыт. Отправьте /login и введите пароль.",
    creatingAdCallback: "Создание объявления",
    loggedOut: "Выход выполнен",
    invalidId: "Некорректный ID",
    requestApproved: "Запрос одобрен",
    requestDenied: "Запрос отклонен",
    dialogOpened: "Диалог открыт",
    callbackError: "Ошибка",
    genericError: "Ошибка: {message}",
    langChoose: "Выберите язык:",
    langSet: "Язык установлен: {lang}",
    langPL: "Польский",
    langRU: "Русский",
    promptCategory: "Выберите категорию товара.",
    promptBrand: "Введите бренд товара (например: Apple, Sony).",
    promptModel: "Введите модель товара.",
    promptYear: "Введите год выпуска (1970-2100) или '-' если не нужен.",
    promptMemory: "Введите память/объем (например: 128GB) или '-' если не нужно.",
    promptCondition: "Введите состояние: Новый или Б/У.",
    promptPrice: "Введите цену в рублях (только число).",
    promptSeller: "Введите имя продавца.",
    promptDescription: "Введите описание (или '-').",
    promptPhoto: "Отправьте одно или несколько фото. Когда закончите, отправьте /done. Для публикации без фото отправьте '-'.",
    conditionNew: "Новый",
    conditionUsed: "Б/У",
    conditionLabelNew: "Новый",
    conditionLabelUsed: "Б/У",
    dateUnknown: "неизвестно",
    descriptionFallback: "Описание не указано.",
    yearFallback: "не указан",
    labelPrice: "Цена",
    labelSeller: "Продавец",
    labelCategory: "Категория",
    labelCondition: "Состояние",
    labelYear: "Год",
    labelDate: "Дата"
  }
};

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
const chatLanguage = new Map();
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
  if (["\u043D\u043E\u0432\u044B\u0439", "new", "n", "nowy"].includes(value)) {
    return "new";
  }
  if (["\u0431/\u0443", "\u0431\u0443", "used", "u", "uzywany"].includes(value)) {
    return "used";
  }
  return null;
}

function getChatLanguage(chatId) {
  const raw = String(chatLanguage.get(chatId) || "pl").trim().toLowerCase();
  return raw === "ru" ? "ru" : "pl";
}

function setChatLanguage(chatId, lang) {
  chatLanguage.set(chatId, lang === "ru" ? "ru" : "pl");
}

function t(chatId, key, vars = {}) {
  const lang = getChatLanguage(chatId);
  const dict = I18N[lang] || I18N.pl;
  let text = dict[key] || I18N.pl[key] || key;
  text = text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
  return text;
}

function categoryText(item, chatId) {
  const lang = getChatLanguage(chatId);
  return lang === "ru" ? item.ru : item.pl;
}

function categoryRows(chatId, includeAll = true) {
  const items = includeAll ? CATEGORY_ITEMS : CATEGORY_ITEMS.filter((item) => item.id !== "all");
  const rows = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3).map((item) => categoryText(item, chatId)));
  }
  return rows;
}

function categoryByIndex(index) {
  return CATEGORY_ITEMS[index] || CATEGORY_ITEMS[0];
}

function findCategoryByInput(text) {
  const value = String(text || "").trim().toLowerCase();
  return CATEGORY_ITEMS.find((item) => item.ru.toLowerCase() === value || item.pl.toLowerCase() === value) || null;
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

function getPrompt(chatId, step) {
  if (step === "category") {
    return t(chatId, "promptCategory");
  }
  if (step === "brand") {
    return t(chatId, "promptBrand");
  }
  if (step === "model") {
    return t(chatId, "promptModel");
  }
  if (step === "year") {
    return t(chatId, "promptYear");
  }
  if (step === "memory") {
    return t(chatId, "promptMemory");
  }
  if (step === "condition") {
    return t(chatId, "promptCondition");
  }
  if (step === "price") {
    return t(chatId, "promptPrice");
  }
  if (step === "seller") {
    return t(chatId, "promptSeller");
  }
  if (step === "description") {
    return t(chatId, "promptDescription");
  }
  if (step === "photo") {
    return t(chatId, "promptPhoto");
  }
  return "";
}

async function askStep(chatId, step) {
  const prompt = getPrompt(chatId, step);
  if (step === "category") {
    await sendMessage(chatId, prompt, {
      reply_markup: {
        keyboard: categoryRows(chatId, false),
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return;
  }

  if (step === "condition") {
    await sendMessage(chatId, prompt, {
      reply_markup: {
        keyboard: [[t(chatId, "conditionNew"), t(chatId, "conditionUsed")]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return;
  }

  await sendMessage(chatId, prompt, { reply_markup: { remove_keyboard: true } });
}

function buildTitle(chatId, data) {
  const conditionLabel = data.condition === "new" ? t(chatId, "conditionLabelNew") : t(chatId, "conditionLabelUsed");
  return `${data.brand} ${data.model}${data.memory ? ` ${data.memory}` : ""} ${conditionLabel}`;
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
  const text = t(chatId, "chooseCatalogMode", { mode: mode === "delete" ? t(chatId, "modeDelete") : t(chatId, "modeCatalog") });
  const keyboard = {
    inline_keyboard: [
      ...CATEGORY_ITEMS.map((item, idx) => ({ item, idx }))
        .reduce((rows, pair) => {
          if (!rows.length || rows[rows.length - 1].length === 3) {
            rows.push([]);
          }
          rows[rows.length - 1].push(pair);
          return rows;
        }, [])
        .map((row) =>
          row.map(({ item, idx }) => ({ text: categoryText(item, chatId), callback_data: `cat:${mode}:${idx}:0` }))
      ),
      [{ text: t(chatId, "menu"), callback_data: "cmd:menu" }]
    ]
  };

  if (messageId) {
    await editMessage(chatId, messageId, text, { reply_markup: keyboard });
    return;
  }
  await sendMessage(chatId, text, { reply_markup: keyboard });
}

async function sendMainMenu(chatId, messageId = null) {
  const text = t(chatId, "mainMenu");
  const keyboard = {
    inline_keyboard: [
      [
        { text: t(chatId, "catalog"), callback_data: "menu:catalog" },
        { text: t(chatId, "delete"), callback_data: "menu:delete" }
      ],
      [
        { text: t(chatId, "add"), callback_data: "cmd:newad" },
        { text: t(chatId, "logout"), callback_data: "cmd:logout" }
      ],
      [
        { text: t(chatId, "support"), callback_data: "cmd:support" }
      ],
      [
        { text: "🇵🇱 PL", callback_data: "lang:pl" },
        { text: "🇷🇺 RU", callback_data: "lang:ru" }
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
    { text: `${t(chatId, "approve")} #${item.id}`, callback_data: `sup:approve:${item.id}` },
    { text: `${t(chatId, "deny")} #${item.id}`, callback_data: `sup:deny:${item.id}` }
  ]));

  const approvedRows = approved.slice(0, 8).map((item) => ([
    { text: `${t(chatId, "open")} #${item.id}`, callback_data: `sup:open:${item.id}` }
  ]));

  const lines = [
    t(chatId, "supportQueue"),
    `${t(chatId, "pending")}: ${pending.length}`,
    `${t(chatId, "approved")}: ${approved.length}`,
    "",
    ...pending.slice(0, 6).map((item) => `${t(chatId, "pending").toUpperCase()} #${item.id} ${item.visitorName || t(chatId, "guest")}`),
    ...approved.slice(0, 6).map((item) => `${t(chatId, "approved").toUpperCase()} #${item.id} ${item.visitorName || t(chatId, "guest")}`)
  ];

  const keyboard = {
    inline_keyboard: [
      ...pendingRows,
      ...approvedRows,
      [
        { text: t(chatId, "refresh"), callback_data: "sup:refresh" },
        { text: t(chatId, "menu"), callback_data: "cmd:menu" }
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
    throw new Error(t(chatId, "itemNotFound"));
  }

  supportReplyMode.set(chatId, Number(ticketId));
  const allMessages = Array.isArray(details.messages) ? details.messages : [];
  const lastMessageId = allMessages.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  supportCursorByChat.set(supportCursorKey(chatId, ticketId), lastMessageId);

  const history = allMessages.slice(-8).map((item) => {
    const from = item.from === "operator" ? t(chatId, "you") : item.from === "visitor" ? t(chatId, "client") : t(chatId, "system");
    return `${from}: ${String(item.text || "").slice(0, 400)}`;
  });

  await sendMessage(
    chatId,
    [
      `${t(chatId, "dialog")} #${details.item.id}`,
      `${t(chatId, "status")}: ${formatSupportStatus(details.item.status)}`,
      t(chatId, "replyModeOn"),
      t(chatId, "useLeave"),
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
        await sendMessage(chatId, t(chatId, "notFoundDialog", { id: ticketId }));
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
        await sendMessage(chatId, t(chatId, "deniedDialog", { id: ticketId }));
        continue;
      }

      for (const msg of incoming) {
        await sendMessage(chatId, `${t(chatId, "client")} #${ticketId}: ${msg.text}`);
      }
    } catch (error) {
      await sendMessage(chatId, t(chatId, "syncError", { id: ticketId, message: error.message }));
    }
  }
}

async function sendCatalog(chatId, options, messageId = null) {
  const { mode, categoryIndex } = options;
  const ads = await fetchAdsFromSite();
  const categoryItem = categoryByIndex(categoryIndex);
  const categoryRu = categoryItem.ru;
  const categoryLabel = categoryText(categoryItem, chatId);
  const filtered = categoryItem.id === "all" ? ads : ads.filter((item) => item.category === categoryRu);

  if (!filtered.length) {
    const emptyText = t(chatId, "categoryEmpty", { category: categoryLabel });
    const keyboard = {
      inline_keyboard: [[{ text: t(chatId, "categories"), callback_data: `menu:${mode}` }]]
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
  const text = `${t(chatId, "catalogTitle", { category: categoryLabel })}\n${t(chatId, "page", { current: page + 1, total: totalPages })}\n\n${lines.join("\n")}`;

  const keyboard = {
    inline_keyboard: [
      ...items.map((item) => [{ text: `${t(chatId, "open")} #${item.id}`, callback_data: `view:${mode}:${categoryIndex}:${page}:${item.id}` }]),
      [
        { text: "\u2B05\uFE0F", callback_data: `page:${mode}:${categoryIndex}:${page - 1}` },
        { text: t(chatId, "categories"), callback_data: `menu:${mode}` },
        { text: t(chatId, "menu"), callback_data: "cmd:menu" },
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

function adDetailsText(chatId, item) {
  const conditionLabel = item.condition === "new" ? t(chatId, "conditionLabelNew") : t(chatId, "conditionLabelUsed");
  const yearLabel = Number.isFinite(Number(item.year)) ? String(Math.round(Number(item.year))) : t(chatId, "yearFallback");
  const created = item.createdAt ? new Date(item.createdAt).toLocaleString(getChatLanguage(chatId) === "ru" ? "ru-RU" : "pl-PL") : t(chatId, "dateUnknown");
  const description = item.description || t(chatId, "descriptionFallback");
  return [
    `#${item.id} ${item.title}`,
    `${t(chatId, "labelPrice")}: ${item.price} \u20BD`,
    `${t(chatId, "labelSeller")}: ${item.seller}`,
    `${t(chatId, "labelCategory")}: ${item.category}`,
    `${t(chatId, "labelCondition")}: ${conditionLabel}`,
    `${t(chatId, "labelYear")}: ${yearLabel}`,
    `${t(chatId, "labelDate")}: ${created}`,
    "",
    `${description}`
  ].join("\n");
}

async function showAdDetails(chatId, messageId, mode, categoryIndex, page, adId) {
  const ads = await fetchAdsFromSite();
  const ad = ads.find((item) => Number(item.id) === Number(adId));
  if (!ad) {
    await editMessage(chatId, messageId, t(chatId, "itemNotFound"), {
      reply_markup: { inline_keyboard: [[{ text: t(chatId, "back"), callback_data: `page:${mode}:${categoryIndex}:${page}` }]] }
    });
    return;
  }

  const buttons = [
    [{ text: t(chatId, "back"), callback_data: `page:${mode}:${categoryIndex}:${page}` }],
    [{ text: t(chatId, "menu"), callback_data: "cmd:menu" }]
  ];
  if (mode === "delete") {
    buttons.unshift([{ text: t(chatId, "delete"), callback_data: `delete:${mode}:${categoryIndex}:${page}:${ad.id}` }]);
  }

  await editMessage(chatId, messageId, adDetailsText(chatId, ad), {
    reply_markup: { inline_keyboard: buttons }
  });
}

async function finalizeSession(chatId) {
  const session = sessions.get(chatId);
  if (!session) {
    return;
  }

  const payload = {
    title: buildTitle(chatId, session.data),
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
    await sendMessage(chatId, t(chatId, "published", {
      id: item.id,
      title: item.title,
      price: item.price,
      year: item.year || "-",
      photos: session.data.imageUrls.length
    }));
  } catch (error) {
    await sendMessage(chatId, t(chatId, "publishError", { message: error.message }));
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
    const category = findCategoryByInput(text);
    if (!category || category.id === "all") {
      await sendMessage(chatId, t(chatId, "chooseCategoryBtn"));
      return;
    }
    session.data.category = category.ru;
    session.step = "brand";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "brand") {
    if (text.length < 2) {
      await sendMessage(chatId, t(chatId, "shortBrand"));
      return;
    }
    session.data.brand = text;
    session.step = "model";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "model") {
    if (text.length < 2) {
      await sendMessage(chatId, t(chatId, "shortModel"));
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
      await sendMessage(chatId, t(chatId, "invalidYear"));
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
      await sendMessage(chatId, t(chatId, "invalidCondition"));
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
      await sendMessage(chatId, t(chatId, "invalidPrice"));
      return;
    }
    session.data.price = Math.round(price);
    session.step = "seller";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "seller") {
    if (text.length < 2) {
      await sendMessage(chatId, t(chatId, "shortSeller"));
      return;
    }
    session.data.seller = text;
    session.step = "description";
    await askStep(chatId, session.step);
    return;
  }

  if (session.step === "description") {
    session.data.description = text === "-" ? t(chatId, "descriptionFallback") : text;
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
    await sendMessage(chatId, t(chatId, "photoInstruction"));
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
    await sendMessage(chatId, t(chatId, "photoAdded", { count: session.data.imageUrls.length }));
  } catch (error) {
    await sendMessage(chatId, t(chatId, "photoUploadError", { message: error.message }));
  }
}

async function handleStart(chatId) {
  await sendMessage(chatId, t(chatId, "startText"));
  await sendMainMenu(chatId);
}

async function handleMessage(message) {
  if (!message || !message.chat) {
    return;
  }

  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  if (text === "/start") {
    if (!chatLanguage.has(chatId)) {
      setChatLanguage(chatId, "pl");
    }
    stopSession(chatId);
    await handleStart(chatId);
    if (!isAuthorized(chatId)) {
      await sendMessage(chatId, t(chatId, "accessLockedStart"));
    }
    return;
  }

  if (text === "/lang") {
    await sendMessage(chatId, t(chatId, "langChoose"), {
      reply_markup: {
        inline_keyboard: [[
          { text: "🇵🇱 PL", callback_data: "lang:pl" },
          { text: "🇷🇺 RU", callback_data: "lang:ru" }
        ]]
      }
    });
    return;
  }

  if (text === "/menu") {
    stopSession(chatId);
    if (!isAuthorized(chatId)) {
      await sendMessage(chatId, t(chatId, "botProtected"));
      return;
    }
    await sendMainMenu(chatId);
    return;
  }

  if (text === "/logout") {
    stopSession(chatId);
    resetAuth(chatId);
    supportReplyMode.delete(chatId);
    await sendMessage(chatId, t(chatId, "accessClosed"));
    return;
  }

  if (text === "/login") {
    if (isAuthorized(chatId)) {
      await sendMessage(chatId, t(chatId, "alreadyAuthorized"));
      return;
    }
    const seconds = authSecondsLeft(chatId);
    if (seconds > 0) {
      await sendMessage(chatId, t(chatId, "tooManyErrorsRetry", { seconds }));
      return;
    }
    await sendMessage(chatId, t(chatId, "enterPassword"));
    return;
  }

  if (!isAuthorized(chatId)) {
    if (text && !text.startsWith("/")) {
      const authResult = authorizeByPassword(chatId, text);
      if (authResult.ok) {
        await sendMessage(chatId, t(chatId, "accessOpened"));
        return;
      }
      if (authResult.reason === "locked") {
        await sendMessage(chatId, t(chatId, "tooManyErrorsLocked", { seconds: authResult.seconds }));
        return;
      }
      await sendMessage(chatId, t(chatId, "invalidPassword", { attempts: authResult.attemptsLeft }));
      return;
    }

    await sendMessage(chatId, t(chatId, "botProtected"));
    return;
  }

  if (text === "/cancel") {
    stopSession(chatId);
    await sendMessage(chatId, t(chatId, "canceled"));
    return;
  }

  if (text === "/newad") {
    startSession(chatId);
    await sendMessage(chatId, t(chatId, "creatingAd"));
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
      await sendMessage(chatId, t(chatId, "replyModeOff", { id: currentTicketId }));
      return;
    }
    await sendMessage(chatId, t(chatId, "replyModeNotActive"));
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
      await sendMessage(chatId, t(chatId, "replySent", { id: ticketId }));
    } catch (error) {
      await sendMessage(chatId, t(chatId, "sendError", { message: error.message }));
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
    await sendMessage(chatId, t(chatId, "useNewAdForPhoto"));
    return;
  }

  await sendMessage(chatId, t(chatId, "fallbackHelp"));
}

async function handleCallbackQuery(query) {
  if (!query || !query.message || !query.data) {
    return;
  }

  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  if (data.startsWith("lang:")) {
    const [, lang] = data.split(":");
    setChatLanguage(chatId, lang === "ru" ? "ru" : "pl");
    await answerCallbackQuery(query.id, t(chatId, "langSet", { lang: lang === "ru" ? t(chatId, "langRU") : t(chatId, "langPL") }));
    await sendMainMenu(chatId, messageId);
    return;
  }

  if (!isAuthorized(chatId)) {
    await answerCallbackQuery(query.id, t(chatId, "passwordRequired"));
    await sendMessage(chatId, t(chatId, "noAccessButtons"));
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
        await answerCallbackQuery(query.id, t(chatId, "creatingAdCallback"));
        await sendMessage(chatId, t(chatId, "creatingAd"));
        await askStep(chatId, "category");
        return;
      }

      if (command === "logout") {
        stopSession(chatId);
        resetAuth(chatId);
        supportReplyMode.delete(chatId);
        await answerCallbackQuery(query.id, t(chatId, "loggedOut"));
        await sendMainMenu(chatId, messageId);
        await sendMessage(chatId, t(chatId, "accessClosed"));
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
        await answerCallbackQuery(query.id, t(chatId, "invalidId"));
        return;
      }

      if (action === "approve") {
        await postSupportDecision(ticketId, "approved", chatId);
        await answerCallbackQuery(query.id, t(chatId, "requestApproved"));
        await openSupportThread(chatId, ticketId);
        await sendSupportMenu(chatId);
        return;
      }

      if (action === "deny") {
        await postSupportDecision(ticketId, "denied", chatId);
        await answerCallbackQuery(query.id, t(chatId, "requestDenied"));
        await sendSupportMenu(chatId, messageId);
        return;
      }

      if (action === "open") {
        await answerCallbackQuery(query.id, t(chatId, "dialogOpened"));
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
      await answerCallbackQuery(query.id, t(chatId, "deleted"));
      return;
    }

    await answerCallbackQuery(query.id);
  } catch (error) {
    await answerCallbackQuery(query.id, t(chatId, "callbackError"));
    await sendMessage(chatId, t(chatId, "genericError", { message: error.message }));
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


