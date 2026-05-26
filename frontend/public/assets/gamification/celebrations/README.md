# Celebration GIF assets

Place looping GIFs here. The app resolves:

`/assets/gamification/celebrations/{key}.gif`

Optional static fallbacks (reduced motion): `{key}.png`

## Required placeholder / production files

| File | Use |
|------|-----|
| `generic-common.gif` | Default fallback |
| `xp-earned.gif` | XP awards |
| `streak-milestone.gif` | Streak milestones (7, 14, 30, 60 days) |
| `badge-default.gif` | Unknown badge |
| `tier-common.gif` | Common tier badge |
| `tier-rare.gif` | Rare tier badge |
| `tier-epic.gif` | Epic tier badge |
| `badge-{icon_key}.gif` | Per-badge (e.g. `badge-first_course.gif`) |

Tier GIFs (`tier-common`, `tier-rare`, `tier-epic`) are used for badge celebrations by default. Add per-badge overrides in `BADGE_CELEBRATION_GIF_OVERRIDES` (`badgeCatalog.ts`) when custom `badge-{icon_key}.gif` files exist.

Until a GIF loads, the modal shows CSS confetti and the badge icon from `/assets/gamification/badges/`.
