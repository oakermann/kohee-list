import {
  $,
  CAT_MAP,
  api,
  buildNaverMapUrls,
  favoriteIds,
  getCity,
  openNaverMapForCafe,
  safeHttpUrl,
  shareCafe,
  toggleFavorite,
} from "./common.js";

let data = [];
let selectedCategory = null;
let nearbyMode = false;
let openModalCafeId = "";

// 한 번만 묻는다: 정밀 GPS 는 실내·PC 에서 오래 걸리고, 1분 안 위치는 다시 쓴다.
const GEO_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 60000,
  timeout: 8000,
};
const GEO_APPROX_THRESHOLD_M = 1200;
const GEO_UNRELIABLE_ACCURACY_M = 5000;
// Sentinel distance for cafes without usable coordinates (kept out of results).
const GEO_DISTANCE_LIMIT_KM = 9999;
// Actual "near me" radius. Cafes farther than this are not shown in nearby mode.
// Tune this single value to widen/narrow the nearby search.
const GEO_NEARBY_RADIUS_KM = 20;

let lastPositionAccuracyM = null;

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
  return cafe.category.filter((tag) => CAT_MAP[tag]);
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
  return values.join(", ");
}

function updateFavoriteButton(cafeId = openModalCafeId) {
  const btn = $("btn-favorite");
  if (!btn) return;
  const favored = favoriteIds().has(cafeId);
  btn.style.display = cafeId ? "inline-flex" : "none";
  btn.textContent = favored ? "★" : "☆";
  btn.classList.toggle("is-on", favored);
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
  card.dataset.cafeId = cafe.id;

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
  title.textContent = cafe.name;

  const desc = document.createElement("p");
  desc.className = "cafe-desc";
  desc.textContent = cafe.desc;
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

  const copy = desc;
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
    const response = await api("/data");
    if (!response.ok) throw new Error();
    const rows = await response.json();
    data = rows;
    render();
    // 마이페이지 찜 목록이 index.html?cafe=<id> 로 연다.
    const linked = new URLSearchParams(location.search).get("cafe");
    if (linked) openModal(linked);
  } catch {
    renderCenterMessage([
      "데이터를 불러오지 못했습니다.",
      "잠시 후 다시 시도해 주세요.",
    ]);
  }
}

// 검색은 걸러내기가 아니라 순위 매기기다.
//
// "서울"은 "서울역"의 앞부분이다. 단순 포함 검사로는 둘을 구분할 수 없고, 서울 카페의
// 주소는 전부 "서울"로 시작하므로 "서울"을 치면 전체가 나오면서 서울역 카페가 그 사이에
// 흩어진다. 주소에는 역 이름이 없으므로(패스로스터리는 "서울 중구 ...") 문자열만으로는
// 어느 카페가 그 역 근처인지 알 방법이 없다. 그걸 아는 유일한 칸이 region 이다.
//
// 그래서 어디가 맞았는지에 따라 점수를 주고 높은 순으로 보여준다. "서울역"을 치면 region
// 이 정확히 일치하는 카페가 맨 위에 모이고, "서울"을 치면 서울역 카페들이 나머지 서울
// 카페보다 앞에 온다.
function matchScore(cafe, query) {
  const lower = (value) => value.toLowerCase();
  const region = lower(cafe.region);
  if (region && region === query) return 5; // 서울역 == 서울역
  if (lower(cafe.name).includes(query)) return 4;
  if (region.includes(query)) return 3; // 서울 -> 서울역 지역의 카페
  if (lower(cafe.address).includes(query)) return 2;
  if (lower(cafe.desc).includes(query)) return 1;
  return 0;
}

function render() {
  const query = $("search").value.toLowerCase().trim();

  if (nearbyMode) {
    // Composition rule: when nearbyMode is on AND selectedCategory is set,
    // first filter cafes by that category then apply the distance sort and radius cap.
    let located = data.filter(
      (cafe) => Number.isFinite(cafe.dis) && cafe.dis < GEO_DISTANCE_LIMIT_KM,
    );

    if (selectedCategory) {
      located = located.filter((cafe) =>
        cafeCategories(cafe).includes(selectedCategory),
      );
    }

    // No cafe has usable coordinates -> the cause is missing cafe data, not GPS.
    if (!located.length) {
      if (selectedCategory) {
        renderCenterMessage([
          "해당 카테고리의 주변 카페 위치 정보가 부족합니다.",
          "카페명 또는 주소로 검색해 주세요.",
        ]);
      } else {
        renderCenterMessage([
          "주변 카페의 위치 정보가 아직 부족합니다.",
          "카페명 또는 주소로 검색해 주세요.",
        ]);
      }
      return;
    }

    const nearbyCafes = located
      .filter((cafe) => cafe.dis <= GEO_NEARBY_RADIUS_KM)
      .sort((a, b) => a.dis - b.dis)
      .slice(0, 20);

    if (!nearbyCafes.length) {
      if (selectedCategory) {
        renderCenterMessage([
          `${GEO_NEARBY_RADIUS_KM}km 이내에 해당 카테고리로 등록된 카페가 없습니다.`,
          "카페명 또는 주소로 검색해 보세요.",
        ]);
      } else {
        renderCenterMessage([
          `${GEO_NEARBY_RADIUS_KM}km 이내에 등록된 카페가 없습니다.`,
          "카페명 또는 주소로 검색해 보세요.",
        ]);
      }
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

function setDistanceNote(text) {
  const note = $("distance-note");
  if (!note) return;
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
  // 컴퓨터는 GPS 가 없어 OS 위치 서비스(와이파이)에 기댄다 — 꺼져 있으면 여기로 온다.
  if (error?.code === 2)
    return "컴퓨터 위치 서비스가 꺼져 있습니다. (맥: 시스템 설정 > 개인정보 보호 및 보안 > 위치 서비스 / 윈도우: 설정 > 개인 정보 > 위치)";
  if (error?.code === 3) return "위치를 찾는 데 너무 오래 걸립니다.";
  return error?.message || "위치를 가져오지 못했습니다.";
}

function applyUserPosition(pos) {
  const userLat = Number(pos?.coords?.latitude);
  const userLng = Number(pos?.coords?.longitude);

  if (!isValidUserCoord(userLat, userLng)) {
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
    cafe.dis = isValidCafeCoord(cafe)
      ? getDist(userLat, userLng, Number(cafe.lat), Number(cafe.lng))
      : GEO_DISTANCE_LIMIT_KM;
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

// 위치가 안 되면 이유를 말하고 검색으로 보낸다 — 동네 직접 입력은 컴퓨터에서 위치가 막혀 있던
// 때(Permissions-Policy geolocation=())의 우회로였고, 원인을 지워 함께 지웠다.
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

  openModalCafeId = String(cafe.id);
  appendTags($("m-tags"), cafe);
  if (cafe.oakerman_pick) $("m-tags").prepend(makePickBadge());
  updateFavoriteButton(cafe.id);
  setButtonAction("btn-favorite", () => {
    try {
      toggleFavorite(cafe.id);
      updateFavoriteButton(cafe.id);
    } catch (error) {
      alert(error.message);
    }
  });

  $("m-name").textContent = cafe.name;
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
$("guide-btn").addEventListener("click", (event) => {
  event.preventDefault();
  $("guide-bg").style.display = "flex";
});
$("guide-close").addEventListener("click", () => {
  $("guide-bg").style.display = "none";
});
$("guide-bg").addEventListener("click", (event) => {
  if (event.target === $("guide-bg")) $("guide-bg").style.display = "none";
});
$("list").addEventListener("click", (event) => {
  const card = event.target.closest(".cafe-card[data-cafe-id]");
  if (!card) return;
  openModal(card.dataset.cafeId);
});

loadData();
loadNotice();
