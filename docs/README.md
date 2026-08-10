# Documentation index — MyYouTube

Start with the root [README.md](../README.md) for install and overview. Use this page as a map of the rest of the docs.

## Reading order

### New contributors / first clone

1. [../README.md](../README.md) — what it is, how to run  
2. [../PLAN.md](../PLAN.md) — canonical plan and non-goals  
3. [DECISIONS.md](DECISIONS.md) — locked product/tech choices (D-numbers)  
4. [ARCHITECTURE.md](ARCHITECTURE.md) — process model and folders  
5. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — phases and MVP checklist  

### Behaviour & product

| Doc | Use when |
| --- | -------- |
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | Full product + technical specification (long form) |
| [UI_DESIGN.md](UI_DESIGN.md) | Screens, chrome, anti-attention-trap UX |
| [RECOMMENDATIONS.md](RECOMMENDATIONS.md) | Future scoring / interests / explainability |

### Implementation contracts

| Doc | Use when |
| --- | -------- |
| [IPC_CONTRACT.md](IPC_CONTRACT.md) | Main ↔ renderer API |
| [DATA_MODEL.md](DATA_MODEL.md) | Entities and SQLite sketch |
| [PROJECT_FORMAT.md](PROJECT_FORMAT.md) | `userData` paths, settings layout |
| [YOUTUBE_API.md](YOUTUBE_API.md) | Data API v3, quota, caching |
| [SECURITY.md](SECURITY.md) | OAuth, secrets, ToS posture |

### Releases

| Doc | Use when |
| --- | -------- |
| [../CHANGELOG.md](../CHANGELOG.md) | Machine-oriented version history |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | GitHub Release copy + checklist |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | PR / issue norms |

## Spec vs code

Until a behaviour is implemented, prefer updating `docs/` + `PLAN.md` + `DECISIONS.md` when product decisions change, then implement. Do not invent silent discovery in the subscription feed or stream-URL extraction — those are hard locks.
