import {
  $,
  api,
  clearAuthToken,
  formatDate,
  jsonApi,
  roleLabel,
} from "./common.js?v=20260803-1";

const state = {
  me: null,
  tab: "queue",
  cafes: [],
  submissions: [],
  rejected: [],
  errors: [],
  errorStatus: "open",
  openErrors: 0,
  form: null,
  opsLoaded: false,
  userTimer: null,
};

const LIST_TABS = ["queue", "public", "hidden"];

const STATE_LABEL = {
  candidate: "후보",
  approved: "공개",
  hold: "보류",
  imported: "숨김(가져옴)",
  rejected: "반려",
  deleted: "삭제됨",
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

const CSV_EXPORTS = [
  ["/export-csv/submissions-review", "user_submissions_review_export.csv"],
  ["/export-csv/candidates-review", "candidates-review.csv"],
  ["/export-csv/hold-review", "hold-review.csv"],
  ["/export-csv/approved-review", "approved-review.csv"],
];

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

function saveFile(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

// ---- 카페 분류: 대기(제보+후보) · 공개 · 숨김(나머지 전부) ----

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
  const subs = (rows) => rows.map((data) => ({ kind: "sub", data }));
  if (tab === "queue")
    return [...subs(state.submissions), ...cafes(["candidate"])];
  if (tab === "public") return cafes(["approved"]);
  return [
    ...cafes(["hold", "imported", "rejected", "deleted"]),
    ...subs(state.rejected),
  ];
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

// ---- 목록 ----

function submissionCard(sub) {
  const dup = sameAddressCafe(sub);
  const lines = [
    ["제보", sub.username, formatDate(sub.created_at)]
      .filter(Boolean)
      .join(" · "),
    sub.address,
    sub.desc,
    sub.reason && `추천 이유: ${sub.reason}`,
    dup && `같은 주소: ${dup.name} (${STATE_LABEL[cafeState(dup)]})`,
    sub.status === "rejected" && `반려: ${sub.reject_reason || "사유 없음"}`,
  ];
  if (sub.status !== "pending") return card(sub.name, lines);
  return card(sub.name, lines, [
    ["검토", () => openForm("approve", sub), "primary"],
    ["중복", () => markDuplicate(sub, dup)],
    ["반려", () => rejectSubmission(sub), "warn"],
  ]);
}

function cafeActions(cafe) {
  const edit = ["수정", () => openForm("edit", cafe)];
  switch (cafeState(cafe)) {
    case "candidate":
      return [
        edit,
        [
          "공개",
          () => cafeAction("/approve-cafe", cafe, "공개할까요?"),
          "primary",
        ],
        ["보류", () => cafeAction("/hold-cafe", cafe, "보류할까요?")],
      ];
    case "hold":
      return [
        edit,
        [
          "후보로",
          () => cafeAction("/unhold-cafe", cafe, "후보로 되돌릴까요?"),
        ],
      ];
    case "deleted":
      return [["복구", () => cafeAction("/restore", cafe, "복구할까요?")]];
    default:
      return [edit];
  }
}

function cafeCard(cafe) {
  const dup = sameAddressCafe(cafe);
  return card(
    cafe.name,
    [
      `${STATE_LABEL[cafeState(cafe)]}${cafe.oakerman_pick ? " · 오커맨픽" : ""}`,
      cafe.address,
      !hasCoords(cafe) && "좌표 없음 — 지도에 안 나옴",
      dup && `같은 주소: ${dup.name} (${STATE_LABEL[cafeState(dup)]})`,
      cafe.deleted_at && `삭제: ${formatDate(cafe.deleted_at, true)}`,
    ],
    cafeActions(cafe),
  );
}

function renderCounts() {
  const counts = {
    queue: tabItems("queue").length,
    public: tabItems("public").length,
    hidden: tabItems("hidden").length,
    errors: state.openErrors,
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
      ? items.map(({ kind, data }) =>
          kind === "sub" ? submissionCard(data) : cafeCard(data),
        )
      : [el("div", "item empty-state", "없습니다.")]),
  );
}

async function reload() {
  const [cafes, pending, rejected] = await Promise.all([
    jsonApi("/cafes?lifecycle=all"),
    jsonApi("/submissions?status=pending"),
    jsonApi("/submissions?status=rejected"),
  ]);
  state.cafes = Array.isArray(cafes) ? cafes : [];
  state.submissions = pending.items || [];
  state.rejected = rejected.items || [];
  renderList();
}

// ---- 처리 ----

async function cafeAction(path, cafe, question) {
  if (!confirm(`'${cafe.name}' ${question}`)) return;
  await post(path, { id: cafe.id });
  await reload();
}

async function rejectSubmission(sub) {
  const reason = prompt(`'${sub.name}' 반려 사유 (선택)`, "");
  if (reason === null) return;
  await post("/reject", { submissionId: sub.id, reject_reason: reason });
  await reload();
}

function findCafe(text) {
  const query = text.trim().toLowerCase();
  const byId = state.cafes.find((cafe) => cafe.id === text.trim());
  if (byId) return byId;
  const matches = state.cafes.filter(
    (cafe) =>
      !cafe.deleted_at && String(cafe.name).toLowerCase().includes(query),
  );
  return matches.length === 1 ? matches[0] : null;
}

async function markDuplicate(sub, suggested) {
  const text = prompt(
    "이미 있는 카페 이름 (또는 id)",
    suggested ? suggested.name : "",
  );
  if (!text?.trim()) return;
  const cafe = findCafe(text);
  if (!cafe) throw new Error("그 이름의 카페가 하나로 좁혀지지 않습니다.");
  if (
    !confirm(`'${sub.name}' 제보를 '${cafe.name}' 와 같은 곳으로 처리할까요?`)
  )
    return;
  await post("/approve", {
    submissionId: sub.id,
    duplicate: true,
    linkedCafeId: cafe.id,
  });
  await reload();
}

// ---- 카페 양식 (신규 · 수정 · 제보 검토) ----

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
  $("form-title").textContent = {
    add: "신규 등록",
    edit: data.name,
    approve: "제보 검토",
  }[mode];
  $("form-note").textContent =
    mode === "edit"
      ? `지금 상태: ${STATE_LABEL[cafeState(data)]}`
      : "저장하면 후보로 들어갑니다. 공개는 대기 탭에서 따로 누릅니다.";
  $("form-save").textContent = mode === "approve" ? "후보로 받기" : "저장";
  $("form-delete").classList.toggle(
    "hidden",
    mode !== "edit" || !!data.deleted_at,
  );
  $("cafe-dialog").showModal();
  if (!hasCoords(data) && data.address) geocode().catch(() => {});
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
  if (mode === "approve")
    await post("/approve", { ...payload, submissionId: id });
  else if (mode === "edit") await post("/edit", { ...payload, id });
  else await post("/add", payload);
  $("cafe-dialog").close();
  await reload();
}

async function deleteFromForm() {
  const cafe = state.cafes.find((item) => item.id === state.form.id);
  if (!cafe) return;
  $("cafe-dialog").close();
  await cafeAction("/delete", cafe, "삭제할까요? (숨김 탭에서 복구 가능)");
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
  const done = report.status === "resolved";
  const item = card(report.title, [
    `${report.username || "-"} · ${report.page || "-"} · ${formatDate(report.created_at, true)}`,
    report.content,
    done &&
      `처리 완료 · ${report.resolved_by_username || ""} ${formatDate(report.resolved_at, true)}`,
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
  if (!done) row.append(button("처리 완료", () => resolveError(report)));
  item.append(input, row);
  return item;
}

async function loadErrors() {
  const data = await jsonApi(`/error-reports?status=${state.errorStatus}`);
  state.errors = data.items || [];
  if (state.errorStatus === "open") state.openErrors = state.errors.length;
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

// ---- 운영: 방문자 · 공지 · CSV · 회원 ----

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
    visitTile("최근 7일", `${stats.last7.uniques}명`),
    visitTile("최근 30일", `${stats.last30.uniques}명`),
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

async function downloadCsv() {
  for (const [path, filename] of CSV_EXPORTS) {
    const res = await api(path);
    const text = await res.text();
    if (!res.ok) throw new Error(text || `${filename} 내려받기 실패`);
    saveFile(filename, text);
  }
  csvMsg(`내려받음: ${CSV_EXPORTS.map(([, name]) => name).join(", ")}`);
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
  if (dryRun) {
    csvMsg(
      `검증: 신규 ${r.wouldAdd || 0} · 수정 ${r.wouldUpdate || 0} · 중복 ${r.wouldDuplicate || 0} · 실패 ${r.failed || 0}`,
    );
    return;
  }
  csvMsg(
    `올림: 신규 ${r.added || 0} · 수정 ${r.updated || 0} · 중복 ${r.duplicated || 0} · 실패 ${r.failed || 0}`,
  );
  clearCsvFile();
  await reload();
}

async function resetCsv() {
  const file = csvFile();
  const active = state.cafes.filter((cafe) => !cafe.deleted_at).length;
  if (!confirm(`지금 카페 ${active}곳을 이 CSV 로 전부 바꿉니다. 계속할까요?`))
    return;
  if (prompt("정말 바꾸려면 '초기화' 라고 적어 주세요.", "") !== "초기화")
    return;
  const r = await postText("/reset-csv", await file.text());
  csvMsg(
    `전체 교체: 삭제 ${r.deleted || 0} · 신규 ${r.added || 0} · 수정 ${r.updated || 0}`,
  );
  clearCsvFile();
  await reload();
}

async function loadUsers() {
  const query = encodeURIComponent($("user-search").value.trim().toLowerCase());
  const data = await jsonApi(`/users?q=${query}`);
  const users = data.items || [];
  $("user-count").textContent = `${users.length}명`;
  $("user-list").replaceChildren(
    ...users.map((user) =>
      card(`${user.username} (${roleLabel(user.role)})`, [
        `가입 ${formatDate(user.created_at)}`,
      ]),
    ),
  );
}

async function loadOps() {
  if (state.opsLoaded) return;
  state.opsLoaded = true;
  await Promise.all([loadVisits(), loadNotice(), loadUsers()]);
}

// ---- 시작 ----

function showTab(tab) {
  state.tab = tab;
  document.querySelectorAll("#tabs button").forEach((node) => {
    node.classList.toggle("active", node.dataset.tab === tab);
  });
  $("pane-list").classList.toggle("hidden", !LIST_TABS.includes(tab));
  $("pane-errors").classList.toggle("hidden", tab !== "errors");
  $("pane-ops").classList.toggle("hidden", tab !== "ops");
  if (tab === "ops") guarded(loadOps)();
  renderList();
}

function bindErrorTabs() {
  const tabs = [...document.querySelectorAll("#error-tabs button")];
  for (const node of tabs) {
    node.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.toggle("active", item === node));
      state.errorStatus = node.dataset.status;
      guarded(loadErrors)();
    });
  }
}

function bind(id, onClick) {
  $(id).addEventListener("click", guarded(onClick));
}

function bindEvents() {
  document.querySelectorAll("#tabs button").forEach((node) => {
    node.addEventListener("click", () => showTab(node.dataset.tab));
  });
  bindErrorTabs();
  $("search").addEventListener("input", renderList);
  bind("new-cafe-btn", () => openForm("add"));
  bind("form-save", saveForm);
  bind("form-delete", deleteFromForm);
  bind("geocode-btn", geocode);
  bind("logout-btn", async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    clearAuthToken();
    location.href = "index.html";
  });
  bind("notice-save", saveNotice);
  bind("csv-download", downloadCsv);
  bind("csv-dry-run", () => importCsv(true));
  bind("csv-upload", () => importCsv(false));
  bind("csv-reset", resetCsv);
  $("csv-file").addEventListener("change", () => {
    $("csv-file-name").textContent =
      $("csv-file").files[0]?.name || "CSV 파일 고르기";
  });
  $("user-search").addEventListener("input", () => {
    clearTimeout(state.userTimer);
    state.userTimer = setTimeout(guarded(loadUsers), 180);
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
  state.me = me.user;
  $("hello").textContent = `${me.user.username} (${roleLabel(me.user.role)})`;
  bindEvents();
  await Promise.all([reload(), loadErrors()]);
}

init().catch((error) => {
  $("hello").textContent = error.message;
});
