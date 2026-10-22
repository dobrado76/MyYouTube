# Documentation index — MyYouTube

Start with the root [README.md](../README.md) for install and overview. For AI-assisted help, download the root [AI-SUPPORT.md](../AI-SUPPORT.md) (generated; do not edit it by hand).

## User support set

These files are the source of `AI-SUPPORT.md`. Rebuild with `npm run docs:bundle`. Check with `npm run docs:check`.

| Doc | Use when |
| --- | --- |
| [product.md](product.md) | What the app is and is not |
| [getting-started.md](getting-started.md) | Install, mock vs live, first sync |
| [user-guide.md](user-guide.md) | Every screen and control |
| [configuration.md](configuration.md) | Settings, defaults, userData paths |
| [reference.md](reference.md) | Limits, errors, IPC behaviour |
| [troubleshooting.md](troubleshooting.md) | Symptoms and safe recovery |
| [app-architecture.md](app-architecture.md) | Processes and boundaries (does not replace [ARCHITECTURE.md](ARCHITECTURE.md)) |
| [development.md](development.md) | Build, test, doc bundle |
| [FAQ.md](FAQ.md) | Question-shaped answers |
| [roadmap.md](roadmap.md) | Shipped vs deferred |
| [support-evaluation.md](support-evaluation.md) | Maintainer prompts; not bundled |

## Reading order (engineering)

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
| [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md) | Enable YouTube Data API v3 + OAuth (also in-app Help) |

### Releases

| Doc | Use when |
| --- | -------- |
| [../CHANGELOG.md](../CHANGELOG.md) | Machine-oriented version history |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | GitHub Release copy + checklist |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | PR / issue norms |

## Spec vs code

Until a behaviour is implemented, prefer updating `docs/` + `PLAN.md` + `DECISIONS.md` when product decisions change, then implement. Do not invent silent discovery in the subscription feed or stream-URL extraction — those are hard locks.
