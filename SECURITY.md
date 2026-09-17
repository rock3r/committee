# Security and private data

The local admin is designed to listen on loopback. Its token grants access to private event data and administrative actions. Do not place it behind a public reverse proxy.

Keep data, provider credentials, Sessionize endpoint URLs and publisher tokens outside the repository. Reader bundles still contain identifiable proposal data. Preview them before distribution and obtain the event owner's authorisation.

Do not include credentials, real proposals or private reviewer information in public issues. No dedicated security-reporting contact is provided.

There has been no independent security audit. See the hosting guide for invitation scope, revocation and retention limitations.
