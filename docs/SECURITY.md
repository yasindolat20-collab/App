# Ω-SIB Clinical Data Security

Ω-SIB processes health information and must be deployed as a clinical system, not as a generic web demo. This document describes the intended security controls for the current architecture and distinguishes implemented application capabilities from production controls that an operator must still establish.

> **Clinical-use warning:** A deployment is not suitable for production clinical use merely because the application starts successfully. The operator must complete authorization review, infrastructure hardening, backup recovery testing, privacy review, and validation appropriate to the intended setting.

## Authentication and sessions

- The REST API uses **Bearer JWT authentication**. Clients obtain a token through `POST /api/auth/login` and send it as `Authorization: Bearer <access_token>`.
- Password hashes use **bcrypt**; plaintext passwords must never be stored, logged, committed, or placed in fixtures intended for shared environments.
- Tokens must be signed with a high-entropy secret that is unique to each environment and supplied through secure deployment configuration. Treat signing-key rotation, token lifetime, and revocation behavior as explicit production configuration decisions.
- The demonstration credential `admin` / `admin123`, if enabled by the backend's seed configuration, is for local development only. It must be removed, reset, or disabled before exposure beyond a controlled local environment.
- Do not place JWTs in URLs, logs, issue comments, screenshots, or support tickets. Prefer secure session handling consistent with the frontend's threat model.

## Role-based access control

The application defines four roles: `family_physician`, `behvarz`, `midwife`, and `admin`. The current backend capability map is shown below. Route guards must enforce these permissions server-side; hiding a control in the UI is never authorization.

| Capability | Family physician | Behvarz | Midwife | Admin |
|---|---|---|---|---|
| Read (`read`) | Yes | Yes | Yes | Yes |
| Write encounters (`write_visit`) | Yes | No | Yes | Yes |
| Record standalone vitals (`write_vitals`) | Not listed as a standalone capability | Yes | Not listed as a standalone capability | Yes |
| Create or change referrals (`write_referral`) | Yes | No | Yes | Yes |
| Create or change service requests (`write_service`) | Yes | Yes | Yes | Yes |
| Commit SIB synchronization work (`commit_sib`) | Yes | No | No | Yes |
| Execute confirmed AI actions (`ai_execute`) | Yes | No | No | Yes |
| Read reports (`reports`) | Yes | No | No | Yes |
| Administrative capability (`admin`) | No | No | No | Yes |

The documented REST surface does not include separate user, role, secret, or deployment administration endpoints. The current role map also does not itself demonstrate per-record scope enforcement for a health house, comprehensive health center, household file, or care team. Before production, every read and write must additionally validate the caller's permitted record scope. Any emergency or break-glass workflow should be separately designed, justified, time-limited, and auditable; it is not assumed by the current API surface.

## Audit-log integrity

Ω-SIB has an **append-only audit log table for every clinical write**. The audit trail should capture the actor, action, affected record, timestamp, and relevant correlation or request context without copying unnecessary sensitive payloads.

To preserve its value:

- Application code must append audit events rather than update or delete historical entries.
- Database permissions must prevent ordinary application users and routine support accounts from altering audit history.
- Administrative access to the database, log exports, or backups must itself be controlled and logged.
- Audit data should be retained according to the applicable organization policy and law, then securely disposed of when retention ends.
- An application-level append-only table is valuable but is **not by itself immutable storage**. Production deployments should add database access controls, monitored privileged access, protected backups, and, where required, independent or tamper-evident audit retention.

## Password and PIN policy

The stack guarantees bcrypt hashing; exact password and PIN validation rules are configuration and product-policy decisions unless enforced by the backend. Before production, adopt and enforce at least the following policy:

- Require passwords of **12 or more characters**, reject known-compromised passwords where the organization can do so safely, and rate-limit or otherwise protect repeated failed authentication attempts.
- Prohibit shared clinical accounts. Each physician, Behvarz (بهورز), midwife, and administrator must have an attributable identity.
- Reset or disable seed and demo accounts in every non-local environment.
- If an optional local PIN or rapid re-entry feature is introduced, use a **minimum six-digit PIN**, protect it with device/session controls and throttling, store only a secure verifier, and never use it as a substitute for a strong server-side credential.
- Establish a secure recovery process that verifies identity and creates an auditable event. Do not disclose passwords, PINs, API keys, or verification codes through chat or source control.

## Encryption and transport security

| Area | Requirement |
|---|---|
| **In transit** | Terminate and enforce modern TLS for browser-to-API and API-to-external-service traffic. Redirect or reject plaintext HTTP in production. Validate upstream certificates; do not disable certificate verification to work around deployment issues. |
| **At rest** | Use encrypted volumes, disks, or a managed database service for PostgreSQL production data. Protect database snapshots and local backups with encryption and access controls. SQLite development databases require equivalent host-level protection if they contain real data. |
| **Secrets** | Keep JWT signing material, database credentials, AI provider keys, and third-party adapter credentials in a managed secret store or protected deployment environment. Rotate them after suspected exposure. |
| **AI provider traffic** | Send the minimum necessary context to the configured OpenAI-compatible provider. Verify contractual, geographic, access-control, and retention requirements before sending identifiable clinical data to any provider. |
| **Logs and telemetry** | Exclude access tokens, passwords, secrets, national IDs (کد ملی), and unnecessary clinical payloads. Restrict log access and define retention. |

## Least privilege and data minimization

- Grant database, container, cloud, CI, and support accounts only the permissions they require.
- Separate development, test, staging, and production credentials and data. Do not use production exports as convenient development fixtures.
- Return and render only data needed for the user’s authorized task. The same principle applies to reports, audit views, AI prompts, referrals, and integrations.
- Treat the 10-digit national ID (کد ملی) as sensitive identifying information. Validate it where the application requires it, avoid exposing it in logs or filenames, and restrict exports.
- Use service identities for integrations rather than a clinician’s personal credentials. Scope each adapter credential to the smallest available permissions.

## Backups and recovery

1. Back up PostgreSQL on a documented schedule using an account with read-only backup permissions where possible.
2. Encrypt backup artifacts, restrict their storage location, and track who can restore them.
3. Test restoration into an isolated environment at a scheduled interval. A backup that has not been restored is not proven recoverable.
4. Include the required application configuration, schema/migration state, and operational runbook in recovery planning without copying production secrets into the backup.
5. Record backup and restore actions in operational logs. Follow local retention and disposal requirements for clinical records.

See [Deployment](DEPLOYMENT.md#backup-and-restore) for local command examples.

## Secrets and source control

- Never commit `.env` files containing real credentials. The repository ignores `.env*` while allowing a deliberately non-secret `.env.example` if one is added later.
- Do not bake secrets into a Docker image, Dockerfile, compose file, frontend bundle, test fixture, or GitHub Actions log.
- Pass `AI_API_KEY`, database passwords, JWT signing secrets, and future SIB credentials at runtime through protected environment configuration or a secret manager.
- If a secret is committed or exposed, revoke or rotate it immediately; removing it from a later commit is not sufficient.

## What is **not** production-ready yet

The stated architecture includes application primitives, not a completed production assurance program. At minimum, the following require confirmation, implementation, or environment-specific validation before a live clinical rollout:

- A live, authorized SIB adapter and reconciliation process; the SIB adapter remains a future integration boundary.
- Verified TLS termination, encrypted database volumes/backups, managed key rotation, and environment-specific secret management.
- Confirmed route-level and record-scope RBAC tests for every endpoint and a defined emergency-access policy.
- Production monitoring, security alerting, incident response, log-retention policy, and independent audit-log protection.
- Formal clinical-rule governance, guideline review, test coverage, data migration validation, and usability/safety review with intended users.
- AI provider privacy assessment and controls appropriate to any identifiable data sent outside the operator's environment.

Until those controls are in place, use Ω-SIB only in controlled development, demonstration, or explicitly approved evaluation settings with non-production data.
