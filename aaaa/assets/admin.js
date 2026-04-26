import {
  $,
  api,
  clearAuthToken,
  errorStatusLabel,
  esc,
  formatDate,
  jsonApi,
  roleLabel,
  statusLabel,
} from "./common.js";

const state = {
  me: null,
  cafes: [],
  cafeKeyCounts: {},
  submissions: [],
  editApproveId: "",
  editApproveName: "",
  errorReports: [],
  errorStatus: "open",
  reviewedSubmissions: [],
  reviewedStatus: "approved",
  users: [],
  userSearchTimer: null,
};

function categories() {
  return [...document.querySelectorAll('input[name="cat"]:checked')].map(
    (input) => input.value,
  );
}

function signatures(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cafeKey(cafe) {
  return `${String(cafe.name || "")
    .trim()
    .toLowerCase()}||${String(cafe.address || "")
    .trim()
    .toLowerCase()}`;
}

function isDuplicateCafe(cafe) {
  const key = cafeKey(cafe);
  return key !== "||" && Number(state.cafeKeyCounts[key] || 0) > 1;
}

function emptyState(text) {
  return `<div class="item empty-state">${esc(text)}</div>`;
}

function formatDateTime(value) {
  return formatDate(value, true);
}

function fillCafeForm(cafe) {
  $("cafe-id").value = cafe.id || "";
  $("cafe-name").value = cafe.name || "";
  $("cafe-address").value = cafe.address || "";
  $("cafe-desc").value = cafe.desc || "";
  $("cafe-lat").value = cafe.lat || "";
  $("cafe-lng").value = cafe.lng || "";
  $("cafe-signature").value = (cafe.signature || []).join(", ");
  $("cafe-instagram").value = cafe.instagram || "";
  $("cafe-bean").value = cafe.beanShop || "";
  [...document.querySelectorAll('input[name="cat"]')].forEach((box) => {
    box.checked = (cafe.category || []).includes(box.value);
  });
  $("oakerman-pick").checked = !!cafe.oakerman_pick;
  $("manager-pick").checked = !!cafe.manager_pick;
}

function openCafeForm(scroll = true) {
  $("cafe-form-wrap").classList.remove("hidden");
  if (scroll) {
    setTimeout(
      () =>
        $("cafe-form-wrap").scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      0,
    );
  }
}

function closeCafeForm(resetForm = true) {
  state.editApproveId = "";
  state.editApproveName = "";
  $("review-mode").classList.add("hidden");
  $("review-mode").innerHTML = "";
  if (resetForm) fillCafeForm({});
  $("save-cafe-btn").textContent = "저장";
  $("delete-btn").textContent = "닫기";
  $("cafe-form-wrap").classList.add("hidden");
}

function prepareNewCafe() {
  state.editApproveId = "";
  state.editApproveName = "";
  $("review-mode").classList.add("hidden");
  $("review-mode").innerHTML = "";
  fillCafeForm({});
  $("save-cafe-btn").textContent = "저장";
  $("delete-btn").textContent = "닫기";
  openCafeForm();
  setTimeout(() => $("cafe-name").focus(), 0);
}

function fillCafeFormFromSubmission(submission) {
  fillCafeForm({
    id: "",
    name: submission.name || "",
    address: submission.address || "",
    desc: submission.desc || "",
    lat: 0,
    lng: 0,
    signature: submission.signature || [],
    instagram: submission.instagram || "",
    beanShop: submission.beanShop || "",
    category: submission.category || [],
    oakerman_pick: !!submission.oakerman_pick,
    manager_pick: !!submission.manager_pick,
  });
}

function setEditApproveMode(submission) {
  state.editApproveId = submission.id;
  state.editApproveName = submission.name || "";
  openCafeForm(false);
  $("review-mode").classList.remove("hidden");
  $("review-mode").innerHTML = `
    <h3>수정 후 승인 준비 중</h3>
    <div class="mini">대상 제보: ${esc(state.editApproveName)}</div>
    <div class="mini">아래 입력칸을 보완한 뒤 <b>수정 후 승인 저장</b>을 누르면 카페로 등록됩니다.</div>
  `;
  $("save-cafe-btn").textContent = "수정 후 승인 저장";
  $("delete-btn").textContent = "취소";
}

function clearEditApproveMode(resetForm = false) {
  state.editApproveId = "";
  state.editApproveName = "";
  $("review-mode").classList.add("hidden");
  $("review-mode").innerHTML = "";
  $("save-cafe-btn").textContent = "저장";
  if (resetForm) fillCafeForm({});
  $("delete-btn").textContent = $("cafe-id").value.trim() ? "삭제" : "닫기";
}

function collectCafeForm() {
  return {
    id: $("cafe-id").value.trim(),
    name: $("cafe-name").value.trim(),
    address: $("cafe-address").value.trim(),
    desc: $("cafe-desc").value.trim(),
    lat: Number($("cafe-lat").value || 0),
    lng: Number($("cafe-lng").value || 0),
    signature: signatures($("cafe-signature").value),
    instagram: $("cafe-instagram").value.trim(),
    beanShop: $("cafe-bean").value.trim(),
    category: categories(),
    oakerman_pick: $("oakerman-pick").checked,
    manager_pick: $("manager-pick").checked,
  };
}

async function loadCafes() {
  try {
    const res = await api("/data");
    const rows = await res.json();
    state.cafes = Array.isArray(rows) ? rows : [];
    state.cafeKeyCounts = state.cafes.reduce((acc, cafe) => {
      const key = cafeKey(cafe);
      if (key !== "||") acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    $("cafe-count").textContent = `로드된 카페 ${state.cafes.length}개`;
    renderCafeList();
  } catch (error) {
    state.cafes = [];
    state.cafeKeyCounts = {};
    $("cafe-count").textContent = "카페 데이터를 불러오지 못했습니다.";
    $("cafe-list").innerHTML = emptyState(
      `카페 데이터 로드 실패: ${error.message}`,
    );
  }
}

function renderCafeList() {
  const query = $("cafe-search").value.trim().toLowerCase();
  if (!state.cafes.length) {
    $("cafe-list").innerHTML = emptyState(
      "등록된 카페 데이터가 없습니다. 기존 데이터는 CSV 업로드로 먼저 넣어 주세요.",
    );
    return;
  }
  if (!query) {
    $("cafe-list").innerHTML = emptyState(
      "카페명을 검색하면 기존 카페 카드가 표시됩니다.",
    );
    return;
  }

  const rows = state.cafes
    .filter((cafe) =>
      `${cafe.name} ${cafe.address}`.toLowerCase().includes(query),
    )
    .slice(0, 120);

  $("cafe-list").innerHTML = rows.length
    ? rows
        .map(
          (cafe) => `
      <div class="item">
        <h3>${esc(cafe.name)}</h3>
        <div class="mini">ID: ${esc(cafe.id)}${isDuplicateCafe(cafe) ? " (중복)" : ""}</div>
        <div class="mini">${esc(cafe.address)}</div>
        <div class="btns" style="margin-top:6px;">
          <button type="button" class="pick-cafe" data-id="${esc(cafe.id)}">선택</button>
        </div>
      </div>
    `,
        )
        .join("")
    : emptyState("검색 결과가 없습니다.");

  [...document.querySelectorAll(".pick-cafe")].forEach((btn) => {
    btn.addEventListener("click", () => {
      const cafe = state.cafes.find((item) => item.id === btn.dataset.id);
      if (!cafe) return;
      clearEditApproveMode(false);
      fillCafeForm(cafe);
      $("save-cafe-btn").textContent = "저장";
      $("delete-btn").textContent = "삭제";
      openCafeForm();
    });
  });
}

async function loadSubmissions() {
  const data = await jsonApi("/submissions?status=pending");
  state.submissions = data.items || [];
  renderSubmissions();
}

function renderSubmissions() {
  if (!state.submissions.length) {
    $("sub-list").innerHTML = emptyState("해당 상태의 제보가 없습니다.");
    return;
  }

  $("sub-list").innerHTML = state.submissions
    .map(
      (submission) => `
    <div class="item">
      <h3>${esc(submission.name)} <small style="font-size:.72rem;">(${esc(submission.username)})</small></h3>
      <div class="mini">${esc(submission.address)}</div>
      <div class="mini">${esc(submission.desc)}</div>
      <div class="mini">추천 이유: ${esc(submission.reason || "-")}</div>
      <div class="mini">상태: ${statusLabel(submission.status)}${submission.reject_reason ? ` / 반려 사유: ${esc(submission.reject_reason)}` : ""}</div>
      <div class="btns" style="margin-top:6px;">
        <button type="button" class="s-approve" data-id="${esc(submission.id)}">승인</button>
        <button type="button" class="s-edit-approve" data-id="${esc(submission.id)}">수정 후 승인</button>
        <button type="button" class="s-reject warn" data-id="${esc(submission.id)}">반려</button>
        <button type="button" class="s-dup" data-id="${esc(submission.id)}">중복 처리</button>
      </div>
    </div>
  `,
    )
    .join("");

  [...document.querySelectorAll(".s-approve")].forEach((btn) =>
    btn.addEventListener("click", () => approve(btn.dataset.id, false)),
  );
  [...document.querySelectorAll(".s-edit-approve")].forEach((btn) =>
    btn.addEventListener("click", () => approve(btn.dataset.id, true)),
  );
  [...document.querySelectorAll(".s-reject")].forEach((btn) =>
    btn.addEventListener("click", () => reject(btn.dataset.id)),
  );
  [...document.querySelectorAll(".s-dup")].forEach((btn) =>
    btn.addEventListener("click", () => markDuplicate(btn.dataset.id)),
  );
}

async function loadReviewedSubmissions() {
  const data = await jsonApi(`/submissions?status=${state.reviewedStatus}`);
  state.reviewedSubmissions = data.items || [];
  renderReviewedSubmissions();
}

function renderReviewedSubmissions() {
  if (!state.reviewedSubmissions.length) {
    $("reviewed-list").innerHTML = emptyState(
      "해당 상태의 처리 내역이 없습니다.",
    );
    return;
  }

  $("reviewed-list").innerHTML = state.reviewedSubmissions
    .map(
      (submission) => `
    <div class="item">
      <h3>${esc(submission.name)} <small style="font-size:.72rem;">(${esc(submission.username)})</small></h3>
      <div class="mini">${esc(submission.address)}</div>
      <div class="mini">처리: ${statusLabel(submission.status)}${submission.reviewed_by_username ? ` / 담당: ${esc(submission.reviewed_by_username)}` : ""}</div>
      ${submission.linked_cafe_id ? `<div class="mini">연결 cafe id: ${esc(submission.linked_cafe_id)}</div>` : ""}
      ${submission.reject_reason ? `<div class="mini">반려 사유: ${esc(submission.reject_reason)}</div>` : ""}
    </div>
  `,
    )
    .join("");
}

async function loadErrorReports() {
  const data = await jsonApi(`/error-reports?status=${state.errorStatus}`);
  state.errorReports = data.items || [];
  renderErrorReports();
}

function getReplyInput(id) {
  return (
    [...document.querySelectorAll(".error-reply-input")].find(
      (input) => input.dataset.id === String(id),
    ) || null
  );
}

function renderErrorReports() {
  if (!state.errorReports.length) {
    $("error-list").innerHTML = emptyState("해당 상태의 오류 제보가 없습니다.");
    return;
  }

  $("error-list").innerHTML = state.errorReports
    .map(
      (report) => `
    <div class="item">
      <h3>${esc(report.title)} <small style="font-size:.72rem;">(${esc(report.username)})</small></h3>
      <div class="mini">관련: ${esc(report.page || "-")}</div>
      <div class="mini">${esc(report.content)}</div>
      <div class="mini">상태: ${errorStatusLabel(report.status)}${report.resolved_by_username ? ` / 처리: ${esc(report.resolved_by_username)}` : ""}${report.resolved_at ? ` / ${esc(formatDateTime(report.resolved_at))}` : ""}</div>
      <div class="reply-block">
        <div class="reply-meta">
          ${
            report.reply_message
              ? `운영진 답변 등록됨${report.replied_by_username ? ` / ${esc(report.replied_by_username)}` : ""}${report.replied_at ? ` / ${esc(formatDateTime(report.replied_at))}` : ""}`
              : "운영진 답변이 아직 없습니다."
          }
        </div>
        <textarea class="error-reply-input" data-id="${esc(report.id)}" placeholder="이 오류 제보에 대한 답변을 입력해 주세요.">${esc(report.reply_message || "")}</textarea>
        <div class="reply-actions">
          <button type="button" class="e-reply primary" data-id="${esc(report.id)}">${report.reply_message ? "답변 수정" : "답변 저장"}</button>
          ${report.status === "open" ? `<button type="button" class="e-resolve" data-id="${esc(report.id)}">처리 완료</button>` : ""}
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  [...document.querySelectorAll(".e-reply")].forEach((btn) => {
    btn.addEventListener("click", () => saveErrorReply(btn.dataset.id));
  });
  [...document.querySelectorAll(".e-resolve")].forEach((btn) => {
    btn.addEventListener("click", () => resolveErrorReport(btn.dataset.id));
  });
}

async function saveErrorReply(id) {
  const input = getReplyInput(id);
  if (!input) return;
  const message = input.value.trim();
  if (!message) {
    alert("답변 내용을 입력해 주세요.");
    return;
  }
  await jsonApi("/reply-error-report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, message }),
  });
  await loadErrorReports();
  alert("답변 저장 완료");
}

async function resolveErrorReport(id) {
  if (!confirm("이 오류 제보를 처리 완료로 변경할까요?")) return;
  await jsonApi("/resolve-error-report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  await loadErrorReports();
}

async function approve(id, withEdit) {
  const submission = state.submissions.find((item) => item.id === id);
  if (!submission) return;
  if (withEdit) {
    fillCafeFormFromSubmission(submission);
    setEditApproveMode(submission);
    $("cafe-form-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  await jsonApi("/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ submissionId: id }),
  });
  await Promise.all([
    loadSubmissions(),
    loadCafes(),
    loadReviewedSubmissions(),
  ]);
}

async function approveEditedSubmission() {
  if (!state.editApproveId) return;
  const payload = collectCafeForm();
  payload.submissionId = state.editApproveId;
  await jsonApi("/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  alert("수정 후 승인 완료");
  closeCafeForm(true);
  await Promise.all([
    loadSubmissions(),
    loadCafes(),
    loadReviewedSubmissions(),
  ]);
}

async function reject(id) {
  const reason = prompt("반려 사유를 입력해 주세요. (선택)", "") || "";
  await jsonApi("/reject", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ submissionId: id, reject_reason: reason }),
  });
  await Promise.all([loadSubmissions(), loadReviewedSubmissions()]);
}

async function markDuplicate(id) {
  const linkedCafeId =
    prompt("중복 처리할 기존 cafe id를 입력해 주세요.", "") || "";
  if (!linkedCafeId.trim()) {
    alert("기존 cafe id를 입력해야 중복 처리할 수 있습니다.");
    return;
  }
  await jsonApi("/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ submissionId: id, duplicate: true, linkedCafeId }),
  });
  await Promise.all([loadSubmissions(), loadReviewedSubmissions()]);
}

async function saveNotice() {
  const res = await api("/notice", {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: $("notice-input").value.trim(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok)
    throw new Error(data.error || "공지 저장에 실패했습니다.");
  alert("공지 저장 완료");
}

async function addCafe() {
  await jsonApi("/add", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(collectCafeForm()),
  });
  await loadCafes();
  closeCafeForm(true);
  alert("카페 등록 완료");
}

async function editCafe() {
  const id = $("cafe-id").value.trim();
  if (!id) {
    alert("먼저 수정할 카페를 선택해 주세요.");
    return;
  }
  const payload = collectCafeForm();
  payload.id = id;
  await jsonApi("/edit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  await loadCafes();
  closeCafeForm(true);
  alert("수정 완료");
}

async function saveCafe() {
  if (state.editApproveId) {
    await approveEditedSubmission();
    return;
  }
  if ($("cafe-id").value.trim()) {
    await editCafe();
  } else {
    await addCafe();
  }
}

async function deleteCafe() {
  if (state.editApproveId) {
    closeCafeForm(true);
    return;
  }
  const id = $("cafe-id").value.trim();
  if (!id) {
    closeCafeForm(true);
    return;
  }
  if (!confirm("정말 삭제할까요?")) return;
  await jsonApi("/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  await loadCafes();
  closeCafeForm(true);
}

async function downloadCsv() {
  const res = await api("/data");
  const rows = await res.json();
  if (!rows.length) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const headers = [
    "id",
    "name",
    "address",
    "desc",
    "lat",
    "lng",
    "signature",
    "beanShop",
    "instagram",
    "category",
    "oakerman_pick",
    "manager_pick",
  ];
  const csvRows = rows.map((cafe) => [
    cafe.id,
    cafe.name,
    cafe.address,
    cafe.desc,
    cafe.lat,
    cafe.lng,
    (cafe.signature || []).join(","),
    cafe.beanShop || "",
    cafe.instagram || "",
    (cafe.category || []).join(","),
    cafe.oakerman_pick ? "1" : "0",
    cafe.manager_pick ? "1" : "0",
  ]);
  const toCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    headers.join(","),
    ...csvRows.map((row) => row.map(toCell).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "kohee-cafes.csv";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function updateCsvFileName() {
  const file = $("csv-file").files[0];
  $("csv-file-name").textContent = file ? file.name : "선택된 파일 없음";
}

async function uploadCsv() {
  try {
    const file = $("csv-file").files[0];
    if (!file) {
      alert("CSV 파일을 선택해 주세요.");
      return;
    }
    $("csv-msg").textContent = "CSV 업로드 중...";

    const text = await file.text();
    const res = await api("/import-csv", {
      method: "POST",
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: text,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok)
      throw new Error(payload.error || "CSV 업로드에 실패했습니다.");

    const added = Number(payload.added || 0);
    const updated = Number(payload.updated || 0);
    const duplicated = Number(payload.duplicated || 0);
    const failed = Number(payload.failed || 0);
    const uploaded = added + updated;
    const duplicateIds = (payload.duplicateRows || [])
      .slice(0, 5)
      .map((row) => `${row.id} 중복`)
      .join(", ");

    const duplicateText = duplicated
      ? ` / 중복 ${duplicated}${duplicateIds ? ` (${duplicateIds}${duplicated > 5 ? " 외" : ""})` : ""}`
      : "";

    const message = `CSV 업로드 완료: 카페 ${uploaded}개 반영 (신규 ${added} / 수정 ${updated}${duplicateText} / 실패 ${failed})`;

    $("csv-file").value = "";
    updateCsvFileName();
    $("csv-msg").textContent = message;
    await loadCafes();
    $("csv-msg").textContent = message;
  } catch (error) {
    $("csv-msg").textContent = `CSV 업로드 실패: ${error.message}`;
    alert(error.message);
  }
}

async function dryRunCsv() {
  try {
    const file = $("csv-file").files[0];
    if (!file) {
      alert("CSV 파일을 선택해 주세요.");
      return;
    }
    $("csv-msg").textContent = "CSV 검증 중...";

    const text = await file.text();
    const res = await api("/import-csv?dryRun=1", {
      method: "POST",
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: text,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok)
      throw new Error(payload.error || "CSV 검증에 실패했습니다.");

    const message =
      `CSV 검증 완료: 신규 ${payload.wouldAdd || 0} / 수정 ${payload.wouldUpdate || 0}` +
      ` / 중복 ${payload.wouldDuplicate || 0} / 실패 ${payload.failed || 0}`;
    $("csv-msg").textContent = message;
  } catch (error) {
    $("csv-msg").textContent = `CSV 검증 실패: ${error.message}`;
    alert(error.message);
  }
}

async function resetCsv() {
  if (state.me.role !== "admin") {
    alert("CSV 초기화는 admin만 가능합니다.");
    return;
  }
  const count = state.cafes.length;
  if (
    !confirm(
      `현재 카페 데이터 ${count}개를 모두 삭제합니다.\n이후 CSV 업로드로 다시 넣을 수 있습니다.\n계속할까요?`,
    )
  )
    return;
  const typed = prompt(
    "정말 초기화하려면 아래의 '초기화'를 그대로 입력해 주세요.",
    "",
  );
  if (typed !== "초기화") {
    alert("초기화를 취소했습니다.");
    return;
  }

  const data = await jsonApi("/reset-csv", { method: "POST" });
  $("csv-file").value = "";
  updateCsvFileName();
  $("csv-msg").textContent =
    `CSV 초기화 완료: 카페 ${data.deleted || 0}개 삭제`;
  await loadCafes();
  closeCafeForm(true);
}

async function setRole() {
  const username = $("role-username").value.trim().toLowerCase();
  const role = $("role-value").value;
  await jsonApi("/set-role", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, role }),
  });
  alert("권한 반영 완료");
  await loadUsers();
}

async function loadUsers() {
  const query = encodeURIComponent($("user-search").value.trim().toLowerCase());
  const data = await jsonApi(`/users?q=${query}`);
  state.users = data.items || [];
  renderUsers();
}

function renderUsers() {
  $("user-count").textContent = `검색 결과 ${state.users.length}명`;
  if (!state.users.length) {
    $("user-list").innerHTML = emptyState("해당 아이디의 회원이 없습니다.");
    return;
  }

  $("user-list").innerHTML = state.users
    .map(
      (user) => `
    <div class="item">
      <h3>${esc(user.username)} <small style="font-size:.72rem;">(${esc(roleLabel(user.role))})</small></h3>
      <div class="mini">가입일: ${esc(user.created_at || "-")}</div>
      ${
        user.role === "admin"
          ? `<div class="mini">admin 계정은 권한 변경 대상에서 제외됩니다.</div>`
          : `
          <div class="btns" style="margin-top:6px;">
            <button type="button" class="user-pick" data-username="${esc(user.username)}" data-role="${esc(user.role)}">권한 관리에 입력</button>
          </div>
        `
      }
    </div>
  `,
    )
    .join("");

  [...document.querySelectorAll(".user-pick")].forEach((btn) => {
    btn.addEventListener("click", () => {
      $("role-username").value = btn.dataset.username || "";
      $("role-value").value =
        btn.dataset.role === "manager" ? "manager" : "user";
      $("role-username").scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  });
}

async function init() {
  const me = await jsonApi("/me");
  if (!me.user) {
    location.href = "login.html";
    return;
  }

  state.me = me.user;
  if (!["manager", "admin"].includes(state.me.role)) {
    alert("관리자 권한이 없습니다.");
    location.href = "index.html";
    return;
  }

  $("hello").textContent = `${state.me.username} (${roleLabel(state.me.role)})`;

  const isAdmin = state.me.role === "admin";
  $("notice-sec").classList.toggle("hidden", !isAdmin);
  $("user-sec").classList.toggle("hidden", !isAdmin);
  $("role-sec").classList.toggle("hidden", !isAdmin);
  $("oakerman-pick").disabled = !isAdmin;
  $("reviewed-note").textContent = isAdmin
    ? "전체 매니저/관리자 처리 내역"
    : "내가 처리한 승인/반려 내역";

  const errorTabs = [...document.querySelectorAll("#error-tabs button")];
  errorTabs.forEach((btn) =>
    btn.addEventListener("click", async () => {
      errorTabs.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      state.errorStatus = btn.dataset.status;
      await loadErrorReports();
    }),
  );

  const reviewedTabs = [...document.querySelectorAll("#reviewed-tabs button")];
  reviewedTabs.forEach((btn) =>
    btn.addEventListener("click", async () => {
      reviewedTabs.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      state.reviewedStatus = btn.dataset.status;
      await loadReviewedSubmissions();
    }),
  );

  $("logout-btn").addEventListener("click", async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    clearAuthToken();
    location.href = "index.html";
  });
  $("notice-save").addEventListener("click", () =>
    saveNotice().catch((error) => alert(error.message)),
  );
  $("cafe-search").addEventListener("input", renderCafeList);
  $("new-cafe-btn").addEventListener("click", prepareNewCafe);
  $("save-cafe-btn").addEventListener("click", () =>
    saveCafe().catch((error) => alert(error.message)),
  );
  $("delete-btn").addEventListener("click", () =>
    deleteCafe().catch((error) => alert(error.message)),
  );
  $("csv-download").addEventListener("click", downloadCsv);
  $("csv-file").addEventListener("change", updateCsvFileName);
  $("csv-dry-run").addEventListener("click", dryRunCsv);
  $("csv-upload").addEventListener("click", uploadCsv);
  $("csv-reset").addEventListener("click", () =>
    resetCsv().catch((error) => alert(error.message)),
  );
  $("role-set").addEventListener("click", () =>
    setRole().catch((error) => alert(error.message)),
  );
  $("user-search").addEventListener("input", () => {
    clearTimeout(state.userSearchTimer);
    state.userSearchTimer = setTimeout(
      () =>
        loadUsers().catch((error) => {
          $("user-count").textContent = error.message;
        }),
      180,
    );
  });

  const tasks = [
    loadCafes(),
    loadSubmissions(),
    loadErrorReports(),
    loadReviewedSubmissions(),
  ];
  if (isAdmin) tasks.push(loadUsers());
  updateCsvFileName();
  await Promise.all(tasks);
}

init().catch((error) => {
  $("hello").textContent = error.message;
});
