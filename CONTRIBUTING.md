# Contributing

Install Node.js 26 or later and Python 3.9 or later. Run `npm ci`, then `npm run check`, before proposing a change.

Backend and Worker tests live in `test/`. Frontend tests live beside `web/app.js`. Add regression tests when you change data handling, authentication or publication.

Use `npm run demo` for browser checks and screenshots. Keep private working directories outside the checkout. Inspect staged files even when Git ignore rules cover private paths.

Never put real submissions, speaker profiles, reviewer comments, access tokens, API responses or database files in fixtures, issues or pull requests.

For interface changes, check desktop and narrow layouts in a browser. Check keyboard focus, empty states and failure states too. Use fictional data for screenshots. Run browser checks even when frontend unit tests pass.

Write documentation around tasks. State the action, its result and any limits. Use current interface labels and commands that readers can run. Label planned behaviour separately from tested behaviour. Remove marketing claims and duplicate warnings.

The source uses the [Apache 2.0 licence](LICENSE).
