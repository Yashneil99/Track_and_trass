# API Inventory (old server)

Source: `server/src/routes/*.js`, `server/server.js`, and the React service files in `client/src`.
Purpose: Phase 0 contract. `server-v2` must answer the endpoints marked "React" or "Handheld?" with the same URL, method and `{status, message, data}` shape until the apps are changed.

Mounts: users at `/api`, materials `/api/materials`, movements `/api/movement`, process `/api/process` (also CSRF), locations `/api/location`, STN `/api/stn`, raise `/api/raise`.

Auth column, as written in the code:
- `verifyToken` = cookie JWT. `verifyUnifyToken` = cookie **or** Bearer header (built for web and handheld).
- `NONE` = no auth middleware (often commented out in the source).

Total: 62 route definitions plus `GET /` and `GET /api/csrf-token` in `server.js`.
Called by the React client: 41. Not called by React: 21 (marked "Handheld?" where they look like handheld or admin-tool endpoints; the real Android contract is still unconfirmed).

## Users (`/api`)

| Method | URL | Auth | React | Notes |
|---|---|---|---|---|
| POST | /api/login | login validation + lockout | yes | web login, sets cookies |
| POST | /api/mobileLogin | login validation, no lockout (on purpose) | no | **Handheld?** shared warehouse device |
| POST | /api/register | validation | yes | |
| POST | /api/refresh | cookie | yes | |
| GET | /api/users | verifyUnifyToken + admin | yes | |
| PUT | /api/users/:userId/status | verifyUnifyToken + admin | **no** | React calls `PUT /api/users/{id}` (no `/status`), which appears to match no route. Likely a client bug. |

## Locations (`/api/location`)

| Method | URL | Auth | React | Notes |
|---|---|---|---|---|
| GET | /getAllLocations | verifyToken | yes | |
| POST | /addNewLocation | verifyToken | yes | **Known bug:** throws ReferenceError (`stack`, `parent` undefined), returns 500 |
| POST | /addBulkLocations | NONE | yes | |
| POST | /updateExistingLocation | verifyToken | no | |
| GET | / | verifyToken | no | fetch location by id |
| GET | /tree | verifyToken | yes | |
| GET | /binLocationsWithOccupancyAvailability | NONE | yes | **Handheld?** shows bin capacity |
| DELETE | /deleteLocationTree | NONE | yes | **Unauthenticated delete of the whole location tree** |

## Materials / bags (`/api/materials`)

All seven have auth commented out.

| Method | URL | Auth | React | Notes |
|---|---|---|---|---|
| GET | /getAllMaterials | NONE | yes | |
| POST | /addNewMaterial | NONE | yes | image upload |
| POST | /addBulkMaterials | NONE | no | **Handheld?** |
| POST | /updateExistingMaterial | NONE | yes | image upload |
| GET | /checkMaterialValidity | NONE | no | **Handheld?** (tag check) |
| GET | /getStaleMaterials | NONE | yes | |
| DELETE | /deleteMaterial | NONE | yes | **Unauthenticated delete** |

## Movements (`/api/movement`)

| Method | URL | Auth | React | Notes |
|---|---|---|---|---|
| POST | /addNewMovement | verifyToken | yes | |
| POST | /addBulkMovements | NONE | no | **Handheld?** scan |
| POST | /completeInTransitMovement | NONE | no | **Handheld?** putaway (In Transit to Moved) |
| POST | /changeAssignedBin | NONE | no | **Handheld?** |
| GET | /getAllMovements | verifyToken | yes | |
| GET | /getMaterialMovemntOverTimeThroughLocations | verifyToken | yes | analytics |
| GET | /getMaterialPresenceAtLocationToday | verifyToken | yes | analytics |
| GET | /getAllMaterialPresenceAtLocationSpecificDate | verifyToken | yes | analytics |
| GET | /getAverageOfAllMovementTime | verifyToken | yes | analytics |
| GET | /getAverageOfMovementTimePerRoute | verifyToken | yes | analytics |
| GET | /getMaterialRoutingHistoryTillDate | verifyToken | yes | analytics |
| GET | /getAllCurrentMaterialPresenceAtAllLocations | verifyToken | yes | |
| GET | /getOccupancyDistribution | verifyToken | yes | |
| GET | /getIntransitMovements | NONE | no | **Handheld?** |
| GET | /getMovedMaterialMovements | NONE | no | **Handheld?** |
| GET | /getOutwardIntransitMovements | NONE | no | **Handheld?** |
| GET | /getMaterialPresenceFromToDate | verifyToken | yes | |
| POST | /materialCurrentPresence | NONE | no | **Handheld?** |

## Process (`/api/process`, plus CSRF)

| Method | URL | Auth | React | Notes |
|---|---|---|---|---|
| POST | /addNewProcess | verifyToken | yes | |
| GET | /fetchAllProcess | verifyToken | yes | needs `process_definitions` table (missing from the dump) |
| POST | /updateProcess | verifyToken | yes | |

## STN (`/api/stn`)

| Method | URL | Auth | React | Notes |
|---|---|---|---|---|
| POST | /uploadStn | verifyUnifyToken | yes | multipart file `stnFile` |
| GET | /getStn/:file_name | verifyUnifyToken | no | |
| GET | /getStnByInvoice/:invoice_stn | verifyUnifyToken | no | **Handheld?** |
| DELETE | /deleteStn | verifyUnifyToken | yes | |
| GET | /extractPdf | NONE | yes | controller call commented out |
| GET | /extractExcel | verifyUnifyToken | no | |
| GET | /getAllStnDocuments | verifyUnifyToken | yes | |
| POST | /stnStatusUpdate | NONE | no | |
| POST | /consolidate | verifyUnifyToken | yes | |
| GET | /getAllocations | NONE | yes | |
| POST | /allocate | verifyUnifyToken | yes | |
| POST | /release | verifyUnifyToken | yes | |
| POST | /incrementSubmitted | verifyUnifyToken | no | **Handheld?** counts bags submitted |
| POST | /manualAssign | verifyUnifyToken | yes | |
| POST | /relocateInvoice | NONE | no | **Handheld?** |

## Raise requests (`/api/raise`, receives `io`)

Auth for this router is not visible in the route file (check the controller).

| Method | URL | React | Notes |
|---|---|---|---|
| POST | /raiseOutwardRequest | yes | emits `new-request-broadcast` |
| POST | /updateRaiseRequest | no | emits `request-updated` |
| POST | /deleteRaiseRequest | yes | emits `request-deleted` |
| POST | /applyOutward | no | **Handheld?** picks bags, completes the request |
| GET | /getPendingRaiseRequest | yes | **Handheld?** |

## Server-level

| Method | URL | Notes |
|---|---|---|
| GET | / | "Server is Running Properly" |
| GET | /api/csrf-token | CSRF token for the web client |
| WebSocket | Socket.IO | events: `new-request-broadcast`, `request-deleted`, `request-updated` (no auth, `io.emit` to everyone) |

## Findings to carry into v2
1. **Auth is missing on many endpoints,** including two deletes (`deleteLocationTree`, `deleteMaterial`). The handheld may call some of these without a token. v2 must authenticate them, so the handheld login flow has to be confirmed first.
2. **The React user status update looks broken** (wrong URL).
3. **`addNewLocation` throws** and always returns 500.
4. **21 endpoints are not called by React.** Their real callers (handheld, scripts, admin tools) are unconfirmed.
5. **Socket.IO events have no authentication.**
