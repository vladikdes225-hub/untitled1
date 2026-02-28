"use strict";

(function initMarketplace() {
  const API_FALLBACK_BASE = String(document.documentElement.getAttribute("data-api-fallback-base") || "")
    .trim()
    .replace(/\/+$/, "");
  const TELEGRAM_FALLBACK = "RXSEND";
  const SUPPORT_POLL_MS = 3000;
  const SUPPORT_VISITOR_KEY = "rxsend_support_visitor_id";
  const SUPPORT_TICKET_KEY = "rxsend_support_ticket_id";

  const CATEGORY_META = [
    { name: "Все", icon: "🧭" },
    { name: "Телефоны", icon: "📱" },
    { name: "Наушники", icon: "🎧" },
    { name: "Часы", icon: "⌚" },
    { name: "Планшеты", icon: "📲" },
    { name: "Ноутбуки", icon: "💻" },
    { name: "Компьютеры", icon: "🖥️" },
    { name: "Консоли", icon: "🎮" },
    { name: "Колонки", icon: "🔊" },
    { name: "Без категории", icon: "📁" }
  ];

  const CATEGORY_ICON_MAP = CATEGORY_META.reduce((acc, item) => {
    acc[item.name] = item.icon;
    return acc;
  }, {});

  const SORT_MODES = [
    { id: "recent", label: "Новые" },
    { id: "price-up", label: "Цена ↑" },
    { id: "price-down", label: "Цена ↓" }
  ];

  const state = {
    ads: [],
    query: "",
    sideMode: "market",
    category: "Все",
    sort: "recent",
    favorites: new Set(),
    activeAdId: null,
    activeImageIndex: 0,
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
    searchInput: document.getElementById("searchInput"),
    sortButton: document.getElementById("sortButton"),
    chips: document.getElementById("chips"),
    cardsGrid: document.getElementById("cardsGrid"),
    resultCount: document.getElementById("resultCount"),
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
    return `${new Intl.NumberFormat("ru-RU").format(num)} ₽`;
  }

  function formatDate(iso) {
    if (!iso) {
      return "Дата не указана";
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "Дата не указана";
    }
    return date.toLocaleString("ru-RU", {
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
      return "Без категории";
    }
    const exact = CATEGORY_META.find((item) => item.name === value);
    if (exact) {
      return exact.name;
    }
    const lower = value.toLowerCase();
    const fuzzy = CATEGORY_META.find((item) => item.name.toLowerCase() === lower);
    return fuzzy ? fuzzy.name : "Без категории";
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
    return SORT_MODES.find((item) => item.id === state.sort) || SORT_MODES[0];
  }

  function nextSortMode() {
    const idx = SORT_MODES.findIndex((item) => item.id === state.sort);
    const next = SORT_MODES[(idx + 1 + SORT_MODES.length) % SORT_MODES.length];
    state.sort = next.id;
    els.sortButton.textContent = next.label;
    render();
    showToast(`Сортировка: ${next.label}`);
  }

  function renderChips() {
    const html = CATEGORY_META.map((item) => {
      const active = item.name === state.category ? " is-active" : "";
      return `<button class="chip${active}" type="button" data-category="${escapeHtml(item.name)}"><span class="chip-icon">${item.icon}</span>${escapeHtml(item.name)}</button>`;
    }).join("");
    els.chips.innerHTML = html;
  }

  function filterAds() {
    const query = state.query.trim().toLowerCase();
    let result = [...state.ads];

    if (state.sideMode === "only-new") {
      result = result.filter((item) => item.condition === "new");
    } else if (state.sideMode === "only-used") {
      result = result.filter((item) => item.condition !== "new");
    }

    if (state.category !== "Все") {
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
      els.cardsGrid.innerHTML = '<div class="empty">Ничего не найдено. Измените фильтры или поиск.</div>';
      return;
    }

    const html = items.map((item) => {
      const images = getImages(item);
      const [tone1, tone2] = toneById(item.id);
      const isFav = state.favorites.has(Number(item.id));
      const mainImage = images[0];
      const safeTitle = escapeHtml(item.title || "Без названия");
      const safeDescription = escapeHtml(item.description || "Описание не указано.");
      const safeSeller = escapeHtml(item.seller || "Продавец");
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

  function renderOverlayPhoto(ad) {
    const images = getImages(ad);
    const list = images.length ? images : [""];
    state.activeImageIndex = Math.min(Math.max(state.activeImageIndex, 0), list.length - 1);
    const current = list[state.activeImageIndex] || "";

    if (current) {
      els.productPhoto.classList.remove("no-photo");
      els.productPhoto.innerHTML = `<img src="${escapeHtml(current)}" alt="${escapeHtml(ad.title || "Фото")}">`;
    } else {
      els.productPhoto.classList.add("no-photo");
      els.productPhoto.textContent = "Фото отсутствует";
    }

    if (!images.length) {
      els.productGallery.innerHTML = "";
      return;
    }

    els.productGallery.innerHTML = images.map((img, idx) => {
      const active = idx === state.activeImageIndex ? " is-active" : "";
      return `<button type="button" class="gallery-thumb${active}" data-gallery-index="${idx}"><img src="${escapeHtml(img)}" alt="Фото ${idx + 1}"></button>`;
    }).join("");
  }

  function openOverlay(ad) {
    state.activeAdId = Number(ad.id);
    state.activeImageIndex = 0;

    const sellerHandle = normalizeTelegram(ad.sellerTelegram) || TELEGRAM_FALLBACK;
    const managerHandle = normalizeTelegram(ad.managerTelegram) || TELEGRAM_FALLBACK;
    const managerName = ad.managerName || "RXSEND";

    els.productCategory.textContent = `${CATEGORY_ICON_MAP[normalizeCategory(ad.category)] || "📁"} ${normalizeCategory(ad.category)}`;
    els.productPrice.textContent = formatPrice(ad.price);
    els.productTitle.textContent = ad.title || "Без названия";
    els.productDescription.textContent = ad.description || "Описание не указано.";
    els.sellerName.textContent = ad.seller || "Продавец";
    els.sellerContact.textContent = `Telegram продавца: @${sellerHandle}`;
    els.sellerProfileLink.href = telegramUrl(sellerHandle);
    els.sellerProfileLink.textContent = `Открыть @${sellerHandle}`;
    els.managerLink.href = telegramUrl(managerHandle);
    els.managerLink.textContent = `Связаться с менеджером ${managerName}`;
    els.buyLink.href = telegramUrl(sellerHandle || managerHandle);
    els.buyLink.textContent = "Перейти к покупке";

    renderOverlayPhoto(ad);

    els.overlay.classList.add("is-open");
    els.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("overlay-open");
  }

  function closeOverlay() {
    state.activeAdId = null;
    state.activeImageIndex = 0;
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
    const time = createdAt ? `\n${new Date(createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : "";
    row.textContent = `${text}${time}`;
    els.supportMessages.appendChild(row);
    els.supportMessages.scrollTop = els.supportMessages.scrollHeight;
  }

  function ensureSupportGreeting() {
    if (state.support.greeted) {
      return;
    }
    appendSupportMessage("system", "Hi! We work 24/7.");
    state.support.greeted = true;
  }

  function updateSupportUiByStatus(status) {
    state.support.status = status || "idle";
    if (status === "approved") {
      setSupportStatus("Chat approved. You can send messages now.");
      setSupportControlsEnabled(true);
      return;
    }
    if (status === "pending") {
      setSupportStatus("Request sent. Waiting for Telegram approval.");
      setSupportControlsEnabled(false);
      return;
    }
    if (status === "denied") {
      setSupportStatus("Request was denied by support.");
      setSupportControlsEnabled(false);
      return;
    }
    setSupportStatus("Press the button below to request support.");
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
      setSupportStatus(`Support error: ${error.message}`);
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
      appendSupportMessage("system", "Request sent. Waiting for operator decision.");
      ensureSupportPolling();
      await syncSupportTicket();
    } catch (error) {
      setSupportStatus(`Request error: ${error.message}`);
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
      showToast("Please wait until support approves your chat.");
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
      setSupportStatus(`Send error: ${error.message}`);
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
      render();
    } catch (error) {
      state.ads = [];
      render();
      showToast(`API недоступно: ${error.message}`);
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
      state.category = button.dataset.category || "Все";
      render();
    });

    for (const button of els.sideLinks) {
      button.addEventListener("click", () => {
        state.sideMode = button.dataset.mode || "market";
        render();
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

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.overlay.classList.contains("is-open")) {
        closeOverlay();
      }
    });

    els.brandLink.addEventListener("click", (event) => {
      event.preventDefault();
      closeOverlay();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

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

  bindEvents();
  render();
  loadAds();
  initSupport();
})();
