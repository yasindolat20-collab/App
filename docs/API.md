# Ω-SIB REST API Reference

The Ω-SIB API is a JSON REST API served beneath the base path **`/api`**. Authenticated endpoints use a JWT Bearer access token. The live FastAPI contract is available at:

- **Swagger UI:** `/docs`
- **OpenAPI document:** `/openapi.json`

For example, when running locally, open <http://localhost:8000/docs> or retrieve <http://localhost:8000/openapi.json>. The OpenAPI document and the Pydantic models exposed by the running backend are authoritative for exact field names, validation constraints, optional fields, and response schemas.

> **Examples below are representative JSON payloads.** The endpoint paths, methods, named status enums, and AI request/response shape are part of the documented interface. Where the product specification does not define a complete clinical record schema, examples use conventional field names to explain intent; clients must generate typed integrations from `/openapi.json` rather than rely on illustrative fields.

## Conventions

| Convention | Rule |
|---|---|
| Base path | Prefix every endpoint with `/api`. |
| Content type | Send `Content-Type: application/json` for JSON request bodies. |
| Authentication | Send `Authorization: Bearer <access_token>` after login, except for login and health checks. |
| IDs | Replace `{id}` and `{issue_id}` path placeholders with the server-issued identifier. Treat the identifier as opaque in client code. |
| Dates and times | Send and consume the ISO-8601 formats required by the OpenAPI schema. |
| Clinical action safety | Treat rules and AI output as decision support. Review AI drafts before confirmation and execution. |
| Error body | FastAPI errors use `{ "detail": ... }`; `detail` may be a message or structured validation information. |

## Authentication

### Sign in

`POST /api/auth/login` returns an access token, token type, expiry, and user object. A clinical e-signature `pin` is optional in the current request schema.

```json
{
  "username": "admin",
  "password": "admin123",
  "pin": "1234"
}
```

Representative response:

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in_minutes": 720,
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Dr. Sara Alavi",
    "role": "admin",
    "medical_council_no": null,
    "facility": null
  }
}
```

Use the returned value on subsequent requests:

```http
Authorization: Bearer eyJ...
```

The backend seed configuration uses `admin` / `admin123` as the **default local demo credentials** when demo seeding is enabled. They are configurable through `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_NAME`; `SEED_DEMO_DATA` controls seed-data behavior. They are not production credentials and must be changed, disabled, or removed outside controlled local development.

### Current user

`GET /api/auth/me` returns the authenticated user.

```json
{
  "id": 1,
  "username": "admin",
  "full_name": "Dr. Sara Alavi",
  "role": "admin",
  "medical_council_no": null,
  "facility": null
}
```

## Endpoint reference

| Group | Method and path | Purpose |
|---|---|---|
| Auth | `POST /api/auth/login` | Issue `{access_token, token_type, user}` for valid credentials. |
| Auth | `GET /api/auth/me` | Return the authenticated user. |
| Patients | `GET /api/patients` | Search/list patients with `query`, `limit`, `offset`, and `sort`. |
| Patients | `POST /api/patients` | Create a patient record. |
| Patients | `GET /api/patients/{id}` | Return a full patient chart. |
| Patients | `PATCH /api/patients/{id}` | Update allowed patient fields. |
| Patient clinical data | `GET /api/patients/{id}/encounters` | List the patient's encounters. |
| Patient clinical data | `POST /api/patients/{id}/encounters` | Create an encounter for that patient. |
| Patient clinical data | `GET /api/patients/{id}/vitals` | List the patient's recorded vitals. |
| Patient clinical data | `POST /api/patients/{id}/vitals` | Record vitals for that patient. |
| Patient clinical data | `GET /api/patients/{id}/preventive-care` | Return preventive-care schedule/status information. |
| Patient clinical data | `GET /api/patients/{id}/quality-issues` | Return data-quality findings. |
| Patient clinical data | `POST /api/patients/{id}/quality-issues/{issue_id}/resolve` | Resolve a named quality issue. |
| Decision support | `GET /api/patients/{id}/risk` | Return IraPEN-style cardiovascular-risk information. |
| Decision support | `GET /api/patients/{id}/suggestions` | Return deterministic rules-engine suggestions. |
| Encounters | `GET /api/encounters` | List encounters across the authorized scope. |
| Encounters | `POST /api/encounters` | Create an encounter using the general encounter resource. |
| Encounters | `GET /api/encounters/{id}` | Return one encounter. |
| Encounters | `POST /api/encounters/{id}/commit` | Commit an encounter and create a SIB synchronization transaction. |
| Referrals | `GET /api/referrals` | List referrals. |
| Referrals | `POST /api/referrals` | Create a referral. |
| Referrals | `GET /api/referrals/{id}` | Return one referral. |
| Referrals | `PATCH /api/referrals/{id}` | Update a referral, including `DRAFT`, `SENT`, `ACCEPTED`, `COMPLETED`, or `REJECTED` status as allowed. |
| Services | `GET /api/services` | Return the service catalog. |
| Services | `GET /api/service-requests` | List service requests. |
| Services | `POST /api/service-requests` | Create a service request. |
| Services | `PATCH /api/service-requests/{id}` | Update request status: `REQUESTED`, `SCHEDULED`, `RESULTED`, or `CANCELLED`. |
| Reports | `GET /api/reports/summary` | Return summary reporting data. |
| Reports | `GET /api/reports/care-gaps` | Return preventive-care/care-gap reporting data. |
| Reports | `GET /api/reports/data-quality` | Return data-quality reporting data. |
| Sync | `GET /api/sync/queue` | List SIB synchronization transactions and their queue state. |
| Sync | `POST /api/sync/queue/{id}/retry` | Retry a queue item, especially after `FAILED`. |
| Sync | `POST /api/sync/flush` | Request processing of queued transactions. |
| AI | `POST /api/ai/chat` | Submit a chat message and optional patient/history context. |
| AI | `POST /api/ai/execute` | Execute confirmed AI actions and return results plus `audit_id`. |
| Operations | `GET /api/audit` | Return available audit-log information. |
| Operations | `GET /api/health` | Return API health information; suitable for basic reachability checks. |

## Request and response examples by endpoint group

### 1. Patients and charts

List patients with the documented search and offset parameters:

```http
GET /api/patients?query=Alavi&limit=25&offset=0&sort=last_name
Authorization: Bearer <access_token>
```

A client should use `limit` and `offset` for the patient list. The client convention is a zero-based `offset`; do not assume cursor pagination. `query` and `sort` are optional. The list response is an envelope with `items`, `total`, `limit`, and `offset`. The current OpenAPI schema determines defaults, allowed sort values, and maximum page size.

Representative patient creation request:

```json
{
  "national_id": "0123456789",
  "name": "Sara Alavi",
  "persian_name": "سارا علوی",
  "gender": "F",
  "birth_date": "1984-05-12",
  "household_number": "HH-1001",
  "health_center": "Example comprehensive health center",
  "health_house": "Example health house",
  "assigned_behvarz": "Example Behvarz",
  "phone": "+989121234567",
  "smoker": false,
  "initial_vitals": {
    "bp_systolic": 124,
    "bp_diastolic": 78,
    "weight_kg": 68.4,
    "height_cm": 166
  }
}
```

Representative response after `POST /api/patients`:

```json
{
  "id": "p-example",
  "name": "Sara Alavi",
  "persian_name": "سارا علوی",
  "national_id": "0123456789",
  "gender": "F",
  "phone": "+989121234567"
}
```

Update only mutable fields with `PATCH /api/patients/{id}`:

```json
{
  "phone": "+989129876543"
}
```

`GET /api/patients/{id}` returns the full chart representation defined by the server. Do not put a national ID (کد ملی) in a URL, log line, browser history annotation, or error report.

### 2. Patient encounters, vitals, preventive care, and quality

Create an encounter directly beneath a patient:

```json
{
  "patient_id": "p-example",
  "chief_complaint": "Preventive follow-up",
  "subjective": "Clinician-reviewed history",
  "assessment": ["Follow-up assessment"],
  "plan": ["Review preventive-care schedule"],
  "follow_up_days": 90,
  "vitals": {
    "bp_systolic": 124,
    "bp_diastolic": 78
  }
}
```

Representative response:

```json
{
  "id": "enc-example",
  "patient_id": "p-example",
  "status": "DRAFT",
  "occurred_at": "2026-10-05T09:30:00Z"
}
```

Record vitals with `POST /api/patients/{id}/vitals`:

```json
{
  "measured_at": "2026-10-05T09:35:00Z",
  "bp_systolic": 124,
  "bp_diastolic": 78,
  "heart_rate": 72,
  "weight_kg": 68.4,
  "height_cm": 166
}
```

Representative response:

```json
{
  "id": 301,
  "measured_at": "2026-10-05T09:35:00Z",
  "bp_systolic": 124,
  "bp_diastolic": 78
}
```

Read the related resources with `GET /api/patients/{id}/encounters`, `GET /api/patients/{id}/vitals`, `GET /api/patients/{id}/preventive-care`, and `GET /api/patients/{id}/quality-issues`. To resolve one finding, use the issue identifier returned by the quality-issues endpoint:

```http
POST /api/patients/42/quality-issues/17/resolve
Authorization: Bearer <access_token>
Content-Type: application/json

{}
```

A resolution may require fields defined by the current server schema; if so, provide them as shown in `/docs`. A successful response represents the resolved issue or its updated status.

### 3. IraPEN-style risk and rules suggestions

Decision support is read through patient-specific endpoints:

```http
GET /api/patients/42/risk
GET /api/patients/42/suggestions
Authorization: Bearer <access_token>
```

Representative risk response:

```json
{
  "patient_id": 42,
  "risk": "calculated",
  "inputs_status": "complete",
  "provenance": "FACT"
}
```

Representative suggestions response:

```json
{
  "patient_id": 42,
  "suggestions": [
    {
      "kind": "preventive_care",
      "message": "Review the current preventive-care schedule.",
      "provenance": "SUGGESTION"
    }
  ]
}
```

The exact risk fields and rule messages are determined by the rules engine and available patient data. They are decision support, not autonomous orders or diagnoses. The frontend must render AI-facing provenance labels as **FACT**, **INFERENCE**, **SUGGESTION**, or **UNKNOWN** where applicable.

### 4. General encounters and SIB commit

The general encounter resource is useful when the client starts with an encounter rather than a patient page:

```json
{
  "patient_id": "p-example",
  "chief_complaint": "Follow-up",
  "subjective": "Clinician-reviewed history",
  "assessment": ["Follow-up assessment"],
  "plan": ["Continue follow-up"],
  "referral_requested": false,
  "commit": false
}
```

Representative creation response:

```json
{
  "id": "enc-example",
  "patient_id": "p-example",
  "status": "DRAFT"
}
```

Read encounters through `GET /api/encounters`, `GET /api/encounters/{id}`, or the patient-scoped listing. Commit a completed encounter using:

```http
POST /api/encounters/108/commit
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "pin": "1234",
  "summary_override": ["Clinician-reviewed commit summary"]
}
```

The commit creates a synchronization transaction for the pluggable SIB integration path. A representative response includes the encounter and a queued transaction:

```json
{
  "encounter_id": "enc-example",
  "sync_transaction": {
    "id": "tx-example",
    "status": "QUEUED"
  }
}
```

A local commit being accepted does not prove an external SIB operation completed. Follow the queue state through the sync endpoints.

### 5. Referrals

Create a referral with clinical information required by the server schema:

```json
{
  "patient_id": "p-example",
  "specialty": "Cardiology",
  "persian_specialty": "قلب و عروق",
  "urgency": "ROUTINE",
  "reason": "Specialist assessment requested",
  "target_facility": "Example comprehensive health center",
  "send": false
}
```

Representative response:

```json
{
  "id": "ref-example",
  "patient_id": "p-example",
  "specialty": "Cardiology",
  "status": "DRAFT"
}
```

Read referrals with `GET /api/referrals` or `GET /api/referrals/{id}`. Update using `PATCH /api/referrals/{id}`:

```json
{
  "status": "SENT"
}
```

Referral statuses are `DRAFT`, `SENT`, `ACCEPTED`, `COMPLETED`, and `REJECTED`. The server determines which transitions and fields are valid.

### 6. Service catalog and service requests

`GET /api/services` returns the catalog. Create a request against a catalog item using `POST /api/service-requests`:

```json
{
  "patient_id": "p-example",
  "service_code": "FBS",
  "notes": "Fasting sample requested"
}
```

Representative response:

```json
{
  "id": "srv-example",
  "patient_id": "p-example",
  "service_id": 12,
  "status": "REQUESTED"
}
```

List requests with `GET /api/service-requests` and update one with `PATCH /api/service-requests/{id}`:

```json
{
  "status": "SCHEDULED"
}
```

Service-request statuses are `REQUESTED`, `SCHEDULED`, `RESULTED`, and `CANCELLED`. Use the exact catalog identifier and any additional fields required by the OpenAPI schema.

### 7. Reports

All report endpoints are read-only:

```http
GET /api/reports/summary
GET /api/reports/care-gaps
GET /api/reports/data-quality
Authorization: Bearer <access_token>
```

Representative summary response:

```json
{
  "generated_at": "2026-10-05T12:00:00Z",
  "summary": {}
}
```

Representative care-gap and data-quality responses identify the requested report domain and result set:

```json
{
  "items": []
}
```

Report population, aggregation, and permitted scope must be enforced by the backend. Do not interpret an empty response as proof that all care is complete or all records are correct.

### 8. Synchronization queue

Read synchronization state:

```http
GET /api/sync/queue
Authorization: Bearer <access_token>
```

Representative queue response:

```json
[
  {
    "id": "tx-example",
    "status": "FAILED",
    "kind": "ENCOUNTER",
    "retry_count": 1,
    "error_message": "Example adapter error"
  }
]
```

Retry one item or request a queue flush:

```http
POST /api/sync/queue/tx-example/retry
POST /api/sync/flush
Authorization: Bearer <access_token>
Content-Type: application/json

{}
```

A transaction progresses through `QUEUED`, `SYNCING`, `SYNCED`, or `FAILED`. Retrying a queue item must be limited to authorized users and must not be treated as proof of idempotency with a future external system until the adapter contract has been validated.

### 9. AI chat and confirmed execution

The chat endpoint has the following request and response shape:

```json
{
  "message": "Summarize the pending preventive-care items.",
  "patient_id": "p-example",
  "session_id": "chat-example",
  "history": [
    {
      "role": "user",
      "content": "What should I review today?"
    }
  ]
}
```

```json
{
  "session_id": "chat-example",
  "reply": "Review the displayed preventive-care items with the clinician.",
  "intent": "clinical_summary",
  "engine": "rules",
  "draft_plan": {
    "summary": "Clinician review required.",
    "actions": []
  },
  "provenance": {
    "label": "SUGGESTION"
  },
  "requires_confirmation": true,
  "patient_id": "p-example",
  "evidence": []
}
```

When no `AI_API_KEY` is configured, Ω-SIB uses its deterministic offline rules fallback rather than an external chat-completions provider. An AI reply must remain visibly labelled with its provenance.

Only send actions that a clinician has reviewed and confirmed to `POST /api/ai/execute`:

```json
{
  "patient_id": "p-example",
  "session_id": "chat-example",
  "actions": [
    {
      "type": "example_confirmed_action",
      "description": "Example action after clinical review",
      "params": {
        "target_id": "p-example"
      },
      "provenance": {
        "label": "SUGGESTION"
      }
    }
  ]
}
```

Representative response:

```json
{
  "executed": 0,
  "results": [],
  "audit_id": 9001
}
```

The available action types are server-defined. Clients must not invent, auto-submit, or bypass the draft → review → confirm → execute → audit workflow.

### 10. Audit and health

Read audit data through the authorized API view:

```http
GET /api/audit
Authorization: Bearer <access_token>
```

Representative response:

```json
{
  "items": []
}
```

The audit table is append-only for clinical writes. Audit visibility and retention are security-sensitive; use server-side authorization and avoid exporting more information than needed.

Check basic API reachability:

```http
GET /api/health
```

Representative response:

```json
{
  "status": "ok"
}
```

## HTTP status codes and error shape

| Status | Meaning | Typical response |
|---|---|---|
| `200 OK` | Read, update, command, or health request completed. | Resource, list, report, or command result. |
| `201 Created` | A resource was created. | New resource representation. |
| `204 No Content` | A successful operation intentionally has no response body, if used by the implementation. | No body. |
| `400 Bad Request` | The server cannot process the request because of a domain-level request problem. | `{ "detail": "..." }` |
| `401 Unauthorized` | No usable Bearer token, invalid credentials, expired/invalid token, or inactive/unknown user. | `{ "detail": "Not authenticated" }` or `{ "detail": "Could not validate credentials" }` |
| `403 Forbidden` | The authenticated role lacks the required capability. | `{ "detail": "Role 'behvarz' may not perform '...'" }` |
| `404 Not Found` | The requested resource or route does not exist, or is not available to the caller. | `{ "detail": "..." }` |
| `409 Conflict` | A state transition or uniqueness constraint conflicts with the current server state, if used by the endpoint. | `{ "detail": "..." }` |
| `422 Unprocessable Content` | FastAPI/Pydantic validation failed. | `{ "detail": [ ...validation errors... ] }` |
| `429 Too Many Requests` | A configured rate limit was exceeded. | `{ "detail": "..." }` |
| `500 Internal Server Error` | An unexpected server failure occurred. | Do not depend on internal implementation details in the response. |

All clients should handle unknown error statuses defensively, display safe user-facing messages, and preserve enough request correlation information for support without logging credentials or sensitive clinical data.

## curl quickstart

Set the local API base URL and log in. The demo credentials are configurable and are only suitable for local seeded development data.

```bash
export API_BASE=http://localhost:8000/api

curl --request POST "$API_BASE/auth/login" \
  --header 'Content-Type: application/json' \
  --data '{"username":"admin","password":"admin123"}'
```

Copy `access_token` from the response into `TOKEN`, then verify identity:

```bash
export TOKEN='paste-access-token-here'

curl --fail "$API_BASE/auth/me" \
  --header "Authorization: Bearer $TOKEN"
```

List patients and inspect a full chart:

```bash
curl --get "$API_BASE/patients" \
  --data-urlencode 'query=' \
  --data-urlencode 'limit=25' \
  --data-urlencode 'offset=0' \
  --data-urlencode 'sort=last_name' \
  --header "Authorization: Bearer $TOKEN"

curl --fail "$API_BASE/patients/42" \
  --header "Authorization: Bearer $TOKEN"
```

Check health without a token and access interactive API documentation:

```bash
curl --fail "$API_BASE/health"
# Open http://localhost:8000/docs in a browser.
```

For automated clients, fetch `/openapi.json`, generate or validate a typed client, and ensure the caller respects the role, clinical-safety, provenance, confirmation, and audit requirements described above.
