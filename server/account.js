import {
  HttpError,
  clearCookieHeader,
  clearCsrfCookieHeader,
  json,
  readJson,
  requireAuth,
  verifyPassword,
  withGuard,
} from "./shared.js";
import { consumeRateLimit, safeWriteAuditLog } from "./security.js";

// PIPA Article 35-5/36/37: self-service data deletion (권리행사 채널).
// Deletes the account and all personal data child rows in a single atomic
// batch. Public, approved cafe content is preserved but de-identified
// (created_by -> NULL). Admin accounts are blocked from self-deletion so the
// last admin can never disappear.
export async function deleteAccount(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);

    // Block admin self-delete: signup makes the first user admin, and setRole
    // refuses to demote an admin, so a self-delete could erase the last admin.
    if (user.role === "admin") {
      throw new HttpError(
        403,
        "관리자 계정은 직접 탈퇴할 수 없습니다(운영자 문의).",
        "ADMIN_SELF_DELETE_FORBIDDEN",
      );
    }

    await consumeRateLimit(env, `delete-account:${user.user_id}`, 5, 10);

    const body = await readJson(req);

    // Re-authenticate: requireAuth's user object has no password_hash, so
    // re-select it and verify the supplied password before destroying data.
    const row = await env.DB.prepare(
      "SELECT id, password_hash FROM users WHERE id = ?",
    )
      .bind(user.user_id)
      .first();
    if (!row) {
      throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(
      String(body.password || ""),
      row.password_hash,
    );
    if (!valid) {
      throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const id = user.user_id;

    // Record the deletion audit log BEFORE deleting the actor. audit_logs.
    // actor_user_id is ON DELETE SET NULL, so the row survives the delete as a
    // record of the deletion itself. No PII in the snapshot (username/role
    // only, which scrubAuditValue drops from the persisted JSON).
    await safeWriteAuditLog(env, {
      actorUserId: id,
      action: "user.delete_account",
      targetType: "user",
      targetId: id,
      before: { username: user.username, role: user.role },
      after: { self_deleted: true },
    });

    // Explicit child-first atomic delete. We do NOT trust D1 FK cascade: run
    // an ordered batch so children go before parents and the users row is
    // last. cafes.created_by is set NULL to keep public approved cafes while
    // removing the author link. audit_logs is left untouched (SET NULL keeps
    // the deletion record).
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM error_report_replies WHERE report_id IN (SELECT id FROM error_reports WHERE user_id = ?)",
      ).bind(id),
      env.DB.prepare("DELETE FROM error_reports WHERE user_id = ?").bind(id),
      env.DB.prepare("DELETE FROM submissions WHERE user_id = ?").bind(id),
      env.DB.prepare("DELETE FROM favorites WHERE user_id = ?").bind(id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
      env.DB.prepare(
        "UPDATE cafes SET created_by = NULL WHERE created_by = ?",
      ).bind(id),
      env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id),
    ]);

    // The batch already deleted every session (logout on all devices). Clear
    // the client cookies the same way logout does.
    return json({ ok: true }, 200, req, env, {
      "set-cookie": [clearCookieHeader(), clearCsrfCookieHeader()],
    });
  });
}
