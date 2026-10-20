// 찜(이 브라우저)·내 제보·내 오류 제보(브라우저 표로 조회). 카페를 누르면 메인에서 연다.
import { $, clientId, favoriteIds, formatDate, jsonApi } from "./common.js";

const SUBMISSION_STATE = {
  reviewing: ["pending", "검토 중"],
  published: ["approved", "사이트에 올라감"],
  declined: ["rejected", "반영 안 됨"],
};
const REPORT_STATE = { open: "확인 중", resolved: "처리 완료" };

function el(tag, className, text = "") {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function card(title, statusClass, statusText, lines) {
  const article = el("article", "card");
  const top = el("div", "card-top");
  top.append(el("div", "card-name", title));
  if (statusText) top.append(el("span", `status ${statusClass}`, statusText));
  const body = el("div", "card-text");
  lines.filter(Boolean).forEach((line, index) => {
    if (index) body.append(document.createElement("br"));
    body.append(line);
  });
  article.append(top, body);
  return article;
}

function fill(id, nodes, emptyText) {
  $(id).replaceChildren(
    ...(nodes.length ? nodes : [el("div", "empty", emptyText)]),
  );
}

async function showFavorites() {
  const ids = favoriteIds();
  const cafes = ids.size
    ? (await jsonApi("/data")).filter((c) => ids.has(c.id))
    : [];
  fill(
    "fav-list",
    cafes.map((cafe) => {
      const link = el("a", "card fav-card", "");
      link.href = `index.html?cafe=${encodeURIComponent(cafe.id)}`;
      link.append(el("div", "card-name", cafe.name));
      return link;
    }),
    "찜한 카페가 없습니다. 카페를 열고 ☆ 를 누르면 여기에 모입니다.",
  );
}

async function showSubmissions() {
  const { items } = await jsonApi(`/my-submits?client_id=${clientId()}`);
  fill(
    "sub-list",
    items.map((item) => {
      const [statusClass, label] = SUBMISSION_STATE[item.state];
      return card(item.name, statusClass, label, [
        item.address,
        `제보일: ${formatDate(item.created_at)}`,
        item.reject_reason && `사유: ${item.reject_reason}`,
      ]);
    }),
    "이 브라우저에서 보낸 제보가 없습니다.",
  );
}

async function showErrorReports() {
  const { items } = await jsonApi(`/my-error-reports?client_id=${clientId()}`);
  fill(
    "error-list",
    items.map((item) =>
      card(item.title, item.status, REPORT_STATE[item.status], [
        item.page && `관련: ${item.page}`,
        item.content,
        `답변: ${item.reply || "아직 없습니다."}`,
      ]),
    ),
    "이 브라우저에서 보낸 오류 제보가 없습니다.",
  );
}

for (const [id, show] of [
  ["fav-list", showFavorites],
  ["sub-list", showSubmissions],
  ["error-list", showErrorReports],
]) {
  show().catch((error) =>
    fill(id, [], `불러오지 못했습니다: ${error.message}`),
  );
}
