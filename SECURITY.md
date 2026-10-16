# Security and private data

The local admin listens on loopback. Anyone with its token can read private event data and run administrative actions. Keep the admin off public reverse proxies.

Store data, provider credentials, Sessionize endpoint URLs and publisher tokens outside the repository.

Reader bundles contain identifiable proposal data. Preview each bundle before distribution. Get the event owner's permission to share it.

Keep credentials, real proposals and private reviewer information out of public issues. The project has no dedicated contact for security reports.

No independent security audit has taken place. The [hosting guide](docs/hosting.md) explains invitation scope, revocation and retention limits.
