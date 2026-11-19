import {
  $,
  CAT_MAP,
  api,
  favoriteIds,
  fetchNotice,
  openNaverMapForCafe,
  safeHttpUrl,
  shareCafe,
  toggleFavorite,
} from "./common.js";

let data = [];
let selectedCategory = null;
let nearbyMode = false;

// Ask only once: precise GPS is slow indoors and on PCs, and a location less than 1 minute old is reused.
const GEO_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 60000,
  timeout: 8000,
};
const GEO_APPROX_THRESHOLD_M = 1200;
const GEO_UNRELIABLE_ACCURACY_M = 5000;
// Actual "near me" radius. Cafes farther than this are not shown in nearby mode.
// Tune this single value to widen/narrow the nearby search.
const GEO_NEARBY_RADIUS_KM = 20;
const NEARBY_MAX = 20; // closest cafes shown in 'near me'
const RESULTS_MAX = 50; // best search/category matches shown

let lastPositionAccuracyM = null;

function cafeCategories(cafe) {
  return cafe.category.filter((tag) => CAT_MAP[tag]);
}

function tagSpan(className, text) {
  const item = document.createElement("span");
  item.className = className;
  item.textContent = text;
  return item;
}

// '오커맨픽' first, then the category tags.
function fillTags(container, cafe) {
  const tags = cafeCategories(cafe).map((key) =>
    tagSpan("tag-small", CAT_MAP[key]),
  );
  if (cafe.oakerman_pick)
    tags.unshift(tagSpan("tag-small tag-pick", "오커맨픽"));
  container.replaceChildren(...tags);
}

function renderCenterMessage(lines) {
  const message = document.createElement("div");
  message.className = "center-msg";
  [lines].flat().forEach((line, index) => {
    if (index) message.append(document.createElement("br"));
    message.append(line);
  });
  $("list").replaceChildren(message);
}

function updateFavoriteButton(cafeId) {
  const btn = $("btn-favorite");
  const favored = favoriteIds().has(cafeId);
  btn.textContent = favored ? "★" : "☆";
  btn.classList.toggle("is-on", favored);
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "";
  const label = `${distanceKm.toFixed(1)}km`;
  return lastPositionAccuracyM && lastPositionAccuracyM > GEO_APPROX_THRESHOLD_M
    ? `약 ${label}`
    : label;
}

function createCafeCard(cafe) {
  // A button so keyboards and screen readers reach it; only phrasing elements (span) inside.
  const card = document.createElement("button");
  card.type = "button";
  card.className = "cafe-card";
  card.dataset.cafeId = cafe.id;

  const meta = document.createElement("span");
  meta.className = "meta-row";

  const tagGroup = document.createElement("span");
  tagGroup.className = "tag-group";
  fillTags(tagGroup, cafe);
  meta.appendChild(tagGroup);

  const distance = formatDistance(cafe.dis);
  if (distance) {
    const metaRight = document.createElement("span");
    metaRight.className = "meta-right";
    const badge = document.createElement("span");
    badge.className = "distance-badge";
    badge.textContent = distance;
    metaRight.appendChild(badge);
    meta.appendChild(metaRight);
  }

  const title = document.createElement("span");
  title.className = "cafe-name";
  title.textContent = cafe.name;

  const desc = document.createElement("span");
  desc.className = "cafe-desc";
  desc.textContent = cafe.desc;
  const signature = cafe.signature.join(", ");
  if (signature) {
    desc.append(" ");
    const sig = document.createElement("span");
    sig.className = "sig-inline";
    sig.textContent = signature;
    desc.appendChild(sig);
  }

  const address = document.createElement("span");
  address.className = "address-full";
  address.textContent = cafe.address;

  card.append(meta, title, desc, address);
  return card;
}

function renderCafeCards(cafes) {
  $("list").replaceChildren(...cafes.map(createCafeCard));
}

function renderModalDescription(desc, signature) {
  const wrap = $("m-desc");
  wrap.replaceChildren();

  const signatureValue = signature.join(", ");

  if (desc) {
    const copyEl = document.createElement("div");
    copyEl.className = "modal-copy-text";
    copyEl.textContent = desc;
    wrap.appendChild(copyEl);
  }

  if (signatureValue) {
    const box = document.createElement("div");
    box.className = "modal-signature";

    const label = document.createElement("div");
    label.className = "modal-signature-label";
    label.textContent = "대표메뉴";

    const value = document.createElement("div");
    value.className = "modal-signature-value";
    value.textContent = signatureValue;

    box.append(label, value);
    wrap.appendChild(box);
  }

  if (!desc && !signatureValue) {
    const empty = document.createElement("div");
    empty.className = "modal-copy-empty";
    empty.textContent = "소개가 아직 없습니다.";
    wrap.appendChild(empty);
  }
}

async function loadData() {
  try {
    const response = await api("/data");
    if (!response.ok) throw new Error(`/data HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.error("cafe data load failed", error);
    renderCenterMessage([
      "데이터를 불러오지 못했습니다.",
      "잠시 후 다시 시도해 주세요.",
    ]);
    return;
  }
  render();
  // The mypage saved list opens index.html?cafe=<id>.
  const linked = new URLSearchParams(location.search).get("cafe");
  if (linked) openModal(linked);
}

// Search ranks, it does not filter.
//
// "서울" is the prefix of "서울역". A plain contains check cannot tell them apart, and every Seoul cafe's
// address starts with "서울", so typing "서울" shows everything with the 서울역 cafes scattered
// among them. Addresses have no station names (패스로스터리 is "서울 중구 ..."), so text alone
// cannot tell which cafe is near that station. The only column that knows is region.
//
// So score by where it matched and show highest first. Typing "서울역" gathers cafes whose region
// matches exactly at the top, and typing "서울" puts the 서울역 cafes before the other Seoul
// cafes.
function matchScore(cafe, query) {
  const lower = (value) => value.toLowerCase();
  const region = lower(cafe.region);
  if (region && region === query) return 5; // 서울역 == 서울역
  if (lower(cafe.name).includes(query)) return 4;
  if (region.includes(query)) return 3; // 서울 -> cafes in the 서울역 region
  if (lower(cafe.address).includes(query)) return 2;
  if (lower(cafe.desc).includes(query)) return 1;
  return 0;
}

function render() {
  const query = $("search").value.toLowerCase().trim();

  if (nearbyMode) {
    // Composition rule: when nearbyMode is on AND selectedCategory is set,
    // first filter cafes by that category then apply the distance sort and radius cap.
    let located = data.filter((cafe) => Number.isFinite(cafe.dis));

    if (selectedCategory) {
      located = located.filter((cafe) =>
        cafeCategories(cafe).includes(selectedCategory),
      );
    }

    // No cafe has usable coordinates -> the cause is missing cafe data, not GPS.
    if (!located.length) {
      renderCenterMessage([
        selectedCategory
          ? "해당 카테고리의 주변 카페 위치 정보가 부족합니다."
          : "주변 카페의 위치 정보가 아직 부족합니다.",
        "카페명 또는 주소로 검색해 주세요.",
      ]);
      return;
    }

    const nearbyCafes = located
      .filter((cafe) => cafe.dis <= GEO_NEARBY_RADIUS_KM)
      .sort((a, b) => a.dis - b.dis)
      .slice(0, NEARBY_MAX);

    if (!nearbyCafes.length) {
      renderCenterMessage([
        `${GEO_NEARBY_RADIUS_KM}km 이내에 ${selectedCategory ? "해당 카테고리로 " : ""}등록된 카페가 없습니다.`,
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
        matchScore(cafe, query) > 0 &&
        (!selectedCategory || cafeCategories(cafe).includes(selectedCategory)),
    )
    .sort((left, right) => matchScore(right, query) - matchScore(left, query))
    .slice(0, RESULTS_MAX);

  if (!filtered.length) {
    renderCenterMessage("조건에 맞는 결과가 없습니다.");
    return;
  }

  renderCafeCards(filtered);
}

function selectCategory(categoryKey) {
  selectedCategory = categoryKey;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.id === `tab-${categoryKey}`);
  });
}

function toggleFilter(categoryKey) {
  if (selectedCategory !== categoryKey) $("search").value = "";
  selectCategory(selectedCategory === categoryKey ? null : categoryKey);
  render();
}

function handleSearchInput() {
  if (nearbyMode) exitNearbyMode();
  if ($("search").value.trim()) selectCategory(null);
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

// 0,0 = no coordinates stored.
function isValidCoord(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function setDistanceNote(text) {
  const note = $("distance-note");
  note.textContent = text || "";
  note.style.display = text ? "block" : "none";
}

function clearDistances() {
  data.forEach((cafe) => {
    delete cafe.dis;
  });
  lastPositionAccuracyM = null;
  setDistanceNote("");
}

function requestUserPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}

function geoErrorMessage(error) {
  if (error?.code === 1) return "위치 권한이 꺼져 있습니다.";
  // Desktops have no GPS and rely on OS location services (Wi-Fi) — if they are off we land here.
  if (error?.code === 2)
    return "컴퓨터 위치 서비스가 꺼져 있습니다. (맥: 시스템 설정 > 개인정보 보호 및 보안 > 위치 서비스 / 윈도우: 설정 > 개인 정보 > 위치)";
  if (error?.code === 3) return "위치를 찾는 데 너무 오래 걸립니다.";
  return error?.message || "위치를 가져오지 못했습니다.";
}

function applyUserPosition(pos) {
  const userLat = Number(pos?.coords?.latitude);
  const userLng = Number(pos?.coords?.longitude);

  if (!isValidCoord(userLat, userLng)) {
    throw new Error("잘못된 위치 정보입니다.");
  }

  lastPositionAccuracyM = Number(pos?.coords?.accuracy || 0) || null;

  if (
    lastPositionAccuracyM &&
    lastPositionAccuracyM > GEO_UNRELIABLE_ACCURACY_M
  ) {
    const km = Math.round(lastPositionAccuracyM / 1000);
    throw new Error(`기기가 대략적인 위치(오차 ±${km}km)만 줬습니다.`);
  }

  setDistanceNote(
    lastPositionAccuracyM > GEO_APPROX_THRESHOLD_M
      ? "위치 정확도가 낮아 거리는 대략입니다."
      : "현재 위치 기준 거리",
  );

  data.forEach((cafe) => {
    const [lat, lng] = [Number(cafe.lat), Number(cafe.lng)];
    cafe.dis = isValidCoord(lat, lng)
      ? getDist(userLat, userLng, lat, lng)
      : Infinity; // no coordinates: kept out of 'near me'
  });
}

function activateNearbyMode() {
  nearbyMode = true;
  setNearbyActive(true);
  $("search").value = "";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setNearbyLoading(isLoading) {
  const btn = $("nearby-btn");
  btn.disabled = isLoading;
  btn.classList.toggle("is-loading", isLoading);
}

function setNearbyActive(active) {
  const btn = $("nearby-btn");
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

// If location fails, say why and send the user to search — typing a neighbourhood was the workaround from when location was blocked on
// desktops (Permissions-Policy geolocation=()); the cause was removed, so it was removed too.
async function handleNearbyClick() {
  if (nearbyMode) {
    exitNearbyMode();
    render();
    return;
  }

  if (!navigator.geolocation) {
    alert(
      "이 브라우저는 위치를 지원하지 않습니다.\n카페명이나 주소로 검색해 주세요.",
    );
    return;
  }

  setNearbyLoading(true);
  try {
    applyUserPosition(await requestUserPosition());
    activateNearbyMode();
  } catch (error) {
    alert(`${geoErrorMessage(error)}\n카페명이나 주소로 검색해 주세요.`);
  } finally {
    setNearbyLoading(false);
  }
}

function openModal(cafeId) {
  const cafe = data.find((item) => String(item.id) === String(cafeId));
  if (!cafe) return;

  fillTags($("m-tags"), cafe);
  updateFavoriteButton(cafe.id);
  // onclick (not addEventListener) so each opened cafe replaces the last one's handlers.
  $("btn-favorite").onclick = () => {
    try {
      toggleFavorite(cafe.id);
      updateFavoriteButton(cafe.id);
    } catch (error) {
      alert(error.message);
    }
  };

  $("m-name").textContent = cafe.name;
  renderModalDescription(cafe.desc, cafe.signature);

  $("btn-map").onclick = () => openNaverMapForCafe(cafe);
  $("btn-share").onclick = async () => {
    try {
      if ((await shareCafe(cafe)) === "copied")
        alert("클립보드에 복사되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  };

  for (const [id, link] of [
    ["btn-insta", cafe.instagram],
    ["btn-bean", cafe.beanShop],
  ]) {
    const url = safeHttpUrl(link);
    $(id).hidden = !url;
    $(id).onclick = url ? () => window.open(url, "_blank", "noopener") : null;
  }

  if (!$("cafe-sheet").open) $("cafe-sheet").showModal();
}

async function loadNotice() {
  try {
    const text = (await fetchNotice()).trim();
    if (text) {
      $("notice").innerText = text;
      $("notice").style.display = "block";
    }
  } catch (error) {
    console.error("notice load failed", error);
  }
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
$("guide-btn").addEventListener("click", () => $("guide-sheet").showModal());
// Escape closes a <dialog> natively; a tap on the backdrop (the dialog itself) or 닫기 closes it too.
for (const sheet of document.querySelectorAll("dialog.sheet")) {
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet || event.target.closest(".sheet-close"))
      sheet.close();
  });
}
$("list").addEventListener("click", (event) => {
  const card = event.target.closest(".cafe-card[data-cafe-id]");
  if (!card) return;
  openModal(card.dataset.cafeId);
});

loadData();
loadNotice();
