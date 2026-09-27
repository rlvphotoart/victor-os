CREATE TABLE IF NOT EXISTS records (
  owner TEXT NOT NULL,
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (owner, collection, id)
);

CREATE INDEX IF NOT EXISTS records_owner_idx ON records(owner);
