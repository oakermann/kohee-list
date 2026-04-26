import { $, jsonApi } from "./common.js?v=20260426-1";

function showTab(mode) {
  const isLoginMode = mode === "login";
  $("page-title").textContent = isLoginMode ? "로그인" : "회원가입";
  $("login-panel").classList.toggle("active", isLoginMode);
  $("signup-panel").classList.toggle("active", !isLoginMode);
  $("msg").textContent = "";
}

async function call(path, payload) {
  return jsonApi(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function doLogin() {
  const username = $("login-id").value.trim().toLowerCase();
  const password = $("login-pw").value;
  await call("/login", { username, password });
  location.href = "index.html";
}

async function doSignup() {
  const username = $("signup-id").value.trim().toLowerCase();
  const password = $("signup-pw").value;

  try {
    await call("/signup", { username, password });
  } catch (error) {
    const needsFirstAdminCode = [
      "FIRST_ADMIN_CODE_REQUIRED",
      "FIRST_ADMIN_CODE_INVALID",
    ].includes(error.code);
    if (!needsFirstAdminCode) {
      throw error;
    }

    const adminCode =
      prompt(
        "최초 관리자 코드가 필요합니다. 관리자 코드를 입력해 주세요.",
        "",
      ) || "";
    if (!adminCode.trim()) {
      throw new Error("최초 관리자 코드가 필요합니다.");
    }

    await call("/signup", { username, password, admin_code: adminCode.trim() });
  }

  await call("/login", { username, password });
  location.href = "index.html";
}

$("open-signup").addEventListener("click", () => showTab("signup"));
$("back-login").addEventListener("click", () => showTab("login"));
$("btn-login").addEventListener("click", async () => {
  try {
    await doLogin();
  } catch (error) {
    $("msg").textContent = error.message;
  }
});
$("btn-signup").addEventListener("click", async () => {
  try {
    await doSignup();
  } catch (error) {
    $("msg").textContent = error.message;
  }
});
