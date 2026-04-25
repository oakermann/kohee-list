import { $, jsonApi } from "./common.js";

function categories() {
  return [...document.querySelectorAll('input[name="cat"]:checked')].map(
    (input) => input.value,
  );
}

async function loadCurrentUser() {
  const data = await jsonApi("/me");
  if (!data.user) {
    location.href = "login.html";
    return null;
  }
  $("me").textContent = `${data.user.username} 계정으로 제보 중입니다.`;
  return data.user;
}

async function submitCafe() {
  const payload = {
    name: $("name").value.trim(),
    address: $("address").value.trim(),
    desc: $("desc").value.trim(),
    reason: $("reason").value.trim(),
    signature: [],
    instagram: "",
    beanShop: "",
    category: categories(),
  };

  await jsonApi("/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  $("msg").textContent =
    "카페 제보가 저장되었습니다. 운영진 검토 후 반영됩니다.";
  ["name", "address", "desc", "reason"].forEach((id) => {
    $(id).value = "";
  });
  [...document.querySelectorAll('input[name="cat"]')].forEach((input) => {
    input.checked = false;
  });
}

async function submitErrorReport() {
  const payload = {
    title: $("error-title").value.trim(),
    page: $("error-page").value.trim(),
    content: $("error-content").value.trim(),
  };

  await jsonApi("/error-report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  $("error-msg").textContent =
    "오류 제보가 저장되었습니다. 운영진 답변은 마이페이지에서 확인할 수 있습니다.";
  ["error-title", "error-page", "error-content"].forEach((id) => {
    $(id).value = "";
  });
}

$("submit-btn").addEventListener("click", async () => {
  try {
    $("msg").textContent = "카페 제보 저장 중...";
    await submitCafe();
  } catch (error) {
    $("msg").textContent = error.message;
  }
});

$("error-submit-btn").addEventListener("click", async () => {
  try {
    $("error-msg").textContent = "오류 제보 저장 중...";
    await submitErrorReport();
  } catch (error) {
    $("error-msg").textContent = error.message;
  }
});

loadCurrentUser().catch((error) => {
  $("me").textContent = error.message;
});
