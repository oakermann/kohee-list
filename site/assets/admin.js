// Ops console: home = ops (choose a column). One or two actions per column; tapping a card edits it.
//   new = candidates (admin entries, CSV, user reports)  [publish] [discard] · [publish together] for those with coordinates
//   public                                               [unpublish]
//   removed                                              [restore] [delete for good]
import {
  $,
  ERROR_MESSAGES,
  fetchNotice,
  formatDate,
  jsonApi,
  postJson,
} from "./common.js";

const state = { view: "", cafes: [], errors: [], form: null };

const VIEWS = {
  inbox: { title: "새로 들어옴", pane: "pane-list" },
  public: { title: "공개 중", pane: "pane-list" },
  down: { title: "내린 것", pane: "pane-list" },
  errors: { title: "오류 제보", pane: "pane-errors" },
  notice: { title: "공지", pane: "pane-notice" },
  csv: { title: "CSV 가져오기", pane: "pane-csv" },
};

const FORM_FIELDS = {
  name: "cafe-name",
  address: "cafe-address",
  desc: "cafe-desc",
  lat: "cafe-lat",
  lng: "cafe-lng",
  instagram: "cafe-instagram",
  naver_url: "cafe-naver",
  beanShop: "cafe-bean",
  region: "cafe-region",
  region_distance_m: "cafe-region-distance",
  memo: "cafe-memo",
};

// ---- small tools ----

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function guarded(fn) {
  return () =>
    Promise.resolve()
      .then(fn)
      .catch((error) => {
        if (error.code === "AUTH_REQUIRED") showLogin();
        else alert(error.message);
      });
}

function buttonRow(actions) {
  const row = el("div", "btns");
  for (const [label, onClick, className] of actions) {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", guarded(onClick));
    row.append(node);
  }
  return row;
}

function card(title, lines, actions = []) {
  const item = el("div", "item");
  item.append(el("h3", "", title || ""));
  for (const line of lines.filter(Boolean))
    item.append(el("div", "mini", line));
  if (actions.length) item.append(buttonRow(actions));
  return item;
}

function hasCoords(cafe) {
  return Boolean(Number(cafe.lat) && Number(cafe.lng));
}

// Names are spelled differently and miss the same place — compare by address (spaces removed, as the server does).
const addressKey = (cafe) =>
  String(cafe.address || "")
    .replace(/\s+/g, "")
    .toLowerCase();

function sameAddressCafe(cafe) {
  return state.cafes.find(
    (other) =>
      other.id !== cafe.id &&
      !other.deleted_at &&
      addressKey(other) === addressKey(cafe),
  );
}

// ---- classification ----

function viewCafes(view) {
  return state.cafes.filter((cafe) => {
    if (view === "down") return cafe.deleted_at;
    if (cafe.deleted_at) return false;
    return view === "inbox"
      ? cafe.status === "candidate"
      : cafe.status === "approved";
  });
}

function renderCounts() {
  const counts = {
    inbox: viewCafes("inbox").length,
    public: viewCafes("public").length,
    down: viewCafes("down").length,
    errors: state.errors.length,
  };
  document.querySelectorAll("[data-count]").forEach((node) => {
    node.textContent = String(counts[node.dataset.count]);
  });
}

// ---- cards and actions ----

function cafeActions(view, cafe) {
  if (view === "inbox")
    return [
      ["공개", () => publishCafe(cafe), "primary"],
      ["버리기", () => discardCafe(cafe)],
    ];
  if (view === "public")
    return [["내리기", () => act("/delete", cafe, "내릴까요?")]];
  return [
    ["되살리기", () => act("/restore", cafe, "되살릴까요?")],
    ["완전 삭제", () => purgeCafe(cafe), "warn"],
  ];
}

function cafeCard(view, cafe) {
  const dup = sameAddressCafe(cafe);
  const item = card(
    cafe.name,
    [
      view === "inbox"
        ? cafe.submitted
          ? `제보 · ${formatDate(cafe.created_at)}`
          : "후보"
        : cafe.oakerman_pick && "오커맨픽",
      cafe.address,
      cafe.reason && `추천 이유: ${cafe.reason}`,
      !hasCoords(cafe) && "좌표 없음 — 눌러서 채워야 공개됨",
      dup &&
        `같은 주소: ${dup.name} (${dup.status === "approved" ? "공개 중" : "후보"})`,
      view === "down" &&
        `내림 ${formatDate(cafe.deleted_at)}${cafe.reject_reason ? ` · ${cafe.reject_reason}` : ""}`,
    ],
    cafeActions(view, cafe),
  );
  if (view !== "down") {
    // Holds its own buttons, so it cannot be a <button>: focusable, Enter/Space open the form like a tap.
    item.tabIndex = 0;
    item.addEventListener("click", (event) => {
      if (!event.target.closest("button")) openForm("edit", cafe);
    });
    item.addEventListener("keydown", (event) => {
      if (event.target !== item || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      openForm("edit", cafe);
    });
  }
  return item;
}

function renderList() {
  renderCounts();
  if (VIEWS[state.view]?.pane !== "pane-list") return;
  const ready = publishable().length;
  $("bulk-publish-btn").textContent = `한꺼번에 공개 (${ready})`;
  $("bulk-publish-btn").disabled = !ready;
  const query = $("search").value.trim().toLowerCase();
  const cafes = viewCafes(state.view).filter((cafe) =>
    `${cafe.name} ${cafe.address}`.toLowerCase().includes(query),
  );
  $("list").replaceChildren(
    ...(cafes.length
      ? cafes.map((cafe) => cafeCard(state.view, cafe))
      : [el("div", "item empty-state", "없습니다.")]),
  );
}

async function reload() {
  const [cafes, errors] = await Promise.all([
    jsonApi("/cafes"),
    jsonApi("/error-reports"),
  ]);
  state.cafes = cafes;
  state.errors = errors.items;
  renderList();
  renderErrors();
}

// ---- handling ----

async function act(path, cafe, question, extra = {}) {
  if (question && !confirm(`'${cafe.name}' ${question}`)) return;
  await postJson(path, { id: cafe.id, ...extra });
  await reload();
}

// Without coordinates a published cafe does not show in 'near me' (the server blocks it too) — fill in the form, then publish.
async function publishCafe(cafe) {
  if (!hasCoords(cafe)) return openForm("publish", cafe);
  await act("/publish", cafe, "공개할까요?");
}

// The reason shows in the reporter's 'saved / my reports'. If a cafe with the same address exists, its name is the default reason.
async function discardCafe(cafe) {
  if (!cafe.submitted) return act("/delete", cafe, "버릴까요?");
  const dup = sameAddressCafe(cafe);
  const reason = prompt(
    `'${cafe.name}' 버리는 이유 (제보자에게 보임, 비워도 됨)`,
    dup ? `이미 등록된 카페입니다 (${dup.name})` : "",
  );
  if (reason === null) return;
  await act("/delete", cafe, "", { reason });
}

async function purgeCafe(cafe) {
  if (!confirm(`'${cafe.name}' 을(를) 완전히 지웁니다. 되돌릴 수 없습니다.`))
    return;
  await act("/purge", cafe, "");
}

// ---- bulk publish: candidates that already pass the publish check, chosen and confirmed in the page ----

function publishable() {
  return viewCafes("inbox").filter(hasCoords);
}

function bulkRow(cafe) {
  const label = el("label", "bulk-row");
  const box = el("input");
  box.type = "checkbox";
  box.value = cafe.id;
  box.checked = true;
  label.append(
    box,
    `${cafe.submitted ? "제보 · " : ""}${cafe.name} · ${cafe.address}`,
  );
  return label;
}

function openBulk() {
  const cafes = publishable();
  $("bulk-note").textContent =
    "좌표가 있는 후보만 나옵니다. 고른 카페가 바로 사이트에 공개됩니다.";
  $("bulk-list").replaceChildren(...cafes.map(bulkRow));
  show("bulk-confirm", true);
  $("bulk-dialog").showModal();
}

async function bulkPublish() {
  const ids = [...$("bulk-list").querySelectorAll("input:checked")].map(
    (box) => box.value,
  );
  if (!ids.length) throw new Error("공개할 카페를 고르세요.");
  $("bulk-note").textContent = `${ids.length}곳 공개 중...`;
  const { results } = await postJson("/publish-many", { ids });
  const done = results.filter((r) => r.ok).length;
  $("bulk-note").textContent = `공개 ${done} · 실패 ${results.length - done}`;
  $("bulk-list").replaceChildren(
    ...results.map((r) =>
      el(
        "div",
        "bulk-row",
        r.ok
          ? `공개됨 · ${r.name}`
          : `실패 · ${state.cafes.find((c) => c.id === r.id)?.name || r.id} — ${ERROR_MESSAGES[r.code] || r.error}`,
      ),
    ),
  );
  show("bulk-confirm", false);
  await reload();
}

// ---- cafe form: new or coordinate-less candidates save = publish, edits just save ----

function fillForm(cafe) {
  for (const [key, id] of Object.entries(FORM_FIELDS))
    $(id).value = cafe[key] || "";
  $("cafe-signature").value = (cafe.signature || []).join(", ");
  document.querySelectorAll('input[name="cat"]').forEach((box) => {
    box.checked = (cafe.category || []).includes(box.value);
  });
  $("oakerman-pick").checked = !!cafe.oakerman_pick;
  $("cafe-reason").textContent = cafe.reason
    ? `제보자 추천 이유: ${cafe.reason}`
    : "";
  $("geo-msg").textContent = "";
}

function openForm(mode, cafe = {}) {
  state.form = { mode, id: cafe.id || "" };
  fillForm(cafe);
  $("form-title").textContent = mode === "add" ? "신규 등록" : cafe.name;
  $("form-note").textContent =
    mode === "edit"
      ? `지금: ${cafe.status === "approved" ? "공개 중" : "후보"}`
      : "저장하면 바로 사이트에 공개됩니다. 좌표가 맞는지 확인하세요.";
  $("form-save").textContent = mode === "edit" ? "저장" : "공개";
  $("cafe-dialog").showModal();
  if (!hasCoords(cafe) && cafe.address) guarded(geocode)();
}

function collectForm() {
  const value = (id) => $(id).value.trim();
  const form = {};
  for (const [key, id] of Object.entries(FORM_FIELDS)) form[key] = value(id);
  return {
    ...form,
    signature: value("cafe-signature")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    category: [...document.querySelectorAll('input[name="cat"]:checked')].map(
      (box) => box.value,
    ),
    oakerman_pick: $("oakerman-pick").checked,
  };
}

async function saveForm() {
  if (!$("cafe-form").reportValidity()) return;
  const payload = collectForm();
  const { mode } = state.form;
  let { id } = state.form;
  if (mode === "add") id = (await postJson("/add", payload)).id;
  else await postJson("/edit", { ...payload, id });
  if (mode !== "edit") await postJson("/publish", { id });
  $("cafe-dialog").close();
  await reload();
}

async function geocode() {
  const address = $("cafe-address").value.trim();
  if (address.length < 2) return;
  $("geo-msg").textContent = "좌표 찾는 중...";
  try {
    const hit = await jsonApi(`/geocode?q=${encodeURIComponent(address)}`);
    $("cafe-lat").value = hit.lat.toFixed(6);
    $("cafe-lng").value = hit.lng.toFixed(6);
    $("geo-msg").textContent = `찾은 곳: ${hit.label} — 구·동이 맞는지 확인`;
  } catch (error) {
    if (error.code === "AUTH_REQUIRED") throw error;
    $("geo-msg").textContent =
      "주소로 좌표를 못 찾았습니다. 주소를 줄이거나 지도에서 직접 넣어 주세요.";
  }
}

// ---- error reports, notices, CSV ----

function errorCard(report) {
  const item = card(report.title, [
    `${report.page || "-"} · ${formatDate(report.created_at, true)}`,
    report.content,
  ]);
  const input = el("textarea");
  input.placeholder = "답변 (제보한 사람의 '찜·내 제보'에 보임)";
  input.ariaLabel = "답변";
  input.value = report.reply || "";
  item.append(
    input,
    buttonRow([
      [
        report.reply ? "답변 고치기" : "답변 저장",
        () => replyError(report, input.value),
        "primary",
      ],
      ["처리 완료", () => resolveError(report)],
    ]),
  );
  return item;
}

function renderErrors() {
  renderCounts();
  $("error-list").replaceChildren(
    ...(state.errors.length
      ? state.errors.map(errorCard)
      : [el("div", "item empty-state", "없습니다.")]),
  );
}

async function replyError(report, message) {
  if (!message.trim()) throw new Error("답변을 적어 주세요.");
  await postJson("/reply-error-report", { id: report.id, message });
  await reload();
}

async function resolveError(report) {
  if (!confirm(`'${report.title}' 처리 완료로 바꿀까요?`)) return;
  await postJson("/resolve-error-report", { id: report.id });
  await reload();
}

async function loadNotice() {
  $("notice-input").value = await fetchNotice();
}

async function saveNotice() {
  await jsonApi("/notice", {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: $("notice-input").value.trim(),
  });
  alert("공지 저장 완료");
}

async function importCsv(dryRun) {
  const file = $("csv-file").files[0];
  if (!file) throw new Error("CSV 파일을 먼저 고르세요.");
  $("csv-msg").textContent = dryRun ? "검증 중..." : "올리는 중...";
  const r = await jsonApi(`/import-csv${dryRun ? "?dryRun=1" : ""}`, {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: await file.text(),
  });
  $("csv-msg").textContent = [
    `${dryRun ? "넣을 것" : "넣음"} ${r.added}곳 (후보)`,
    r.skipped.length &&
      `이미 있어 건너뜀 ${r.skipped.length}: ${r.skipped.map((s) => `${s.row}행 ${s.name}`).join(", ")}`,
    r.failed &&
      `틀린 행 ${r.failed}: ${r.failedRows.map((f) => `${f.row}행 ${f.error}`).join(", ")}`,
  ]
    .filter(Boolean)
    .join(" · ");
  if (dryRun) return;
  $("csv-file").value = "";
  $("csv-file-name").textContent = "CSV 파일 고르기";
  await reload();
}

// ---- view switch: ops (home) ↔ column ----

function show(id, visible) {
  $(id).classList.toggle("hidden", !visible);
}

function showLogin() {
  for (const id of ["hub", "view", "logout-btn"]) show(id, false);
  show("login-pane", true);
  $("password").focus();
}

function showHub() {
  state.view = "";
  show("login-pane", false);
  show("view", false);
  show("hub", true);
  show("logout-btn", true);
  renderCounts();
}

function openView(view) {
  state.view = view;
  show("hub", false);
  show("view", true);
  $("view-title").textContent = VIEWS[view].title;
  for (const pane of document.querySelectorAll(".pane")) {
    pane.classList.toggle("hidden", pane.id !== VIEWS[view].pane);
  }
  show("new-cafe-btn", view === "inbox");
  show("bulk-publish-btn", view === "inbox");
  $("search").value = "";
  if (view === "notice") guarded(loadNotice)();
  renderList();
}

async function login(event) {
  event.preventDefault();
  try {
    await postJson("/admin/login", { password: $("password").value });
    $("password").value = "";
    $("login-msg").textContent = "";
    showHub();
    await reload();
  } catch (error) {
    $("login-msg").textContent = error.message;
  }
}

function bind(id, fn) {
  $(id).addEventListener("click", guarded(fn));
}

function bindEvents() {
  $("login-pane").addEventListener("submit", login);
  document.querySelectorAll("[data-go]").forEach((tile) => {
    tile.addEventListener("click", () => openView(tile.dataset.go));
  });
  bind("back-btn", showHub);
  $("search").addEventListener("input", renderList);
  bind("new-cafe-btn", () => openForm("add"));
  bind("form-save", saveForm);
  bind("bulk-publish-btn", openBulk);
  bind("bulk-confirm", bulkPublish);
  bind("geocode-btn", geocode);
  bind("notice-save", saveNotice);
  bind("csv-dry-run", () => importCsv(true));
  bind("csv-upload", () => importCsv(false));
  $("csv-file").addEventListener("change", () => {
    $("csv-file-name").textContent =
      $("csv-file").files[0]?.name || "CSV 파일 고르기";
  });
  bind("logout-btn", async () => {
    await postJson("/admin/logout", {});
    showLogin();
  });
}

async function init() {
  bindEvents();
  const { admin } = await jsonApi("/admin/me");
  if (!admin) return showLogin();
  showHub();
  await reload();
}

guarded(init)();
