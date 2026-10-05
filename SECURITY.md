# Security Policy

Ω-SIB handles sensitive clinical information. Detailed application and deployment controls are documented in [docs/SECURITY.md](docs/SECURITY.md).

## Reporting a vulnerability

Please **do not** report suspected vulnerabilities, exposed credentials, patient-data exposure, or authentication bypasses in a public GitHub issue.

Use a private disclosure channel managed by the repository owners (for example, GitHub's private security advisory/reporting feature where enabled, or the organization’s designated security contact). Include:

- a clear description of the issue and affected component;
- reproducible steps or a minimal proof of concept;
- potential impact and affected versions/environments; and
- any suggested mitigation, if available.

Do not include real patient data, passwords, API keys, access tokens, or production national IDs (کد ملی) in a report. Provide only the minimum information needed to reproduce the issue safely.

## Response expectations

Repository maintainers will assess a private report, coordinate remediation and validation, and determine an appropriate disclosure timeline. Do not publicly disclose an unresolved issue while users may remain at risk.

For operational hardening, secrets, RBAC, audits, encryption, backups, and current production-readiness limitations, see [docs/SECURITY.md](docs/SECURITY.md).
