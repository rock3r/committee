# Host the reviewer site

Committee runs the administrator workspace locally and hosts a read-only copy for reviewers.

| Runtime | Responsibilities and requirements |
| --- | --- |
| Admin | Node 26 or later and Python 3.9 or later run imports, research, approvals and bundle creation. SQLite and source/evidence files stay private. |
| Reader | A Cloudflare Worker serves frontend assets and selected bundles from private R2 storage. It holds no SQLite database, Python runtime, Sessionize login or model keys. |

The admin Mac can go offline after publication. Bundles still identify speakers and proposals and contain approved findings. Get permission from the event owner before distributing them. Protected hosting alone grants no permission to publish a historical dataset.

Preview the exact fields before upload. Local Workers runtime tests passed. Deployment to a cloud account remains unverified.

## Prepare the deployment

Run these commands from the source folder:

```sh
npm ci
node scripts/build-reader.mjs
npx wrangler login
```

The lockfile pins Wrangler 4.132.0. `build-reader.mjs` copies exactly four source assets into `.reader-assets`. It excludes the private data directory, tests and provider configuration.

Select the intended Cloudflare account explicitly:

```sh
export CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID
npx wrangler r2 bucket create committee-private-bundles
```

Set the Worker and bucket names in `hosting/wrangler.jsonc`. Keep the R2 bucket private. Leave its r2.dev URL and public custom domains disabled. Read access must go through the Worker binding.

Use a password manager to generate a random publisher token with at least 32 characters. Enter it through Wrangler's interactive secret prompt:

```sh
npx wrangler secret put PUBLISH_TOKEN --config hosting/wrangler.jsonc
npx wrangler deploy --config hosting/wrangler.jsonc
```

Keep the publisher token out of command arguments, repositories, userscripts and reviewer invitations. An operator must separately deploy code and upload real bundles. Rebuild the four assets before each later code deployment.

## Publish from the local admin

In **Publish & access**, save the deployed HTTPS origin and publisher token. Committee stores them in private local `publication-target.json`.

Select an event and publication profile. Choose whether to include abstracts, then preview the bundle. The preview shows the revision and exact included and excluded fields.

Non-mechanical findings need human approval. Speaker findings also need confirmed identity. The bundle excludes dismissed findings, hidden reviewer-derived findings, raw custom fields, biographies, private notes, comments, credentials and unapproved model findings.

Choose **Publish this revision** after reviewing the preview. Committee checks that local content and approvals still match it. The Worker checks the hash, writes an immutable bundle and updates the event pointer. An incomplete upload leaves the last published bundle available.

Read responses use `no-store`. The userscript refreshes every five minutes while its page is visible. Reviewers can also refresh through its menu.

To restore a published local revision, call authenticated `POST /api/publication/rollback {revision}`. The revision must have a record of prior publication by this admin. Rollback can restore older evidence. It requires a deliberate request and leaves the normal current-data preview check in place for other publication actions.

R2 retains old objects until an operator deliberately removes them under the chosen retention rules.

## Invite reviewers

Create an invitation with a label and explicit event IDs. Committee shows the connection code once. The code contains a read-only bearer token, the site origin and permitted events.

Share the code or its fragment-only connect link privately with the intended reviewer. The Worker stores only a token hash. The local reader list excludes the token.

Reviewers can paste the code into the hosted site. To add Sessionize badges:

1. Install the script from the site's **Install userscript** link with Tampermonkey.
2. Open Sessionize. In Tampermonkey, choose **Connect Committee…**.
3. Paste the invitation code. If Tampermonkey asks, allow requests to the Committee host.

Reviewers need no script edits, local admin token or running Mac. The script connects only to the configured HTTPS host. Its wildcard `@connect` supports deployments on operator-chosen hosts.

The public Sessionize Helper runs separately. Its listing remains on [Greasy Fork](https://greasyfork.org/en/scripts/503828/).

## Revoke access and manage copies

Revocation removes the invitation's hashed reader record and immediately blocks future requests. It cannot remove information that a reviewer has downloaded or copied.

The frontend stores its code in localStorage until **Disconnect**. Tampermonkey stores its code in isolated script storage. The Sessionize page can read visible badges. The script keeps full private records and credentials out of that page's DOM.

Invitations have no automatic expiry. Rotate or revoke them when the committee finishes. Anyone holding an invitation can read the selected events' published profiles. Client display preferences impose no access restrictions. Invitations provide bearer access without enterprise identity or single sign-on (SSO).

Exported bundles currently contain no ranks, comments or votes.

## Verify locally

```sh
node scripts/build-reader.mjs
npx wrangler dev --local --config hosting/wrangler.jsonc --port 43201
```

Put a fictional publisher secret in gitignored `hosting/.dev.vars` for local tests. Keep production secrets and real proposal datasets out of fixtures.

Wrangler/workerd tests with local R2 covered bundle upload and retrieval, exact revisions, wrong-event rejection (403), revoked-token rejection (401) and the connected reader interface.

Visual userscript tests used a local fictional Sessionize DOM fixture. A mock GM transport connected it to the local Worker. Checks covered compact badges, topics, repeated refresh without duplicates, immediate keyboard-focus tooltips and stale-abstract suppression.

Before committee rollout, test an actual Tampermonkey installation against deployed HTTPS.

References: [Workers static assets](https://developers.cloudflare.com/workers/static-assets/), [R2 Worker binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
