import { health } from "./shared.js";
import { login, logout, me, signup } from "./auth.js";
import {
  addCafe,
  deleteCafe,
  editCafe,
  getData,
  getNotice,
  resetCsv,
  setNotice,
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
import { importCsv } from "./csv.js";

export const AUTH_ROUTES = [
  ["POST", "/signup", signup],
  ["POST", "/login", login],
  ["POST", "/logout", logout],
  ["GET", "/me", me],
];

export const PUBLIC_ROUTES = [
  ["GET", "/health", health],
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

export const MANAGER_ROUTES = [
  ["GET", "/submissions", getSubmissions],
  ["GET", "/error-reports", getErrorReports],
  ["POST", "/reply-error-report", replyErrorReport],
  ["POST", "/resolve-error-report", resolveErrorReport],
  ["POST", "/approve", approveSubmission],
  ["POST", "/reject", rejectSubmission],
  ["POST", "/update-submission", updateSubmission],
  ["POST", "/add", addCafe],
  ["POST", "/edit", editCafe],
  ["POST", "/delete", deleteCafe],
  ["POST", "/import-csv", importCsv],
];

export const ADMIN_ROUTES = [
  ["GET", "/users", getUsers],
  ["POST", "/set-role", setRole],
  ["POST", "/notice", setNotice],
  ["POST", "/reset-csv", resetCsv],
];

export const ROUTES = [
  ...AUTH_ROUTES,
  ...PUBLIC_ROUTES,
  ...USER_ROUTES,
  ...MANAGER_ROUTES,
  ...ADMIN_ROUTES,
];
