# Contributing to MyYouTube

Thanks for helping. This project is a **standalone** personal YouTube client. Please keep changes aligned with [PLAN.md](PLAN.md) and [docs/DECISIONS.md](docs/DECISIONS.md).

## Before you start

- Read [README.md](README.md) and [docs/README.md](docs/README.md).
- Do **not** introduce scraping of youtube.com for API-covered data, stream-URL extraction, or silent discovery injection into the subscription feed.
- Prefer updating docs when locking a new behaviour, then implementing.

## Development setup

```bash
npm install
npm run dev
```

Useful checks before a PR:

```bash
npm run typecheck
npm test
npm run lint
```

Mock YouTube provider is the default — use it for UI work so you do not burn API quota.

## Pull requests

- Keep PRs focused; one concern per PR when practical.
- Match existing TypeScript style (strict; avoid `any`).
- Renderer must stay free of Node integration; secrets and SQLite stay in main.
- IPC payloads should remain Zod-validated with the Result envelope `{ ok, value } | { ok: false, error }`.
- Never commit `.env`, client secrets, tokens, or `*.sqlite` user databases.
- If you change a locked decision, update [docs/DECISIONS.md](docs/DECISIONS.md) in the same PR.
- Add a [CHANGELOG.md](CHANGELOG.md) entry under `[Unreleased]` for user-visible changes.

## Issues

Include OS, MyYouTube version (or commit), mock vs live provider, and steps to reproduce. For API/quota issues, note whether Search or Home Refresh was involved.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
