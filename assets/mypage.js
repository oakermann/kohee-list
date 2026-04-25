import {
  $,
  CAT_MAP,
  cleanParts,
  clearAuthToken,
  errorStatusLabel,
  esc,
  formatDate,
  getStorageValue,
  jsonApi,
  modalDescHtml,
  openNaverMapForCafe,
  roleLabel,
  setStorageValue,
  shareCafe,
  statusLabel,
} from "./common.js";

let currentUser = null;
let favoriteItems = [];
let openModalCafeId = "";

const FAVORITE_SYNC_KEY = "kohee-favorites-sync";
let lastFavoriteSync = "";

function cafeCategories(cafe) {
  return cleanParts(cafe.category).filter((tag) => CAT_MAP[tag]);
}

function cafeTags(cafe) {
  const tags = [];
  if (cafe.oakerman_pick) tags.push("오커맨픽");
  if (cafe.manager_pick) tags.push("매니저픽");
  cafeCategories(cafe).forEach((tag) => tags.push(CAT_MAP[tag]));
  return tags;
}

function tagHtml(cafe) {
  return cafeTags(cafe)
    .map((tag) => `<span class="tag-small">${esc(tag)}</span>`)
    .join("");
}

function favoriteCafe(cafeId) {
  return (
    favoriteItems.find((item) => String(item.cafe?.id) === String(cafeId))
      ?.cafe || null
  );
}

function getFavoriteSyncStamp() {
  return getStorageValue(FAVORITE_SYNC_KEY);
}

function touchFavoriteSync() {
  const stamp = String(Date.now());
  lastFavoriteSync = stamp;
  setStorageValue(FAVORITE_SYNC_KEY, stamp);
}

function updateFavoriteButton(cafeId = openModalCafeId) {
  const btn = $("btn-favorite");
  if (!btn) return;
  const favored = !!favoriteCafe(cafeId);
  btn.style.display = cafeId ? "inline-flex" : "none";
  btn.textContent = favored ? "★" : "☆";
  btn.classList.toggle("is-on", favored);
}

async function toggleFavorite(cafeId) {
  const data = await jsonApi("/favorite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cafe_id: cafeId, action: "remove" }),
  });

  if (data.favored === false) {
    favoriteItems = favoriteItems.filter(
      (item) => String(item.cafe?.id) !== String(cafeId),
    );
    renderFavorites(favoriteItems);
    updateFavoriteButton(cafeId);
    touchFavoriteSync();
    $("modal-bg").style.display = "none";
  }
}

function openModal(cafeId) {
  const cafe = favoriteCafe(cafeId);
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

  if (cafe.instagram) {
    $("btn-insta").classList.remove("is-hidden");
    $("btn-insta").onclick = () =>
      window.open(cafe.instagram, "_blank", "noopener");
  } else {
    $("btn-insta").classList.add("is-hidden");
    $("btn-insta").onclick = null;
  }

  if (cafe.beanShop) {
    $("btn-bean").classList.remove("is-hidden");
    $("btn-bean").onclick = () =>
      window.open(cafe.beanShop, "_blank", "noopener");
  } else {
    $("btn-bean").classList.add("is-hidden");
    $("btn-bean").onclick = null;
  }

  $("modal-bg").style.display = "flex";
}

function renderMenu(user) {
  const roleButton =
    user.role === "admin"
      ? `<a class="mini-btn primary" href="admin.html">관리자 페이지</a>`
      : user.role === "manager"
        ? `<a class="mini-btn primary" href="admin.html">매니저 페이지</a>`
        : "";

  $("menu").innerHTML = `
    <a class="mini-btn" href="index.html">메인</a>
    ${roleButton}
    <button id="logout-btn" class="mini-btn" type="button">로그아웃</button>
  `;

  $("logout-btn").addEventListener("click", async () => {
    await jsonApi("/logout", { method: "POST" }).catch(() => {});
    clearAuthToken();
    location.href = "index.html";
  });
}

function renderFavorites(items) {
  $("fav-list").innerHTML = items.length
    ? items
        .map(
          (item) => `
      <article class="card fav-card" data-cafe-id="${esc(item.cafe.id)}">
        <div class="card-name">${esc(item.cafe.name)}</div>
      </article>
    `,
        )
        .join("")
    : `<div class="empty">찜한 카페가 없습니다.</div>`;

  [...document.querySelectorAll(".fav-card")].forEach((card) => {
    card.addEventListener("click", () => {
      openModal(card.dataset.cafeId);
    });
  });
}

function applyFavorites(items) {
  favoriteItems = items || [];
  renderFavorites(favoriteItems);
  updateFavoriteButton();
  lastFavoriteSync = getFavoriteSyncStamp();
}

async function loadFavorites() {
  const favoriteData = await jsonApi("/favorites");
  applyFavorites(favoriteData.items || []);
}

async function syncFavoritesIfNeeded() {
  const stamp = getFavoriteSyncStamp();
  if (stamp === lastFavoriteSync) return;
  lastFavoriteSync = stamp;
  await loadFavorites();
}

function renderSubmissions(items) {
  $("sub-list").innerHTML = items.length
    ? items
        .map(
          (item) => `
      <article class="card">
        <div class="card-top">
          <div class="card-name">${esc(item.name)}</div>
          <span class="status ${esc(item.status)}">${statusLabel(item.status)}</span>
        </div>
        <div class="card-text">
          ${esc(item.address)}<br>
          처리현황: ${statusLabel(item.status)}
          ${item.created_at ? `<br>제보일: ${esc(formatDate(item.created_at))}` : ""}
          ${item.reject_reason ? `<br>반려 사유: ${esc(item.reject_reason)}` : ""}
        </div>
      </article>
    `,
        )
        .join("")
    : `<div class="empty">아직 제보 내역이 없습니다.</div>`;
}

function renderErrorReports(items) {
  $("error-list").innerHTML = items.length
    ? items
        .map(
          (item) => `
      <article class="card">
        <div class="card-top">
          <div class="card-name">${esc(item.title)}</div>
          <span class="status ${esc(item.status)}">${errorStatusLabel(item.status)}</span>
        </div>
        <div class="card-text">
          ${item.page ? `관련 항목: ${esc(item.page)}<br>` : ""}
          ${esc(item.content)}
          ${item.created_at ? `<br>제보일: ${esc(formatDate(item.created_at))}` : ""}
        </div>
        <div class="answer-box">
          <div class="answer-label">운영진 답변</div>
          <div class="answer-text">${item.reply_message ? esc(item.reply_message) : "아직 답변이 등록되지 않았습니다."}</div>
          ${
            item.replied_by_username || item.replied_at
              ? `<div class="answer-meta">${item.replied_by_username ? `답변자: ${esc(item.replied_by_username)}` : ""}${item.replied_by_username && item.replied_at ? " / " : ""}${item.replied_at ? `답변일: ${esc(formatDate(item.replied_at))}` : ""}</div>`
              : ""
          }
        </div>
      </article>
    `,
        )
        .join("")
    : `<div class="empty">아직 오류 제보 내역이 없습니다.</div>`;
}

async function loadPage() {
  const meData = await jsonApi("/me");
  if (!meData.user) {
    location.href = "login.html";
    return;
  }

  currentUser = meData.user;
  $("me").innerHTML =
    `${esc(currentUser.username)} <span class="role-badge">${roleLabel(currentUser.role)}</span>`;
  renderMenu(currentUser);

  const [submissions, errorReports] = await Promise.all([
    jsonApi("/my-submits"),
    jsonApi("/my-error-reports"),
    loadFavorites(),
  ]);

  renderSubmissions(submissions.items || []);
  renderErrorReports(errorReports.items || []);
}

loadPage().catch((error) => {
  $("me").textContent = error.message;
  $("fav-list").innerHTML =
    `<div class="empty">찜 목록을 불러오지 못했습니다.</div>`;
  $("sub-list").innerHTML =
    `<div class="empty">제보 내역을 불러오지 못했습니다.</div>`;
  $("error-list").innerHTML =
    `<div class="empty">오류 제보 내역을 불러오지 못했습니다.</div>`;
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
