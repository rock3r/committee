# Release readiness

Audit date: 17 September 2026. Target: an explicitly labelled pilot source release, not a production certification. The owner has authorised public source publication.

## Prepared

- README, user guide, contributing guidance and security boundaries.
- Desktop screenshots from the isolated fictional demo; sync layout inspected at 390 pixels with no horizontal overflow.
- ESLint and TypeScript checks. TypeScript checking is currently non-strict; this is not a claim of full type safety.
- 30 backend/Worker tests, 13 frontend tests and two Python collector tests passing locally.
- Reader asset build with an explicit four-file allowlist.
- Source-file checks for selected credential patterns, personal paths, data artifact extensions and broken Markdown links. These checks are bounded and do not replace manual inspection.
- GitHub Actions workflow using Node 26 and Python 3.12, running `npm run check` without provider credentials.
- npm dependency audit: zero reported vulnerabilities at the audit date.

## Before public source release

- Apache 2.0 selected; canonical licence text included.
- No dedicated security-reporting contact, by owner choice.
- Inspect the exact staged files, including screenshots, before the first commit. Exclude local tool state, generated assets and all event data.
- Confirm the first hosted CI run; local success does not establish hosted CI success.

## Before using a hosted reader with a committee

- Exercise a dedicated all-submissions Sessionize API endpoint end to end. The accepted-only live test imported 111 sessions twice without duplicate changes and correctly failed complete-event coverage. It does not validate a full-event API import.
- Deploy a synthetic event to HTTPS and install the actual userscript in Tampermonkey. Test connection, event scope, update delivery and revocation.
- Validate the selected paid provider and spending limits with an authorised small sample. Mocked adapter tests do not measure model accuracy or certify arbitrary provider compatibility.
- Test backup restoration, choose invitation rotation/retention policy and confirm event-owner permission for reviewer distribution.

The local Worker/R2 path has been exercised. Cloud deployment remains unverified. Existing invitations do not expire automatically; old published revisions require deliberate retention cleanup.
