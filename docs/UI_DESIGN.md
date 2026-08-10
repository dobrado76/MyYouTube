# UI design — MyYouTube

Wireframes and behaviour from PRODUCT_SPEC §12–§14, §47, §67–§68, §73–§75.  
Visual system: CSS variables; light / dark / system / custom with editable colors & fonts (D16). Avoid locking core logic to a component library.

---

## Chrome

Horizontal top chrome (no sidebar) so Watch / cinema can use full width — **one row**:

```text
┌───────────────────────────────────────────────────────────────┐
│ MyYouTube │ Home · Subs · Search · Queue · Play · Settings │ Search… Account │
├───────────────────────────────────────────────────────────────┤
│  Personal Feed / filters / video cards                        │
│  [Load more]                                                  │
└───────────────────────────────────────────────────────────────┘
```

Feed filters live on the Home page header (not a side rail). Cinema watch hides the search field and drops main padding so the player is edge-to-edge under the tab bar.

Persist: filters, sort, feed mode, theme, density, player layout.

---

## Anti-patterns (forbidden by default)

- Autoplay next  
- Infinite scroll that never ends without intent  
- Forced Shorts shelf  
- Engagement streaks / artificial urgency  
- Silently mixing Discover into Subscriptions  

---

## Video card

Show: thumbnail, title, channel, published (relative), duration, optional views, topic chips, personal score (when ranked), watched state.  
Actions: Watch, Queue, Hide, Why? (when scored).

---

## Watch page

```text
┌─────────────────────────────┐
│   YouTube IFrame Player     │
├─────────────────────────────┤
│ Title / Channel / actions   │
│ Save · Queue · Hide · Rate  │
│ Open on YouTube · Why?      │
├─────────────────────────────┤
│ Related *personal* picks    │  ← clearly labelled; not Home
└─────────────────────────────┘
```

---

## Source honesty

Label feeds clearly:

- **Subscriptions** — only subscribed channels  
- **Discover** — optional personal discovery  
- **Search** — query results  

---

## Settings IA

Settings uses an **internal left sidebar** (sections) + focused pane — not a single long scroll of every block.

Sections: Account · Provider · Appearance · Player · Performance · Feed · Updates  
(Later: Recommendations · History · Search · Cache · Privacy · Advanced)  

Performance includes hardware acceleration (Electron + YouTube playback); changes require restart.  

---

## Accessibility & keyboard (later OK)

Semantic HTML, focus rings, contrast, scalable type. Shortcuts (J/K, Q, H, W, `/`) configurable eventually.

---

## Performance UX

- Cached feed paint target &lt; 500ms when practical  
- Paginate / virtualise long lists  
- Lazy thumbnails  
