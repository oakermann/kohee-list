import {
  $,
  api,
  clearAuthToken,
  errorStatusLabel,
  formatDate,
  jsonApi,
  roleLabel,
  statusLabel,
  storeCsrfFromPayload,
} from "./common.js?v=20260426-1";

const state = {
  me: null,
  cafes: [],
  cafeKeyCounts: {},
  cafeLifecycle: "active",
  submissions: [],
  editApproveId: "",
  editApproveName: "",
  errorReports: [],
  errorStatus: "open",
  reviewConsoleTab: "submissions",
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

function isAdmin() {
  return state.me?.role === "admin";
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
  const reviewMode = $("review-mode");
  const title = document.createElement("h3");
  title.textContent = "수정 후 승인 준비 중";

  const target = document.createElement("div");
  target.className = "mini";
  target.textContent = `대상 제보: ${state.editApproveName}`;

  const guide = document.createElement("div");
  guide.className = "mini";
  const saveLabel = document.createElement("b");
  saveLabel.textContent = "수정 후 승인 저장";
  guide.append(
    "아래 입력칸을 보완한 뒤 ",
    saveLabel,
    "을 누르면 카페로 등록됩니다.",
  );

  reviewMode.classList.remove("hidden");
  reviewMode.replaceChildren(title, target, guide);
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
  $("delete-btn").textContent =
    $("cafe-id").value.trim() && isAdmin() ? "삭제" : "닫기";
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
    const rows = await jsonApi(
      `/cafes?lifecycle=${encodeURIComponent(state.cafeLifecycle)}`,
    );
    state.cafes = Array.isArray(rows) ? rows : [];
    state.cafeKeyCounts = state.cafes.reduce((acc, cafe) => {
      const key = cafeKey(cafe);
      if (key !== "||") acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    $("cafe-count").textContent = `로드된 카페 ${state.cafes.length}개`;
    renderCafeList();
    renderReviewConsole();
  } catch (error) {
    state.cafes = [];
    state.cafeKeyCounts = {};
    $("cafe-count").textContent = "카페 데이터를 불러오지 못했습니다.";
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent = `카페 데이터 로드 실패: ${error.message}`;
    $("cafe-list").replaceChildren(empty);
    renderReviewConsole();
  }
}

function renderCafeList() {
  const list = $("cafe-list");
  const query = $("cafe-search").value.trim().toLowerCase();
  if (!state.cafes.length) {
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent =
      "등록된 카페 데이터가 없습니다. 기존 데이터는 CSV 업로드로 먼저 넣어 주세요.";
    list.replaceChildren(empty);
    return;
  }
  if (!query) {
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent = "카페명을 검색하면 기존 카페 카드가 표시됩니다.";
    list.replaceChildren(empty);
    return;
  }

  const rows = state.cafes
    .filter((cafe) =>
      `${cafe.name} ${cafe.address}`.toLowerCase().includes(query),
    )
    .slice(0, 120);

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent = "검색 결과가 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const cards = rows.map((cafe) => {
    const item = document.createElement("div");
    item.className = "item";

    const name = document.createElement("h3");
    name.textContent = cafe.name || "";

    const id = document.createElement("div");
    id.className = "mini";
    id.textContent = `ID: ${cafe.id}${isDuplicateCafe(cafe) ? " (중복)" : ""}`;

    const status = document.createElement("div");
    status.className = "mini";
    status.textContent = `상태: ${statusLabel(cafe.status)}`;

    item.append(name, id, status);

    if (cafe.deleted_at) {
      const deleted = document.createElement("div");
      deleted.className = "mini";
      deleted.textContent = `삭제됨: ${formatDateTime(cafe.deleted_at)}`;
      item.append(deleted);
    }

    const address = document.createElement("div");
    address.className = "mini";
    address.textContent = cafe.address || "";

    const actions = document.createElement("div");
    actions.className = "btns admin-actions";

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "pick-cafe";
    pick.dataset.id = cafe.id;
    pick.textContent = "선택";
    pick.addEventListener("click", () => {
      const selectedCafe = state.cafes.find(
        (item) => item.id === pick.dataset.id,
      );
      if (!selectedCafe) return;
      clearEditApproveMode(false);
      fillCafeForm(selectedCafe);
      $("save-cafe-btn").textContent = "저장";
      $("delete-btn").textContent = isAdmin() ? "삭제" : "닫기";
      openCafeForm();
    });

    actions.append(pick);

    if (!cafe.deleted_at && cafe.status === "candidate" && isAdmin()) {
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "approve-cafe";
      approve.dataset.id = cafe.id;
      approve.textContent = "승인";
      approve.addEventListener("click", () =>
        approveCafe(approve.dataset.id).catch((error) => alert(error.message)),
      );
      actions.append(approve);
    }

    if (cafe.deleted_at && isAdmin()) {
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "restore-cafe";
      restore.dataset.id = cafe.id;
      restore.textContent = "복구";
      restore.addEventListener("click", () =>
        restoreCafe(restore.dataset.id).catch((error) => alert(error.message)),
      );
      actions.append(restore);
    }

    item.append(address, actions);
    return item;
  });

  list.replaceChildren(...cards);
}

async function loadSubmissions() {
  const data = await jsonApi("/submissions?status=pending");
  state.submissions = data.items || [];
  renderSubmissions();
  renderReviewConsole();
}

function renderSubmissions() {
  const list = $("sub-list");
  if (!state.submissions.length) {
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent = "해당 상태의 제보가 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const items = state.submissions.map((submission) => {
    const item = document.createElement("div");
    item.className = "item";

    const title = document.createElement("h3");
    title.append(document.createTextNode(submission.name || ""));
    const user = document.createElement("small");
    user.className = "admin-small";
    user.textContent = `(${submission.username || ""})`;
    title.append(document.createTextNode(" "), user);

    const address = document.createElement("div");
    address.className = "mini";
    address.textContent = submission.address || "";

    const desc = document.createElement("div");
    desc.className = "mini";
    desc.textContent = submission.desc || "";

    const reason = document.createElement("div");
    reason.className = "mini";
    reason.textContent = `추천 이유: ${submission.reason || "-"}`;

    const status = document.createElement("div");
    status.className = "mini";
    status.textContent = `상태: ${statusLabel(submission.status)}${
      submission.reject_reason
        ? ` / 반려 사유: ${submission.reject_reason}`
        : ""
    }`;

    const actions = document.createElement("div");
    actions.className = "btns admin-actions";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.className = "s-approve";
    approveBtn.dataset.id = submission.id;
    approveBtn.textContent = "승인";
    approveBtn.addEventListener("click", () =>
      approve(approveBtn.dataset.id, false),
    );

    const editApproveBtn = document.createElement("button");
    editApproveBtn.type = "button";
    editApproveBtn.className = "s-edit-approve";
    editApproveBtn.dataset.id = submission.id;
    editApproveBtn.textContent = "수정 후 승인";
    editApproveBtn.addEventListener("click", () =>
      approve(editApproveBtn.dataset.id, true),
    );

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "s-reject warn";
    rejectBtn.dataset.id = submission.id;
    rejectBtn.textContent = "반려";
    rejectBtn.addEventListener("click", () => reject(rejectBtn.dataset.id));

    const duplicateBtn = document.createElement("button");
    duplicateBtn.type = "button";
    duplicateBtn.className = "s-dup";
    duplicateBtn.dataset.id = submission.id;
    duplicateBtn.textContent = "중복 처리";
    duplicateBtn.addEventListener("click", () =>
      markDuplicate(duplicateBtn.dataset.id),
    );

    actions.append(approveBtn, editApproveBtn, rejectBtn, duplicateBtn);
    item.append(title, address, desc, reason, status, actions);
    return item;
  });

  list.replaceChildren(...items);
}

async function loadReviewedSubmissions() {
  const data = await jsonApi(`/submissions?status=${state.reviewedStatus}`);
  state.reviewedSubmissions = data.items || [];
  renderReviewedSubmissions();
}

function renderReviewedSubmissions() {
  const list = $("reviewed-list");
  if (!state.reviewedSubmissions.length) {
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent = "해당 상태의 처리 내역이 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const items = state.reviewedSubmissions.map((submission) => {
    const item = document.createElement("div");
    item.className = "item";

    const title = document.createElement("h3");
    title.append(document.createTextNode(submission.name || ""));
    const user = document.createElement("small");
    user.className = "admin-small";
    user.textContent = `(${submission.username || ""})`;
    title.append(document.createTextNode(" "), user);

    const address = document.createElement("div");
    address.className = "mini";
    address.textContent = submission.address || "";

    const status = document.createElement("div");
    status.className = "mini";
    const statusParts = [`처리: ${statusLabel(submission.status)}`];
    if (submission.reviewed_by_username) {
      statusParts.push(`담당: ${submission.reviewed_by_username}`);
    }
    status.textContent = statusParts.join(" / ");

    item.append(title, address, status);

    if (submission.linked_cafe_id) {
      const linkedCafe = document.createElement("div");
      linkedCafe.className = "mini";
      linkedCafe.textContent = `연결 cafe id: ${submission.linked_cafe_id}`;
      item.append(linkedCafe);
    }

    if (submission.reject_reason) {
      const rejectReason = document.createElement("div");
      rejectReason.className = "mini";
      rejectReason.textContent = `반려 사유: ${submission.reject_reason}`;
      item.append(rejectReason);
    }

    return item;
  });

  list.replaceChildren(...items);
}

function reviewConsoleEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "item empty-state";
  empty.textContent = message;
  return empty;
}

function reviewConsoleSubmissionItem(submission) {
  const item = document.createElement("div");
  item.className = "item";

  const title = document.createElement("h3");
  title.textContent = submission.name || "";

  const address = document.createElement("div");
  address.className = "mini";
  address.textContent = submission.address || "";

  const status = document.createElement("div");
  status.className = "mini";
  status.textContent = `상태: ${statusLabel(submission.status)}`;

  item.append(title, address, status);
  return item;
}

function reviewConsoleCafeItem(cafe) {
  const item = document.createElement("div");
  item.className = "item";

  const title = document.createElement("h3");
  title.textContent = cafe.name || "";

  const address = document.createElement("div");
  address.className = "mini";
  address.textContent = cafe.address || "";

  const status = document.createElement("div");
  status.className = "mini";
  status.textContent = `상태: ${statusLabel(cafe.status)}`;

  item.append(title, address, status);

  if (isAdmin()) {
    const actions = document.createElement("div");
    actions.className = "item-actions";

    if (cafe.status === "candidate") {
      const hold = document.createElement("button");
      hold.type = "button";
      hold.textContent = "보류";
      hold.addEventListener("click", () => holdCafe(cafe.id));
      actions.append(hold);
    }

    if (cafe.status === "hidden") {
      const unhold = document.createElement("button");
      unhold.type = "button";
      unhold.textContent = "후보로 복귀";
      unhold.addEventListener("click", () => unholdCafe(cafe.id));
      actions.append(unhold);
    }

    if (actions.children.length) item.append(actions);
  }

  return item;
}

function renderReviewConsole() {
  const list = $("review-console-list");
  const note = $("review-console-note");
  if (!list || !note) return;

  if (state.reviewConsoleTab === "submissions") {
    note.textContent = "검토 대기 제보를 기존 제보 목록과 함께 확인합니다.";
    const items = state.submissions.map(reviewConsoleSubmissionItem);
    list.replaceChildren(
      ...(items.length
        ? items
        : [reviewConsoleEmpty("검토 대기 제보가 없습니다.")]),
    );
    return;
  }

  const targetStatus =
    state.reviewConsoleTab === "approved"
      ? "approved"
      : state.reviewConsoleTab === "hold"
        ? "hidden"
        : "candidate";
  note.textContent =
    targetStatus === "approved"
      ? "공개 중인 카페를 기존 카페 관리 데이터에서 확인합니다."
      : targetStatus === "hidden"
        ? "보류 중인 후보 카페를 기존 카페 관리 데이터에서 확인합니다."
        : "공개 전 후보 카페를 기존 카페 관리 데이터에서 확인합니다.";
  const cafes = state.cafes
    .filter((cafe) => !cafe.deleted_at && cafe.status === targetStatus)
    .map(reviewConsoleCafeItem);
  list.replaceChildren(
    ...(cafes.length ? cafes : [reviewConsoleEmpty("해당 카페가 없습니다.")]),
  );
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
  const list = $("error-list");
  if (!state.errorReports.length) {
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent = "해당 상태의 오류 제보가 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const items = state.errorReports.map((report) => {
    const item = document.createElement("div");
    item.className = "item";

    const title = document.createElement("h3");
    title.append(document.createTextNode(report.title || ""));
    const user = document.createElement("small");
    user.className = "admin-small";
    user.textContent = `(${report.username || ""})`;
    title.append(document.createTextNode(" "), user);

    const page = document.createElement("div");
    page.className = "mini";
    page.textContent = `관련: ${report.page || "-"}`;

    const content = document.createElement("div");
    content.className = "mini";
    content.textContent = report.content || "";

    const status = document.createElement("div");
    status.className = "mini";
    const statusParts = [`상태: ${errorStatusLabel(report.status)}`];
    if (report.resolved_by_username) {
      statusParts.push(`처리: ${report.resolved_by_username}`);
    }
    if (report.resolved_at) {
      statusParts.push(formatDateTime(report.resolved_at));
    }
    status.textContent = statusParts.join(" / ");

    const replyBlock = document.createElement("div");
    replyBlock.className = "reply-block";

    const replyMeta = document.createElement("div");
    replyMeta.className = "reply-meta";
    if (report.reply_message) {
      const replyParts = ["운영진 답변 등록됨"];
      if (report.replied_by_username)
        replyParts.push(report.replied_by_username);
      if (report.replied_at) replyParts.push(formatDateTime(report.replied_at));
      replyMeta.textContent = replyParts.join(" / ");
    } else {
      replyMeta.textContent = "운영진 답변이 아직 없습니다.";
    }

    const input = document.createElement("textarea");
    input.className = "error-reply-input";
    input.dataset.id = report.id;
    input.placeholder = "이 오류 제보에 대한 답변을 입력해 주세요.";
    input.value = report.reply_message || "";

    const actions = document.createElement("div");
    actions.className = "reply-actions";

    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "e-reply primary";
    replyBtn.dataset.id = report.id;
    replyBtn.textContent = report.reply_message ? "답변 수정" : "답변 저장";
    replyBtn.addEventListener("click", () =>
      saveErrorReply(replyBtn.dataset.id),
    );
    actions.append(replyBtn);

    if (report.status === "open") {
      const resolveBtn = document.createElement("button");
      resolveBtn.type = "button";
      resolveBtn.className = "e-resolve";
      resolveBtn.dataset.id = report.id;
      resolveBtn.textContent = "처리 완료";
      resolveBtn.addEventListener("click", () =>
        resolveErrorReport(resolveBtn.dataset.id),
      );
      actions.append(resolveBtn);
    }

    replyBlock.append(replyMeta, input, actions);
    item.append(title, page, content, status, replyBlock);
    return item;
  });

  list.replaceChildren(...items);
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
  storeCsrfFromPayload(data);
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
  if (!isAdmin()) {
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

async function restoreCafe(id) {
  if (!id) return;
  if (!confirm("이 카페를 복구할까요?")) return;
  await jsonApi("/restore", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  await loadCafes();
  closeCafeForm(true);
}

async function approveCafe(id) {
  if (!id) return;
  if (!confirm("이 카페를 공개할까요?")) return;
  await jsonApi("/approve-cafe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  await loadCafes();
  closeCafeForm(true);
}

async function holdCafe(id) {
  if (!id) return;
  if (!confirm("이 후보 카페를 보류할까요?")) return;
  await jsonApi("/hold-cafe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  await loadCafes();
  closeCafeForm(true);
}

async function unholdCafe(id) {
  if (!id) return;
  if (!confirm("이 보류 카페를 후보로 되돌릴까요?")) return;
  await jsonApi("/unhold-cafe", {
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
    storeCsrfFromPayload(payload);
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
    storeCsrfFromPayload(payload);
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
  const file = $("csv-file").files[0];
  if (!file) {
    alert("CSV 파일을 선택해 주세요.");
    return;
  }
  const count = state.cafes.length;
  if (
    !confirm(`CSV 검증 후 현재 활성 카페 ${count}개를 교체합니다.\n계속할까요?`)
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

  const text = await file.text();
  const data = await jsonApi("/reset-csv", {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: text,
  });
  $("csv-file").value = "";
  updateCsvFileName();
  $("csv-msg").textContent =
    `CSV 초기화 완료: 삭제 ${data.deleted || 0} / 신규 ${data.added || 0} / 수정 ${data.updated || 0}`;
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
  const list = $("user-list");
  $("user-count").textContent = `검색 결과 ${state.users.length}명`;
  if (!state.users.length) {
    const empty = document.createElement("div");
    empty.className = "item empty-state";
    empty.textContent = "해당 아이디의 회원이 없습니다.";
    list.replaceChildren(empty);
    return;
  }

  const items = state.users.map((user) => {
    const item = document.createElement("div");
    item.className = "item";

    const title = document.createElement("h3");
    title.append(document.createTextNode(user.username || ""));
    title.append(document.createTextNode(" "));
    const role = document.createElement("small");
    role.className = "admin-small";
    role.textContent = `(${roleLabel(user.role)})`;
    title.append(role);
    item.append(title);

    const createdAt = document.createElement("div");
    createdAt.className = "mini";
    createdAt.textContent = `가입일: ${user.created_at || "-"}`;
    item.append(createdAt);

    if (user.role === "admin") {
      const notice = document.createElement("div");
      notice.className = "mini";
      notice.textContent = "admin 계정은 권한 변경 대상에서 제외됩니다.";
      item.append(notice);
    } else {
      const actions = document.createElement("div");
      actions.className = "btns admin-actions";

      const pick = document.createElement("button");
      pick.type = "button";
      pick.className = "user-pick";
      pick.dataset.username = user.username || "";
      pick.dataset.role = user.role || "";
      pick.textContent = "권한 관리에 입력";
      pick.addEventListener("click", () => {
        $("role-username").value = pick.dataset.username || "";
        $("role-value").value =
          pick.dataset.role === "manager" ? "manager" : "user";
        $("role-username").scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      actions.append(pick);
      item.append(actions);
    }

    return item;
  });

  list.replaceChildren(...items);
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

  const admin = isAdmin();
  $("notice-sec").classList.toggle("hidden", !admin);
  $("user-sec").classList.toggle("hidden", !admin);
  $("role-sec").classList.toggle("hidden", !admin);
  $("csv-dry-run").classList.toggle("hidden", !admin);
  $("csv-upload").classList.toggle("hidden", !admin);
  $("csv-reset").classList.toggle("hidden", !admin);
  $("csv-file").disabled = !admin;
  $("oakerman-pick").disabled = !admin;
  $("reviewed-note").textContent = admin
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

  const reviewConsoleTabs = [
    ...document.querySelectorAll("#review-console-tabs button"),
  ];
  reviewConsoleTabs.forEach((btn) =>
    btn.addEventListener("click", () => {
      reviewConsoleTabs.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      state.reviewConsoleTab = btn.dataset.tab;
      renderReviewConsole();
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
  $("cafe-lifecycle").addEventListener("change", async () => {
    state.cafeLifecycle = $("cafe-lifecycle").value;
    await loadCafes();
  });
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
  if (admin) tasks.push(loadUsers());
  updateCsvFileName();
  await Promise.all(tasks);
}

init().catch((error) => {
  $("hello").textContent = error.message;
});
