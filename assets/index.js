import {
  $,
  CAT_MAP,
  api,
  cleanParts,
  clearAuthToken,
  esc,
  getStorageValue,
  modalDescHtml,
  openNaverMapForCafe,
  setStorageValue,
  shareCafe,
} from "./common.js";

let data = [];
let selectedCategory = null;
let nearbyMode = false;
let currentUser = null;
let favoriteIds = new Set();
let openModalCafeId = "";
const FAVORITE_SYNC_KEY = "kohee-favorites-sync";
let lastFavoriteSync = "";
let lastPositionAccuracyM = null;
const GEO_HIGH_ACCURACY_TIMEOUT_MS = 7000;
const GEO_FALLBACK_TIMEOUT_MS = 4000;
const GEO_APPROX_THRESHOLD_M = 1200;
const GEO_DISTANCE_LIMIT_KM = 9999;

function safeText(value) {
  const text = String(value || "").trim();
  return text.toLowerCase() === "undefined" || text.toLowerCase() === "null" ? "" : text;
}

function cafeCategories(cafe) {
  return cleanParts(cafe.category).filter((tag) => CAT_MAP[tag]);
}

function tagHtml(cafe) {
  return cafeCategories(cafe).map((tag) => `<span class="tag-small">${CAT_MAP[tag]}</span>`).join("");
}

function signatureHtml(values) {
  const parts = cleanParts(values);
  return parts.length
    ? `<span class="sig-inline">${parts.map((value) => esc(value)).join(", ")}</span>`
    : "";
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
  btn.style.display = "inline-flex";
  btn.textContent = isFavorite(cafeId) ? "★" : "☆";
  btn.classList.toggle("is-on", isFavorite(cafeId));
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
    favoriteIds = new Set((payload.items || []).map((item) => String(item.cafe?.id || "")));
  } catch (error) {
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
  if (!res.ok || !payload.ok) throw new Error(payload.error || "찜 처리 실패");

  if (payload.favored) favoriteIds.add(String(cafeId));
  else favoriteIds.delete(String(cafeId));

  updateFavoriteButton(cafeId);
  touchFavoriteSync();
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm >= GEO_DISTANCE_LIMIT_KM) return "";
  const label = `${distanceKm.toFixed(1)}km`;
  return lastPositionAccuracyM && lastPositionAccuracyM > GEO_APPROX_THRESHOLD_M
    ? `약 ${label}`
    : label;
}

function cafeCardHtml(cafe) {
  return `
    <div class="cafe-card" data-cafe-id="${esc(cafe.id)}">
      <div class="meta-row">
        <div class="tag-group">
          ${tagHtml(cafe)}
        </div>
        ${cafe.dis !== undefined && cafe.dis < GEO_DISTANCE_LIMIT_KM
          ? `<span class="distance-badge">${formatDistance(cafe.dis)}</span>`
          : ""}
      </div>
      <h4>${esc(cafe.name)}</h4>
      <p class="cafe-desc">
        ${esc(safeText(cafe.desc))}
        ${signatureHtml(cafe.signature)}
      </p>
      <p class="address-full">${esc(safeText(cafe.address))}</p>
    </div>
  `;
}

async function loadData() {
  try {
    const response = await api(`/data?${Date.now()}`);
    if (!response.ok) throw new Error();
    const rows = await response.json();
    data = Array.isArray(rows) ? rows.map((cafe) => ({
      ...cafe,
      id: safeText(cafe.id),
      name: safeText(cafe.name),
      address: safeText(cafe.address),
      desc: safeText(cafe.desc),
      category: cafeCategories(cafe),
      signature: cleanParts(cafe.signature),
    })) : [];
    render();
  } catch (error) {
    $("list").innerHTML = `<div class="center-msg">데이터 로드 실패!<br>관리자에게 문의하새우 🦐</div>`;
  }
}

function render() {
  const query = $("search").value.toLowerCase().trim();

  if (nearbyMode) {
    let nearbyCafes = data
      .filter((cafe) => Number.isFinite(cafe.dis) && cafe.dis < GEO_DISTANCE_LIMIT_KM)
      .sort((a, b) => a.dis - b.dis);
    if (selectedCategory) {
      nearbyCafes = nearbyCafes.filter((cafe) => cafeCategories(cafe).includes(selectedCategory));
    }
    nearbyCafes = nearbyCafes.slice(0, 20);

    if (!nearbyCafes.length) {
      $("list").innerHTML = `<div class="center-msg">근처에 해당 카페가 없새우...<br>GPS를 확인해주세요 🦐</div>`;
      return;
    }

    $("list").innerHTML = nearbyCafes.map(cafeCardHtml).join("");
    return;
  }

  const hasFilter = query.length > 0 || selectedCategory !== null;
  if (!hasFilter) {
    $("list").innerHTML = `<div class="center-msg">카테고리를 선택하거나<br>카페나 주소를 검색해보새우! ☕</div>`;
    return;
  }

  const filtered = data.filter((cafe) =>
    (safeText(cafe.name).toLowerCase().includes(query) || safeText(cafe.address).toLowerCase().includes(query))
    && (!selectedCategory || cafeCategories(cafe).includes(selectedCategory))
  ).slice(0, 50);

  if (!filtered.length) {
    $("list").innerHTML = `<div class="center-msg">조건에 맞는 결과가 없새우! 🦐</div>`;
    return;
  }

  $("list").innerHTML = filtered.map(cafeCardHtml).join("");
}

function toggleFilter(categoryKey) {
  nearbyMode = false;
  if (selectedCategory !== categoryKey) $("search").value = "";
  selectedCategory = selectedCategory === categoryKey ? null : categoryKey;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
    if (selectedCategory && tab.id === `tab-${selectedCategory}`) tab.classList.add("active");
  });
  render();
}

function handleSearchInput() {
  nearbyMode = false;
  if ($("search").value.trim().length > 0) {
    selectedCategory = null;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  }
  render();
}

function getDist(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCafeCoord(cafe) {
  const lat = Number(cafe.lat);
  const lng = Number(cafe.lng);
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180
    && !(lat === 0 && lng === 0);
}

function isValidUserCoord(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;
}

function setDistanceNote(accuracy) {
  const note = $("distance-note");
  if (!note) return;

  if (!accuracy) {
    note.style.display = "none";
    note.textContent = "";
    return;
  }

  note.textContent = accuracy > GEO_APPROX_THRESHOLD_M
    ? "브라우저 위치가 대략적일 수 있어 거리를 약으로 표시합니다"
    : "내 위치 기준 거리 표시 중";
  note.style.display = "block";
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
    throw error || lastError || new Error("Geolocation failed");
  }
}

function applyUserPosition(pos) {
  const userLat = Number(pos?.coords?.latitude);
  const userLng = Number(pos?.coords?.longitude);

  if (!isValidUserCoord(userLat, userLng)) {
    throw new Error("Invalid user coordinates");
  }

  lastPositionAccuracyM = Number(pos?.coords?.accuracy || 0) || null;
  setDistanceNote(lastPositionAccuracyM);

  data.forEach((cafe) => {
    cafe.dis = isValidCafeCoord(cafe)
      ? getDist(userLat, userLng, Number(cafe.lat), Number(cafe.lng))
      : GEO_DISTANCE_LIMIT_KM;
  });

  const ruri = data.find((cafe) => safeText(cafe.name).includes("루리커피"));
  if (ruri) {
    console.info("[KOHEE distance check]", {
      userLat,
      userLng,
      accuracyM: lastPositionAccuracyM,
      ruriLat: Number(ruri.lat),
      ruriLng: Number(ruri.lng),
      ruriDistanceKm: Number.isFinite(ruri.dis) ? Number(ruri.dis.toFixed(3)) : null,
    });
  }
}

function setNearbyLoading(isLoading) {
  const btn = $("nearby-btn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle("is-loading", isLoading);
}

async function handleNearbyClick() {
  if (!navigator.geolocation) {
    alert("GPS 미지원 기기입니다.");
    return;
  }

  setNearbyLoading(true);
  try {
    const pos = await requestUserPosition();
    applyUserPosition(pos);
    nearbyMode = true;
    $("search").value = "";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    clearDistances();
    nearbyMode = false;
    render();
    alert("위치 정보를 가져올 수 없습니다.\nGPS를 켜주세요.");
    console.error(error);
  } finally {
    setNearbyLoading(false);
  }
}

function openModal(cafeId) {
  const cafe = data.find((item) => String(item.id) === String(cafeId));
  if (!cafe) return;

  openModalCafeId = String(cafe.id);
  $("m-tags").innerHTML = tagHtml(cafe);
  updateFavoriteButton(cafe.id);
  $("btn-favorite").onclick = async () => {
    try {
      await toggleFavorite(cafe.id);
    } catch (error) {
      alert(error.message);
    }
  };
  $("m-name").innerText = cafe.name;
  $("m-desc").innerHTML = modalDescHtml(cafe.desc, cafe.signature);

  $("btn-map").onclick = () => openNaverMapForCafe(cafe);
  $("btn-share").onclick = async () => {
    try {
      const mode = await shareCafe(cafe);
      if (mode === "copied") alert("클립보드에 복사되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  };

  if (cafe.beanShop) {
    $("btn-bean").classList.remove("is-hidden");
    $("btn-bean").onclick = () => window.open(cafe.beanShop, "_blank");
  } else {
    $("btn-bean").classList.add("is-hidden");
    $("btn-bean").onclick = null;
  }

  if (cafe.instagram) {
    $("btn-insta").classList.remove("is-hidden");
    $("btn-insta").onclick = () => window.open(cafe.instagram, "_blank");
  } else {
    $("btn-insta").classList.add("is-hidden");
    $("btn-insta").onclick = null;
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
  } catch (error) {
    console.error("공지 로드 실패");
  }
}

async function loadMe() {
  try {
    const res = await api("/me");
    if (!res.ok) throw new Error();
    const payload = await res.json();
    currentUser = payload.user || null;
  } catch (error) {
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
    menu.innerHTML = `
      <a class="auth-link" href="login.html">로그인</a>
      <a class="auth-link" href="submit.html">제보하기</a>
      <a class="auth-link" href="mypage.html">마이페이지</a>
    `;
    return;
  }

  menu.className = "auth-menu is-logged-in";
  menu.innerHTML = `
    <button type="button" onclick="logout()">로그아웃</button>
    <a class="auth-link" href="submit.html">제보하기</a>
    <a class="auth-link" href="mypage.html">마이페이지</a>
  `;
}

async function logout() {
  try {
    await api("/logout", { method: "POST" });
  } catch (error) {}
  clearAuthToken();
  currentUser = null;
  favoriteIds = new Set();
  updateFavoriteButton();
  renderAuthMenu();
}

window.toggleFilter = toggleFilter;
window.handleSearchInput = handleSearchInput;
window.logout = logout;

$("tabs").innerHTML = Object.entries(CAT_MAP).map(([key, label]) => (
  `<button class="tab" id="tab-${key}" onclick="toggleFilter('${key}')">${label}</button>`
)).join("");

$("nearby-btn").addEventListener("click", handleNearbyClick);
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
