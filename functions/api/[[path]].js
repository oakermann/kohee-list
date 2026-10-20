// 사이트와 API 가 같은 주소(kohee.pages.dev)에서 같은 곳에서 돈다 — 워커로 다시 보내지 않으니
// 쿠키는 1자 쿠키이고, DB 는 이 Pages 프로젝트에 직접 묶인다(wrangler.toml).
import { handle } from "../../server/app.js";

export const onRequest = ({ request, env }) => handle(request, env);
