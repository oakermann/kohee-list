import { $, jsonApi, setAuthToken } from "./common.js";

function showTab(mode) {
  const isLoginMode = mode === "login";
  $("page-title").textContent = isLoginMode ? "로그인" : "회원가입";
  $("login-panel").classList.toggle("active", isLoginMode);
  $("signup-panel").classList.toggle("active", !isLoginMode);
  $("msg").textContent = "";
}

async function call(path, payload) {
  const data = await jsonApi(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (data?.token) setAuthToken(data.token);
  return data;
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
  await call("/signup", { username, password });
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
