# Weekly Progress Update — April 16, 2026
**Member:** Daniella
**Project:** AdaptivPush

---

## Summary of Task Progress

This week was focused on fixing the core of the app — workout data wasn't being saved at all after completing a session, which meant nothing downstream was working either. Once that was resolved, I built several new features on top of the now-working foundation.

**What I worked on:**

- **Fixed workout saving** — Completing a workout now correctly saves all logged sets, weights, reps, and RPE to the database. Previously this was silently failing due to a database constraint issue (sets with missing data were crashing the entire save operation). I also added a visible "Saving…" indicator so users get feedback while data is being written.

- **Fixed automatic weight progression** — After each workout, the app now calculates next week's suggested weights based on performance (e.g. if you crushed your sets, weight goes up; if you struggled, it adjusts down). This was previously never triggering.

- **Fixed readiness check-in** — The pre-workout readiness rating (how you're feeling that day) was incorrectly writing adjusted weights back to the database permanently, compounding over time. It now only affects what's displayed during that session — nothing is permanently changed.

- **Added "Start Week" button** — Users can now manually advance to the next training week instead of waiting 7 real-world days. This was blocking all testing of the week-over-week progression system.

- **Improved workout history tab** — History cards are now tappable and show every exercise logged in that session. Each exercise has a "History" button showing all past performances for that movement with volume trend indicators. The tab also now refreshes automatically after completing a workout instead of showing stale data.

- **Built full program overview screen** — A new screen on the Plan tab lets users see their entire program at a glance — all weeks, all workout days, all exercises with planned sets, reps, RPE, and starting weights. Deload weeks are highlighted in amber.

- **Fixed program generation** — Programs were assigning different exercises each week instead of repeating the same movements with progressive weight increases. This was fundamentally broken — progressive overload requires training the same exercises week over week. Fixed so the program generates a consistent exercise template for each day type (Push, Pull, Legs, etc.) and reuses it across all weeks. Also added automatic deload weeks every 4th week (standard practice: 3 weeks loading, 1 week recovery).

---

## Challenges

- **Silent database failures** — The hardest part of the week was diagnosing why workouts were not saving. The app was not throwing visible errors — it was silently failing because one invalid value in a batch insert caused the entire operation to be rolled back. Required tracing through the full save pipeline to find two separate null-value issues.

- **Stacked modal bug** — When opening a history detail sheet and then an exercise history popup inside it, React Native was leaving broken touch handlers behind when both were closed, making the screen beneath unscrollable. Required restructuring both modals into a single modal with an absolute-positioned inner layer.

- **Week progression was calendar-locked** — The week number was calculated purely from a start date, meaning there was no way to test week-over-week behaviour without waiting real days. Solved by back-dating the program's start date in the database rather than adding a separate column.

---

## Next Week Plan

- **Store exercise best practices** — Build a reference layer for recommended sets, RPE ranges, and rep targets per exercise category and training goal, so program generation uses evidence-based defaults rather than flat values.
- **Workout duration preferences** — Let users specify how long they want to train, and factor estimated session time into how many exercises and sets get generated.
- **Accessory exercise rotation** — Prompt users to swap certain accessory movements every few weeks to add variety while keeping primary compound lifts consistent.
- **Menstrual cycle tracking** — Implement cycle-aware training adjustments based on cycle phase.
- **Performance-based carry-over** — If a user does not hit their target weights/reps/RPE for a given week, carry that forward and affect the following week's targets rather than always progressing forward.
- **Personal records in workout history** — Surface PRs in the history tab so users can see when they hit a new best for any exercise.
