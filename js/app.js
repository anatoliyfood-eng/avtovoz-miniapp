/* ═══════════════════════════════════════════════
   AvtovozBot Mini App — Core Application Logic
═══════════════════════════════════════════════ */

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
}

// ── Стан додатку ────────────────────────────────
const state = {
  activeTab: "borders",
  currentCountry: "ALL",
  currentFuelCountry: "UA",
  userLocation: null,
  currentSpeed: 0,
  speedLimit: null,
  watchId: null,
  activeTrip: null,
  tripTimer: null,
  navigationActive: false,
  cameraAlertActive: false,
};

// ── API Base URL ────────────────────────────────
const API_BASE = new URLSearchParams(window.location.search).get('api') || window.location.origin;

// ── Fetch з ngrok-skip-browser-warning ──────────
const apiFetch = (url, opts = {}) => fetch(url, {
  ...opts,
  headers: { "ngrok-skip-browser-warning": "true", ...(opts.headers || {}) },
});

// ── Утилети ─────────────────────────────────────
function sendTg(action, data = {}) {
  tg?.sendData(JSON.stringify({ action, ...data }));
}

function showLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = '<div class="loading">⏳ Завантаження...</div>';
}

function haptic(type = "impact") {
  tg?.HapticFeedback?.[type === "impact" ? "impactOccurred" : "notificationOccurred"]?.(
    type === "impact" ? "medium" : type
  );
}

// ── Вкладки ──────────────────────────────────────
function showTab(tabName) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`tab-${tabName}`)?.classList.add("active");
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");
  state.activeTab = tabName;
  haptic("impact");

  // Завантажуємо дані при переключенні
  const loaders = {
    borders: loadBorders,
    fuel: loadFuel,
    trips: loadTrips,
    map: initMap,
  };
  loaders[tabName]?.();
}

// ════════════════════════════════════════════════
// ── КОРДОНИ ──────────────────────────────────────
// ════════════════════════════════════════════════

async function loadBorders() {
  showLoading("borders-list");
  try {
    const resp = await apiFetch(`${API_BASE}/api/borders?country=${state.currentCountry}`);
    const data = await resp.json();
    renderBorders(data.borders || getMockBorders());
  } catch {
    renderBorders(getMockBorders());
  }
}

function filterBorders(country) {
  state.currentCountry = country;
  document.querySelectorAll(".country-filter .filter-btn").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
  loadBorders();
}

function renderBorders(borders) {
  const container = document.getElementById("borders-list");
  if (!borders.length) {
    container.innerHTML = '<div class="empty-state">Дані тимчасово недоступні</div>';
    return;
  }

  container.innerHTML = borders.map(b => {
    const maxWait = Math.max(b.wait_out_minutes || 0, b.wait_in_minutes || 0);
    const severity = maxWait < 30 ? "" : maxWait < 180 ? "warning" : "critical";
    const dotColor = maxWait < 30 ? "#22c55e" : maxWait < 180 ? "#f59e0b" : "#ef4444";

    return `
      <div class="border-card ${severity}">
        <div class="border-card-name">
          <span style="color:${dotColor}">●</span> ${b.crossing_name}
        </div>
        <div class="border-directions">
          <div class="direction-block">
            <div class="direction-label">📤 З України</div>
            <div class="direction-trucks">${b.trucks_out ?? "—"} 🚛</div>
            <div class="direction-wait">⏱ ${formatWait(b.wait_out_minutes)}</div>
          </div>
          <div class="direction-block">
            <div class="direction-label">📥 В Україну</div>
            <div class="direction-trucks">${b.trucks_in ?? "—"} 🚛</div>
            <div class="direction-wait">⏱ ${formatWait(b.wait_in_minutes)}</div>
          </div>
        </div>
        <div class="border-source">📡 ${b.source || "ДПСУ"} · ${b.country || ""}</div>
      </div>
    `;
  }).join("");
}

function formatWait(minutes) {
  if (!minutes || minutes === 0) return "Вільно";
  if (minutes < 60) return `${minutes} хв`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} год ${m} хв` : `${h} год`;
}

function getMockBorders() {
  return [
    { crossing_name: "Краківець - Корчова", trucks_out: 47, trucks_in: 12, wait_out_minutes: 190, wait_in_minutes: 45, source: "ДПСУ", country: "🇵🇱 PL" },
    { crossing_name: "Шегині - Медика", trucks_out: 23, trucks_in: 8, wait_out_minutes: 95, wait_in_minutes: 30, source: "ДПСУ", country: "🇵🇱 PL" },
    { crossing_name: "Рава-Руська - Гребенне", trucks_out: 11, trucks_in: 5, wait_out_minutes: 40, wait_in_minutes: 15, source: "ДПСУ", country: "🇵🇱 PL" },
    { crossing_name: "Ужгород - Вишнє Нємецьке", trucks_out: 8, trucks_in: 3, wait_out_minutes: 25, wait_in_minutes: 10, source: "ДПСУ", country: "🇸🇰 SK" },
    { crossing_name: "Чоп - Захонь", trucks_out: 15, trucks_in: 7, wait_out_minutes: 55, wait_in_minutes: 20, source: "ДПСУ", country: "🇭🇺 HU" },
  ];
}

// ════════════════════════════════════════════════
// ── КАРТА ТА КАМЕРИ ШВИДКОСТІ ────────────────────
// ════════════════════════════════════════════════

function initMap() {
  if (!navigator.geolocation) {
    document.getElementById("map").innerHTML = "❌ Геолокація недоступна";
    return;
  }
  updateLocation();
}

function updateLocation() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      state.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      state.currentSpeed = Math.round((pos.coords.speed || 0) * 3.6); // м/с → км/год
      updateSpeedDisplay();
      loadCamerasNearby();

      // Відправляємо локацію в бот
      apiFetch(`${API_BASE}/api/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: tg?.initDataUnsafe?.user?.id,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      }).catch(() => {});
    },
    err => {
      document.getElementById("map").innerHTML = "📍 Надайте доступ до геолокації";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function startNavigation() {
  if (state.navigationActive) {
    stopNavigation();
    return;
  }
  state.navigationActive = true;
  const btn = document.querySelector(".primary-btn");
  btn.textContent = "⏹ Зупинити моніторинг";
  btn.style.background = "#ef4444";

  state.watchId = navigator.geolocation.watchPosition(
    pos => {
      state.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const speedMs = pos.coords.speed || 0;
      state.currentSpeed = Math.round(speedMs * 3.6);
      updateSpeedDisplay();
      checkCameraAlert();
    },
    null,
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
  );

  loadCamerasNearby();
  haptic("success");
}

function stopNavigation() {
  state.navigationActive = false;
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
  const btn = document.querySelector("#tab-map .primary-btn");
  if (btn) { btn.textContent = "▶️ Почати моніторинг маршруту"; btn.style.background = ""; }
  hideCameraAlert();
}

function updateSpeedDisplay() {
  document.getElementById("current-speed").textContent = state.currentSpeed || "0";
  document.getElementById("speed-limit").textContent = state.speedLimit || "—";

  const speedEl = document.getElementById("current-speed");
  if (state.speedLimit && state.currentSpeed > state.speedLimit) {
    speedEl.style.color = "var(--danger)";
  } else {
    speedEl.style.color = "var(--success)";
  }
}

async function loadCamerasNearby() {
  if (!state.userLocation) return;
  try {
    const { lat, lon } = state.userLocation;
    const resp = await apiFetch(`${API_BASE}/api/cameras?lat=${lat}&lon=${lon}&radius=2`);
    const data = await resp.json();
    renderCameras(data.cameras || getMockCameras());
  } catch {
    renderCameras(getMockCameras());
  }
}

function renderCameras(cameras) {
  const container = document.getElementById("cameras-list");
  if (!cameras.length) {
    container.innerHTML = '<div class="empty-state">Камер у радіусі 2 км не знайдено ✅</div>';
    return;
  }
  container.innerHTML = cameras.map(c => `
    <div class="camera-item">
      <div class="camera-distance">📏 ${c.distance_km ? c.distance_km.toFixed(1) + " км" : "—"}</div>
      <div class="camera-info">
        <div class="camera-type">📷 ${getCameraTypeName(c.camera_type)}</div>
        <div class="camera-speed">🚦 ${c.max_speed} км/год · ${c.road_name || ""}</div>
      </div>
    </div>
  `).join("");

  // Встановлюємо ліміт швидкості за найближчою камерою
  if (cameras.length > 0) {
    state.speedLimit = cameras[0].max_speed;
    updateSpeedDisplay();
  }
}

function getCameraTypeName(type) {
  const names = { fixed: "Стаціонарна", mobile: "Мобільний радар", average_speed: "Середня швидкість", red_light: "Світлофор" };
  return names[type] || "Камера";
}

function checkCameraAlert() {
  if (!state.userLocation) return;
  apiFetch(`${API_BASE}/api/cameras?lat=${state.userLocation.lat}&lon=${state.userLocation.lon}&radius=0.5`)
    .then(r => r.json())
    .then(data => {
      const cameras = data.cameras || [];
      const nearestCamera = cameras.find(c => (c.distance_km || 1) < 0.5);
      if (nearestCamera && state.currentSpeed >= nearestCamera.max_speed * 0.85) {
        showCameraAlert(nearestCamera);
      } else {
        hideCameraAlert();
      }
    })
    .catch(() => {});
}

function showCameraAlert(camera) {
  if (state.cameraAlertActive) return;
  state.cameraAlertActive = true;
  const alertEl = document.getElementById("speed-alert");
  document.getElementById("speed-limit-text").textContent = `Обмеження: ${camera.max_speed} км/год`;
  alertEl.classList.remove("hidden");
  playAlertSound();
  haptic("error");
  tg?.HapticFeedback?.notificationOccurred("error");
}

function hideCameraAlert() {
  state.cameraAlertActive = false;
  document.getElementById("speed-alert").classList.add("hidden");
}

function playAlertSound() {
  // Генеруємо звук через Web Audio API
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

function getMockCameras() {
  return [
    { max_speed: 80, camera_type: "fixed", road_name: "М-06", distance_km: 0.8 },
    { max_speed: 80, camera_type: "average_speed", road_name: "Е-40", distance_km: 1.5 },
  ];
}

// ════════════════════════════════════════════════
// ── ПАЛИВО ───────────────────────────────────────
// ════════════════════════════════════════════════

async function loadFuel() {
  loadFuelCountry(state.currentFuelCountry);
}

async function loadFuelCountry(country) {
  state.currentFuelCountry = country;
  document.querySelectorAll("#tab-fuel .filter-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`#tab-fuel [onclick="loadFuelCountry('${country}')"]`)?.classList.add("active");

  const summaryEl = document.getElementById("fuel-summary");
  summaryEl.innerHTML = '<div class="loading" style="grid-column:1/-1">⏳ Завантаження...</div>';

  try {
    const resp = await apiFetch(`${API_BASE}/api/fuel?country=${country}`);
    const data = await resp.json();
    renderFuelSummary(data, country);
  } catch {
    renderFuelSummary(getMockFuel(country), country);
  }
}

function renderFuelSummary(data, country) {
  const flags = { UA: "🇺🇦", PL: "🇵🇱", SK: "🇸🇰", HU: "🇭🇺", RO: "🇷🇴" };
  const summaryEl = document.getElementById("fuel-summary");
  summaryEl.innerHTML = `
    <div class="fuel-card">
      <div class="fuel-type">🛢 Дизель ${flags[country] || ""}</div>
      <div class="fuel-price">${(data.avg_diesel || 0).toFixed(2)}</div>
      <div class="fuel-unit">${data.currency || "UAH"}/л</div>
    </div>
    <div class="fuel-card">
      <div class="fuel-type">⛽ Бензин А-95</div>
      <div class="fuel-price">${(data.avg_gasoline_95 || 0).toFixed(2)}</div>
      <div class="fuel-unit">${data.currency || "UAH"}/л</div>
    </div>
  `;

  if (data.cheapest_diesel) {
    const { station_name, price, currency, city } = data.cheapest_diesel;
    document.getElementById("fuel-stations").innerHTML = `
      <div class="border-card">
        <div class="border-card-name">✅ Найдешевший дизель</div>
        <div style="font-size:22px;font-weight:800;color:var(--link)">${price.toFixed(2)} ${currency}/л</div>
        <div style="margin-top:4px;color:var(--hint)">${station_name} · ${city}</div>
      </div>
    `;
  }
}

function getMockFuel(country) {
  const data = {
    UA: { avg_diesel: 56.99, avg_gasoline_95: 59.49, currency: "UAH", cheapest_diesel: { station_name: "KLO", price: 55.5, currency: "UAH", city: "Львів" } },
    PL: { avg_diesel: 6.20, avg_gasoline_95: 6.45, currency: "PLN", cheapest_diesel: { station_name: "Orlen", price: 6.10, currency: "PLN", city: "Жешув" } },
    SK: { avg_diesel: 1.55, avg_gasoline_95: 1.65, currency: "EUR", cheapest_diesel: null },
    HU: { avg_diesel: 620, avg_gasoline_95: 650, currency: "HUF", cheapest_diesel: null },
    RO: { avg_diesel: 7.20, avg_gasoline_95: 7.55, currency: "RON", cheapest_diesel: null },
  };
  return data[country] || data.UA;
}

// ════════════════════════════════════════════════
// ── ПОЇЗДКИ ──────────────────────────────────────
// ════════════════════════════════════════════════

async function loadTrips() {
  try {
    const userId = tg?.initDataUnsafe?.user?.id;
    const resp = await apiFetch(`${API_BASE}/api/trips?user_id=${userId}`);
    const data = await resp.json();
    renderTrips(data);
  } catch {
    renderTrips({ total: 12, done: 10, active_trip: null, recent: getMockTrips() });
  }
}

function renderTrips(data) {
  document.getElementById("stat-total").textContent = data.total || 0;
  document.getElementById("stat-done").textContent = data.done || 0;
  document.getElementById("stat-km").textContent = data.total_km ? Math.round(data.total_km) : "—";
  document.getElementById("stat-fuel").textContent = data.total_fuel_uah ? Math.round(data.total_fuel_uah) : "—";

  if (data.active_trip) {
    state.activeTrip = data.active_trip;
    const card = document.getElementById("active-trip-card");
    card.classList.remove("hidden");
    document.getElementById("trip-route").textContent =
      `${data.active_trip.origin} → ${data.active_trip.destination}`;
    startTripTimer(data.active_trip.started_at);
  }

  const list = document.getElementById("trips-list");
  const trips = data.recent || [];
  if (!trips.length) {
    list.innerHTML = '<div class="empty-state">Поїздок ще немає. Натисніть "Нова поїздка"</div>';
    return;
  }
  list.innerHTML = trips.map(t => `
    <div class="trip-item">
      <div>
        <div class="trip-item-route">${t.origin} → ${t.destination}</div>
        <div class="trip-item-meta">${t.created_at} ${t.cargo_name ? "· " + t.cargo_name : ""}</div>
      </div>
      <div class="trip-item-status">${t.status === "completed" ? "✅" : t.status === "in_progress" ? "▶️" : "📅"}</div>
    </div>
  `).join("");
}

function startTripTimer(startedAt) {
  if (state.tripTimer) clearInterval(state.tripTimer);
  const start = startedAt ? new Date(startedAt) : new Date();
  state.tripTimer = setInterval(() => {
    const diff = Math.floor((Date.now() - start) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, "0");
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
    document.getElementById("trip-duration").textContent = `${h}:${m}`;
  }, 1000);
}

function startNewTrip() {
  sendTg("new_trip");
  tg?.close();
}

function finishTrip() {
  if (!confirm("Завершити поточну поїздку?")) return;
  sendTg("finish_trip", { trip_id: state.activeTrip?.id });
  document.getElementById("active-trip-card").classList.add("hidden");
  if (state.tripTimer) clearInterval(state.tripTimer);
  haptic("success");
  loadTrips();
}

function getMockTrips() {
  return [
    { origin: "Київ", destination: "Варшава", status: "completed", created_at: "05.04.2026", cargo_name: "Автозапчастини" },
    { origin: "Львів", destination: "Краків", status: "completed", created_at: "01.04.2026", cargo_name: "Електроніка" },
    { origin: "Одеса", destination: "Бухарест", status: "completed", created_at: "28.03.2026" },
  ];
}

// ════════════════════════════════════════════════
// ── ДОКУМЕНТИ ────────────────────────────────────
// ════════════════════════════════════════════════

function openDocForm(docType) {
  const modal = document.getElementById("doc-modal");
  const titles = { cmr: "📦 CMR — Міжнародна накладна", ttn: "📋 ТТН — Форма №1-ТН", invoice: "💰 Invoice", t1: "🌐 T1 — Транзитна декларація" };
  document.getElementById("modal-title").textContent = titles[docType] || "Новий документ";
  document.getElementById("modal-body").innerHTML = buildDocForm(docType);
  modal.classList.remove("hidden");
  haptic("impact");
}

function closeModal() {
  document.getElementById("doc-modal").classList.add("hidden");
}

function buildDocForm(docType) {
  const commonFields = `
    <div class="form-group">
      <label class="form-label">Відправник (назва)</label>
      <input class="form-input" id="f-sender" placeholder="ТОВ Транспорт Груп" />
    </div>
    <div class="form-group">
      <label class="form-label">Адреса відправника</label>
      <input class="form-input" id="f-sender-addr" placeholder="вул. Хрещатик, 1, Київ, UA" />
    </div>
    <div class="form-group">
      <label class="form-label">Одержувач (назва)</label>
      <input class="form-input" id="f-consignee" placeholder="Acme GmbH" />
    </div>
    <div class="form-group">
      <label class="form-label">Адреса одержувача</label>
      <input class="form-input" id="f-consignee-addr" placeholder="Hauptstraße 1, Berlin, DE" />
    </div>
    <div class="form-group">
      <label class="form-label">Місце завантаження</label>
      <input class="form-input" id="f-loading" placeholder="Київ, Україна" />
    </div>
    <div class="form-group">
      <label class="form-label">Місце доставки</label>
      <input class="form-input" id="f-delivery" placeholder="Варшава, Польща" />
    </div>
    <div class="form-group">
      <label class="form-label">Опис вантажу</label>
      <input class="form-input" id="f-cargo" placeholder="Автозапчастини | 24 | палети" />
    </div>
    <div class="form-group">
      <label class="form-label">Вага брутто (кг)</label>
      <input class="form-input" id="f-weight" type="number" placeholder="12500" />
    </div>
  `;

  const freightField = docType === "cmr" ? `
    <div class="form-group">
      <label class="form-label">Фрахт (EUR)</label>
      <input class="form-input" id="f-freight" type="number" placeholder="850" />
    </div>
  ` : "";

  return `
    ${commonFields}
    ${freightField}
    <button class="primary-btn" onclick="generateDocument('${docType}')">
      📄 Згенерувати ${docType.toUpperCase()}
    </button>
  `;
}

async function generateDocument(docType) {
  const userId = tg?.initDataUnsafe?.user?.id;
  const payload = {
    doc_type: docType,
    user_id: userId,
    sender_name: document.getElementById("f-sender")?.value,
    sender_address: document.getElementById("f-sender-addr")?.value,
    consignee_name: document.getElementById("f-consignee")?.value,
    consignee_address: document.getElementById("f-consignee-addr")?.value,
    loading_place: document.getElementById("f-loading")?.value,
    delivery_place: document.getElementById("f-delivery")?.value,
    cargo_raw: document.getElementById("f-cargo")?.value,
    cargo_weight: parseFloat(document.getElementById("f-weight")?.value) || 0,
    freight_cost: parseFloat(document.getElementById("f-freight")?.value) || 0,
  };

  document.getElementById("modal-body").innerHTML = '<div class="loading">⏳ Генерую документ...</div>';

  try {
    const resp = await apiFetch(`${API_BASE}/api/generate-doc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (data.success) {
      document.getElementById("modal-body").innerHTML = `
        <div style="text-align:center;padding:24px">
          <div style="font-size:48px">✅</div>
          <div style="font-size:17px;font-weight:700;margin:12px 0">${docType.toUpperCase()} готовий!</div>
          <div style="color:var(--hint);margin-bottom:16px">Документ надіслано у Telegram</div>
          <button class="primary-btn" onclick="closeModal()">Закрити</button>
        </div>
      `;
      haptic("success");
    } else {
      throw new Error(data.error || "Помилка генерації");
    }
  } catch (e) {
    // Якщо API недоступне — відправляємо в бот через Telegram
    sendTg("generate_doc", payload);
    closeModal();
    tg?.showAlert(`Запит на ${docType.toUpperCase()} відправлено боту. Документ буде надіслано у чат.`);
  }
}

// ── Ініціалізація ─────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadBorders();

  // Встановлюємо Telegram тему
  if (tg?.colorScheme === "light") {
    document.documentElement.style.setProperty("--bg", "#ffffff");
    document.documentElement.style.setProperty("--bg-secondary", "#f5f5f5");
    document.documentElement.style.setProperty("--text", "#000000");
  }
});
