import assert from "node:assert/strict";

import {
  exportApprovedReviewCsv,
  exportCandidatesReviewCsv,
  exportHoldReviewCsv,
} from "../server/csv.js";

function createCsvExportEnv() {
  return {
    SESSION_SECRET: "unit-secret",
    DB: {
      prepare(sql) {
        return {
          bind() {
            return this;
          },
          first: async () => {
            if (/FROM\s+sessions\s+s/i.test(sql)) {
              return {
                session_id: "session-1",
                user_id: "admin-user",
                expires_at: "2999-01-01T00:00:00.000Z",
                csrf_token_hash: "",
                username: "admin",
                role: "admin",
              };
            }
            return null;
          },
          all: async () => ({
            results: [
              {
                id: "=id",
                name: "=name",
                address: "+address",
                desc: "-desc",
                lat: 37.5,
                lng: 127,
                category: "@category",
                signature: "=signature",
                beanShop: "+bean",
                instagram: "-instagram",
                oakerman_pick: 0,
                manager_pick: 0,
                status: "@status",
                updated_at: "2026-05-10T00:00:00.000Z",
                hidden_at: "2026-05-10T00:00:00.000Z",
                hidden_by: "=hidden-by",
              },
            ],
          }),
        };
      },
    },
  };
}

async function exportText(handler) {
  const response = await handler(
    new Request("https://kohee.test/export", {
      headers: { authorization: "Bearer unit-token" },
    }),
    createCsvExportEnv(),
  );
  assert.equal(response.status, 200);
  return response.text();
}

for (const handler of [
  exportCandidatesReviewCsv,
  exportHoldReviewCsv,
  exportApprovedReviewCsv,
]) {
  const csv = await exportText(handler);
  assert.match(csv, /'=id/);
  assert.match(csv, /'=name/);
  assert.match(csv, /'\+address/);
  assert.match(csv, /'-desc/);
  assert.match(csv, /'@category/);
  assert.match(csv, /'=signature/);
  assert.match(csv, /'\+bean/);
  assert.match(csv, /'-instagram/);
  assert.match(csv, /'@status/);
}

const holdCsv = await exportText(exportHoldReviewCsv);
assert.match(holdCsv, /'=hidden-by/);

console.log("[csv-export-unit] ok");
