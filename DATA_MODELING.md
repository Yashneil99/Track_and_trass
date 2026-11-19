# Data Modeling: HUL Tea Bag Track N Trace

Status: DRAFT for review. Nothing here is created in the database yet.
Business rules behind this model are in `BUSINESS_RULES.md`. Never put secrets in this file.

## 1. Conventions

- **Primary keys:** `bigint generated always as identity` on high-volume tables (`bags`, `bag_events`). Human-readable codes (for example `BAG-000101`) are separate `UNIQUE` columns.
- **Times:** always `timestamptz` (migration 006 fixed earlier `timetz` mistakes).
- **Status columns:** `text` with a `CHECK` constraint, not Postgres ENUMs, because ENUMs are hard to change.
- **Foreign keys:** every link is an enforced FK, and every FK column has an index (Postgres does not create these automatically).
- **Changes to stock numbers** happen only inside one database transaction, together with the event that caused them.

## 2. How the tables connect

```
users ──< user_sessions
  │
  ├──< audit_logs
  │
gardens ──< garden_aliases
  │
  └──< stn_lots >── stn_documents          (STN upload)
          │  │
          │  └──< stn_lot_lines             (original STN rows)
          │
          ├──< lot_bin_allocations >── locations ──1:1── bin_stock
          │                               ▲ (self-parent tree)
          └──< bags ──────────────────────┘ (current bin)
                │  │
                │  ├──< bag_events           (append-only history)
                │  │
                │  └──< tag_assignments >── rfid_tags
                │
                └──< outward_request_bags >── outward_requests ──< outward_request_lines
```

## 3. Tables

### 3.1 Access

**users** (kept)

| Column | Notes |
|---|---|
| `user_id` | PK |
| `email` | UNIQUE |
| `password_hash`, `name`, `role` (CHECK), `is_active`, `created_at` | |
| `refresh_token` | **removed**; moves to `user_sessions` |

**user_sessions** (new; replaces the plain-text refresh token)
- PK `session_id`. FK `user_id` → users.
- `refresh_token_hash` UNIQUE, `expires_at`, `revoked_at`, `device_info`.
- Indexes: `user_id`, `expires_at`.

### 3.2 Master data

**locations** (kept, cleaned). A tree: warehouse → floor → bin, plus the loading area.
- PK `location_id`. `code` UNIQUE (human-readable, e.g. `hul_2f_bin_3`).
- FK `parent_id` → locations(`location_id`). Today it holds the parent's code and is not enforced.
- `name`, `type` CHECK (warehouse, floor, bin, loading_area), `capacity int` (a real column, not JSON), `is_active`, `created_at`.
- Removed: `reserved` (moves to `bin_stock`). `stack` and `layout` kept only if the client uses them.
- Indexes: `parent_id`, `(type, is_active)`.

**bin_stock** (new; one row per bin)
- PK and FK `location_id` → locations.
- `occupied int`, `reserved int`, `updated_at`.
- `CHECK (occupied >= 0 AND reserved >= 0)`.
- Over-booking is blocked by the update itself (see 4.1).

**bin_availability** (view)
- `capacity` (from locations), `occupied`, `reserved`, `available = capacity - occupied - reserved`.
- Roll-ups per floor and per warehouse sum this view through the `parent_id` tree.

**gardens** (new)
- PK `garden_id`. `name` UNIQUE (normalized).
- **Created automatically at STN upload** when the garden name is not found. `created_by_stn_id` (FK → stn_documents) and `created_at` record where it first appeared.
- Names are normalized before the check (upper case, trimmed, repeated spaces collapsed), so "Ngk Prime Gold " and "NGK PRIME GOLD" are the same garden.
- **Fully automatic, no approval step.** Duplicates are cleaned up later by an admin on the merge screen (8.12).
- `status` CHECK (active, merged). `merged_into_garden_id` FK → gardens (self), NULL unless merged. A merged garden is hidden but never deleted.
- Index: partial `(garden_id) WHERE status = 'active'`; trigram index on `name` to find similar names.

**garden_merges** (new; history of every merge)
- PK `merge_id`. FK `source_garden_id`, `target_garden_id` → gardens. FK `merged_by` → users.
- `merged_at`, `moved_counts jsonb` (lots, bags, request lines, aliases moved).
- Index: `target_garden_id`.

**garden_aliases** (new; maps the name written on the bag, read by OCR, to a garden)
- PK `alias_id`. FK `garden_id` → gardens. `alias_text` UNIQUE (normalized).
- Indexes: `garden_id`; trigram index (`pg_trgm`) on `alias_text` for fuzzy matching.

**app_settings** (new)
- PK `key`, `value jsonb`. For example the expiry period in months.

**process_definitions** (to recreate; the code needs it, the dump does not have it)
- A master list of production processes HUL defines. It is **not** a bag history. Today it only has create, list and update (admin form and process page).
- PK `process_id`, `name` UNIQUE, `description`, `input_material_types`, `output_material_types`, `created_at`.
- Link (Proposed): `bags.delivered_process_id` records which process a bag was put into at the delivery scan.

### 3.3 STN and lots

**stn_documents** (was `documents`)
- PK `stn_id`. `stn_number` UNIQUE, `stn_date`, `obd_no`, `truck_no`, `file_path`.
- `file_hash` UNIQUE (stops the same file being uploaded twice).
- `status` CHECK. FK `uploaded_by` → users. `created_at`.
- Indexes: `stn_date`, `status`.

**stn_lots** (was `stn_invoice_allocations`; one row per garden invoice)
- PK `lot_id`. FK `stn_id` → stn_documents. FK `garden_id` → gardens.
- `grade`, `invoice_no`, `lot_qr_code` UNIQUE (fallback for OCR).
- Progress counters: `bags_expected`, `bags_tagged`, `bags_stored` (reached a bin, never goes down), `bags_damaged` (damaged before reaching a bin). All `>= 0`.
- `status` CHECK (`EXPECTED`, `IN_TRANSIT`, `PARTIALLY_STORED`, `STORED`), set automatically from the counters in the same transaction (see `BUSINESS_RULES.md` section 4).
- UNIQUE `(garden_id, invoice_no)`: agreed unique for now. A duplicate makes the STN upload fail with a clear message.
- Indexes: `stn_id`, `status`.

**stn_lot_lines** (new; keeps the original Excel rows, such as 19 bags at 30 kg and 1 bag at 21.4 kg)
- PK `line_id`. FK `lot_id` → stn_lots.
- `bag_count`, `net_wt_per_bag`, `tare_wt`, `gross_wt`.
- Index: `lot_id`.

### 3.4 Bags and tags

**bags** (was `materials`; one row per physical bag, created at STN upload)

| Column | Notes |
|---|---|
| `bag_id` | PK, identity |
| `public_code` | UNIQUE, e.g. `BAG-000101` |
| `lot_id` | FK → stn_lots |
| `expected_weight_kg`, `actual_weight_kg` | |
| `status` | CHECK: `EXPECTED`, `IN_TRANSIT`, `STORED`, `DISPATCHED_TO_PRODUCTION`, `DELIVERED`, `DAMAGED` |
| `current_location_id` | FK → locations, NULL until stored |
| `expiry_date` | set at STN upload: STN date + the period in `app_settings` (one year); only an admin can edit it |
| `tagged_at`, `stored_at`, `dispatched_to_production_at`, `delivered_at` | |
| `delivered_process_id` | FK → process_definitions, optional (Proposed) |

Indexes:
- `(lot_id)`
- partial `(lot_id, bag_id) WHERE status = 'EXPECTED'`: finds the next free slot; used with `FOR UPDATE SKIP LOCKED` so many scanners never block each other
- partial `(current_location_id) WHERE status = 'STORED'`: bin contents
- partial `(expiry_date) WHERE status = 'STORED'`: first-expiry-first-out picking

**rfid_tags** (new)
- PK `tag_uid` (the factory number, text).
- `status` CHECK (available, in_use, lost, damaged), `first_seen_at`.

**tag_assignments** (new; makes tag reuse safe)
- PK `assignment_id`. FK `tag_uid` → rfid_tags. FK `bag_id` → bags. FK `assigned_by` → users.
- `assigned_at`, `released_at`, `release_reason`.
- Partial UNIQUE `(tag_uid) WHERE released_at IS NULL`: one active bag per tag.
- Partial UNIQUE `(bag_id) WHERE released_at IS NULL`: one active tag per bag.

### 3.5 History

**bag_events** (was `material_movements`; append-only, one row per thing that happened)
- PK `(event_id, occurred_at)`. Partitioned by month on `occurred_at`.
- FK `bag_id` → bags. FK `user_id` → users. FK `from_location_id`, `to_location_id` → locations.
- `event_type`, `from_status`, `to_status`, `device_id`, `payload jsonb` (OCR text, expiry-change reason, and so on).
- Indexes: `(bag_id, occurred_at DESC)` for a bag's timeline; BRIN on `occurred_at`.
- Current state lives on `bags`; events are the history. Today `material_movements` is a state table with one row per bag.

### 3.6 Storage planning

**lot_bin_allocations** (was `splits` plus the `allocated_location` column; one table for single-bin and split lots)
- PK `allocation_id`. FK `lot_id` → stn_lots. FK `location_id` → locations.
- `bags_allocated` CHECK `> 0`.
- UNIQUE `(lot_id, location_id)`. Indexes: `lot_id`, `location_id`.
- A lot that fits in one bin has one row; a split lot has several. The sum for a lot equals its bag count.

### 3.7 Outward

**outward_requests** (was `raise_request`)
- PK `request_id`. FK `location_id` → locations. FK `requested_by` → users.
- `purpose` CHECK (production, dispatch), `status` CHECK (pending, picking, completed, cancelled), `created_at`, `completed_at`.
- Partial UNIQUE `(location_id) WHERE status = 'PENDING'`: the database enforces one pending request per location.
- Index: `(status, created_at)`.

**outward_request_lines** (replaces the JSON lines)
- PK `line_id`. FK `request_id` → outward_requests. FK `garden_id` → gardens.
- `grade`, `invoice_no` (optional), `bags_requested`, `bags_picked`.
- Index: `request_id`.

**outward_request_bags** (new; exactly which bags left)
- PK `(request_id, bag_id)`. FK `request_id`, `line_id`, `bag_id` → bags. FK `picked_by` → users. `picked_at`.
- UNIQUE `(bag_id)`: a bag leaves once. Tags are reused, bags are not.

### 3.8 System

**audit_logs** (kept)
- PK `log_id`. FK `user_id` → users.
- `action`, `entity_type`, `entity_id`, `request_id`, `ip`, `details jsonb`, `created_at`.
- Indexes: `(entity_type, entity_id)`, `(user_id, created_at)`, BRIN on `created_at`.
- Capacity changes are logged here (entity type `location`). The current dump has a duplicate-primary-key problem to clean up.

**alerts** (new; live alerts for admins, also kept so an offline admin sees them later)
- PK `alert_id`. `alert_type` CHECK (damaged_bag, extra_bag, unexpected_bag, rejected_tag, lot_closed_missing, expired_bag, near_expiry), `severity`.
- FK `bag_id` → bags, `lot_id` → stn_lots, `garden_id` → gardens (all optional). `message`, `payload jsonb`, `created_at`.
- FK `acknowledged_by` → users, `acknowledged_at`.
- Indexes: partial `(created_at DESC) WHERE acknowledged_at IS NULL`; `(alert_type, created_at)`.

**schema_migrations**: tracks which migration scripts have run.

## 4. Bin numbers

| Number | Source | Changed by |
|---|---|---|
| Capacity (total) | `locations.capacity` | Only an admin editing the bin |
| Occupied | `bin_stock.occupied` | Place, move, dispatch-to-production and damaged events |
| Reserved | `bin_stock.reserved` | Lot allocation; reduced as bags are placed |
| Available | `bin_availability` view | Never set directly: `capacity - occupied - reserved` |

### 4.1 Rules enforced by the database
- **Allocate (atomic, no race):**
  `UPDATE bin_stock SET reserved = reserved + :n FROM locations l WHERE bin_stock.location_id = :bin AND l.location_id = bin_stock.location_id AND bin_stock.occupied + bin_stock.reserved + :n <= l.capacity`
  If zero rows are updated, the bin is full.
- **Place a bag:** `reserved - 1`, `occupied + 1` (or just `occupied + 1` with the same space check when the bag has no reservation there).
- **Move a bag to another bin:** old bin `occupied - 1`; new bin uses its reservation for that lot if present, otherwise needs free space.
- **Dispatch to production, or marked damaged while stored:** `occupied - 1`.
- **Marked damaged before reaching a bin:** release one reservation of the lot (`reserved - 1`).
- **Change capacity:** allowed only if the new value is at least `occupied + reserved`. Old value, new value, user, time and reason go to `audit_logs`.
- **Single place of change:** one function updates `bin_stock`, called inside the same transaction as the bag event. A nightly job recounts from `bags` and `lot_bin_allocations` and raises an alert on drift.

## 5. How data flows

| Step | Writes |
|---|---|
| STN upload | `stn_documents`, `stn_lots`, `stn_lot_lines`, one `bags` row per bag (`EXPECTED`), `lot_bin_allocations`, `bin_stock.reserved` up |
| OCR + tag scan (truck) | `rfid_tags` (checked `AVAILABLE`), `tag_assignments`, `bags.status = IN_TRANSIT`, `stn_lots` counters and status, a `bag_events` row |
| Putaway to bin | `bags.current_location_id`, status `STORED`, `bin_stock` (reserved down, occupied up), a `bag_events` row |
| Outward raised | `outward_requests`, `outward_request_lines` |
| Pick and scan out | `outward_request_bags`, `bags.status = DISPATCHED_TO_PRODUCTION`, `bin_stock.occupied` down, `bag_events` |
| Delivery scan at production | `bags.status = DELIVERED`, `tag_assignments.released_at` set, tag `AVAILABLE`, `bag_events` |
| Bag found damaged | `bags.status = DAMAGED`, tag released, bin or reservation released, `stn_lots` counters, `alerts`, `bag_events` |

Each row of this table runs inside one transaction.

## 6. Old names to new names

| Current | New |
|---|---|
| materials | bags |
| material_movements | bag_events |
| documents | stn_documents |
| stn_invoice_allocations | stn_lots |
| splits (and `allocated_location`) | lot_bin_allocations |
| raise_request | outward_requests |
| `locations.reserved` | `bin_stock.reserved` |
| `users.refresh_token` | `user_sessions` |
| (none) | gardens, garden_aliases, garden_merges, alerts, stn_lot_lines, rfid_tags, tag_assignments, outward_request_lines, outward_request_bags, bin_stock, app_settings |

## 7. Open points

1. **Volume:** the stated target is now 1 million per day, but the unit is unconfirmed (bags or API requests). 1M bags a day is about 12 bags a second and roughly 1 GB a day of data. 1M API requests a day is only about 12 requests a second. Either is within reach of a well-designed Postgres server. If it is 1M bags, `bags` also needs archiving of delivered bags; events are already partitioned.
2. **Lifecycle:** statuses are now set (`EXPECTED`, `IN_TRANSIT`, `STORED`, `DISPATCHED_TO_PRODUCTION`, `DELIVERED`, `DAMAGED`); the names are to be confirmed. The operator marks a bag damaged.
3. **IDs:** `user_id` and `location_id` are UUIDs today. Keep as they are, or move to bigint?
4. **Data migration:** converting existing rows (about 1,291 bags, 48 allocations) into the new tables needs a one-off script. `location.parent_id` values must be converted from codes to `location_id`.
5. **Capacity edits:** is a reason required, and may a bin be set inactive instead of capacity 0?

## 8. Complete flow of the database

Every diagram below shows what happens, who does it, and which tables change. Each numbered step that writes data runs inside **one transaction**: either all of it is saved or none of it is.
The bag lifecycle (states) is provisional until that discussion is finished.

### 8.1 Bag and lot lifecycle (states)

```
                 STN upload
                     │
                     ▼
              ┌─────────────┐
              │  EXPECTED   │  slot created, no tag yet
              └──────┬──────┘
                     │ OCR lot confirmed + AVAILABLE RFID tag scanned (at the truck)
                     ▼
              ┌─────────────┐
              │ IN_TRANSIT  │  tag linked, bag on its way to a bin
              └──────┬──────┘
                     │ scanned into its bin ("reached its location")
                     ▼
              ┌─────────────┐   bin change      ┌──────────────┐
              │   STORED    │◄─────────────────►│ STORED (new  │
              │ (in a bin)  │   (move)          │     bin)     │
              └──────┬──────┘                   └──────────────┘
                     │ request raised; bag picked and scanned out
                     ▼
        ┌──────────────────────────┐
        │ DISPATCHED_TO_PRODUCTION │  tag still on the bag
        └────────────┬─────────────┘
                     │ scanned at production when put into the process
                     ▼
              ┌─────────────┐
              │  DELIVERED  │  tag released -> AVAILABLE
              └─────────────┘

DAMAGED: can be set at any step before DELIVERED; tag released -> AVAILABLE.
Expired is a flag from expiry_date, not a status.
```

**Lot status** follows its bags automatically (example: lot of 20):

```
EXPECTED ──(first tag scanned)──► IN_TRANSIT ──(first bag reaches a bin)──► PARTIALLY_STORED
                                                                                   │
                                  bags_stored + bags_damaged = bags_expected       ▼
                                                                                STORED
Example: 10 of 20 bags have reached their bins -> bags_stored = 10 -> PARTIALLY_STORED
```

### 8.2 Flow A: One-time and occasional setup (admin)

```
Admin
  │
  ├─► create users, roles ─────────────► users
  │
  ├─► create warehouse / floors / bins ─► locations (+ parent_id tree, capacity)
  │         │
  │         └─ for each bin ────────────► bin_stock row (occupied 0, reserved 0)
  │
  ├─► gardens are created automatically at STN upload (see 8.3)
  │       ├─ admin merges duplicate gardens on a side-by-side comparison screen (see 8.12)
  │       └─ add printed-name variants ─► garden_aliases
  │
  ├─► define production processes ──────► process_definitions
  │
  ├─► settings (expiry months, alert days) ► app_settings
  │
  └─► change a bin's capacity ─────────► locations.capacity
              │   rule: new capacity >= occupied + reserved, else rejected
              └─ old value, new value, user, reason ─► audit_logs
```

### 8.3 Flow B: STN upload

```
Admin uploads STN Excel
  │
  1. Save file, calculate file hash
  │     └─ hash already in stn_documents? ─► STOP: "already uploaded"
  │
  2. Parse header (STN no., date, OBD no., truck) and rows
  │
  3. For each row, find the garden (gardens.name first, then garden_aliases)
  │     ├─ name found ─► use the stored garden
  │     └─ unknown name ─► create the garden automatically (saved in step 5)
  │           └─ no approval step. A close match to an existing garden (likely typo) is
  │              still created, and appears on the admin "Possible duplicates" screen (8.12)
  │
  4. For each garden + invoice number
  │     └─ (garden_id, invoice_no) already exists in stn_lots? ─► STOP: duplicate, clear message
  │
  ▼  ONE TRANSACTION
  5. gardens            ← auto-create any unknown garden (normalized name)
  6. stn_documents      ← 1 row
  7. stn_lots           ← 1 row per garden invoice (+ lot QR code), status EXPECTED, counters 0
  8. stn_lot_lines      ← the original Excel rows (e.g. 19 @ 30 kg, 1 @ 21.4 kg)
  9. bags               ← 1 row per expected bag, status EXPECTED, expected weight, expiry_date (STN date + 1 year)
 10. lot_bin_allocations ← choose bins for each lot (first-fit, split if it does not fit)
 11. bin_stock.reserved ← + bags allocated, only if occupied + reserved + n <= capacity
        └─ a bin without space ─► try the next bin; none left ─► whole STN fails, nothing saved
 12. audit_logs        ← "STN uploaded" (and "garden auto-created" for each new garden)
  │
  ▼
  Operators now see the lot as expected
```

### 8.4 Flow C: Receiving at the truck (OCR + RFID)

```
Operator (handheld app)
  │
  1. Scan the printed garden name on the bag. OCR runs in the app,
  │  which sends only the garden name text to the server.
  │
  2. Server normalizes the name and searches:
  │     gardens.name, then garden_aliases (fuzzy) ─► stn_lots that still have EXPECTED bags
  │     ├─ no garden/lot match ─► "unexpected bag": nothing is created, stop,
  │     │                         bag_events payload + alerts row, live alert to admin
  │     └─ one or more matches ─► show list to the operator
  │
  3. Operator confirms the lot
  │
  4. Operator attaches an RFID tag and scans it
  │
  ▼  ONE TRANSACTION
  5. rfid_tags          ← register the tag as AVAILABLE if never seen before
  6. Is the tag available for use?
  │     rfid_tags.status must be AVAILABLE and it must have no active tag_assignments row
  │     └─ IN_USE / LOST / DAMAGED ─► REJECT, alerts row ("rejected tag")
  7. Pick one free slot:
  │     bags WHERE lot_id = ? AND status = 'EXPECTED' LIMIT 1 FOR UPDATE SKIP LOCKED
  │     └─ no free slot ─► "extra bag": not linked, alerts row, live alert to admin
  8. tag_assignments    ← new row (tag, bag, who, assigned_at)
  9. rfid_tags.status   ← IN_USE
 10. bags               ← status IN_TRANSIT, actual weight, tagged_at
 11. stn_lots           ← bags_tagged + 1, status recalculated
 12. bag_events         ← IN_TRANSIT (payload keeps the raw OCR text)
  │
  ▼
  Slots still EXPECTED when an admin closes the lot are the missing bags (reported, alert)
```

### 8.5 Flow D: Reaching the bin, and moving between bins

```
Operator scans the bag tag, then scans the bin
  │
  1. Find the active bag for the tag (tag_assignments where released_at IS NULL)
  │
  ▼  ONE TRANSACTION
  2. Same lot has a reservation in this bin (lot_bin_allocations)?
  │     ├─ yes ─► bin_stock: reserved - 1, occupied + 1
  │     └─ no  ─► need free space: occupied + reserved + 1 <= capacity, else REJECT
  3. If the bag was already stored in another bin (a move):
  │     └─ old bin: occupied - 1
  4. bags               ← current_location_id, status STORED, stored_at
  5. First time this bag reaches a bin (not a move):
  │     └─ stn_lots     ← bags_stored + 1, status recalculated
  │           (IN_TRANSIT -> PARTIALLY_STORED -> STORED when every bag has reached its bin)
  6. bag_events         ← STORED or MOVED (from_location, to_location)
  │
  ▼
  Bin numbers now show the new occupied / reserved / available
```

### 8.6 Flow E: Outward to production

```
A request is raised for a location
  │
  ▼  ONE TRANSACTION
  1. outward_requests       ← status PENDING
  │     └─ the location already has a PENDING request ─► REJECT (database rule)
  2. outward_request_lines  ← garden, grade, bags requested
  │
  ▼
Operators are notified (WebSocket) of the new request

Operator picks bags and scans each one out
  │
  ▼  ONE TRANSACTION (per bag)
  3. Choose bags: STORED, matching line, ORDER BY expiry_date (first-expiry-first-out)
  │     └─ expired bag ─► blocked, needs admin override
  4. outward_request_bags   ← which bag, by whom, when
  5. bags                   ← status DISPATCHED_TO_PRODUCTION, dispatched_to_production_at
  6. bin_stock              ← bag's bin: occupied - 1
  7. bag_events             ← DISPATCHED_TO_PRODUCTION
  8. outward_request_lines  ← bags_picked + 1
  │
  ▼
All lines complete ─► outward_requests.status = COMPLETED
(the tag stays on the bag so production can scan it)

At production, the person puts the bag into a process and scans it
  │
  ▼  ONE TRANSACTION
  9. bags                   ← status DELIVERED, delivered_at, delivered_process_id (optional)
 10. tag_assignments        ← released_at = now, release_reason "delivered"
 11. rfid_tags              ← status AVAILABLE (tag can be used for a new bag)
 12. bag_events             ← DELIVERED
```

### 8.7 Flow F: Changing a bag's expiry date

```
Admin edits expiry (one bag, or a whole lot)
  │
  ▼  ONE TRANSACTION
  1. Check role = admin and that a reason was given
  2. bags               ← expiry_date = new date
  3. bag_events         ← EXPIRY_CHANGED, payload: old date, new date, reason
        (a lot edit writes one event per bag)
  4. audit_logs         ← who changed what
```

### 8.8 Flow G: Damaged bags, exceptions and live alerts

**A bag is found damaged** (the operator marks it):

```
  ▼  ONE TRANSACTION
  1. bags               ← status DAMAGED
  2. Bin or reservation:
  │     ├─ bag was STORED ─► bin_stock.occupied - 1
  │     └─ bag was IN_TRANSIT / not yet in a bin ─► release one reservation of the lot
  │                                                  (bin_stock.reserved - 1)
  3. tag_assignments    ← released_at = now, release_reason "damaged"
  4. rfid_tags          ← status AVAILABLE (the tag is free again)
  5. stn_lots           ← bags_damaged + 1 only if the bag had not reached a bin; status recalculated
  6. bag_events         ← DAMAGED (who, reason)
  7. alerts             ← live alert to admins, showing the bag and the garden it belongs to
```

**Exceptions:**

```
Situation .......................... What the system does ........................ Admin alert
OCR matches no garden / open lot ... "unexpected bag", nothing created ........... yes
Lot has no free slot ............... "extra bag", not linked ..................... yes
Slots still EXPECTED at lot close .. "missing bags", report lists the slots ...... yes
Tag is IN_USE / LOST / DAMAGED ..... reject the scan ............................. yes
Tag has no active bag when needed .. reject the scan ............................. yes
Bin has no space ................... reject placement (choose another bin) ....... no
Capacity lowered below stock ....... reject the change ........................... no
Bag expired ........................ block dispatch, admin override ............... yes
```

Live alerts go to admins over WebSocket and are also saved in `alerts`, so an admin who was offline sees them later.

### 8.9 Background jobs

| Job | When | What it does | Tables |
|---|---|---|---|
| Stock reconcile | Nightly | Recounts occupied and reserved from `bags` and `lot_bin_allocations`, compares with `bin_stock`, alerts on any difference | `bin_stock`, `bags`, `lot_bin_allocations` |
| Lot counter reconcile | Nightly | Recounts lot counters (tagged, stored, damaged) from `bags` and fixes the lot status | `stn_lots`, `bags` |
| Partition creator | Monthly | Creates next month's `bag_events` partition ahead of time | `bag_events` |
| Archiver | Monthly | Moves old events (and dispatched bags, if volume needs it) to archive storage | `bag_events`, `bags` |
| Expiry alerts | Daily | Lists bags expiring within the configured number of days | `bags`, `app_settings` |
| Session cleanup | Daily | Deletes expired and revoked sessions | `user_sessions` |
| STN parsing (later) | On upload | Runs parsing in a background worker so big files do not block the server | `stn_*`, `bags` |

### 8.10 One bag, start to finish (worked example)

STN `2619005538`, garden NGK PRIME GOLD, invoice C269, 20 bags (19 at 30 kg, 1 at 21.4 kg). Bin `hul_2f_bin_3`, capacity 500, empty at the start. Bag shown: `BAG-000101`, tag `E2806894…F0C5`.

| # | What happens | Key rows changed | Lot (tagged / stored) and status | Bin: occupied / reserved / available |
|---|---|---|---|---|
| 1 | Admin uploads the STN | 1 `stn_documents`, 1 `stn_lots`, 2 `stn_lot_lines`, 20 `bags` (EXPECTED), 1 `lot_bin_allocations` (20 bags to bin 3); garden created if new | 0 / 0, `EXPECTED` | 0 / 20 / 480 |
| 2 | Operator scans the printed "NGK PRIME GOLD", app sends the name, operator confirms lot C269 | none yet (a search only) | 0 / 0, `EXPECTED` | 0 / 20 / 480 |
| 3 | Operator scans an `AVAILABLE` tag `E2806894…F0C5` | `tag_assignments` (BAG-000101), tag IN_USE, bag IN_TRANSIT, 1 `bag_events` | 1 / 0, `IN_TRANSIT` | 0 / 20 / 480 |
| 4 | Operator puts it in bin 3 | bag STORED in bin 3, 1 `bag_events` | 1 / 1, `PARTIALLY_STORED` | 1 / 19 / 480 |
| 5 | The other 19 bags are tagged and placed the same way | 19 more of steps 3 and 4 | 20 / 20, `STORED` | 20 / 0 / 480 |
| 6 | A request is raised for this garden, 10 bags | 1 `outward_requests` (PENDING), 1 `outward_request_lines` | unchanged | 20 / 0 / 480 |
| 7 | Operator picks 10 bags (earliest expiry first), including BAG-000101, and scans each out | 10 `outward_request_bags`, bags DISPATCHED_TO_PRODUCTION, 10 `bag_events`, request COMPLETED; tags still IN_USE | unchanged | 10 / 0 / 490 |
| 8 | At production each bag is scanned as it goes into a process | bags DELIVERED, `tag_assignments.released_at` set, 10 tags AVAILABLE, 10 `bag_events` | unchanged | 10 / 0 / 490 |
| 9 | Tag `E2806894…F0C5` is attached to a new bag in a later STN | new `tag_assignments` row for the new bag; the old row keeps the old bag's history | other lot | unchanged |

Looking up BAG-000101 afterwards returns its full timeline from `bag_events`: tagged, stored, dispatched to production, delivered, with the user and time for each step.

### 8.11 Who reads what

| Reader | Reads | From |
|---|---|---|
| Handheld operator | Expected lots, free slots, bin availability | `stn_lots`, `bags`, `bin_availability` |
| Admin dashboard | Totals per floor / warehouse, expiring bags, missing bags | `bin_availability`, `bags`, `stn_lots` |
| Production | Pending and completed requests | `outward_requests`, `outward_request_lines` |
| Traceability search | Full timeline of one bag or tag | `bag_events`, `tag_assignments` |
| Auditor | Who changed capacity, expiry, users | `audit_logs`, `bag_events` |

### 8.12 Flow H: Merging duplicate gardens (admin screen)

Gardens are created automatically with no approval, so near-duplicates will appear over time (for example "NGK PRIME GOLD" and "NGK PRIME GLD"). The admin cleans them up here.

**The screen**

```
┌─────────────────────────── Possible duplicates ───────────────────────────┐
│  Similar pairs, most similar first (from trigram similarity on names)      │
│    NGK PRIME GOLD  ~  NGK PRIME GLD            similarity 93%   [Compare]  │
│    ...                                                                     │
└────────────────────────────────────────────────────────────────────────────┘

┌──────── Garden A ────────┐   ┌──────── Garden B ────────┐
│ Name   NGK PRIME GOLD    │   │ Name   NGK PRIME GLD     │
│ First seen  STN 2619005538│   │ First seen  STN 2619007120│
│ Lots   12                │   │ Lots   1                 │
│ Bags   340               │   │ Bags   20                │
│ Aliases  (none)          │   │ Aliases  (none)          │
│ ( ) Keep this name       │   │ ( ) Keep this name       │
└──────────────────────────┘   └──────────────────────────┘
        Preview: 1 lot, 20 bags, 0 request lines will move.   [ Merge ]
```

**What the Merge button does** (admin only, one transaction)

```
  1. Lock both gardens
  2. Conflict check: does any invoice number exist under BOTH gardens?
  │     └─ yes ─► STOP, show the conflicting invoices (UNIQUE garden + invoice must hold)
  3. stn_lots              ← garden_id = kept garden (for every lot of the other garden)
  4. outward_request_lines ← garden_id = kept garden
  5. garden_aliases        ← move the other garden's aliases to the kept garden
  │                          and add the other garden's name as a new alias
  6. gardens (other one)   ← status MERGED, merged_into_garden_id = kept garden (not deleted)
  7. garden_merges         ← who, when, counts moved
  8. audit_logs            ← "garden merged"
```

**Why future uploads do not recreate the duplicate:** step 5 saves the old name as an alias. At STN upload, the garden lookup checks `gardens.name` first and then `garden_aliases`, so "NGK PRIME GLD" now resolves to the kept garden. The OCR search also uses the alias.

**Notes**
- Nothing is deleted, so old records stay explainable. Undoing a merge is possible from `garden_merges` if you want that feature later.
- Bags and events point to a lot, and the lot points to the garden, so no bag row needs to change.
