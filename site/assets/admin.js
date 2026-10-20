import {
  $,
  api,
  clearAuthToken,
  formatDate,
  jsonApi,
  roleLabel,
} from "./common.js?v=20260803-1";

const state = {
  tab: "inbox",
  cafes: [],
  submissions: [],
  errors: [],
  form: null,
  opsLoaded: false,
};

const LIST_TABS = ["inbox", "public", "down"];

// 카드의 상태 줄 — 내린 것 탭에서는 왜 내려갔는지가 보인다.
const STATE_LABEL = {
  candidate: "후보",
  approved: "공개 중",
  hold: "보류",
  imported: "숨김(가져옴)",
  rejected: "반려",
  deleted: "내림",
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

// ---- 작은 도구 ----

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
      .catch((error) => alert(error.message));
}

function button(label, onClick, className = "") {
  const node = el("button", className, label);
  node.type = "button";
  node.addEventListener("click", guarded(onClick));
  return node;
}

function card(title, lines, actions = []) {
  const item = el("div", "item");
  item.append(el("h3", "", title || ""));
  for (const line of lines.filter(Boolean))
    item.append(el("div", "mini", line));
  if (actions.length) {
    const row = el("div", "btns");
    for (const [label, onClick, className] of actions)
      row.append(button(label, onClick, className));
    item.append(row);
  }
  return item;
}

function post(path, body) {
  return jsonApi(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postText(path, body) {
  return jsonApi(path, {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body,
  });
}

// ---- 분류: 새로 들어옴(제보+후보) · 공개 중 · 내린 것(나머지 카페 전부) ----

function cafeState(cafe) {
  if (cafe.deleted_at) return "deleted";
  if (cafe.status === "hidden") return cafe.hidden_at ? "hold" : "imported";
  return cafe.status;
}

function tabItems(tab) {
  const cafes = (states) =>
    state.cafes
      .filter((cafe) => states.includes(cafeState(cafe)))
      .map((data) => ({ kind: "cafe", data }));
  if (tab === "inbox")
    return [
      ...state.submissions.map((data) => ({ kind: "sub", data })),
      ...cafes(["candidate"]),
    ];
  if (tab === "public") return cafes(["approved"]);
  return cafes(["deleted", "hold", "imported", "rejected"]);
}

function hasCoords(item) {
  return Boolean(Number(item.lat) && Number(item.lng));
}

// 이름은 표기가 갈려 같은 곳을 놓친다 — 주소(공백 제거)로 비교한다.
function sameAddressCafe(item) {
  const key = String(item.address || "").replace(/\s+/g, "");
  if (!key) return null;
  return (
    state.cafes.find(
      (cafe) =>
        cafe.id !== item.id &&
        !cafe.deleted_at &&
        String(cafe.address || "").replace(/\s+/g, "") === key,
    ) || null
  );
}

// ---- 목록: 카드를 누르면 고치기, 버튼은 그 탭에서 할 일 한두 개 ----

function itemActions(kind, data, cafeStatus) {
  if (kind === "sub")
    return [
      ["공개", () => openForm("approve", data), "primary"],
      ["버리기", () => discardSubmission(data)],
    ];
  switch (cafeStatus) {
    case "candidate":
      return [
        ["공개", () => publishCafe(data), "primary"],
        ["버리기", () => cafeAction("/delete", data, "버릴까요?")],
      ];
    case "approved":
      return [["내리기", () => cafeAction("/delete", data, "내릴까요?")]];
    case "deleted":
      return [["되살리기", () => reviveDeleted(data)]];
    case "hold":
    case "imported":
      return [
        [
          "되살리기",
          () => cafeAction("/unhold-cafe", data, "후보로 되살릴까요?"),
        ],
      ];
    default:
      return [];
  }
}

function itemCard({ kind, data }) {
  const isSub = kind === "sub";
  const cafeStatus = isSub ? "" : cafeState(data);
  const dup = sameAddressCafe(data);
  const item = card(
    data.name,
    [
      isSub
        ? ["제보", data.username, formatDate(data.created_at)]
            .filter(Boolean)
            .join(" · ")
        : `${STATE_LABEL[cafeStatus]}${data.oakerman_pick ? " · 오커맨픽" : ""}`,
      data.address,
      isSub && data.desc,
      isSub && data.reason && `추천 이유: ${data.reason}`,
      !isSub && !hasCoords(data) && "좌표 없음 — 눌러서 채워야 공개됨",
      dup && `같은 주소: ${dup.name} (${STATE_LABEL[cafeState(dup)]})`,
    ],
    itemActions(kind, data, cafeStatus),
  );
  if (cafeStatus !== "deleted") {
    item.classList.add("tappable");
    item.addEventListener("click", (event) => {
      if (!event.target.closest("button"))
        openForm(isSub ? "approve" : "edit", data);
    });
  }
  return item;
}

function renderCounts() {
  const counts = {
    inbox: tabItems("inbox").length,
    public: tabItems("public").length,
    down: tabItems("down").length,
    errors: state.errors.length,
  };
  document.querySelectorAll("#tabs [data-count]").forEach((node) => {
    node.textContent = String(counts[node.dataset.count] ?? "");
  });
}

function renderList() {
  renderCounts();
  if (!LIST_TABS.includes(state.tab)) return;
  const query = $("search").value.trim().toLowerCase();
  const items = tabItems(state.tab).filter(({ data }) =>
    `${data.name} ${data.address}`.toLowerCase().includes(query),
  );
  $("list").replaceChildren(
    ...(items.length
      ? items.map(itemCard)
      : [el("div", "item empty-state", "없습니다.")]),
  );
}

async function reload() {
  const [cafes, pending] = await Promise.all([
    jsonApi("/cafes?lifecycle=all"),
    jsonApi("/submissions?status=pending"),
  ]);
  state.cafes = Array.isArray(cafes) ? cafes : [];
  state.submissions = pending.items || [];
  renderList();
}

// ---- 처리 ----

async function cafeAction(path, cafe, question) {
  if (!confirm(`'${cafe.name}' ${question}`)) return;
  await post(path, { id: cafe.id });
  await reload();
}

// 좌표가 없으면 공개해도 '내 주변'에 안 나온다(서버도 막는다) — 양식에서 채우고 공개.
async function publishCafe(cafe) {
  if (!hasCoords(cafe)) {
    openForm("publish", cafe);
    return;
  }
  await cafeAction("/approve-cafe", cafe, "공개할까요?");
}

// 보류였던 카페는 되살리면 보류로 돌아온다 — 한 번에 후보까지 올린다.
async function reviveDeleted(cafe) {
  if (!confirm(`'${cafe.name}' 되살릴까요?`)) return;
  await post("/restore", { id: cafe.id });
  if (cafe.status === "hidden") await post("/unhold-cafe", { id: cafe.id });
  await reload();
}

// 같은 주소 카페가 있으면 중복으로 묶고(제보자에게 '승인'으로 보임), 없으면 반려.
async function discardSubmission(sub) {
  const dup = sameAddressCafe(sub);
  if (dup) {
    if (
      !confirm(
        `'${sub.name}' 는 이미 있는 '${dup.name}' 와 같은 곳입니다. 중복으로 처리할까요?`,
      )
    )
      return;
    await post("/approve", {
      submissionId: sub.id,
      duplicate: true,
      linkedCafeId: dup.id,
    });
  } else {
    const reason = prompt(
      `'${sub.name}' 버리는 이유 (제보자 마이페이지에 보임, 비워도 됨)`,
      "",
    );
    if (reason === null) return;
    await post("/reject", { submissionId: sub.id, reject_reason: reason });
  }
  await reload();
}

// ---- 카페 양식: 신규·제보·좌표 없는 후보는 저장 = 공개, 수정은 저장만 ----

function fillForm(data) {
  for (const [key, id] of Object.entries(FORM_FIELDS))
    $(id).value = data[key] || "";
  $("cafe-signature").value = (data.signature || []).join(", ");
  document.querySelectorAll('input[name="cat"]').forEach((box) => {
    box.checked = (data.category || []).includes(box.value);
  });
  $("oakerman-pick").checked = !!data.oakerman_pick;
  $("geo-msg").textContent = "";
}

function openForm(mode, data = {}) {
  state.form = { mode, id: data.id || "" };
  fillForm(data);
  $("form-title").textContent =
    mode === "add" ? "신규 등록" : data.name || "카페";
  $("form-note").textContent =
    mode === "edit"
      ? `지금: ${STATE_LABEL[cafeState(data)]}`
      : "저장하면 바로 사이트에 공개됩니다. 좌표가 맞는지 확인하세요.";
  $("form-save").textContent = mode === "edit" ? "저장" : "공개";
  $("cafe-dialog").showModal();
  if (!hasCoords(data) && data.address) guarded(geocode)();
}

function collectForm() {
  const value = (id) => $(id).value.trim();
  const form = {};
  for (const [key, id] of Object.entries(FORM_FIELDS)) form[key] = value(id);
  return {
    ...form,
    lat: Number(form.lat) || 0,
    lng: Number(form.lng) || 0,
    region_distance_m: Number(form.region_distance_m) || 0,
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
  const { mode, id } = state.form;
  let cafeId = id;
  if (mode === "approve")
    cafeId = (await post("/approve", { ...payload, submissionId: id }))
      .linked_cafe_id;
  else if (mode === "add") cafeId = (await post("/add", payload)).id;
  else await post("/edit", { ...payload, id });
  if (mode !== "edit") await post("/approve-cafe", { id: cafeId });
  $("cafe-dialog").close();
  await reload();
}

async function geocode() {
  const address = $("cafe-address").value.trim().slice(0, 80);
  if (address.length < 2) return;
  $("geo-msg").textContent = "좌표 찾는 중...";
  const res = await api(`/geocode?q=${encodeURIComponent(address)}`);
  const hit = await res.json().catch(() => ({}));
  if (!res.ok || !Number.isFinite(hit.lat)) {
    $("geo-msg").textContent =
      "주소로 좌표를 못 찾았습니다. 주소를 줄이거나 지도에서 직접 넣어 주세요.";
    return;
  }
  $("cafe-lat").value = hit.lat.toFixed(6);
  $("cafe-lng").value = hit.lng.toFixed(6);
  $("geo-msg").textContent = `찾은 곳: ${hit.label} — 구·동이 맞는지 확인`;
}

// ---- 오류 제보 ----

function errorCard(report) {
  const item = card(report.title, [
    `${report.username || "-"} · ${report.page || "-"} · ${formatDate(report.created_at, true)}`,
    report.content,
  ]);
  const input = el("textarea");
  input.placeholder = "답변 (제보한 사람 마이페이지에 보임)";
  input.value = report.reply_message || "";
  const row = el("div", "btns");
  row.append(
    button(
      report.reply_message ? "답변 고치기" : "답변 저장",
      () => replyError(report, input.value),
      "primary",
    ),
  );
  row.append(button("처리 완료", () => resolveError(report)));
  item.append(input, row);
  return item;
}

async function loadErrors() {
  const data = await jsonApi("/error-reports?status=open");
  state.errors = data.items || [];
  $("error-list").replaceChildren(
    ...(state.errors.length
      ? state.errors.map(errorCard)
      : [el("div", "item empty-state", "없습니다.")]),
  );
  renderCounts();
}

async function replyError(report, message) {
  if (!message.trim()) throw new Error("답변을 적어 주세요.");
  await post("/reply-error-report", { id: report.id, message: message.trim() });
  await loadErrors();
}

async function resolveError(report) {
  if (!confirm(`'${report.title}' 처리 완료로 바꿀까요?`)) return;
  await post("/resolve-error-report", { id: report.id });
  await loadErrors();
}

// ---- 운영: 방문자 · 공지 · CSV ----

function visitTile(label, value, sub) {
  const box = el("div", "visit-tile");
  box.append(el("span", "label", label), el("span", "value", value));
  if (sub) box.append(el("span", "sub", sub));
  return box;
}

function visitRow(day, peak) {
  const row = el("tr");
  const bar = el("div", "visit-bar");
  const fill = el("span");
  fill.style.width = `${peak > 0 ? Math.round((day.uniques / peak) * 100) : 0}%`;
  bar.append(fill);
  const barCell = el("td", "bar-cell");
  barCell.append(bar);
  row.append(
    el("td", "day", day.day),
    barCell,
    el("td", "num", `${day.uniques}명`),
    el("td", "hits", `${day.hits}회`),
  );
  return row;
}

async function loadVisits() {
  const stats = await jsonApi("/stats/visits");
  const summary = $("visit-summary");
  summary.className = "visit-tiles";
  summary.replaceChildren(
    visitTile("오늘", `${stats.today.uniques}명`, `조회 ${stats.today.hits}회`),
    visitTile("7일", `${stats.last7.uniques}`, "날마다 센 사람 합"),
    visitTile("30일", `${stats.last30.uniques}`, "날마다 센 사람 합"),
  );
  const days = (stats.days || []).slice(0, 14);
  const peak = Math.max(0, ...days.map((day) => Number(day.uniques) || 0));
  const table = el("table", "visit-table");
  const body = el("tbody");
  body.append(...days.map((day) => visitRow(day, peak)));
  table.append(body);
  $("visit-days").replaceChildren(
    days.length ? table : el("div", "visit-empty", "기록된 방문이 없습니다."),
  );
}

async function loadNotice() {
  const res = await api("/notice");
  if (res.ok) $("notice-input").value = await res.text();
}

async function saveNotice() {
  await postText("/notice", $("notice-input").value.trim());
  alert("공지 저장 완료");
}

function csvMsg(text) {
  $("csv-msg").textContent = text;
}

function csvFile() {
  const file = $("csv-file").files[0];
  if (!file) throw new Error("CSV 파일을 먼저 고르세요.");
  return file;
}

function clearCsvFile() {
  $("csv-file").value = "";
  $("csv-file-name").textContent = "CSV 파일 고르기";
}

async function importCsv(dryRun) {
  const body = await csvFile().text();
  csvMsg(dryRun ? "검증 중..." : "올리는 중...");
  const r = await postText(`/import-csv${dryRun ? "?dryRun=1" : ""}`, body);
  csvMsg(
    [
      `${dryRun ? "넣을 것" : "넣음"} ${r.added}곳 (후보)`,
      r.skipped.length &&
        `이미 있어 건너뜀 ${r.skipped.length}: ${r.skipped.map((s) => `${s.row}행 ${s.name}`).join(", ")}`,
      r.failed &&
        `틀린 행 ${r.failed}: ${r.failedRows.map((f) => `${f.row}행 ${f.error}`).join(", ")}`,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  if (dryRun) return;
  clearCsvFile();
  await reload();
}

async function loadOps() {
  if (state.opsLoaded) return;
  state.opsLoaded = true;
  await Promise.all([loadVisits(), loadNotice()]);
}

// ---- 시작 ----

function showTab(tab) {
  state.tab = tab;
  document.querySelectorAll("#tabs button").forEach((node) => {
    node.classList.toggle("active", node.dataset.tab === tab);
  });
  $("pane-list").classList.toggle("hidden", !LIST_TABS.includes(tab));
  $("new-cafe-btn").classList.toggle("hidden", tab !== "inbox");
  $("pane-errors").classList.toggle("hidden", tab !== "errors");
  $("pane-ops").classList.toggle("hidden", tab !== "ops");
  if (tab === "ops") guarded(loadOps)();
  renderList();
}

function bind(id, onClick) {
  $(id).addEventListener("click", guarded(onClick));
}

function bindEvents() {
  document.querySelectorAll("#tabs button").forEach((node) => {
    node.addEventListener("click", () => showTab(node.dataset.tab));
  });
  $("search").addEventListener("input", renderList);
  bind("new-cafe-btn", () => openForm("add"));
  bind("form-save", saveForm);
  bind("geocode-btn", geocode);
  bind("logout-btn", async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    clearAuthToken();
    location.href = "index.html";
  });
  bind("notice-save", saveNotice);
  bind("csv-dry-run", () => importCsv(true));
  bind("csv-upload", () => importCsv(false));
  $("csv-file").addEventListener("change", () => {
    $("csv-file-name").textContent =
      $("csv-file").files[0]?.name || "CSV 파일 고르기";
  });
}

async function init() {
  const me = await jsonApi("/me");
  if (!me.user) {
    location.href = "login.html";
    return;
  }
  if (me.user.role !== "admin") {
    alert("관리자 권한이 없습니다.");
    location.href = "index.html";
    return;
  }
  $("hello").textContent = `${me.user.username} (${roleLabel(me.user.role)})`;
  bindEvents();
  await Promise.all([reload(), loadErrors()]);
}

init().catch((error) => {
  $("hello").textContent = error.message;
});
