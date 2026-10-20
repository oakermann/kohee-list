import { adminLogin, adminLogout, adminMe, adminOnly } from "./admin.js";
import {
  addCafe,
  deleteCafe,
  editCafe,
  geocode,
  getData,
  getNotice,
  listCafes,
  mySubmissions,
  publishCafe,
  purgeCafe,
  restoreCafe,
  setNotice,
  submitCafe,
} from "./cafes.js";
import { importCsv } from "./csv.js";
import {
  listErrorReports,
  myErrorReports,
  replyErrorReport,
  resolveErrorReport,
  submitErrorReport,
} from "./errorReports.js";

const PUBLIC_ROUTES = [
  ["GET", "/data", getData],
  ["GET", "/notice", getNotice],
  ["POST", "/submit", submitCafe],
  ["GET", "/my-submits", mySubmissions],
  ["POST", "/error-report", submitErrorReport],
  ["GET", "/my-error-reports", myErrorReports],
  ["POST", "/admin/login", adminLogin],
  ["POST", "/admin/logout", adminLogout],
  ["GET", "/admin/me", adminMe],
];

const ADMIN_ROUTES = [
  ["GET", "/cafes", listCafes],
  ["POST", "/add", addCafe],
  ["POST", "/edit", editCafe],
  ["POST", "/publish", publishCafe],
  ["POST", "/delete", deleteCafe],
  ["POST", "/restore", restoreCafe],
  ["POST", "/purge", purgeCafe],
  ["POST", "/notice", setNotice],
  ["POST", "/import-csv", importCsv],
  ["GET", "/geocode", geocode],
  ["GET", "/error-reports", listErrorReports],
  ["POST", "/reply-error-report", replyErrorReport],
  ["POST", "/resolve-error-report", resolveErrorReport],
];

export const ROUTES = [
  ...PUBLIC_ROUTES,
  ...ADMIN_ROUTES.map(([method, path, handler]) => [
    method,
    path,
    adminOnly(handler),
  ]),
];
