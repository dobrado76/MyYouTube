# Recommendations — MyYouTube

Local, transparent, configurable ranking. Independent of YouTube Home.  
Details and philosophy: PRODUCT_SPEC §15–§44, §66–§69.

## Principles

1. Explicit interests / blocks dominate inference.  
2. Every score exposes **components** (`name`, `value`, `reason`).  
3. Deterministic for the same inputs + weights (testable).  
4. Never inject ranked discovery into the **Subscriptions** feed.  
5. Works with **zero** AI; optional classifiers plug in later.

## Initial model (weighted sum)

Conceptual:

```text
score =
  subscribedChannel
  + interestMatch
  + channelPreference
  + durationPreference
  + freshness
  + quality
  + novelty
  - clickbait
  - shorts
  - repetition
  - hiddenTopic / blocked
```

Default weight examples live in PRODUCT_SPEC §16–§17; store as editable JSON in settings.

## Engine API

```ts
interface RecommendationEngine {
  scoreVideo(video: Video, context: RecommendationContext): RecommendationResult
}

interface RecommendationResult {
  score: number
  components: { id: string; score: number; explanation: string }[]
}
```

Persist final score on `videos` (cache) and either:

- JSON blob of components, or  
- rows in `recommendation_components`  

so the UI can show “Why?” without recomputing if inputs unchanged.

## Feed modes that use scoring

| Mode | Behaviour |
| ---- | --------- |
| Chronological | **No** score reordering |
| Ranked | Sort by personal score |
| Priority | `score >= threshold` (configurable) |
| Unwatched | Filter by local history |

## Interests

```ts
mode: "strong_interest" | "interest" | "neutral" | "low_interest" | "blocked"
```

UI: editable list with weights; blocked topics hard-exclude from recommendations (and optionally from feed if configured).

## Feedback intents (separate columns / rows)

More like this · Less like this · Hide video · Hide topic · Mute channel · Favourite channel · Not interested · Already know · Save for later  

Do not merge into one engagement score.

## Presets (Phase 3+)

General · Deep Technical · Relaxation · Music · Learning · Quick Watch · Long Form — each a saved weights + filter bundle.

## Phase gate

Do **not** implement this engine until chronological feed + player + basic filters work (IMPLEMENTATION_PLAN Phase 8).
