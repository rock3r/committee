# User guide

Administrators import data, review findings and publish revisions in a local workspace. Reviewers read approved results through a hosted, read-only site or the Sessionize userscript.

## Start locally

Install Node.js 26 or later and Python 3.9 or later. Run `npm ci`. Set `REVIEW_HELPER_DATA` to a directory outside the checkout, then start the service.

Open the address that the server prints. Read the access token from the file whose path the server prints. Paste the token into the browser. The browser stores it until you choose **Lock**. Keep the admin on loopback and its port closed to the internet.

To try Committee with fictional data, run `npm run demo`. The demo uses a temporary database.

## Import an event

![Data and sync before connecting the fictional event](images/sync.png)

1. Open **Data & sync → Connect another event**.
2. Paste the Sessionize organiser event URL or numeric event ID. The ID in `/app/organizer/sessions/12345` is `12345`. Give the event a name you can recognise.
3. Open Sessionize's **API / Embed**. Create a dedicated JSON endpoint with all submissions, unscheduled sessions and no category filter. Copy its `/view/All` URL. Anyone with this URL can access the selected data. Keep it private.
4. Paste the URL into Committee and choose **Check coverage**. Compare the result with the organiser's submission count. If descriptions, biographies or required custom fields are missing, enable them in Sessionize.
5. Check the endpoint's settings before confirming its scope. Save the connection. Choose **Sync now** to import it.

Saving a connection records the data source without importing it. This lets you check coverage before replacing an event snapshot. A feed limited to accepted proposals cannot supply a complete call for proposals (CfP) import.

After the first successful sync, enable **Automatic sync** to schedule updates. Keep the machine awake and the local service running. You must request paid analysis and publication separately. The [sync guide](sessionize-sync.md) explains the schedule.

## Read and correct findings

Choose a proposal in **Review**. Search by title or speaker, or filter by topic. Select a speaker's name to open available profile information. A proposal without findings may still be unchecked or have quality problems.

Each finding shows whether it is a measurement, a model proposal or an approved finding. Open **Evidence** for its reason, quotation, sources and origin. Choose **Show in abstract** to locate the passage. Add a note or dismiss misleading findings.

Assess detector signals separately from editorial quality. A generated-text fraction measures the detector's output. It gives no authorship probability.

Keyboard shortcuts work outside text fields:

| Key | Action |
| --- | --- |
| `j` / `k` | Move to the next or previous proposal. |
| `/` | Focus search. |
| `e` | Expand findings. |
| `c` | Compare an available related proposal. |
| `?` | Open the shortcut reference. |

## Run analysis

Configure local provider credentials with the [analysis guide](analysis.md). In **Analysis**, choose an event and a batch limit. You must start research and detector checks yourself. Providers can charge for these actions.

Review evidence before approving findings or inferred topics. Confirm speaker identity before publishing speaker findings.

Editing a title or abstract creates a content version. Treat findings for earlier versions as outdated. Reuse imported detector results only when they meet the recorded matching rules.

## Give reviewers access

Deploy the reader with the [hosting guide](hosting.md). In **Publish & access**, configure its origin and publisher credential. Select an event and profile. Preview the bundle and inspect its fields and findings before publishing the revision.

Create an invitation for the intended events. Share its connection code privately. Reviewers can paste the code into the hosted site.

For Sessionize integration, install the userscript from the hosted site. Open Sessionize and choose **Connect Committee…** in Tampermonkey. Paste the same code. The public Sessionize Helper runs as a separate script.

Revoke invitations when reviewers finish. Revocation blocks future requests but leaves downloaded copies unchanged. Invitations have no automatic expiry.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The local page refuses to connect. | Keep the terminal running and use the port it prints. |
| Unlock fails. | Read the token file for the current data directory. |
| Coverage falls below the organiser count. | Check accepted-only, scheduled-only and category filters in Sessionize. Confirm completeness only after checking these settings. |
| Scheduled sync does not run. | Keep the machine awake and the service running. Inspect the selected event's sync history. |
| A paid check fails. | Inspect its status before retrying. The provider may have charged for a request whose result is unknown. |
| The reader shows old data. | Preview and publish a new revision after syncing. |
| Userscript badges are missing. | Check the invitation's event scope and host permission. Check that an administrator approved and published the findings. |

Back up the private data directory before upgrades. Follow the [operations guide](operations.md) to protect the database and account for retention limits.
