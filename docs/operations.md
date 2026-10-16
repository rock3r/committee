# Local operation and recovery

Run one Committee service per private data directory. The default address is `127.0.0.1:43127`, which accepts only local connections. Set `REVIEW_HELPER_DATA` to a directory outside the source checkout.

Keep the access token, database, API source URLs, publication target and analysis files private. Use mode 700 for the directory and mode 600 for sensitive files. Supply provider keys through the server environment.

## Run the daily review

1. Open the local workspace. Check source coverage and the last sync time.
2. Choose **Sync now**, or leave the service running for scheduled per-event updates.
3. Request analysis with a batch limit. Request paid detection separately if needed.
4. Check sources and exact quotations. Approve findings and topics, or dismiss mistakes.
5. Preview the bundle and inspect its fields. Publish the reviewed revision.
6. Give reviewers read-only invitations. Revoke them when reviewers finish.

Scheduled sync needs the process running and the machine awake. Committee installs no launchd service. You can run `npm start` with an existing process manager. Use absolute working and data paths, and supply the required credentials through its environment.

The service uses a process ID (PID) lock to prevent concurrent access to the same private store. It recovers stale locks after their processes exit. Leave locks for running processes in place.

## Back up and restore data

Stop the service before copying the complete private data directory to a protected backup. Preserve file permissions. An active SQLite write-ahead log (WAL) can contain writes missing from `review.sqlite`. Copying only that database file during writes can produce an incomplete backup.

Back up external credential files separately through your credential manager. Keep them out of the public repository.

To restore data:

1. Stop the service.
2. Restore the complete private directory.
3. Set `REVIEW_HELPER_DATA` to the restored directory and start the service.

Preserve the access token to keep existing local browser sessions connected. Backups still contain sensitive API endpoint URLs and publication tokens.

A provider may have completed an interrupted paid request. Inspect detector submissions with an unknown result before retrying.

## Account for retained copies

Committee has no automated retention deletion or person-level erasure command. R2 retains older published objects for rollback. Revoking a token blocks future reads through that token. It leaves stored objects and downloaded copies unchanged.

A retention or erasure operation must cover local snapshots, findings, caches, publication files, R2 revisions and backups.

## Check a source release

Keep only code, documentation and fictional test data in the checkout. Store real event records elsewhere. `build-reader.mjs` copies assets from an explicit allowlist.

Before a public source release, inspect tracked files and history for private records and credentials. Inspect generated assets, screenshots, test output and logs too. Exclude the existing historical dataset and any derived corpus. Public code release and real cloud publication need separate approvals.
