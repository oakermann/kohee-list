import { health, healthDb, versionInfo } from "./shared.js";
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
  ["GET", "/my-submits", mySubmissions],
  ["GET", "/my-error-reports", myErrorReports],
  ["POST", "/error-report", submitErrorReport],
  ["GET", "/favorites", getFavorites],
  ["POST", "/favorite", toggleFavorite],
];

// This group is a routing surface, not the final permission contract.
// Some handlers below enforce stricter admin-only checks internally.
export const MANAGER_ROUTES = [
  ["GET", "/submissions", getSubmissions],
  ["GET", "/error-reports", getErrorReports],
  ["POST", "/reply-error-report", replyErrorReport],
  ["POST", "/resolve-error-report", resolveErrorReport],
  ["POST", "/approve", approveSubmission],
  ["POST", "/reject", rejectSubmission],
  ["POST", "/update-submission", updateSubmission],
  ["GET", "/cafes", listCafes],
  ["POST", "/add", addCafe],
  ["POST", "/edit", editCafe],
  ["POST", "/delete", deleteCafe],
  ["POST", "/restore", restoreCafe],
  ["POST", "/import-csv", importCsv],
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
  ...MANAGER_ROUTES,
  ...ADMIN_ROUTES,
];
