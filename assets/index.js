import {
  $,
  CAT_MAP,
  api,
  buildNaverMapUrls,
  cleanParts,
  clearAuthToken,
  getCity,
  getStorageValue,
  openNaverMapForCafe,
  safeHttpUrl,
  setStorageValue,
  shareCafe,
  storeCsrfFromPayload,
} from "./common.js?v=20260721-1";

let data = [];
let selectedCategory = null;
let nearbyMode = false;
let currentUser = null;
let favoriteIds = new Set();
let openModalCafeId = "";

const FAVORITE_SYNC_KEY = "kohee-favorites-sync";
const GEO_HIGH_ACCURACY_TIMEOUT_MS = 15000;
const GEO_FALLBACK_TIMEOUT_MS = 4000;
const GEO_APPROX_THRESHOLD_M = 1200;
const GEO_UNRELIABLE_ACCURACY_M = 5000;
// Sentinel distance for cafes without usable coordinates (kept out of results).
const GEO_DISTANCE_LIMIT_KM = 9999;
// Actual "near me" radius. Cafes farther than this are not shown in nearby mode.
// Tune this single value to widen/narrow the nearby search.
const GEO_NEARBY_RADIUS_KM = 20;

let lastFavoriteSync = "";
let lastPositionAccuracyM = null;

function safeText(value) {
  const text = String(value || "").trim();
  return text.toLowerCase() === "undefined" || text.toLowerCase() === "null"
    ? ""
    : text;
}

async function shareCafeMap(cafe) {
  const text = `[코히 리스트] ${cafe.name}\n주소: ${cafe.address}`;
  const keyword = cafe.name
    ? `${cafe.name} ${getCity(cafe.address || "")}`
    : "";
  const mapUrl = keyword ? buildNaverMapUrls(keyword).webUrl : "";

  if (mapUrl) {
    return shareCafe(cafe, mapUrl);
  }

  if (navigator.share) {
    await navigator.share({
      title: "코히 리스트 공유",
      text,
    });
    return "shared";
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return "copied";
  }

  throw new Error(text);
}

function cafeCategories(cafe) {
  return cleanParts(cafe.category).filter((tag) => CAT_MAP[tag]);
}

function cafeTags(cafe) {
  return cafeCategories(cafe).map((tag) => CAT_MAP[tag]);
}

function makePickBadge() {
  const badge = document.createElement("span");
  badge.className = "tag-small tag-pick";
  badge.textContent = "오커맨픽";
  return badge;
}

function appendLines(node, lines) {
  lines.forEach((line, index) => {
    if (index > 0) node.appendChild(document.createElement("br"));
    node.appendChild(document.createTextNode(line));
  });
}

function renderCenterMessage(lines) {
  const message = document.createElement("div");
  message.className = "center-msg";
  appendLines(message, Array.isArray(lines) ? lines : [lines]);
  $("list").replaceChildren(message);
}

function setButtonAction(id, handler) {
  const current = $(id);
  const next = current.cloneNode(true);
  current.replaceWith(next);
  if (handler) next.addEventListener("click", handler);
  return next;
}

function appendTags(container, cafe) {
  container.replaceChildren();
  cafeTags(cafe).forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag-small";
    item.textContent = tag;
    container.appendChild(item);
  });
}

function signatureText(values) {
  const parts = cleanParts(values);
  return parts.length ? parts.join(", ") : "";
}

function getFavoriteSyncStamp() {
  return getStorageValue(FAVORITE_SYNC_KEY);
}

function touchFavoriteSync() {
  const stamp = String(Date.now());
  lastFavoriteSync = stamp;
  setStorageValue(FAVORITE_SYNC_KEY, stamp);
}

async function syncFavoritesIfNeeded() {
  const stamp = getFavoriteSyncStamp();
  if (stamp === lastFavoriteSync) return;
  lastFavoriteSync = stamp;
  await loadFavorites();
}

function isFavorite(cafeId) {
  return favoriteIds.has(String(cafeId));
}

function updateFavoriteButton(cafeId = openModalCafeId) {
  const btn = $("btn-favorite");
  if (!btn) return;
  if (!cafeId) {
    btn.style.display = "none";
    return;
  }

  const favored = isFavorite(cafeId);
  btn.style.display = "inline-flex";
  btn.textContent = favored ? "★" : "☆";
  btn.classList.toggle("is-on", favored);
}

async function loadFavorites() {
  if (!currentUser) {
    favoriteIds = new Set();
    lastFavoriteSync = getFavoriteSyncStamp();
    updateFavoriteButton();
    return;
  }

  try {
    const res = await api("/favorites");
    if (!res.ok) throw new Error();
    const payload = await res.json();
    favoriteIds = new Set(
      (payload.items || []).map((item) => String(item.cafe?.id || "")),
    );
  } catch {
    favoriteIds = new Set();
  }

  lastFavoriteSync = getFavoriteSyncStamp();
  updateFavoriteButton();
}

async function toggleFavorite(cafeId) {
  if (!currentUser) {
    if (confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
      location.href = "login.html";
    }
    return;
  }

  const action = isFavorite(cafeId) ? "remove" : "add";
  const res = await api("/favorite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cafe_id: cafeId, action }),
  });
  const payload = await res.json().catch(() => ({}));
  storeCsrfFromPayload(payload);
  if (!res.ok || !payload.ok)
    throw new Error(payload.error || "찜 처리에 실패했습니다.");

  if (payload.favored) favoriteIds.add(String(cafeId));
  else favoriteIds.delete(String(cafeId));

  updateFavoriteButton(cafeId);
  touchFavoriteSync();
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm >= GEO_DISTANCE_LIMIT_KM)
    return "";
  const label = `${distanceKm.toFixed(1)}km`;
  return lastPositionAccuracyM && lastPositionAccuracyM > GEO_APPROX_THRESHOLD_M
    ? `약 ${label}`
    : label;
}

function centerMessage(message, subMessage = "") {
  const box = document.createElement("div");
  box.className = "center-msg";
  box.textContent = message;
  if (subMessage) {
    box.appendChild(document.createElement("br"));
    box.append(subMessage);
  }
  return box;
}

function createCafeCard(cafe) {
  const card = document.createElement("div");
  card.className = "cafe-card";
  card.dataset.cafeId = safeText(cafe.id);

  const meta = document.createElement("div");
  meta.className = "meta-row";

  const tagGroup = document.createElement("div");
  tagGroup.className = "tag-group";
  appendTags(tagGroup, cafe);
  if (cafe.oakerman_pick) tagGroup.prepend(makePickBadge());
  meta.appendChild(tagGroup);

  const metaRight = document.createElement("div");
  metaRight.className = "meta-right";

  if (cafe.dis !== undefined && cafe.dis < GEO_DISTANCE_LIMIT_KM) {
    const distance = formatDistance(cafe.dis);
    if (distance) {
      const badge = document.createElement("span");
      badge.className = "distance-badge";
      badge.textContent = distance;
      metaRight.appendChild(badge);
    }
  }

  if (metaRight.childElementCount) meta.appendChild(metaRight);

  const title = document.createElement("h4");
  title.textContent = safeText(cafe.name);

  const desc = document.createElement("p");
  desc.className = "cafe-desc";
  desc.textContent = safeText(cafe.desc);
  const signature = signatureText(cafe.signature);
  if (signature) {
    desc.append(" ");
    const sig = document.createElement("span");
    sig.className = "sig-inline";
    sig.textContent = signature;
    desc.appendChild(sig);
  }

  const address = document.createElement("p");
  address.className = "address-full";
  address.textContent = safeText(cafe.address);

  card.append(meta, title, desc, address);
  return card;
}

function renderCafeCards(cafes) {
  $("list").replaceChildren(...cafes.map(createCafeCard));
}

function renderModalDescription(desc, signature) {
  const wrap = $("m-desc");
  wrap.replaceChildren();

  const copy = safeText(desc);
  const signatureValue = signatureText(signature);

  if (copy) {
    const copyEl = document.createElement("div");
    copyEl.className = "modal-copy-text";
    copyEl.textContent = copy;
    wrap.appendChild(copyEl);
  }

  if (signatureValue) {
    const box = document.createElement("div");
    box.className = "modal-signature";

    const label = document.createElement("div");
    label.className = "modal-signature-label";
    label.textContent = "\uB300\uD45C\uBA54\uB274";

    const value = document.createElement("div");
    value.className = "modal-signature-value";
    value.textContent = signatureValue;

    box.append(label, value);
    wrap.appendChild(box);
  }

  if (!copy && !signatureValue) {
    const empty = document.createElement("div");
    empty.className = "modal-copy-empty";
    empty.textContent =
      "\uC18C\uAC1C\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4.";
    wrap.appendChild(empty);
  }
}

async function loadData() {
  try {
    const response = await api(`/data?${Date.now()}`);
    if (!response.ok) throw new Error();
    const rows = await response.json();
    data = Array.isArray(rows)
      ? rows.map((cafe) => ({
          ...cafe,
          id: safeText(cafe.id),
          name: safeText(cafe.name),
          address: safeText(cafe.address),
          desc: safeText(cafe.desc),
          category: cafeCategories(cafe),
          signature: cleanParts(cafe.signature),
        }))
      : [];
    render();
  } catch {
    renderCenterMessage([
      "데이터를 불러오지 못했습니다.",
      "잠시 후 다시 시도해 주세요.",
    ]);
  }
}

function render() {
  const query = $("search").value.toLowerCase().trim();

  if (nearbyMode) {
    const located = data.filter(
      (cafe) => Number.isFinite(cafe.dis) && cafe.dis < GEO_DISTANCE_LIMIT_KM,
    );

    // No cafe has usable coordinates -> the cause is missing cafe data, not GPS.
    if (!located.length) {
      renderCenterMessage([
        "주변 카페의 위치 정보가 아직 부족합니다.",
        "카페명 또는 주소로 검색해 주세요.",
      ]);
      return;
    }

    const nearbyCafes = located
      .filter((cafe) => cafe.dis <= GEO_NEARBY_RADIUS_KM)
      .sort((a, b) => a.dis - b.dis)
      .slice(0, 20);

    if (!nearbyCafes.length) {
      renderCenterMessage([
        `${GEO_NEARBY_RADIUS_KM}km 이내에 등록된 카페가 없습니다.`,
        "카페명 또는 주소로 검색해 보세요.",
      ]);
      return;
    }

    renderCafeCards(nearbyCafes);
    return;
  }

  const hasFilter = query.length > 0 || selectedCategory !== null;
  if (!hasFilter) {
    renderCenterMessage([
      "카테고리를 선택하거나",
      "카페명 또는 주소를 검색해 보세요.",
    ]);
    return;
  }

  const filtered = data
    .filter(
      (cafe) =>
        (safeText(cafe.name).toLowerCase().includes(query) ||
          safeText(cafe.address).toLowerCase().includes(query)) &&
        (!selectedCategory || cafeCategories(cafe).includes(selectedCategory)),
    )
    .slice(0, 50);

  if (!filtered.length) {
    renderCenterMessage("조건에 맞는 결과가 없습니다.");
    return;
  }

  renderCafeCards(filtered);
}

function clearCategorySelection() {
  selectedCategory = null;
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
}

function toggleFilter(categoryKey) {
  if (nearbyMode) exitNearbyMode();
  if (selectedCategory !== categoryKey) $("search").value = "";
  selectedCategory = selectedCategory === categoryKey ? null : categoryKey;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
    if (selectedCategory && tab.id === `tab-${selectedCategory}`)
      tab.classList.add("active");
  });
  render();
}

function handleSearchInput() {
  if (nearbyMode) exitNearbyMode();
  if ($("search").value.trim().length > 0) {
    clearCategorySelection();
  }
  render();
}

function getDist(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCafeCoord(cafe) {
  const lat = Number(cafe.lat);
  const lng = Number(cafe.lng);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function isValidUserCoord(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function setDistanceNote(modeData) {
  const note = $("distance-note");
  if (!note) return;

  if (!modeData) {
    note.style.display = "none";
    note.replaceChildren();
    return;
  }

  note.style.display = "block";
  note.replaceChildren();

  if (modeData.type === "home") {
    note.append(`${modeData.label} 기준 거리`);
  } else if (modeData.type === "gps") {
    note.append(
      modeData.accuracy > GEO_APPROX_THRESHOLD_M
        ? "브라우저 위치 정확도가 낮아 거리가 대략적으로 보일 수 있습니다."
        : "현재 위치 기준 거리 표시 중"
    );
  }

  const link = document.createElement("a");
  link.href = "#";
  link.style.marginLeft = "8px";
  link.style.textDecoration = "underline";
  link.style.cursor = "pointer";
  link.style.fontSize = "0.9em";
  link.textContent = "내 동네 설정";
  link.addEventListener("click", (e) => {
    e.preventDefault();
    promptAndSaveNeighborhood();
  });
  note.appendChild(link);
}

function clearDistances() {
  data.forEach((cafe) => {
    delete cafe.dis;
  });
  lastPositionAccuracyM = null;
  setDistanceNote(null);
}

function requestGeoPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function requestUserPosition() {
  let lastError = null;

  try {
    return await requestGeoPosition({
      enableHighAccuracy: true,
      timeout: GEO_HIGH_ACCURACY_TIMEOUT_MS,
      maximumAge: 0,
    });
  } catch (error) {
    lastError = error;
  }

  try {
    return await requestGeoPosition({
      enableHighAccuracy: false,
      timeout: GEO_FALLBACK_TIMEOUT_MS,
      maximumAge: 0,
    });
  } catch (error) {
    throw error || lastError || new Error("위치 정보를 가져오지 못했습니다.");
  }
}

function applyUserPosition(pos) {
  const userLat = Number(pos?.coords?.latitude);
  const userLng = Number(pos?.coords?.longitude);

  if (!isValidUserCoord(userLat, userLng)) {
    throw new Error("잘못된 위치 정보입니다.");
  }

  lastPositionAccuracyM = Number(pos?.coords?.accuracy || 0) || null;

  if (lastPositionAccuracyM && lastPositionAccuracyM > GEO_UNRELIABLE_ACCURACY_M) {
    const km = Math.round(lastPositionAccuracyM / 1000);
    throw new Error(`브라우저가 대략적인 위치(오차 반경 ±${km}km)만 제공했습니다.\nWindows 설정에서 OS 위치 서비스를 켜시거나, 카페명 또는 주소로 검색해 주세요.`);
  }

  setDistanceNote({ type: "gps", accuracy: lastPositionAccuracyM });

  data.forEach((cafe) => {
    cafe.dis = isValidCafeCoord(cafe)
      ? getDist(userLat, userLng, Number(cafe.lat), Number(cafe.lng))
      : GEO_DISTANCE_LIMIT_KM;
  });
}

function applyHomePosition(home) {
  lastPositionAccuracyM = null;
  setDistanceNote({ type: "home", label: home.label });

  data.forEach((cafe) => {
    cafe.dis = isValidCafeCoord(cafe)
      ? getDist(Number(home.lat), Number(home.lng), Number(cafe.lat), Number(cafe.lng))
      : GEO_DISTANCE_LIMIT_KM;
  });
}

function activateNearbyMode() {
  nearbyMode = true;
  clearCategorySelection();
  setNearbyActive(true);
  $("search").value = "";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function promptAndSaveNeighborhood() {
  const hasHome = !!getStorageValue("kohee-home");
  const msg = hasHome
    ? "동네 이름을 입력해 주세요 (예: 역삼동)\n(입력 없이 확인을 누르면 저장된 동네가 초기화됩니다):"
    : "동네 이름을 입력해 주세요 (예: 역삼동):";

  const q = prompt(msg);
  if (q === null) return;

  const label = q.trim();
  if (!label) {
    if (hasHome) {
      localStorage.removeItem("kohee-home");
      alert("저장된 동네가 초기화되었습니다. 현재 위치를 다시 사용합니다.");
      exitNearbyMode();
      render();
    }
    return;
  }

  try {
    setNearbyLoading(true);
    const res = await api("/geocode?q=" + encodeURIComponent(label));
    if (!res.ok) throw new Error();
    const payload = await res.json();

    let lat = payload.lat;
    let lng = payload.lng;
    if (lat === undefined && payload.items && payload.items[0]) {
      lat = payload.items[0].lat;
      lng = payload.items[0].lng;
    }

    if (lat === undefined || lng === undefined) throw new Error();

    const homeData = {
      lat: Number(lat),
      lng: Number(lng),
      label: label,
    };

    setStorageValue("kohee-home", JSON.stringify(homeData));

    applyHomePosition(homeData);
    activateNearbyMode();
  } catch (e) {
    alert("동네를 찾을 수 없습니다.");
  } finally {
    setNearbyLoading(false);
  }
}

function setNearbyLoading(isLoading) {
  const btn = $("nearby-btn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle("is-loading", isLoading);
}

function setNearbyActive(active) {
  const btn = $("nearby-btn");
  if (!btn) return;
  btn.classList.toggle("is-on", active);
  btn.setAttribute("aria-pressed", active ? "true" : "false");
}

// Leave nearby mode and drop all distance state so distance badges and the
// distance note do not linger in search/category results.
function exitNearbyMode() {
  nearbyMode = false;
  clearDistances();
  setNearbyActive(false);
}

async function handleNearbyClick() {
  // Toggle: pressing the button again while active returns to the default view.
  if (nearbyMode) {
    exitNearbyMode();
    render();
    return;
  }

  setNearbyLoading(true);

  let homeStr = getStorageValue("kohee-home");
  if (homeStr) {
    try {
      const home = JSON.parse(homeStr);
      if (home && isValidUserCoord(Number(home.lat), Number(home.lng)) && home.label) {
        applyHomePosition(home);
        activateNearbyMode();
        setNearbyLoading(false);
        return;
      }
    } catch (e) {
      // ignore parse error
    }
  }

  if (!navigator.geolocation) {
    await promptAndSaveNeighborhood();
    setNearbyLoading(false);
    return;
  }

  try {
    const pos = await requestUserPosition();
    applyUserPosition(pos);
    activateNearbyMode();
  } catch (error) {
    console.error(error);
    await promptAndSaveNeighborhood();
  } finally {
    setNearbyLoading(false);
  }
}

function openModal(cafeId) {
  const cafe = data.find((item) => String(item.id) === String(cafeId));
  if (!cafe) return;

  openModalCafeId = String(cafe.id);
  appendTags($("m-tags"), cafe);
  if (cafe.oakerman_pick) $("m-tags").prepend(makePickBadge());
  updateFavoriteButton(cafe.id);
  setButtonAction("btn-favorite", async () => {
    try {
      await toggleFavorite(cafe.id);
    } catch (error) {
      alert(error.message);
    }
  });

  $("m-name").textContent = safeText(cafe.name);
  renderModalDescription(cafe.desc, cafe.signature);

  setButtonAction("btn-map", () => openNaverMapForCafe(cafe));
  setButtonAction("btn-share", async () => {
    try {
      const mode = await shareCafeMap(cafe);
      if (mode === "copied") alert("클립보드에 복사되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  });

  const beanShopUrl = safeHttpUrl(cafe.beanShop);
  const beanButton = setButtonAction(
    "btn-bean",
    beanShopUrl ? () => window.open(beanShopUrl, "_blank", "noopener") : null,
  );
  if (beanShopUrl) {
    beanButton.classList.remove("is-hidden");
  } else {
    beanButton.classList.add("is-hidden");
  }

  const instagramUrl = safeHttpUrl(cafe.instagram);
  const instagramButton = setButtonAction(
    "btn-insta",
    instagramUrl ? () => window.open(instagramUrl, "_blank", "noopener") : null,
  );
  if (instagramUrl) {
    instagramButton.classList.remove("is-hidden");
  } else {
    instagramButton.classList.add("is-hidden");
  }

  $("modal-bg").style.display = "flex";
}

async function loadNotice() {
  try {
    const res = await api("/notice");
    const text = await res.text();
    if (text && text.trim()) {
      $("notice").innerText = text;
      $("notice").style.display = "block";
    }
  } catch {
    console.error("공지 로드 실패");
  }
}

async function loadMe() {
  try {
    const res = await api("/me");
    if (!res.ok) throw new Error();
    const payload = await res.json();
    storeCsrfFromPayload(payload);
    currentUser = payload.user || null;
  } catch {
    currentUser = null;
  }

  await loadFavorites();
  renderAuthMenu();
}

function renderAuthMenu() {
  const menu = $("auth-menu");
  if (!menu) return;

  if (!currentUser) {
    menu.className = "auth-menu is-guest";
    menu.replaceChildren();
    appendAuthLink(menu, "login.html", "로그인");
    appendAuthLink(menu, "submit.html", "제보하기");
    appendAuthLink(menu, "mypage.html", "마이페이지");
    return;
  }

  menu.className = "auth-menu is-logged-in";
  menu.replaceChildren();

  const logoutButton = document.createElement("button");
  logoutButton.id = "logout-menu-btn";
  logoutButton.type = "button";
  logoutButton.textContent = "로그아웃";
  logoutButton.addEventListener("click", logout);
  menu.appendChild(logoutButton);
  appendAuthLink(menu, "submit.html", "제보하기");
  appendAuthLink(menu, "mypage.html", "마이페이지");
}

function appendAuthLink(menu, href, text) {
  const link = document.createElement("a");
  link.className = "auth-link";
  link.href = href;
  link.textContent = text;
  menu.appendChild(link);
}

async function logout() {
  try {
    await api("/logout", { method: "POST" });
  } catch {}
  clearAuthToken();
  currentUser = null;
  favoriteIds = new Set();
  updateFavoriteButton();
  renderAuthMenu();
}

Object.entries(CAT_MAP).forEach(([key, label]) => {
  const tab = document.createElement("button");
  tab.className = "tab";
  tab.id = `tab-${key}`;
  tab.type = "button";
  tab.textContent = label;
  tab.addEventListener("click", () => toggleFilter(key));
  $("tabs").appendChild(tab);
});

$("search").addEventListener("input", handleSearchInput);
$("nearby-btn").addEventListener("click", handleNearbyClick);
$("app-title").addEventListener("click", () => location.reload());
$("modal-bg").addEventListener("click", (event) => {
  if (event.target === $("modal-bg")) $("modal-bg").style.display = "none";
});
$("list").addEventListener("click", (event) => {
  const card = event.target.closest(".cafe-card[data-cafe-id]");
  if (!card) return;
  openModal(card.dataset.cafeId);
});

window.addEventListener("storage", (event) => {
  if (event.key !== FAVORITE_SYNC_KEY) return;
  lastFavoriteSync = event.newValue || "";
  loadFavorites().catch(() => {});
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  syncFavoritesIfNeeded().catch(() => {});
});

loadData();
loadNotice();
loadMe();
