# Contributing

Use Node.js 26+ and Python 3.9+. Run `npm ci` followed by `npm run check` before proposing a change. Backend and Worker tests live in `test/`; frontend tests live beside `web/app.js`. Add regression tests for changed data, authentication or publication behaviour.

Use `npm run demo` for browser checks and screenshots. Never add real submissions, speaker profiles, reviewer comments, access tokens, API responses or database files to fixtures, issues or pull requests. Keep private working directories outside the checkout. Git ignore rules are a convenience, not a substitute for inspecting the staged files.

For UI changes, inspect desktop and narrow layouts, keyboard focus, empty states and failure states. Save screenshots only from synthetic data. Frontend unit tests do not replace browser validation.

Write documentation around the user's task: what to do, what happens, and what remains limited. Use the actual UI labels and executable commands. Distinguish tested behaviour from planned behaviour. Avoid marketing claims and repeated warnings that obscure the next action.

The source is licensed under [Apache 2.0](LICENSE).
