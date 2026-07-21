-- PIPA Article 15/22: record consent to the privacy policy at signup.
-- Additive, low-risk: two nullable columns on users. Existing rows keep NULL
-- (pre-consent accounts); new signups stamp consent_at + consent_version.
ALTER TABLE users ADD COLUMN consent_at TEXT;
ALTER TABLE users ADD COLUMN consent_version TEXT;
