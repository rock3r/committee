# Release readiness

The 17 September 2026 audit covered a source release labelled as a pilot. It provided no production certification. The owner authorised public source publication.

## Prepared release checks

The audit recorded these results:

| Area | Result |
| --- | --- |
| Documentation | The README, user guide, contributing guide and security limits were ready. |
| Screenshots | Desktop screenshots used the isolated fictional demo. The sync layout had no horizontal overflow at 390 pixels. |
| Static checks | ESLint and non-strict TypeScript checks passed. Non-strict checking leaves some type errors undetected. |
| Tests | Local runs passed 30 backend/Worker tests, 13 frontend tests and two Python collector tests. |
| Reader build | The asset build used an explicit four-file allowlist. |
| Source checks | Checks covered selected credential patterns, personal paths, data file extensions and broken Markdown links. Manual inspection remains necessary. |
| CI | The GitHub Actions workflow used Node 26 and Python 3.12. It ran `npm run check` without provider credentials. |
| Dependencies | The npm audit reported zero vulnerabilities on the audit date. |

## Checks before public source release

The repository includes the canonical Apache 2.0 licence text. The owner chose to provide no dedicated security-reporting contact.

Before the first commit, inspect the exact staged files, including screenshots. Exclude local tool state, generated assets and all event data. Confirm that the first hosted CI run passes. A successful local run cannot establish that result.

## Checks before committee use

Complete these checks before giving a committee access to a hosted reader:

1. Import a real event through a dedicated all-submissions Sessionize API endpoint. The accepted-only live test imported 111 sessions twice without duplicate changes. It correctly failed complete-event coverage. Full-event API import remains unverified.
2. Deploy a fictional event over HTTPS. Install the actual userscript in Tampermonkey. Test connection, event scope, update delivery and revocation.
3. Test the chosen paid provider and spending limits with an authorised small sample. Mock adapter tests establish neither model accuracy nor compatibility with arbitrary providers.
4. Test backup restoration. Choose invitation rotation and retention rules. Get the event owner's permission for reviewer distribution.

Local Worker/R2 tests passed. Cloud deployment remains unverified. Invitations have no automatic expiry. An operator must deliberately remove old published revisions under the chosen retention rules.
