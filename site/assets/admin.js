// Ops console: one row of tabs, each a list of compact rows. Tapping a cafe row edits it.
//   새로 들어옴 = candidates (admin entries, CSV, user reports)  [공개] [버리기] · [한꺼번에 공개] for those with coordinates
//   확인 필요   = public cafes whose pin does not match Kakao (checked live, /cafe-check per cafe)  [카카오 좌표로]
//   공개 중 [내리기] · 내린 것 [되살리기] [완전 삭제] · 오류 제보 · 공지 · CSV
import {
  $,
  CAT_MAP,
  ERROR_MESSAGES,
  fetchNotice,
  formatDate,
  jsonApi,
  postJson,
} from "./common.js";

const CHECK_PARALLEL = 3; // Kakao lookups at once; the daily watch does them one by one

const state = {
  tab: "inbox",
  cafes: [],
  errors: [],
  form: null,
  check: { results: new Map(), running: false, done: 0, total: 0, at: null },
};

const TABS = [
  { id: "inbox", label: "새로 들어옴", pane: "pane-list" },
  { id: "check", label: "확인 필요", pane: "pane-list" },
  { id: "public", label: "공개 중", pane: "pane-list" },
  { id: "down", label: "내린 것", pane: "pane-list" },
  { id: "errors", label: "오류 제보", pane: "pane-errors" },
  { id: "notice", label: "공지", pane: "pane-notice" },
  { id: "csv", label: "CSV", pane: "pane-csv" },
];

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
  return (...args) =>
    Promise.resolve()
      .then(() => fn(...args))
      .catch((error) => {
        if (error.code === "AUTH_REQUIRED") showLogin();
        else alert(error.message);
      });
}

function show(id, visible) {
  $(id).classList.toggle("hidden", !visible);
}

function button(label, onClick, className = "btn") {
  const node = el("button", className, label);
  node.type = "button";
  node.addEventListener("click", guarded(onClick));
  return node;
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

// ---- which cafes each tab shows ----

function tabCafes(tab) {
  return state.cafes.filter((cafe) => {
    if (tab === "down") return cafe.deleted_at;
    if (cafe.deleted_at) return false;
    if (tab === "inbox") return cafe.status === "candidate";
    if (tab === "check") return cafe.status === "approved" && flagged(cafe);
    return cafe.status === "approved";
  });
}

function flagged(cafe) {
  const result = state.check.results.get(cafe.id);
  return Boolean(result && (result.failed || result.problems.length));
}

function tabCount(tab) {
  if (tab === "errors") return state.errors.length;
  if (tab === "check" && !state.check.at && !state.check.running) return null;
  if (TABS.find((t) => t.id === tab).pane !== "pane-list") return null;
  return tabCafes(tab).length;
}

function renderTabs() {
  $("tabs").replaceChildren(
    ...TABS.map(({ id, label }) => {
      const tab = button(label, () => openTab(id), "tab");
      tab.setAttribute("aria-current", String(id === state.tab));
      const count = tabCount(id);
      if (count !== null) tab.append(el("b", "", String(count)));
      return tab;
    }),
  );
}

// ---- cafe rows ----

function badges(tab, cafe) {
  const dup = sameAddressCafe(cafe);
  return [
    cafe.submitted && ["제보", "tag-point"],
    cafe.oakerman_pick && ["오커맨픽", ""],
    !hasCoords(cafe) && ["좌표 없음", "tag-warn"],
    dup && [`같은 주소: ${dup.name}`, "tag-warn"],
    ...(cafe.category || []).map((c) => [CAT_MAP[c] || c, "tag-soft"]),
  ].filter(Boolean);
}

function detailLines(tab, cafe) {
  const result = state.check.results.get(cafe.id);
  return [
    tab === "check" &&
      (result.failed
        ? `검사 실패: ${result.error}`
        : result.problems.join(" · ")),
    tab === "check" && result.pinOff && `카카오 위치: ${result.kakao.label}`,
    cafe.submitted && `제보 ${formatDate(cafe.created_at)}`,
    tab === "inbox" && cafe.reason && `추천 이유: ${cafe.reason}`,
    tab === "down" &&
      `내림 ${formatDate(cafe.deleted_at)}${cafe.reject_reason ? ` · ${cafe.reject_reason}` : ""}`,
  ].filter(Boolean);
}

function cafeActions(tab, cafe) {
  if (tab === "inbox")
    return [
      button("공개", () => publishCafe(cafe), "btn primary"),
      button("버리기", () => discardCafe(cafe)),
    ];
  if (tab === "check") return checkActions(cafe);
  if (tab === "public")
    return [button("내리기", () => act("/delete", cafe, "내릴까요?"))];
  return [
    button("되살리기", () => act("/restore", cafe, "되살릴까요?")),
    button("완전 삭제", () => purgeCafe(cafe), "btn warn"),
  ];
}

function cafeRow(tab, cafe) {
  const row = el("article", "row");
  const main = el("div", "row-main");
  const title = el("div", "row-title");
  title.append(el("strong", "", cafe.name));
  for (const [text, kind] of badges(tab, cafe))
    title.append(el("span", `tag ${kind}`.trim(), text));
  main.append(title, el("div", "row-sub", cafe.address));
  for (const line of detailLines(tab, cafe))
    main.append(el("div", "row-line", line));
  const actions = el("div", "row-actions");
  actions.append(...cafeActions(tab, cafe));
  row.append(main, actions);
  if (tab !== "down") {
    // Holds its own buttons, so it cannot be a <button>: focusable, Enter/Space open the form like a tap.
    row.tabIndex = 0;
    row.classList.add("tappable");
    row.addEventListener("click", (event) => {
      if (!event.target.closest("button, a")) openForm("edit", cafe);
    });
    row.addEventListener("keydown", (event) => {
      if (event.target !== row || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      openForm("edit", cafe);
    });
  }
  return row;
}

function listNote() {
  if (state.tab === "inbox")
    return "공개하면 바로 사이트에 나옵니다. 줄을 누르면 고칠 수 있습니다.";
  if (state.tab !== "check") return "";
  const { running, done, total, at } = state.check;
  if (running) return `카카오와 대조 중… ${done}/${total}`;
  if (!at) return "";
  return `공개 ${total}곳을 카카오와 대조 (${formatDate(at, true)}) · 핀이 카카오 위치와 떨어졌거나 주소·이름이 카카오에 없는 곳만`;
}

function renderList() {
  renderTabs();
  if (TABS.find((t) => t.id === state.tab).pane !== "pane-list") return;
  const query = $("search").value.trim().toLowerCase();
  const cafes = tabCafes(state.tab).filter((cafe) =>
    `${cafe.name} ${cafe.address}`.toLowerCase().includes(query),
  );
  const ready = publishable().length;
  $("bulk-publish-btn").textContent = `한꺼번에 공개 (${ready})`;
  $("bulk-publish-btn").disabled = !ready;
  $("recheck-btn").disabled = state.check.running;
  $("list-note").textContent = listNote();
  const empty = state.check.running ? "검사 중…" : "없습니다.";
  $("list").replaceChildren(
    ...(cafes.length
      ? cafes.map((cafe) => cafeRow(state.tab, cafe))
      : [el("div", "empty", empty)]),
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

// ---- cafe actions ----

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

// ---- 확인 필요: every public cafe against Kakao, a few at a time ----

async function checkOne(cafe) {
  try {
    const { problems, kakao, pinOff } = await jsonApi(
      `/cafe-check?id=${encodeURIComponent(cafe.id)}`,
    );
    state.check.results.set(cafe.id, { problems, kakao, pinOff });
  } catch (error) {
    if (error.code === "AUTH_REQUIRED") throw error;
    state.check.results.set(cafe.id, { failed: true, error: error.message });
  }
}

async function runCheck() {
  if (state.check.running) return;
  const cafes = tabCafes("public");
  Object.assign(state.check, {
    results: new Map(),
    running: true,
    done: 0,
    total: cafes.length,
  });
  renderList();
  const queue = [...cafes];
  const worker = async () => {
    for (let cafe = queue.shift(); cafe; cafe = queue.shift()) {
      await checkOne(cafe);
      state.check.done += 1;
      renderList();
    }
  };
  try {
    await Promise.all(Array.from({ length: CHECK_PARALLEL }, worker));
  } finally {
    state.check.running = false;
    state.check.at = new Date().toISOString();
    renderList();
  }
}

function checkActions(cafe) {
  const { kakao, pinOff } = state.check.results.get(cafe.id);
  const actions = [];
  if (kakao?.placeUrl) {
    const link = el("a", "btn", "카카오맵");
    link.href = kakao.placeUrl;
    link.target = "_blank";
    link.rel = "noopener";
    actions.push(link);
  }
  if (kakao && pinOff)
    actions.push(
      button("카카오 좌표로", () => moveToKakao(cafe, kakao), "btn primary"),
    );
  return actions;
}

// Same fields as the form sends, only the pin moved.
async function moveToKakao(cafe, kakao) {
  const where = kakao.name ? `${kakao.name} (${kakao.label})` : kakao.label;
  if (!confirm(`'${cafe.name}' 핀을 카카오 위치로 옮길까요?\n${where}`)) return;
  await postJson("/edit", {
    ...cafe,
    lat: kakao.lat.toFixed(6),
    lng: kakao.lng.toFixed(6),
  });
  await reload();
  await checkOne(state.cafes.find((c) => c.id === cafe.id));
  renderList();
}

// ---- bulk publish: candidates that already pass the publish check, chosen and confirmed in the page ----

function publishable() {
  return tabCafes("inbox").filter(hasCoords);
}

function bulkRow(cafe) {
  const label = el("label", "bulk-row");
  const box = el("input");
  box.type = "checkbox";
  box.value = cafe.id;
  box.checked = true;
  label.append(box, el("strong", "", cafe.name), el("span", "", cafe.address));
  return label;
}

function openBulk() {
  $("bulk-note").textContent = "좌표 있는 후보만 · 고른 곳이 바로 공개됩니다";
  $("bulk-list").replaceChildren(...publishable().map(bulkRow));
  show("bulk-confirm", true);
  $("bulk-dialog").showModal();
}

async function bulkPublish() {
  const ids = [...$("bulk-list").querySelectorAll("input:checked")].map(
    (box) => box.value,
  );
  if (!ids.length) throw new Error("공개할 카페를 고르세요.");
  $("bulk-note").textContent = `${ids.length}곳 공개 중…`;
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
      ? cafe.status === "approved"
        ? "공개 중"
        : "후보"
      : "저장하면 바로 공개";
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
  // A fixed pin leaves 확인 필요 right away.
  if (state.check.results.has(id)) {
    await checkOne(state.cafes.find((c) => c.id === id));
    renderList();
  }
}

async function geocode() {
  const address = $("cafe-address").value.trim();
  if (address.length < 2) return;
  $("geo-msg").textContent = "찾는 중…";
  try {
    const hit = await jsonApi(`/geocode?q=${encodeURIComponent(address)}`);
    $("cafe-lat").value = hit.lat.toFixed(6);
    $("cafe-lng").value = hit.lng.toFixed(6);
    $("geo-msg").textContent = `찾은 곳: ${hit.label} — 구·동 확인`;
  } catch (error) {
    if (error.code === "AUTH_REQUIRED") throw error;
    $("geo-msg").textContent = "못 찾음 — 주소를 줄이거나 직접 넣어 주세요";
  }
}

// ---- error reports, notice, CSV ----

function errorRow(report) {
  const row = el("article", "row stack");
  const main = el("div", "row-main");
  const title = el("div", "row-title");
  title.append(el("strong", "", report.title));
  main.append(
    title,
    el(
      "div",
      "row-sub",
      `${report.page || "-"} · ${formatDate(report.created_at, true)}`,
    ),
    el("div", "row-line", report.content),
  );
  const input = el("textarea");
  input.placeholder = "답변 (제보한 사람의 '찜·내 제보'에 보임)";
  input.ariaLabel = "답변";
  input.value = report.reply || "";
  const actions = el("div", "row-actions");
  actions.append(
    button(
      report.reply ? "답변 고치기" : "답변 저장",
      () => replyError(report, input.value),
      "btn primary",
    ),
    button("처리 완료", () => resolveError(report)),
  );
  row.append(main, input, actions);
  return row;
}

function renderErrors() {
  renderTabs();
  $("error-list").replaceChildren(
    ...(state.errors.length
      ? state.errors.map(errorRow)
      : [el("div", "empty", "없습니다.")]),
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
  $("notice-msg").textContent = "";
}

async function saveNotice() {
  await jsonApi("/notice", {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: $("notice-input").value.trim(),
  });
  $("notice-msg").textContent = "저장했습니다.";
}

async function importCsv(dryRun) {
  const msg = $("csv-msg");
  try {
    const file = $("csv-file").files[0];
    if (!file) throw new Error("CSV 파일을 먼저 고르세요.");
    msg.textContent = dryRun ? "검증 중…" : "올리는 중…";
    const r = await jsonApi(`/import-csv${dryRun ? "?dryRun=1" : ""}`, {
      method: "POST",
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: await file.text(),
    });
    msg.textContent = [
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
  } catch (error) {
    msg.textContent = `실패: ${error.message}`;
    throw error;
  }
}

// ---- tabs, login ----

function openTab(tab) {
  state.tab = tab;
  const { pane } = TABS.find((t) => t.id === tab);
  for (const node of document.querySelectorAll(".pane"))
    node.classList.toggle("hidden", node.id !== pane);
  show("new-cafe-btn", tab === "inbox");
  show("bulk-publish-btn", tab === "inbox");
  show("recheck-btn", tab === "check");
  $("search").value = "";
  if (tab === "notice") guarded(loadNotice)();
  if (tab === "check" && !state.check.at) guarded(runCheck)();
  renderList();
}

function showLogin() {
  show("console", false);
  show("logout-btn", false);
  show("login-pane", true);
  $("password").focus();
}

function showConsole() {
  show("login-pane", false);
  show("console", true);
  show("logout-btn", true);
  openTab(state.tab);
}

async function login(event) {
  event.preventDefault();
  try {
    await postJson("/admin/login", { password: $("password").value });
    $("password").value = "";
    $("login-msg").textContent = "";
    showConsole();
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
  $("search").addEventListener("input", renderList);
  bind("new-cafe-btn", () => openForm("add"));
  bind("form-save", saveForm);
  bind("bulk-publish-btn", openBulk);
  bind("bulk-confirm", bulkPublish);
  bind("recheck-btn", runCheck);
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
  await reload();
  showConsole();
}

guarded(init)();
