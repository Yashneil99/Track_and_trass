-- 005: gardens. Created automatically at STN upload; an admin merges duplicates later.

-- A normalized name is UPPER CASE, trimmed, with no repeated spaces.
-- The CHECKs make sure nothing un-normalized can ever be stored,
-- so "Ngk Prime Gold " and "NGK PRIME GOLD" cannot become two gardens.
CREATE TABLE gardens (
  garden_id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                  text        NOT NULL UNIQUE
                        CHECK (name = upper(btrim(name)) AND name !~ '\s{2,}' AND name <> ''),
  status                text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged')),
  merged_into_garden_id bigint REFERENCES gardens (garden_id),
  created_by_stn_id     bigint REFERENCES stn_documents (stn_id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- A garden is merged if and only if it points at the garden it was merged into.
  CHECK ((status = 'merged') = (merged_into_garden_id IS NOT NULL)),
  CHECK (merged_into_garden_id IS NULL OR merged_into_garden_id <> garden_id)
);
CREATE INDEX gardens_active_idx ON gardens (garden_id) WHERE status = 'active';
CREATE INDEX gardens_merged_into_idx ON gardens (merged_into_garden_id)
  WHERE merged_into_garden_id IS NOT NULL;
CREATE INDEX gardens_name_trgm_idx ON gardens USING gin (name gin_trgm_ops);
CREATE INDEX gardens_created_by_stn_idx ON gardens (created_by_stn_id);

-- Names read from the bag by OCR that point to a garden (kept after a merge).
CREATE TABLE garden_aliases (
  alias_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  garden_id  bigint      NOT NULL REFERENCES gardens (garden_id),
  alias_text text        NOT NULL UNIQUE
             CHECK (alias_text = upper(btrim(alias_text)) AND alias_text !~ '\s{2,}' AND alias_text <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX garden_aliases_garden_id_idx ON garden_aliases (garden_id);
CREATE INDEX garden_aliases_text_trgm_idx ON garden_aliases USING gin (alias_text gin_trgm_ops);

-- History of every merge an admin did.
CREATE TABLE garden_merges (
  merge_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_garden_id  bigint      NOT NULL REFERENCES gardens (garden_id),
  target_garden_id  bigint      NOT NULL REFERENCES gardens (garden_id),
  merged_by         bigint      NOT NULL REFERENCES users (user_id),
  moved_counts      jsonb       NOT NULL DEFAULT '{}',
  merged_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (source_garden_id <> target_garden_id)
);
CREATE INDEX garden_merges_target_idx ON garden_merges (target_garden_id);
CREATE INDEX garden_merges_source_idx ON garden_merges (source_garden_id);
CREATE INDEX garden_merges_merged_by_idx ON garden_merges (merged_by);
