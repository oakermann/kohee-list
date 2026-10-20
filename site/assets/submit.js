// 카페 제보·오류 제보 — 로그인 없이, 이 브라우저의 표(client_id)를 붙여 보낸다.
import { $, clientId, postJson } from "./common.js";

function checkedCategories() {
  return [...document.querySelectorAll('input[name="cat"]:checked')].map(
    (input) => input.value,
  );
}

function clear(ids) {
  ids.forEach((id) => {
    $(id).value = "";
  });
}

async function send(msgId, path, payload, doneText, fieldIds) {
  $(msgId).textContent = "보내는 중...";
  try {
    await postJson(path, { ...payload, client_id: clientId() });
    $(msgId).textContent = doneText;
    clear(fieldIds);
    return true;
  } catch (error) {
    $(msgId).textContent = error.message;
    return false;
  }
}

$("submit-btn").addEventListener("click", async () => {
  const sent = await send(
    "msg",
    "/submit",
    {
      name: $("name").value,
      address: $("address").value,
      desc: $("desc").value,
      reason: $("reason").value,
      category: checkedCategories(),
    },
    "제보를 받았습니다. 운영진이 확인한 뒤 사이트에 올립니다.",
    ["name", "address", "desc", "reason"],
  );
  if (!sent) return;
  document.querySelectorAll('input[name="cat"]').forEach((input) => {
    input.checked = false;
  });
});

$("error-submit-btn").addEventListener("click", () =>
  send(
    "error-msg",
    "/error-report",
    {
      title: $("error-title").value,
      page: $("error-page").value,
      content: $("error-content").value,
    },
    "오류 제보를 받았습니다. 답변은 '찜·내 제보'에서 볼 수 있습니다.",
    ["error-title", "error-page", "error-content"],
  ),
);
