# `docker/extra-ca.crt` — TLS-intercepting proxy/antivirus workaround

If `docker compose up --build` fails inside `npm install` with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` (or `npm error Exit handler never
called!` immediately followed by a missing `tsc`/`vite`), something on
your machine is intercepting/inspecting HTTPS — a corporate proxy or an
antivirus's "web shield" (reproduced against one for real while building
this). Docker Desktop relays all container network traffic through the
host's own network stack, so the container sees that interception too,
but doesn't trust the certificate it's re-signed with the way your host's
own browser/npm does.

Fix: export that certificate (Windows: your antivirus's settings usually
have an "export root certificate" option; corporate proxy: ask IT) and
save it here as `extra-ca.crt` (PEM format). Both `backend/Dockerfile` and
`frontend/Dockerfile` pick it up automatically on the next build — nothing
else to configure. This file is gitignored on purpose: never commit an
org- or antivirus-specific certificate.

Not needed (and this directory can stay empty) on a network without any
HTTPS interception, which is the common case.
