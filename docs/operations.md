# Local operation and recovery

Run one Committee service per private data directory. The default binds only `127.0.0.1:43127`; it is not a LAN server. `REVIEW_HELPER_DATA` must point outside the source checkout. The access token, database, API source URLs, publication target and analysis artifacts are private. Keep that directory mode 700 and sensitive files mode 600. Provider keys are supplied in the server environment.

## Daily workflow

1. Open the local workspace and check source coverage/sync freshness.
2. Sync now, or let the per-event schedule run while the service is awake.
3. Run bounded analysis or optional paid detection explicitly.
4. Review sources and exact quotations. Approve findings/topics or dismiss mistakes.
5. Preview a bundle, review included fields, and publish deliberately.
6. Give reviewers read-only invitations; revoke them when no longer needed.

Scheduled sync requires the local process and machine to stay running. No launchd service is installed automatically. An operator can run `npm start` under their existing process manager using absolute working/data paths and their own credential environment. The service's PID lock prevents concurrent workers against the same private store; stale locks from exited processes are recovered. Do not manually delete a lock belonging to a live process.

## Backup

Stop the service before copying the entire private data directory to a protected backup. Copying only `review.sqlite` while WAL writes are active is not a reliable backup. Preserve file permissions. Back up external credential files separately using your credential manager, not the public repository.

To restore, stop the service, restore the complete private directory, then start with the restored `REVIEW_HELPER_DATA`. Keep the existing access token if you want existing local sessions to remain connected. Stored API endpoint URLs and publication tokens remain sensitive in backups. Interrupted paid operations may have completed remotely: inspect ambiguous detector submissions before retrying.

No automated retention deletion or person-level erasure command is implemented yet. R2 holds historical published objects for rollback; revocation prevents future reads with the revoked token, but does not delete old objects or copies already downloaded. A retention/erasure operation must cover local snapshots, findings, caches, publication files, R2 revisions and backups.

## Release boundary

The checkout should contain only code, documentation and synthetic tests. Real event records remain outside it. `build-reader.mjs` uses an explicit source-asset allowlist. Before public source release, audit tracked files and history, generated assets, screenshots, test output and logs for private records/credentials. Do not publish the existing historical dataset or derived corpus. Public release and real cloud publication remain separate approvals.
