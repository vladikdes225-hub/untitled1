"use strict";

(function initMarketplace() {
  const API_FALLBACK_BASE = String(document.documentElement.getAttribute("data-api-fallback-base") || "")
    .trim()
    .replace(/\/+$/, "");
  const TELEGRAM_FALLBACK = "RXSEND";
  const SUPPORT_POLL_MS = 3000;
  const SUPPORT_VISITOR_KEY = "rxsend_support_visitor_id";
  const SUPPORT_TICKET_KEY = "rxsend_support_ticket_id";
  const LANGUAGE_STORAGE_KEY = "rxsend_language";
  const CONTACT_PHONE = "+48 736 336 145";
  const CONTACT_EMAIL = "aolhovia@gmail.com";
  const CONTACT_TELEGRAM = "RXSEND";
  const PRICE_MIN_LIMIT = 0;
  const PRICE_MAX_LIMIT = 2_000_000;
  const PRICE_STEP = 1000;
  const PHOTO_ZOOM_MIN = 1;
  const PHOTO_ZOOM_MAX = 3;
  const PHOTO_ZOOM_STEP = 0.25;

    const CATEGORY_META = [
    { id: "all", icon: "\u{1F9ED}", labels: { pl: "Wszystkie", ru: "Все" }, aliases: ["all", "все", "wszystkie"] },
    { id: "phones", icon: "\u{1F4F1}", labels: { pl: "Telefony", ru: "Телефоны" }, aliases: ["телефоны", "telefony"] },
    { id: "headphones", icon: "\u{1F3A7}", labels: { pl: "Sluchawki", ru: "Наушники" }, aliases: ["наушники", "sluchawki"] },
    { id: "watches", icon: "\u{231A}", labels: { pl: "Zegarki", ru: "Часы" }, aliases: ["часы", "zegarki"] },
    { id: "tablets", icon: "\u{1F4F2}", labels: { pl: "Tablety", ru: "Планшеты" }, aliases: ["планшеты", "tablety"] },
    { id: "laptops", icon: "\u{1F4BB}", labels: { pl: "Laptopy", ru: "Ноутбуки" }, aliases: ["ноутбуки", "laptopy"] },
    { id: "computers", icon: "\u{1F5A5}\uFE0F", labels: { pl: "Komputery", ru: "Компьютеры" }, aliases: ["компьютеры", "komputery"] },
    { id: "consoles", icon: "\u{1F3AE}", labels: { pl: "Konsole", ru: "Консоли" }, aliases: ["консоли", "konsole"] },
    { id: "speakers", icon: "\u{1F50A}", labels: { pl: "Glosniki", ru: "Колонки" }, aliases: ["колонки", "glosniki"] },
    { id: "uncat", icon: "\u{1F4C1}", labels: { pl: "Bez kategorii", ru: "Без категории" }, aliases: ["без категории", "bez kategorii"] }
  ];

  const CATEGORY_BY_ID = new Map(CATEGORY_META.map((item) => [item.id, item]));
  const CATEGORY_ICON_MAP = CATEGORY_META.reduce((acc, item) => {
    acc[item.id] = item.icon;
    return acc;
  }, {});
  const CATEGORY_ALIAS_MAP = new Map();
  for (const item of CATEGORY_META) {
    CATEGORY_ALIAS_MAP.set(item.id.toLowerCase(), item.id);
    CATEGORY_ALIAS_MAP.set(item.labels.pl.toLowerCase(), item.id);
    CATEGORY_ALIAS_MAP.set(item.labels.ru.toLowerCase(), item.id);
    for (const alias of item.aliases) {
      CATEGORY_ALIAS_MAP.set(String(alias).toLowerCase(), item.id);
    }
  }

  const SORT_MODES = ["recent", "price-up", "price-down"];
  const UI = {
    pl: {
      pageTitle: "RXSEND Market",
      brandMarket: "Market",
      sideNavAria: "Menu glowne",
      sideMarket: "Market",
      sideAllDevices: "Wszystkie urzadzenia",
      sideOnlyNew: "Tylko nowe",
      sideOnlyUsed: "Tylko uzywane",
      filtersAria: "Filtry",
      filtersTitle: "Filtry",
      price: "Cena",
      from: "Od",
      to: "Do",
      year: "Rok",
      brand: "Marka",
      model: "Model urzadzenia",
      modelPlaceholder: "Np.: iPhone 15 Pro",
      resetFilters: "Resetuj filtry",
      searchPlaceholder: "Szukaj",
      sortAria: "Zmien sortowanie",
      sectionTitle: "Ogloszenia dla Ciebie",
      footerAria: "Kontakt",
      footerTitle: "Kontakt",
      footerSubtitle: "Skontaktuj sie z nami wygodnym sposobem",
      phone: "Telefon",
      email: "Email",
      telegram: "Telegram",
      footerPhoneAria: "Zadzwon pod numer {phone}",
      footerEmailAria: "Napisz na {email}",
      footerTelegramAria: "Otworz Telegram @{handle}",
      priceMinAria: "Minimalna cena",
      priceMaxAria: "Maksymalna cena",
      overlayClose: "Zamknij",
      openContact: "Otworz kontakt",
      connectManager: "Skontaktuj sie z menedzerem {name}",
      goToBuy: "Przejdz do zakupu",
      supportAria: "Wsparcie",
      supportTitle: "Wsparcie",
      supportToggle: "Wsparcie",
      supportCloseAria: "Zamknij",
      supportInputPlaceholder: "Wpisz wiadomosc...",
      supportSend: "Wyslij",
      supportConnect: "Polacz ze wsparciem",
      supportIdle: "Kliknij przycisk ponizej, aby wyslac zgloszenie.",
      supportApproved: "Czat zatwierdzony. Mozesz pisac wiadomosci.",
      supportPending: "Zgloszenie wyslane. Czekaj na akceptacje w Telegramie.",
      supportDenied: "Zgloszenie zostalo odrzucone przez wsparcie.",
      supportGreeting: "Czesc! Pracujemy 24/7.",
      supportWaitingApprove: "Poczekaj, az wsparcie zatwierdzi czat.",
      supportRequestSent: "Zgloszenie wyslane. Czekamy na decyzje operatora.",
      supportError: "Blad wsparcia: {message}",
      requestError: "Blad zgloszenia: {message}",
      sendError: "Blad wysylki: {message}",
      apiUnavailable: "API niedostepne: {message}",
      sortRecent: "Najnowsze",
      sortPriceUp: "Cena ↑",
      sortPriceDown: "Cena ↓",
      sortToast: "Sortowanie: {label}",
      allYears: "Wszystkie lata",
      anyBrand: "Dowolna marka",
      emptyResults: "Nic nie znaleziono. Zmien filtry lub wyszukiwanie.",
      dateUnknown: "Data nieznana",
      titleFallback: "Bez nazwy",
      descriptionFallback: "Opis nie zostal podany.",
      sellerFallback: "Sprzedawca",
      photoMissing: "Brak zdjecia",
      photoAlt: "Zdjecie",
      photoThumb: "Zdjecie {index}",
      zoomControlsAria: "Kontrola powiekszenia zdjecia",
      zoomOutAria: "Pomniejsz",
      zoomResetAria: "Reset powiekszenia",
      zoomInAria: "Powieksz",
      sellerTelegram: "Telegram sprzedawcy: @{handle}",
      openSeller: "Otworz @{handle}",
      languageSelectorAria: "Wybierz jezyk",
      currencyLocale: "pl-PL",
      dateLocale: "pl-PL"
    },
    ru: {
      pageTitle: "RXSEND Маркет",
      brandMarket: "Маркет",
      sideNavAria: "Основное меню",
      sideMarket: "Маркет",
      sideAllDevices: "Все устройства",
      sideOnlyNew: "Только новые",
      sideOnlyUsed: "Только Б/У",
      filtersAria: "Фильтры",
      filtersTitle: "Фильтры",
      price: "Цена",
      from: "От",
      to: "До",
      year: "Год",
      brand: "Бренд",
      model: "Модель устройства",
      modelPlaceholder: "Например: iPhone 15 Pro",
      resetFilters: "Сбросить фильтры",
      searchPlaceholder: "Поиск",
      sortAria: "Сменить сортировку",
      sectionTitle: "Объявления для тебя",
      footerAria: "Контакты",
      footerTitle: "Контакты",
      footerSubtitle: "Свяжитесь с нами удобным способом",
      phone: "Телефон",
      email: "Email",
      telegram: "Telegram",
      footerPhoneAria: "Позвонить по номеру {phone}",
      footerEmailAria: "Написать на {email}",
      footerTelegramAria: "Открыть Telegram @{handle}",
      priceMinAria: "Минимальная цена",
      priceMaxAria: "Максимальная цена",
      overlayClose: "Закрыть",
      openContact: "Открыть контакт",
      connectManager: "Связаться с менеджером {name}",
      goToBuy: "Перейти к покупке",
      supportAria: "Техподдержка",
      supportTitle: "Техподдержка",
      supportToggle: "Техподдержка",
      supportCloseAria: "Закрыть",
      supportInputPlaceholder: "Введите сообщение...",
      supportSend: "Отправить",
      supportConnect: "Связаться с техподдержкой",
      supportIdle: "Нажмите кнопку ниже, чтобы отправить запрос.",
      supportApproved: "Чат подтвержден. Можно отправлять сообщения.",
      supportPending: "Запрос отправлен. Ожидание подтверждения в Telegram.",
      supportDenied: "Запрос был отклонен техподдержкой.",
      supportGreeting: "Привет! Мы работаем 24/7.",
      supportWaitingApprove: "Подождите, пока техподдержка подтвердит чат.",
      supportRequestSent: "Запрос отправлен. Ожидаем решения оператора.",
      supportError: "Ошибка поддержки: {message}",
      requestError: "Ошибка запроса: {message}",
      sendError: "Ошибка отправки: {message}",
      apiUnavailable: "API недоступно: {message}",
      sortRecent: "Новые",
      sortPriceUp: "Цена ↑",
      sortPriceDown: "Цена ↓",
      sortToast: "Сортировка: {label}",
      allYears: "Все годы",
      anyBrand: "Любой бренд",
      emptyResults: "Ничего не найдено. Измените фильтры или поиск.",
      dateUnknown: "Дата не указана",
      titleFallback: "Без названия",
      descriptionFallback: "Описание не указано.",
      sellerFallback: "Продавец",
      photoMissing: "Фото отсутствует",
      photoAlt: "Фото",
      photoThumb: "Фото {index}",
      zoomControlsAria: "Управление масштабом фото",
      zoomOutAria: "Уменьшить",
      zoomResetAria: "Сброс масштаба",
      zoomInAria: "Увеличить",
      sellerTelegram: "Telegram продавца: @{handle}",
      openSeller: "Открыть @{handle}",
      languageSelectorAria: "Выбор языка",
      currencyLocale: "ru-RU",
      dateLocale: "ru-RU"
    }
  };

  const state = {
    ads: [],
    query: "",
    lang: loadLanguage(),
    sideMode: "market",
    category: "all",
    sort: "recent",
    filters: {
      priceMin: PRICE_MIN_LIMIT,
      priceMax: PRICE_MAX_LIMIT,
      year: "all",
      brand: "all",
      model: ""
    },
    favorites: new Set(),
    activeAdId: null,
    activeImageIndex: 0,
    photoZoom: 1,
    photoPanX: 0,
    photoPanY: 0,
    isPhotoPanning: false,
    photoPanStartX: 0,
    photoPanStartY: 0,
    photoPanOriginX: 0,
    photoPanOriginY: 0,
    support: {
      panelOpen: false,
      visitorId: "",
      ticketId: null,
      status: "idle",
      lastMessageId: 0,
      pollTimer: null,
      greeted: false
    }
  };

  const els = {
    brandLink: document.getElementById("brandLink"),
    langSwitch: document.getElementById("langSwitch"),
    langButtons: Array.from(document.querySelectorAll("#langSwitch [data-lang]")),
    sideNav: document.getElementById("sideNav"),
    filtersPanel: document.getElementById("filtersPanel"),
    siteFooter: document.getElementById("siteFooter"),
    brandMarketLabel: document.getElementById("brandMarketLabel"),
    sideMarketText: document.getElementById("sideMarketText"),
    sideAllDevicesText: document.getElementById("sideAllDevicesText"),
    sideOnlyNewText: document.getElementById("sideOnlyNewText"),
    sideOnlyUsedText: document.getElementById("sideOnlyUsedText"),
    filtersTitle: document.getElementById("filtersTitle"),
    priceFilterLabel: document.getElementById("priceFilterLabel"),
    priceFromLabel: document.getElementById("priceFromLabel"),
    priceToLabel: document.getElementById("priceToLabel"),
    yearFilterLabel: document.getElementById("yearFilterLabel"),
    brandFilterLabel: document.getElementById("brandFilterLabel"),
    modelFilterLabel: document.getElementById("modelFilterLabel"),
    sectionTitleText: document.getElementById("sectionTitleText"),
    footerTitle: document.getElementById("footerTitle"),
    footerSubtitle: document.getElementById("footerSubtitle"),
    footerPhoneLabel: document.getElementById("footerPhoneLabel"),
    footerEmailLabel: document.getElementById("footerEmailLabel"),
    footerTelegramLabel: document.getElementById("footerTelegramLabel"),
    footerPhoneLink: document.getElementById("footerPhoneLink"),
    footerEmailLink: document.getElementById("footerEmailLink"),
    footerTelegramLink: document.getElementById("footerTelegramLink"),
    overlayCloseButton: document.getElementById("overlayCloseButton"),
    supportPanelTitle: document.getElementById("supportPanelTitle"),
    searchInput: document.getElementById("searchInput"),
    sortButton: document.getElementById("sortButton"),
    chips: document.getElementById("chips"),
    cardsGrid: document.getElementById("cardsGrid"),
    resultCount: document.getElementById("resultCount"),
    priceRangeLabel: document.getElementById("priceRangeLabel"),
    priceMinRange: document.getElementById("priceMinRange"),
    priceMaxRange: document.getElementById("priceMaxRange"),
    priceMinInput: document.getElementById("priceMinInput"),
    priceMaxInput: document.getElementById("priceMaxInput"),
    yearSelect: document.getElementById("yearSelect"),
    brandSelect: document.getElementById("brandSelect"),
    modelInput: document.getElementById("modelInput"),
    resetFiltersButton: document.getElementById("resetFiltersButton"),
    toast: document.getElementById("toast"),
    sideLinks: Array.from(document.querySelectorAll(".side-link")),
    overlay: document.getElementById("productOverlay"),
    productCategory: document.getElementById("productCategory"),
    productPhoto: document.getElementById("productPhoto"),
    productGallery: document.getElementById("productGallery"),
    productPrice: document.getElementById("productPrice"),
    productTitle: document.getElementById("productTitle"),
    productDescription: document.getElementById("productDescription"),
    sellerName: document.getElementById("sellerName"),
    sellerContact: document.getElementById("sellerContact"),
    sellerProfileLink: document.getElementById("sellerProfileLink"),
    managerLink: document.getElementById("managerLink"),
    buyLink: document.getElementById("buyLink"),
    supportWidget: document.getElementById("supportWidget"),
    supportToggle: document.getElementById("supportToggle"),
    supportPanel: document.getElementById("supportPanel"),
    supportClose: document.getElementById("supportClose"),
    supportMessages: document.getElementById("supportMessages"),
    supportStatus: document.getElementById("supportStatus"),
    supportConnect: document.getElementById("supportConnect"),
    supportChatForm: document.getElementById("supportChatForm"),
    supportInput: document.getElementById("supportInput"),
    supportSend: document.getElementById("supportSend")
  };

  function loadLanguage() {
    try {
      const raw = String(localStorage.getItem(LANGUAGE_STORAGE_KEY) || "").trim().toLowerCase();
      return raw === "ru" ? "ru" : "pl";
    } catch {
      return "pl";
    }
  }

  function saveLanguage(lang) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }

  function i18n() {
    return state.lang === "ru" ? UI.ru : UI.pl;
  }

  function tr(key, vars = {}) {
    const dict = i18n();
    let template = dict[key];
    if (typeof template !== "string") {
      template = UI.pl[key] || key;
    }
    return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
  }

  function categoryLabel(categoryId) {
    const item = CATEGORY_BY_ID.get(categoryId) || CATEGORY_BY_ID.get("uncat");
    return state.lang === "ru" ? item.labels.ru : item.labels.pl;
  }

  function sortLabel(sortId) {
    if (sortId === "price-up") {
      return tr("sortPriceUp");
    }
    if (sortId === "price-down") {
      return tr("sortPriceDown");
    }
    return tr("sortRecent");
  }

  function setLanguage(lang, options = {}) {
    const next = lang === "ru" ? "ru" : "pl";
    state.lang = next;
    saveLanguage(next);
    document.documentElement.lang = next;
    document.title = tr("pageTitle");
    if (els.langSwitch) {
      els.langSwitch.setAttribute("aria-label", tr("languageSelectorAria"));
    }
    for (const button of els.langButtons) {
      button.classList.toggle("is-active", button.dataset.lang === next);
    }
    if (els.brandMarketLabel) {
      els.brandMarketLabel.textContent = tr("brandMarket");
    }
    if (els.sideNav) {
      els.sideNav.setAttribute("aria-label", tr("sideNavAria"));
    }
    if (els.filtersPanel) {
      els.filtersPanel.setAttribute("aria-label", tr("filtersAria"));
    }
    if (els.siteFooter) {
      els.siteFooter.setAttribute("aria-label", tr("footerAria"));
    }
    if (els.sideMarketText) {
      els.sideMarketText.textContent = tr("sideMarket");
    }
    if (els.sideAllDevicesText) {
      els.sideAllDevicesText.textContent = tr("sideAllDevices");
    }
    if (els.sideOnlyNewText) {
      els.sideOnlyNewText.textContent = tr("sideOnlyNew");
    }
    if (els.sideOnlyUsedText) {
      els.sideOnlyUsedText.textContent = tr("sideOnlyUsed");
    }
    if (els.filtersTitle) {
      els.filtersTitle.textContent = tr("filtersTitle");
    }
    if (els.priceFilterLabel) {
      els.priceFilterLabel.textContent = tr("price");
    }
    if (els.priceFromLabel) {
      els.priceFromLabel.textContent = tr("from");
    }
    if (els.priceToLabel) {
      els.priceToLabel.textContent = tr("to");
    }
    if (els.yearFilterLabel) {
      els.yearFilterLabel.textContent = tr("year");
    }
    if (els.brandFilterLabel) {
      els.brandFilterLabel.textContent = tr("brand");
    }
    if (els.modelFilterLabel) {
      els.modelFilterLabel.textContent = tr("model");
    }
    if (els.modelInput) {
      els.modelInput.placeholder = tr("modelPlaceholder");
    }
    if (els.resetFiltersButton) {
      els.resetFiltersButton.textContent = tr("resetFilters");
    }
    if (els.searchInput) {
      els.searchInput.placeholder = tr("searchPlaceholder");
    }
    if (els.sortButton) {
      els.sortButton.setAttribute("aria-label", tr("sortAria"));
      els.sortButton.textContent = sortLabel(state.sort);
    }
    if (els.sectionTitleText) {
      els.sectionTitleText.textContent = tr("sectionTitle");
    }
    if (els.footerTitle) {
      els.footerTitle.textContent = tr("footerTitle");
    }
    if (els.footerSubtitle) {
      els.footerSubtitle.textContent = tr("footerSubtitle");
    }
    if (els.footerPhoneLabel) {
      els.footerPhoneLabel.textContent = tr("phone");
    }
    if (els.footerEmailLabel) {
      els.footerEmailLabel.textContent = tr("email");
    }
    if (els.footerTelegramLabel) {
      els.footerTelegramLabel.textContent = tr("telegram");
    }
    if (els.footerPhoneLink) {
      els.footerPhoneLink.setAttribute("aria-label", tr("footerPhoneAria", { phone: CONTACT_PHONE }));
    }
    if (els.footerEmailLink) {
      els.footerEmailLink.setAttribute("aria-label", tr("footerEmailAria", { email: CONTACT_EMAIL }));
    }
    if (els.footerTelegramLink) {
      els.footerTelegramLink.setAttribute("aria-label", tr("footerTelegramAria", { handle: CONTACT_TELEGRAM }));
    }
    if (els.priceMinRange) {
      els.priceMinRange.setAttribute("aria-label", tr("priceMinAria"));
    }
    if (els.priceMaxRange) {
      els.priceMaxRange.setAttribute("aria-label", tr("priceMaxAria"));
    }
    if (els.overlayCloseButton) {
      els.overlayCloseButton.textContent = tr("overlayClose");
    }
    if (els.supportWidget) {
      els.supportWidget.setAttribute("aria-label", tr("supportAria"));
    }
    if (els.supportToggle) {
      els.supportToggle.textContent = tr("supportToggle");
    }
    if (els.supportPanelTitle) {
      els.supportPanelTitle.textContent = tr("supportTitle");
    }
    if (els.supportClose) {
      els.supportClose.setAttribute("aria-label", tr("supportCloseAria"));
    }
    if (els.supportInput) {
      els.supportInput.placeholder = tr("supportInputPlaceholder");
    }
    if (els.supportSend) {
      els.supportSend.textContent = tr("supportSend");
    }
    if (els.supportConnect) {
      els.supportConnect.textContent = tr("supportConnect");
    }
    if (els.sellerProfileLink) {
      els.sellerProfileLink.textContent = tr("openContact");
    }
    renderFilterOptions();
    updatePriceFilterUi();
    updateSupportUiByStatus(state.support.status);
    if (!options.skipRender) {
      render();
    }
  }

  function normalizeTelegram(value) {
    return String(value || "").trim().replace(/^@+/, "");
  }

  function telegramUrl(handle) {
    const cleaned = normalizeTelegram(handle);
    return cleaned ? `https://t.me/${cleaned}` : `https://t.me/${TELEGRAM_FALLBACK}`;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(value) {
    const num = Number(value) || 0;
    return `${new Intl.NumberFormat(tr("currencyLocale")).format(num)} ₽`;
  }

  function normalizePricePair(minValue, maxValue) {
    let min = clampNumber(Math.round(Number(minValue) || PRICE_MIN_LIMIT), PRICE_MIN_LIMIT, PRICE_MAX_LIMIT);
    let max = clampNumber(Math.round(Number(maxValue) || PRICE_MAX_LIMIT), PRICE_MIN_LIMIT, PRICE_MAX_LIMIT);
    if (min > max) {
      const tmp = min;
      min = max;
      max = tmp;
    }
    return { min, max };
  }

  function getAdYear(ad) {
    const explicitYear = Number(ad && ad.year);
    if (Number.isFinite(explicitYear) && explicitYear >= 1970 && explicitYear <= 2100) {
      return explicitYear;
    }
    const title = String((ad && ad.title) || "");
    const description = String((ad && ad.description) || "");
    const source = `${title} ${description}`;
    const match = source.match(/(?:19|20)\d{2}/);
    if (!match) {
      return null;
    }
    const year = Number(match[0]);
    return Number.isFinite(year) ? year : null;
  }

  function getAdBrand(ad) {
    const title = String((ad && ad.title) || "").trim();
    if (!title) {
      return "";
    }
    const first = title.split(/\s+/)[0] || "";
    return first.slice(0, 30);
  }

  function updatePriceFilterUi() {
    const min = state.filters.priceMin;
    const max = state.filters.priceMax;
    if (els.priceMinRange) {
      els.priceMinRange.value = String(min);
      els.priceMinRange.min = String(PRICE_MIN_LIMIT);
      els.priceMinRange.max = String(PRICE_MAX_LIMIT);
      els.priceMinRange.step = String(PRICE_STEP);
    }
    if (els.priceMaxRange) {
      els.priceMaxRange.value = String(max);
      els.priceMaxRange.min = String(PRICE_MIN_LIMIT);
      els.priceMaxRange.max = String(PRICE_MAX_LIMIT);
      els.priceMaxRange.step = String(PRICE_STEP);
    }
    if (els.priceMinInput) {
      els.priceMinInput.value = String(min);
    }
    if (els.priceMaxInput) {
      els.priceMaxInput.value = String(max);
    }
    if (els.priceRangeLabel) {
      els.priceRangeLabel.textContent = `${formatPrice(min)} — ${formatPrice(max)}`;
    }
  }

  function setPriceFilter(minValue, maxValue) {
    const normalized = normalizePricePair(minValue, maxValue);
    state.filters.priceMin = normalized.min;
    state.filters.priceMax = normalized.max;
    updatePriceFilterUi();
  }

  function buildYearOptions(ads) {
    const years = new Set();
    for (const ad of ads) {
      const year = getAdYear(ad);
      if (year) {
        years.add(year);
      }
    }
    return [...years].sort((a, b) => b - a);
  }

  function buildBrandOptions(ads) {
    const brands = new Set();
    for (const ad of ads) {
      const brand = getAdBrand(ad);
      if (brand) {
        brands.add(brand);
      }
    }
    return [...brands].sort((a, b) => a.localeCompare(b, tr("dateLocale")));
  }

  function renderFilterOptions() {
    if (els.yearSelect) {
      const years = buildYearOptions(state.ads);
      els.yearSelect.innerHTML = `<option value="all">${escapeHtml(tr("allYears"))}</option>${years
        .map((year) => `<option value="${year}">${year}</option>`)
        .join("")}`;
      els.yearSelect.value = state.filters.year;
      if (els.yearSelect.value !== state.filters.year) {
        state.filters.year = "all";
        els.yearSelect.value = "all";
      }
    }

    if (els.brandSelect) {
      const brands = buildBrandOptions(state.ads);
      els.brandSelect.innerHTML = `<option value="all">${escapeHtml(tr("anyBrand"))}</option>${brands
        .map((brand) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`)
        .join("")}`;
      els.brandSelect.value = state.filters.brand;
      if (els.brandSelect.value !== state.filters.brand) {
        state.filters.brand = "all";
        els.brandSelect.value = "all";
      }
    }
  }

  function formatDate(iso) {
    if (!iso) {
      return tr("dateUnknown");
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return tr("dateUnknown");
    }
    return date.toLocaleString(tr("dateLocale"), {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getImages(ad) {
    const list = [];
    if (Array.isArray(ad.imageUrls)) {
      for (const item of ad.imageUrls) {
        if (typeof item === "string" && item.trim()) {
          list.push(item.trim());
        }
      }
    }
    if (typeof ad.imageUrl === "string" && ad.imageUrl.trim()) {
      list.push(ad.imageUrl.trim());
    }
    return [...new Set(list)];
  }

  function normalizeCategory(input) {
    const value = String(input || "").trim();
    if (!value) {
      return "uncat";
    }
    if (CATEGORY_BY_ID.has(value)) {
      return value;
    }
    const lower = value.toLowerCase();
    return CATEGORY_ALIAS_MAP.get(lower) || "uncat";
  }

  function toneById(id) {
    const tones = [
      ["#3a4454", "#101725"],
      ["#2f504e", "#101f24"],
      ["#4b3d56", "#181423"],
      ["#3b4d30", "#121d14"],
      ["#324d58", "#11171e"]
    ];
    const numeric = Math.abs(Number(id) || 0);
    return tones[numeric % tones.length];
  }

  function getSortMeta() {
    const id = SORT_MODES.includes(state.sort) ? state.sort : SORT_MODES[0];
    return { id, label: sortLabel(id) };
  }

  function nextSortMode() {
    const idx = SORT_MODES.findIndex((item) => item === state.sort);
    const next = SORT_MODES[(idx + 1 + SORT_MODES.length) % SORT_MODES.length];
    state.sort = next;
    els.sortButton.textContent = sortLabel(next);
    render();
    showToast(tr("sortToast", { label: sortLabel(next) }));
  }

  function renderChips() {
    const html = CATEGORY_META.map((item) => {
      const active = item.id === state.category ? " is-active" : "";
      return `<button class="chip${active}" type="button" data-category="${escapeHtml(item.id)}"><span class="chip-icon">${item.icon}</span>${escapeHtml(categoryLabel(item.id))}</button>`;
    }).join("");
    els.chips.innerHTML = html;
  }

  function filterAds() {
    const query = state.query.trim().toLowerCase();
    const modelQuery = state.filters.model.trim().toLowerCase();
    const filterYear = state.filters.year;
    const filterBrand = state.filters.brand;
    const minPrice = Number(state.filters.priceMin) || PRICE_MIN_LIMIT;
    const maxPrice = Number(state.filters.priceMax) || PRICE_MAX_LIMIT;
    let result = [...state.ads];

    if (state.sideMode === "only-new") {
      result = result.filter((item) => item.condition === "new");
    } else if (state.sideMode === "only-used") {
      result = result.filter((item) => item.condition !== "new");
    }

    if (state.category !== "all") {
      result = result.filter((item) => normalizeCategory(item.category) === state.category);
    }

    if (query) {
      result = result.filter((item) => {
        const haystack = [
          item.title,
          item.description,
          item.seller,
          item.category
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    result = result.filter((item) => {
      const price = Number(item.price) || 0;
      return price >= minPrice && price <= maxPrice;
    });

    if (filterYear !== "all") {
      result = result.filter((item) => String(getAdYear(item) || "") === String(filterYear));
    }

    if (filterBrand !== "all") {
      result = result.filter((item) => getAdBrand(item) === filterBrand);
    }

    if (modelQuery) {
      result = result.filter((item) => {
        const source = `${item.title || ""} ${item.description || ""}`.toLowerCase();
        return source.includes(modelQuery);
      });
    }

    if (state.sort === "price-up") {
      result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (state.sort === "price-down") {
      result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return result;
  }

  function renderCards() {
    const items = filterAds();
    els.resultCount.textContent = String(items.length);

    if (!items.length) {
      els.cardsGrid.innerHTML = `<div class="empty">${escapeHtml(tr("emptyResults"))}</div>`;
      return;
    }

    const html = items.map((item) => {
      const images = getImages(item);
      const [tone1, tone2] = toneById(item.id);
      const isFav = state.favorites.has(Number(item.id));
      const mainImage = images[0];
      const safeTitle = escapeHtml(item.title || tr("titleFallback"));
      const safeDescription = escapeHtml(item.description || tr("descriptionFallback"));
      const safeSeller = escapeHtml(item.seller || tr("sellerFallback"));
      const rating = Number(item.rating);
      const ratingLabel = Number.isFinite(rating) ? rating.toFixed(1) : "5.0";
      return `
        <article class="card" data-id="${Number(item.id)}" style="--tone-1:${tone1};--tone-2:${tone2};">
          ${item.source === "telegram" ? '<span class="mine-badge">TG</span>' : ""}
          <button class="fav-btn${isFav ? " is-active" : ""}" type="button" data-fav-id="${Number(item.id)}">♥</button>
          <div class="card-image${mainImage ? " has-photo" : ""}">
            ${mainImage ? `<img src="${escapeHtml(mainImage)}" alt="${safeTitle}" loading="lazy">` : ""}
          </div>
          <div class="card-body">
            <h3 class="card-title">${safeTitle}</h3>
            <p class="card-description">${safeDescription}</p>
            <p class="price">${formatPrice(item.price)}</p>
            <div class="meta-line">
              <span class="seller"><span class="avatar"></span>${safeSeller}</span>
              <span class="rating">★ ${ratingLabel}</span>
            </div>
            <p class="date">${escapeHtml(formatDate(item.createdAt))}</p>
          </div>
        </article>
      `;
    }).join("");

    els.cardsGrid.innerHTML = html;
  }

  function renderSideMenu() {
    for (const button of els.sideLinks) {
      button.classList.toggle("is-active", button.dataset.mode === state.sideMode);
    }
  }

  function render() {
    renderSideMenu();
    renderChips();
    renderCards();
  }

  function showToast(text) {
    if (!els.toast) {
      return;
    }
    els.toast.textContent = text;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 1900);
  }

  function findAdById(id) {
    return state.ads.find((item) => Number(item.id) === Number(id)) || null;
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getPhotoPanBounds() {
    const stage = els.productPhoto.querySelector(".product-photo-stage");
    if (!stage) {
      return { x: 0, y: 0 };
    }
    const width = stage.clientWidth || 0;
    const height = stage.clientHeight || 0;
    const extraX = Math.max(width * state.photoZoom - width, 0);
    const extraY = Math.max(height * state.photoZoom - height, 0);
    return {
      x: extraX / 2,
      y: extraY / 2
    };
  }

  function clampPhotoPan() {
    if (state.photoZoom <= PHOTO_ZOOM_MIN + 0.01) {
      state.photoPanX = 0;
      state.photoPanY = 0;
      return;
    }
    const bounds = getPhotoPanBounds();
    state.photoPanX = clampNumber(state.photoPanX, -bounds.x, bounds.x);
    state.photoPanY = clampNumber(state.photoPanY, -bounds.y, bounds.y);
  }

  function setPhotoPan(x, y) {
    state.photoPanX = Number(x) || 0;
    state.photoPanY = Number(y) || 0;
    clampPhotoPan();
    applyPhotoZoom();
  }

  function resetPhotoPan() {
    state.photoPanX = 0;
    state.photoPanY = 0;
    state.isPhotoPanning = false;
    els.productPhoto.classList.remove("is-panning");
  }

  function applyPhotoZoom() {
    const image = els.productPhoto.querySelector(".product-photo-image");
    if (!image) {
      els.productPhoto.classList.remove("is-zoomed");
      els.productPhoto.classList.remove("is-panning");
      return;
    }
    clampPhotoPan();
    image.style.transform = `translate(${state.photoPanX.toFixed(1)}px, ${state.photoPanY.toFixed(1)}px) scale(${state.photoZoom.toFixed(2)})`;
    els.productPhoto.classList.toggle("is-zoomed", state.photoZoom > PHOTO_ZOOM_MIN + 0.01);
    const resetButton = els.productPhoto.querySelector('[data-photo-zoom="reset"]');
    if (resetButton) {
      resetButton.textContent = `${Math.round(state.photoZoom * 100)}%`;
    }
  }

  function setPhotoZoom(value) {
    const prevZoom = state.photoZoom;
    state.photoZoom = clampNumber(Number(value) || PHOTO_ZOOM_MIN, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX);
    if (Math.abs(state.photoZoom - prevZoom) > 0.001 && state.photoZoom <= PHOTO_ZOOM_MIN + 0.01) {
      resetPhotoPan();
    }
    applyPhotoZoom();
  }

  function changePhotoZoom(delta) {
    setPhotoZoom(state.photoZoom + delta);
  }

  function renderOverlayPhoto(ad) {
    const images = getImages(ad);
    const list = images.length ? images : [""];
    state.activeImageIndex = Math.min(Math.max(state.activeImageIndex, 0), list.length - 1);
    const current = list[state.activeImageIndex] || "";

    if (current) {
      els.productPhoto.classList.remove("no-photo");
      els.productPhoto.innerHTML = `
        <div class="product-photo-stage">
          <img class="product-photo-image" src="${escapeHtml(current)}" alt="${escapeHtml(ad.title || tr("photoAlt"))}">
        </div>
        <div class="photo-zoom-controls" aria-label="${escapeHtml(tr("zoomControlsAria"))}">
          <button class="photo-zoom-btn" type="button" data-photo-zoom="out" aria-label="${escapeHtml(tr("zoomOutAria"))}">-</button>
          <button class="photo-zoom-btn" type="button" data-photo-zoom="reset" aria-label="${escapeHtml(tr("zoomResetAria"))}">100%</button>
          <button class="photo-zoom-btn" type="button" data-photo-zoom="in" aria-label="${escapeHtml(tr("zoomInAria"))}">+</button>
        </div>
      `;
      setPhotoZoom(PHOTO_ZOOM_MIN);
    } else {
      els.productPhoto.classList.add("no-photo");
      els.productPhoto.textContent = tr("photoMissing");
      state.photoZoom = PHOTO_ZOOM_MIN;
      resetPhotoPan();
      els.productPhoto.classList.remove("is-zoomed");
    }

    if (!images.length) {
      els.productGallery.innerHTML = "";
      return;
    }

    els.productGallery.innerHTML = images.map((img, idx) => {
      const active = idx === state.activeImageIndex ? " is-active" : "";
      return `<button type="button" class="gallery-thumb${active}" data-gallery-index="${idx}"><img src="${escapeHtml(img)}" alt="${escapeHtml(tr("photoThumb", { index: idx + 1 }))}"></button>`;
    }).join("");
  }

  function openOverlay(ad) {
    state.activeAdId = Number(ad.id);
    state.activeImageIndex = 0;
    state.photoZoom = PHOTO_ZOOM_MIN;
    resetPhotoPan();

    const sellerHandle = normalizeTelegram(ad.sellerTelegram) || TELEGRAM_FALLBACK;
    const managerHandle = normalizeTelegram(ad.managerTelegram) || TELEGRAM_FALLBACK;
    const managerName = ad.managerName || "RXSEND";

    const categoryId = normalizeCategory(ad.category);
    const categoryIcon = CATEGORY_ICON_MAP[categoryId] || CATEGORY_ICON_MAP.uncat;
    els.productCategory.textContent = `${categoryIcon} ${categoryLabel(categoryId)}`;
    els.productPrice.textContent = formatPrice(ad.price);
    els.productTitle.textContent = ad.title || tr("titleFallback");
    els.productDescription.textContent = ad.description || tr("descriptionFallback");
    els.sellerName.textContent = ad.seller || tr("sellerFallback");
    els.sellerContact.textContent = tr("sellerTelegram", { handle: sellerHandle });
    els.sellerProfileLink.href = telegramUrl(sellerHandle);
    els.sellerProfileLink.textContent = tr("openSeller", { handle: sellerHandle });
    els.managerLink.href = telegramUrl(managerHandle);
    els.managerLink.textContent = tr("connectManager", { name: managerName });
    els.buyLink.href = telegramUrl(sellerHandle || managerHandle);
    els.buyLink.textContent = tr("goToBuy");

    renderOverlayPhoto(ad);

    els.overlay.classList.add("is-open");
    els.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("overlay-open");
  }

  function closeOverlay() {
    state.activeAdId = null;
    state.activeImageIndex = 0;
    state.photoZoom = PHOTO_ZOOM_MIN;
    resetPhotoPan();
    els.productPhoto.classList.remove("is-zoomed");
    els.overlay.classList.remove("is-open");
    els.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overlay-open");
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  async function fetchApi(path, options = {}) {
    const req = { cache: "no-store", ...options };
    try {
      const res = await fetch(path, req);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    } catch (error) {
      if (path.startsWith("http") || !API_FALLBACK_BASE) {
        throw error;
      }
      const fallbackUrl = `${API_FALLBACK_BASE}${path}`;
      const res = await fetch(fallbackUrl, req);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    }
  }

  function ensureVisitorId() {
    let visitorId = "";
    try {
      visitorId = localStorage.getItem(SUPPORT_VISITOR_KEY) || "";
    } catch {
      visitorId = "";
    }
    if (!visitorId) {
      visitorId = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      try {
        localStorage.setItem(SUPPORT_VISITOR_KEY, visitorId);
      } catch {
        // ignore
      }
    }
    state.support.visitorId = visitorId;
    return visitorId;
  }

  function supportHeaders(extra = {}) {
    return {
      ...extra,
      "X-Visitor-Id": ensureVisitorId()
    };
  }

  function saveSupportTicketId(ticketId) {
    state.support.ticketId = ticketId ? Number(ticketId) : null;
    try {
      if (state.support.ticketId) {
        localStorage.setItem(SUPPORT_TICKET_KEY, String(state.support.ticketId));
      } else {
        localStorage.removeItem(SUPPORT_TICKET_KEY);
      }
    } catch {
      // ignore
    }
  }

  function loadSupportTicketId() {
    try {
      const raw = localStorage.getItem(SUPPORT_TICKET_KEY) || "";
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  function setSupportControlsEnabled(enabled) {
    els.supportInput.disabled = !enabled;
    els.supportSend.disabled = !enabled;
  }

  function setSupportStatus(text) {
    els.supportStatus.textContent = text;
  }

  function appendSupportMessage(from, text, createdAt = "") {
    const row = document.createElement("div");
    row.className = `support-msg ${from}`;
    const time = createdAt ? `\n${new Date(createdAt).toLocaleTimeString(tr("dateLocale"), { hour: "2-digit", minute: "2-digit" })}` : "";
    row.textContent = `${text}${time}`;
    els.supportMessages.appendChild(row);
    els.supportMessages.scrollTop = els.supportMessages.scrollHeight;
  }

  function ensureSupportGreeting() {
    if (state.support.greeted) {
      return;
    }
    appendSupportMessage("system", tr("supportGreeting"));
    state.support.greeted = true;
  }

  function updateSupportUiByStatus(status) {
    state.support.status = status || "idle";
    if (status === "approved") {
      setSupportStatus(tr("supportApproved"));
      setSupportControlsEnabled(true);
      return;
    }
    if (status === "pending") {
      setSupportStatus(tr("supportPending"));
      setSupportControlsEnabled(false);
      return;
    }
    if (status === "denied") {
      setSupportStatus(tr("supportDenied"));
      setSupportControlsEnabled(false);
      return;
    }
    setSupportStatus(tr("supportIdle"));
    setSupportControlsEnabled(false);
  }

  function renderSupportMessages(messages) {
    if (!Array.isArray(messages) || !messages.length) {
      return;
    }
    for (const msg of messages) {
      const id = Number(msg.id) || 0;
      if (id > state.support.lastMessageId) {
        state.support.lastMessageId = id;
      }
      const from = msg.from === "operator" ? "operator" : msg.from === "visitor" ? "visitor" : "system";
      appendSupportMessage(from, String(msg.text || ""), msg.createdAt || "");
    }
  }

  async function syncSupportTicket() {
    const ticketId = state.support.ticketId;
    if (!ticketId) {
      updateSupportUiByStatus("idle");
      return;
    }
    try {
      const data = await fetchApi(
        `/api/support/requests/${ticketId}?after=${state.support.lastMessageId}&visitorId=${encodeURIComponent(state.support.visitorId)}`,
        { headers: supportHeaders() }
      );
      if (data.item) {
        updateSupportUiByStatus(data.item.status);
      }
      renderSupportMessages(data.messages);
      if (data.item && data.item.status === "denied") {
        clearSupportPolling();
      }
    } catch (error) {
      setSupportStatus(tr("supportError", { message: error.message }));
    }
  }

  function clearSupportPolling() {
    if (state.support.pollTimer) {
      window.clearInterval(state.support.pollTimer);
      state.support.pollTimer = null;
    }
  }

  function ensureSupportPolling() {
    clearSupportPolling();
    if (!state.support.ticketId) {
      return;
    }
    state.support.pollTimer = window.setInterval(() => {
      syncSupportTicket();
    }, SUPPORT_POLL_MS);
  }

  async function createSupportRequest() {
    ensureVisitorId();
    try {
      const data = await fetchApi("/api/support/request", {
        method: "POST",
        headers: supportHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          visitorId: state.support.visitorId,
          visitorName: "Guest"
        })
      });
      if (!data.item || !data.item.id) {
        throw new Error("Unable to create support ticket.");
      }
      saveSupportTicketId(data.item.id);
      state.support.lastMessageId = 0;
      updateSupportUiByStatus(data.item.status);
      appendSupportMessage("system", tr("supportRequestSent"));
      ensureSupportPolling();
      await syncSupportTicket();
    } catch (error) {
      setSupportStatus(tr("requestError", { message: error.message }));
    }
  }

  async function sendSupportVisitorMessage(text) {
    if (!state.support.ticketId) {
      return;
    }
    const value = String(text || "").trim();
    if (!value) {
      return;
    }
    if (state.support.status !== "approved") {
      showToast(tr("supportWaitingApprove"));
      return;
    }
    try {
      const data = await fetchApi(`/api/support/requests/${state.support.ticketId}/message`, {
        method: "POST",
        headers: supportHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          from: "visitor",
          visitorId: state.support.visitorId,
          text: value
        })
      });
      if (data.message) {
        renderSupportMessages([data.message]);
      }
    } catch (error) {
      setSupportStatus(tr("sendError", { message: error.message }));
    }
  }

  async function initSupport() {
    ensureSupportGreeting();
    ensureVisitorId();
    const ticketId = loadSupportTicketId();
    if (ticketId) {
      saveSupportTicketId(ticketId);
      updateSupportUiByStatus("pending");
      ensureSupportPolling();
      await syncSupportTicket();
    } else {
      updateSupportUiByStatus("idle");
    }
  }

  async function loadAds() {
    try {
      let data;
      try {
        data = await fetchJson("/api/ads");
      } catch (error) {
        if (!API_FALLBACK_BASE) {
          throw error;
        }
        data = await fetchJson(`${API_FALLBACK_BASE}/api/ads`);
      }
      state.ads = Array.isArray(data.items) ? data.items : [];
      renderFilterOptions();
      setPriceFilter(state.filters.priceMin, state.filters.priceMax);
      render();
    } catch (error) {
      state.ads = [];
      renderFilterOptions();
      setPriceFilter(state.filters.priceMin, state.filters.priceMax);
      render();
      showToast(tr("apiUnavailable", { message: error.message }));
    }
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value || "";
      renderCards();
    });

    els.sortButton.addEventListener("click", nextSortMode);
    els.sortButton.textContent = getSortMeta().label;

    els.chips.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-category]");
      if (!button) {
        return;
      }
      state.category = button.dataset.category || "all";
      render();
    });

    for (const button of els.sideLinks) {
      button.addEventListener("click", () => {
        state.sideMode = button.dataset.mode || "market";
        render();
      });
    }

    if (els.priceMinRange) {
      els.priceMinRange.addEventListener("input", (event) => {
        setPriceFilter(event.target.value, state.filters.priceMax);
        renderCards();
      });
    }

    if (els.priceMaxRange) {
      els.priceMaxRange.addEventListener("input", (event) => {
        setPriceFilter(state.filters.priceMin, event.target.value);
        renderCards();
      });
    }

    const commitPriceInputs = () => {
      const min = els.priceMinInput ? els.priceMinInput.value : state.filters.priceMin;
      const max = els.priceMaxInput ? els.priceMaxInput.value : state.filters.priceMax;
      setPriceFilter(min, max);
      renderCards();
    };

    if (els.priceMinInput) {
      els.priceMinInput.addEventListener("change", commitPriceInputs);
      els.priceMinInput.addEventListener("blur", commitPriceInputs);
    }

    if (els.priceMaxInput) {
      els.priceMaxInput.addEventListener("change", commitPriceInputs);
      els.priceMaxInput.addEventListener("blur", commitPriceInputs);
    }

    if (els.yearSelect) {
      els.yearSelect.addEventListener("change", (event) => {
        state.filters.year = event.target.value || "all";
        renderCards();
      });
    }

    if (els.brandSelect) {
      els.brandSelect.addEventListener("change", (event) => {
        state.filters.brand = event.target.value || "all";
        renderCards();
      });
    }

    if (els.modelInput) {
      els.modelInput.addEventListener("input", (event) => {
        state.filters.model = event.target.value || "";
        renderCards();
      });
    }

    if (els.resetFiltersButton) {
      els.resetFiltersButton.addEventListener("click", () => {
        state.filters.year = "all";
        state.filters.brand = "all";
        state.filters.model = "";
        setPriceFilter(PRICE_MIN_LIMIT, PRICE_MAX_LIMIT);
        if (els.yearSelect) {
          els.yearSelect.value = "all";
        }
        if (els.brandSelect) {
          els.brandSelect.value = "all";
        }
        if (els.modelInput) {
          els.modelInput.value = "";
        }
        renderCards();
      });
    }

    els.cardsGrid.addEventListener("click", (event) => {
      const favButton = event.target.closest("[data-fav-id]");
      if (favButton) {
        event.stopPropagation();
        const id = Number(favButton.dataset.favId);
        if (state.favorites.has(id)) {
          state.favorites.delete(id);
        } else {
          state.favorites.add(id);
        }
        renderCards();
        return;
      }

      const card = event.target.closest(".card[data-id]");
      if (!card) {
        return;
      }
      const ad = findAdById(card.dataset.id);
      if (!ad) {
        return;
      }
      openOverlay(ad);
    });

    els.overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-product]")) {
        closeOverlay();
        return;
      }
      const zoomButton = event.target.closest("[data-photo-zoom]");
      if (zoomButton) {
        const action = zoomButton.getAttribute("data-photo-zoom");
        if (action === "in") {
          changePhotoZoom(PHOTO_ZOOM_STEP);
        } else if (action === "out") {
          changePhotoZoom(-PHOTO_ZOOM_STEP);
        } else {
          setPhotoZoom(PHOTO_ZOOM_MIN);
        }
        return;
      }
      const thumb = event.target.closest("[data-gallery-index]");
      if (!thumb || state.activeAdId === null) {
        return;
      }
      const ad = findAdById(state.activeAdId);
      if (!ad) {
        return;
      }
      state.activeImageIndex = Number(thumb.dataset.galleryIndex) || 0;
      renderOverlayPhoto(ad);
    });

    els.productPhoto.addEventListener("wheel", (event) => {
      if (!els.productPhoto.querySelector(".product-photo-image")) {
        return;
      }
      event.preventDefault();
      changePhotoZoom(event.deltaY < 0 ? PHOTO_ZOOM_STEP : -PHOTO_ZOOM_STEP);
    }, { passive: false });

    els.productPhoto.addEventListener("dblclick", (event) => {
      if (!els.productPhoto.querySelector(".product-photo-image")) {
        return;
      }
      event.preventDefault();
      setPhotoZoom(state.photoZoom > PHOTO_ZOOM_MIN + 0.01 ? PHOTO_ZOOM_MIN : 2);
    });

    els.productPhoto.addEventListener("pointerdown", (event) => {
      const image = event.target.closest(".product-photo-image");
      if (!image || state.photoZoom <= PHOTO_ZOOM_MIN + 0.01) {
        return;
      }
      event.preventDefault();
      state.isPhotoPanning = true;
      state.photoPanStartX = event.clientX;
      state.photoPanStartY = event.clientY;
      state.photoPanOriginX = state.photoPanX;
      state.photoPanOriginY = state.photoPanY;
      els.productPhoto.classList.add("is-panning");
    });

    window.addEventListener("pointermove", (event) => {
      if (!state.isPhotoPanning) {
        return;
      }
      const dx = event.clientX - state.photoPanStartX;
      const dy = event.clientY - state.photoPanStartY;
      setPhotoPan(state.photoPanOriginX + dx, state.photoPanOriginY + dy);
    });

    window.addEventListener("pointerup", () => {
      if (!state.isPhotoPanning) {
        return;
      }
      state.isPhotoPanning = false;
      els.productPhoto.classList.remove("is-panning");
    });

    window.addEventListener("pointercancel", () => {
      if (!state.isPhotoPanning) {
        return;
      }
      state.isPhotoPanning = false;
      els.productPhoto.classList.remove("is-panning");
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.overlay.classList.contains("is-open")) {
        closeOverlay();
        return;
      }
      if (!els.overlay.classList.contains("is-open")) {
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changePhotoZoom(PHOTO_ZOOM_STEP);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        changePhotoZoom(-PHOTO_ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        setPhotoZoom(PHOTO_ZOOM_MIN);
      }
    });

    els.brandLink.addEventListener("click", (event) => {
      event.preventDefault();
      closeOverlay();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    if (els.langSwitch) {
      els.langSwitch.addEventListener("click", (event) => {
        const button = event.target.closest("[data-lang]");
        if (!button) {
          return;
        }
        setLanguage(button.getAttribute("data-lang") || "pl");
      });
    }

    els.supportToggle.addEventListener("click", () => {
      state.support.panelOpen = !state.support.panelOpen;
      els.supportPanel.classList.toggle("is-open", state.support.panelOpen);
      els.supportPanel.setAttribute("aria-hidden", state.support.panelOpen ? "false" : "true");
      if (state.support.panelOpen) {
        syncSupportTicket();
      }
    });

    els.supportClose.addEventListener("click", () => {
      state.support.panelOpen = false;
      els.supportPanel.classList.remove("is-open");
      els.supportPanel.setAttribute("aria-hidden", "true");
    });

    els.supportConnect.addEventListener("click", () => {
      createSupportRequest();
    });

    els.supportChatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = els.supportInput.value;
      els.supportInput.value = "";
      sendSupportVisitorMessage(text);
    });
  }

  setLanguage(state.lang, { skipRender: true });
  bindEvents();
  render();
  loadAds();
  initSupport();
})();


