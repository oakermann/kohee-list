// Site and API run at the same address (kohee.pages.dev) in the same place — nothing is forwarded to a worker, so
// cookies are first-party and the DB is bound directly to this Pages project (wrangler.toml).
import { handle } from "../../server/app.js";

export const onRequest = ({ request, env }) => handle(request, env);
