# Dedale Survey Studio

V6 is the approved visual baseline. `public/index.html` is an exact copy of the supplied HTML. This is a frontend prototype, NOT a working survey collection service.

## Verify

Use Node 24. Run `npm ci --ignore-scripts`, then `npm test`.
The tests exercise script parsing, initial render, light default even on a dark OS, theme toggle and links rendered on the initial page. They do not establish browser visual fidelity, persistence or backend readiness.

## Deployment

`vercel.json` serves only `public/`. The existing Vercel project is `dedale-survey-studio`, team `vincent-projects2`. Its live V6 preview was not replaced by this preparation work.

GitHub target: https://github.com/vincent-beaulieu/Dedale-Survey-Studio

Status and next steps are in [docs/DELIVERY.md](docs/DELIVERY.md). No secrets, real respondent data or authentication credentials belong in this repository.
