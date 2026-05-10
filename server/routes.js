import {
  health,
  healthDb,
  json,
  requireAuth,
  requireRole,
  versionInfo,
  withGuard,
} from "./shared.js";
import { login, logout, me, signup } from "./auth.js";
import {
  addCafe,
  approveCafe,
  deleteCafe,
  editCafe,
  getData,
  getNotice,
  holdCafe,
  listCafes,
  restoreCafe,
  setNotice,
  unholdCafe,
} from "./cafes.js";
import {
  approveSubmission,
  getSubmissions,
  mySubmissions,
  rejectSubmission,
  submitCafe,
  updateSubmission,
} from "./submissions.js";
import {
  getErrorReports,
  myErrorReports,
  replyErrorReport,
  resolveErrorReport,
  submitErrorReport,
} from "./errorReports.js";
import { getFavorites, toggleFavorite } from "./favorites.js";
import { getUsers, setRole } from "./users.js";
import {
  exportApprovedReviewCsv,
  exportCandidatesReviewCsv,
  exportHoldReviewCsv,
  exportSubmissionsReviewCsv,
  importCsv,
  resetCsv,
} from "./csv.js";

const USER_FACING_OPERATOR_LABEL = "운영진";

function adminOnly(handler) {
  return (req, env) =>
    withGuard(req, env, async () => {
      const user = await requireAuth(req, env);
      requireRole(user, ["admin"]);
      return handler(req, env);
    });
}

function redactOperatorFields(item) {
  const reviewed = !!(item.reviewed_by || item.reviewed_by_username);
  const replied = !!(item.replied_by || item.replied_by_username);
  const resolved = !!(item.resolved_by || item.resolved_by_username);
  return {
    ...item,
    reviewed_by: null,
    reviewed_by_username: reviewed ? USER_FACING_OPERATOR_LABEL : null,
    replied_by: null,
    replied_by_username: replied ? USER_FACING_OPERATOR_LABEL : null,
    resolved_by: null,
    resolved_by_username: resolved ? USER_FACING_OPERATOR_LABEL : null,
  };
}

function redactUserFacingOperators(handler) {
  return async (req, env) => {
    const response = await handler(req, env);
    if (!response.ok) return response;

    let payload;
    try {
      payload = await response.clone().json();
    } catch {
      return response;
    }

    if (!Array.isArray(payload?.items)) return response;
    return json(
      { ...payload, items: payload.items.map(redactOperatorFields) },
      response.status,
      req,
      env,
    );
  };
}

export const AUTH_ROUTES = [
  ["POST", "/signup", signup],
  ["POST", "/login", login],
  ["POST", "/logout", logout],
  ["GET", "/me", me],
];

export const PUBLIC_ROUTES = [
  ["GET", "/health", health],
  ["GET", "/health/db", healthDb],
  ["GET", "/version", versionInfo],
  ["GET", "/data", getData],
  ["GET", "/notice", getNotice],
];

export const USER_ROUTES = [
  ["POST", "/submit", submitCafe],
  ["GET", "/my-submits", redactUserFacingOperators(mySubmissions)],
  ["GET", "/my-error-reports", redactUserFacingOperators(myErrorReports)],
  ["POST", "/error-report", submitErrorReport],
  ["GET", "/favorites", getFavorites],
  ["POST", "/favorite", toggleFavorite],
];

export const ADMIN_OPERATION_ROUTES = [
  ["GET", "/submissions", adminOnly(getSubmissions)],
  ["GET", "/error-reports", adminOnly(getErrorReports)],
  ["POST", "/reply-error-report", adminOnly(replyErrorReport)],
  ["POST", "/resolve-error-report", adminOnly(resolveErrorReport)],
  ["POST", "/approve", adminOnly(approveSubmission)],
  ["POST", "/reject", adminOnly(rejectSubmission)],
  ["POST", "/update-submission", adminOnly(updateSubmission)],
  ["GET", "/cafes", adminOnly(listCafes)],
  ["POST", "/add", adminOnly(addCafe)],
  ["POST", "/edit", adminOnly(editCafe)],
  ["POST", "/delete", adminOnly(deleteCafe)],
  ["POST", "/restore", adminOnly(restoreCafe)],
  ["POST", "/import-csv", adminOnly(importCsv)],
];

export const ADMIN_ROUTES = [
  ["GET", "/users", getUsers],
  ["POST", "/set-role", setRole],
  ["POST", "/notice", setNotice],
  ["POST", "/reset-csv", resetCsv],
  ["GET", "/export-csv/candidates-review", exportCandidatesReviewCsv],
  ["GET", "/export-csv/hold-review", exportHoldReviewCsv],
  ["GET", "/export-csv/approved-review", exportApprovedReviewCsv],
  ["GET", "/export-csv/submissions-review", exportSubmissionsReviewCsv],
  ["POST", "/approve-cafe", approveCafe],
  ["POST", "/hold-cafe", holdCafe],
  ["POST", "/unhold-cafe", unholdCafe],
];

export const ROUTES = [
  ...AUTH_ROUTES,
  ...PUBLIC_ROUTES,
  ...USER_ROUTES,
  ...ADMIN_OPERATION_ROUTES,
  ...ADMIN_ROUTES,
];
