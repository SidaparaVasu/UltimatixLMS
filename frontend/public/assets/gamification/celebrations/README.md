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

Until GIFs exist, the modal shows animated CSS confetti and Lucide badge icons.
