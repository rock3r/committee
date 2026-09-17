# Hosting the read-only reviewer copy

Committee has two runtimes:

- **Admin:** Node 26+, Python 3.9+, local SQLite and private source/evidence files. Imports, research, approvals and bundle construction run here.
- **Reader:** a Cloudflare Worker serving frontend assets and curated bundles from a private R2 bucket. No SQLite, Python, Sessionize login or model keys run in the Worker. The Mac can be offline after publication.

A bundle still contains identifiable submission information and approved findings. Protected hosting is distribution to authorised reviewers, not anonymisation or permission to publish a historical corpus. Preview and approve the exact fields before upload. The reader has been exercised in the local Workers runtime. Deployment to a cloud account remains unverified.

## Prepare the deployment

From the source folder:

```sh
npm ci
node scripts/build-reader.mjs
npx wrangler login
```

Wrangler 4.132.0 is pinned by the lockfile. `build-reader.mjs` copies exactly four source assets into `.reader-assets`; it never copies the private data directory, tests or provider config.

Set the intended Cloudflare account explicitly; do not rely on whichever account Wrangler selects by default:

```sh
export CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID
npx wrangler r2 bucket create committee-private-bundles
```

Adjust `hosting/wrangler.jsonc`'s Worker and bucket names. Keep the R2 bucket private: do not enable an r2.dev URL or public custom domain for it. The Worker binding is the only read path.

Generate a random publisher token of at least 32 characters with your password manager. Set it as a Worker secret through the interactive prompt:

```sh
npx wrangler secret put PUBLISH_TOKEN --config hosting/wrangler.jsonc
npx wrangler deploy --config hosting/wrangler.jsonc
```

Do not put the publisher token on the command line, in a repository, in a userscript or in a reviewer invitation. Deployment and real bundle upload are separate operator actions. Rebuild the four assets before subsequent code deployments.

## Connect the local admin

In **Publish & access**, save the deployed HTTPS origin and the publisher token. These stay in the private local `publication-target.json` file. Select an event and publication profile, choose whether abstracts are included, and preview.

The preview lists the exact included/excluded fields and revision. Non-mechanical findings require human approval; speaker findings also require confirmed identity. Dismissed findings and hidden reviewer-derived findings are excluded. No raw custom fields, biographies, private notes, comments, credentials or unapproved model findings are copied.

**Publish this revision** checks that local content/approvals still match the preview. The Worker verifies its hash, writes the immutable bundle, then switches the event pointer. An incomplete upload leaves the last published bundle available. Read responses use `no-store`; userscript refreshes are every five minutes while the page is visible, or manually from its menu.

For rollback, the authenticated local `POST /api/publication/rollback {revision}` restores a revision recorded as previously published by this admin. It is an explicit rollback and may restore older evidence; it does not silently bypass the normal current-data preview check. Old objects remain in R2 until a deliberate retention cleanup.

## Reviewers and userscript

Create an invitation with a label and explicit event IDs. The connection code is shown once and contains a read-only bearer token, site origin and permitted events. Copy it or its fragment-only connect link and share privately with the intended reviewer. Do not post it publicly. The Worker stores only a hash of the token; the local reader list also excludes the token.

Reviewers can open the site and paste the code. To use Sessionize badges:

1. Install the script from the site's **Install userscript** link using Tampermonkey.
2. Open Sessionize, then Tampermonkey → **Connect Committee…**.
3. Paste the invitation code and allow the request to the committee's host if Tampermonkey asks.

No script editing, local admin token or running Mac is required. The script connects only to the configured HTTPS host; its wildcard `@connect` supports operator-chosen deployments. The public Sessionize Helper remains independent and is linked to [Greasy Fork](https://greasyfork.org/en/scripts/503828/).

Revoking an invitation removes its hashed reader record and immediately denies future requests. It cannot erase information a reviewer already downloaded or copied. The frontend keeps its code in localStorage until Disconnect, and Tampermonkey keeps its code in isolated script storage. The visible badges are readable by the Sessionize page; full private records and credentials are not injected into its DOM.

Current reader invitations do not expire automatically. Rotate/revoke them after the committee finishes. This is per-invitation bearer access, not an enterprise identity/SSO system. Every holder of an invitation can access the selected event's published profile; UI display preferences are not an access-control boundary. Ranks/comments/votes are not currently present in exported bundles.

## Local verification

```sh
node scripts/build-reader.mjs
npx wrangler dev --local --config hosting/wrangler.jsonc --port 43201
```

Use a synthetic publisher secret in a gitignored `hosting/.dev.vars` file for local testing. Do not use a production secret or real corpus in test fixtures. The Worker has been tested in Wrangler/workerd with local R2: bundle upload/retrieval, exact revision, wrong-event rejection (403), revoked-token rejection (401), and the reader UI connected to that runtime.

The actual userscript was visually tested in a local synthetic Sessionize DOM fixture with a mocked GM transport to the local Worker: compact badges, topics, repeated refresh without duplicates, immediate keyboard-focus tooltip, and stale-abstract suppression. A real Tampermonkey installation against deployed HTTPS remains an acceptance step before committee rollout.

References: [Workers static assets](https://developers.cloudflare.com/workers/static-assets/), [R2 Worker binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
