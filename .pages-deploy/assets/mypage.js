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
  openNaverMapForCafe,
  roleLabel,
  safeHttpUrl,
  setStorageValue,
  shareCafe,
  statusLabel,
} from "./common.js?v=20260426-1";

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

function tagNodes(cafe) {
  return cafeTags(cafe).map((tag) => {
    const node = document.createElement("span");
    node.className = "tag-small";
    node.textContent = tag;
    return node;
  });
}

function modalDescNodes(desc, signature) {
  const nodes = [];
  const signatureParts = cleanParts(signature);

  if (desc) {
    const text = document.createElement("div");
    text.className = "modal-copy-text";
    text.textContent = desc;
    nodes.push(text);
  }

  if (signatureParts.length) {
    const wrap = document.createElement("div");
    wrap.className = "modal-signature";

    const label = document.createElement("div");
    label.className = "modal-signature-label";
    label.textContent = "대표메뉴";

    const value = document.createElement("div");
    value.className = "modal-signature-value";
    value.textContent = signatureParts.join(", ");

    wrap.append(label, value);
    nodes.push(wrap);
  }

  if (!nodes.length) {
    const empty = document.createElement("div");
    empty.className = "modal-copy-empty";
    empty.textContent = "소개가 아직 없습니다.";
    nodes.push(empty);
  }

  return nodes;
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
  $("m-tags").replaceChildren(...tagNodes(cafe));
  updateFavoriteButton(cafe.id);
  $("btn-favorite").onclick = async () => {
    try {
      await toggleFavorite(cafe.id);
    } catch (error) {
      alert(error.message);
    }
  };

  $("m-name").innerText = cafe.name;
  $("m-desc").replaceChildren(...modalDescNodes(cafe.desc, cafe.signature));

  $("btn-map").onclick = () => openNaverMapForCafe(cafe);
  $("btn-share").onclick = async () => {
    try {
      const mode = await shareCafe(cafe);
      if (mode === "copied") alert("클립보드에 복사되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  };

  const instagramUrl = safeHttpUrl(cafe.instagram);
  if (instagramUrl) {
    $("btn-insta").classList.remove("is-hidden");
    $("btn-insta").onclick = () =>
      window.open(instagramUrl, "_blank", "noopener");
  } else {
    $("btn-insta").classList.add("is-hidden");
    $("btn-insta").onclick = null;
  }

  const beanShopUrl = safeHttpUrl(cafe.beanShop);
  if (beanShopUrl) {
    $("btn-bean").classList.remove("is-hidden");
    $("btn-bean").onclick = () =>
      window.open(beanShopUrl, "_blank", "noopener");
  } else {
    $("btn-bean").classList.add("is-hidden");
    $("btn-bean").onclick = null;
  }

  $("modal-bg").style.display = "flex";
}

function setupModalOverlay() {
  const overlay = $("modal-bg");
  const modal = overlay?.querySelector(".modal");
  if (!overlay || !modal) return;

  overlay.addEventListener("click", () => {
    overlay.style.display = "none";
  });
  modal.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

function renderMenu(user) {
  const menu = $("menu");
  const mainLink = document.createElement("a");
  mainLink.className = "mini-btn";
  mainLink.href = "index.html";
  mainLink.textContent = "메인";

  const nodes = [mainLink];
  if (user.role === "admin" || user.role === "manager") {
    const roleLink = document.createElement("a");
    roleLink.className = "mini-btn primary";
    roleLink.href = "admin.html";
    roleLink.textContent =
      user.role === "admin" ? "관리자 페이지" : "매니저 페이지";
    nodes.push(roleLink);
  }

  const logoutButton = document.createElement("button");
  logoutButton.id = "logout-btn";
  logoutButton.className = "mini-btn";
  logoutButton.type = "button";
  logoutButton.textContent = "로그아웃";
  nodes.push(logoutButton);

  menu.replaceChildren(...nodes);

  $("logout-btn").addEventListener("click", async () => {
    await jsonApi("/logout", { method: "POST" }).catch(() => {});
    clearAuthToken();
    location.href = "index.html";
  });
}

function renderFavorites(items) {
  const list = $("fav-list");
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "찜한 카페가 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const cards = items.map((item) => {
    const card = document.createElement("article");
    card.className = "card fav-card";
    card.dataset.cafeId = item.cafe.id;

    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = item.cafe.name;

    card.append(name);
    return card;
  });

  list.replaceChildren(...cards);

  cards.forEach((card) => {
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

function renderMe(user) {
  const name = document.createTextNode(user.username || "");
  const badge = document.createElement("span");
  badge.className = "role-badge";
  badge.textContent = roleLabel(user.role);
  $("me").replaceChildren(name, document.createTextNode(" "), badge);
}

function renderEmpty(targetId, message) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  $(targetId).replaceChildren(empty);
}

function renderSubmissions(items) {
  const list = $("sub-list");
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "아직 제보 내역이 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const cards = items.map((item) => {
    const article = document.createElement("article");
    article.className = "card";

    const top = document.createElement("div");
    top.className = "card-top";

    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = item.name || "";

    const status = document.createElement("span");
    status.className = ["status", item.status].filter(Boolean).join(" ");
    status.textContent = statusLabel(item.status);

    top.append(name, status);

    const text = document.createElement("div");
    text.className = "card-text";
    text.append(document.createTextNode(item.address || ""));
    text.append(document.createElement("br"));
    text.append(
      document.createTextNode(`처리현황: ${statusLabel(item.status)}`),
    );
    if (item.created_at) {
      text.append(document.createElement("br"));
      text.append(
        document.createTextNode(`제보일: ${formatDate(item.created_at)}`),
      );
    }
    if (item.reject_reason) {
      text.append(document.createElement("br"));
      text.append(document.createTextNode(`반려 사유: ${item.reject_reason}`));
    }

    article.append(top, text);
    return article;
  });

  list.replaceChildren(...cards);
}

function renderErrorReports(items) {
  const list = $("error-list");
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "아직 오류 제보 내역이 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const cards = items.map((item) => {
    const article = document.createElement("article");
    article.className = "card";

    const top = document.createElement("div");
    top.className = "card-top";

    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = item.title || "";

    const status = document.createElement("span");
    status.className = ["status", item.status].filter(Boolean).join(" ");
    status.textContent = errorStatusLabel(item.status);

    top.append(name, status);

    const text = document.createElement("div");
    text.className = "card-text";
    if (item.page) {
      text.append(document.createTextNode(`관련 항목: ${item.page}`));
      text.append(document.createElement("br"));
    }
    text.append(document.createTextNode(item.content || ""));
    if (item.created_at) {
      text.append(document.createElement("br"));
      text.append(
        document.createTextNode(`제보일: ${formatDate(item.created_at)}`),
      );
    }

    const answer = document.createElement("div");
    answer.className = "answer-box";

    const answerLabel = document.createElement("div");
    answerLabel.className = "answer-label";
    answerLabel.textContent = "운영진 답변";

    const answerText = document.createElement("div");
    answerText.className = "answer-text";
    answerText.textContent =
      item.reply_message || "아직 답변이 등록되지 않았습니다.";

    answer.append(answerLabel, answerText);

    if (item.replied_by_username || item.replied_at) {
      const meta = document.createElement("div");
      meta.className = "answer-meta";
      const parts = [];
      if (item.replied_by_username) {
        parts.push(`답변자: ${item.replied_by_username}`);
      }
      if (item.replied_at) {
        parts.push(`답변일: ${formatDate(item.replied_at)}`);
      }
      meta.textContent = parts.join(" / ");
      answer.append(meta);
    }

    article.append(top, text, answer);
    return article;
  });

  list.replaceChildren(...cards);
}

async function loadPage() {
  const meData = await jsonApi("/me");
  if (!meData.user) {
    location.href = "login.html";
    return;
  }

  currentUser = meData.user;
  renderMe(currentUser);
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
  renderEmpty("fav-list", "찜 목록을 불러오지 못했습니다.");
  renderEmpty("sub-list", "제보 내역을 불러오지 못했습니다.");
  renderEmpty("error-list", "오류 제보 내역을 불러오지 못했습니다.");
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

setupModalOverlay();
