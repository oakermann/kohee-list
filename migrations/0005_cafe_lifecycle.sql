ALTER TABLE cafes ADD COLUMN status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('candidate', 'approved', 'hidden', 'rejected'));
ALTER TABLE cafes ADD COLUMN approved_at TEXT;
ALTER TABLE cafes ADD COLUMN approved_by TEXT;
ALTER TABLE cafes ADD COLUMN rejected_at TEXT;
ALTER TABLE cafes ADD COLUMN rejected_by TEXT;
ALTER TABLE cafes ADD COLUMN hidden_at TEXT;
ALTER TABLE cafes ADD COLUMN hidden_by TEXT;
ALTER TABLE cafes ADD COLUMN deleted_at TEXT;
ALTER TABLE cafes ADD COLUMN deleted_by TEXT;
ALTER TABLE cafes ADD COLUMN delete_reason TEXT;
ALTER TABLE cafes ADD COLUMN created_at TEXT;

CREATE INDEX IF NOT EXISTS idx_cafes_public_lifecycle ON cafes(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_cafes_deleted_at ON cafes(deleted_at);
