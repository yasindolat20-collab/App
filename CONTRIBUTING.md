# Contributing to Ω-SIB

Thank you for improving Ω-SIB, a SIB-compatible clinical web application for family physicians, Behvarz (بهورز), and midwives in Iran. Contributions must protect patient data, preserve Persian/RTL-first usability, and keep clinical decision support reviewable.

## Development setup

### Prerequisites

- Python 3.12
- Node.js 22 and npm
- Docker Compose, if using the local PostgreSQL stack

### Run locally

```bash
git clone <repository-url>
cd app
make install
make seed
```

Start the backend and frontend together:

```bash
make dev
```

Or use separate terminals:

```bash
make run
cd frontend && npm run dev -- --host 0.0.0.0 --port 5173
```

Run checks before opening a pull request:

```bash
make test
make build
make lint
```

For configuration, container use, and database recovery examples, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Never use production clinical data in local development or tests.

## Branch naming

Create a focused branch from an up-to-date `main` branch. Use one of these prefixes:

| Branch type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/patient-risk-summary` |
| Bug fix | `fix/<short-description>` | `fix/referral-status-validation` |
| Documentation | `docs/<short-description>` | `docs/deployment-backup-steps` |

Keep branches small and short-lived. Do not combine unrelated UI, backend, dependency, and clinical-rule changes in one pull request unless the changes cannot safely be separated.

## Commit messages

Use Conventional Commits:

```text
<type>(optional-scope): imperative summary
```

Recommended types include `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `ci`, and `chore`.

Examples:

```text
feat(referrals): validate status transitions
fix(auth): reject inactive user tokens
docs(api): clarify sync queue retry behavior
test(rules): cover preventive-care care gap
```

Write a concise, imperative summary. Use the commit body to explain clinical context, migrations, compatibility impact, or follow-up work when needed. Never include patient data, access tokens, passwords, API keys, or national IDs (کد ملی) in commit messages.

## Pull request checklist

Before requesting review, confirm the following:

- [ ] The branch has a focused purpose and follows the naming convention.
- [ ] `make test`, `make build`, and `make lint` pass locally where applicable.
- [ ] New or changed API behavior is documented and compatible with `/api` conventions.
- [ ] Persian labels, RTL layout, and keyboard/form behavior have been checked for UI changes.
- [ ] Authorization, input validation, audit behavior, and error handling were considered for any clinical write path.
- [ ] No secrets, patient-identifying data, screenshots of real charts, or private endpoints were added.
- [ ] Configuration, deployment, migration, or rollback implications are documented when relevant.
- [ ] Tests cover the change or the pull request explains why automated coverage is not yet practical.

## Clinical-safety review rule

**Any change to clinical rules requires a cited guideline.** Include the guideline or policy source, the applicable population and assumptions, the exact rule change, and the reviewer/approval context in the pull request. Do not change IraPEN-style risk logic, preventive-care schedules, drug-interaction checks, or clinical suggestions based solely on model output, anecdote, or an uncited request.

Changes that affect AI actions must preserve the **draft → review → confirm → execute → audit** flow and the **FACT / INFERENCE / SUGGESTION / UNKNOWN** provenance labels. AI assistance is not a substitute for licensed clinical judgement.

## Security and incident reporting

Do not open a public issue for a suspected vulnerability or an exposed credential. Follow [SECURITY.md](SECURITY.md) and the detailed controls in [docs/SECURITY.md](docs/SECURITY.md).
