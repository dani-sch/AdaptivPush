# Weekly Progress Report

**Project Title:**
AdaptivPush

**Date:**
4/19/26

---

**Team Member Updates**

1. **Member Name:**
   Dani

   **Summary of Task Progress:**

   What I worked on this week:
   The main focus was expanding the progression and program generation systems, along with several quality-of-life features and bug fixes. I upgraded the readiness check-in, added full PR tracking, and built two new content screens from scratch.

   - Upgraded readiness check-in to 4-factor scoring (sleep 35%, stress 25%, soreness 25%, motivation 15%) with new sliders and upsert logic so re-submitting today replaces rather than stacks
   - Built per-set weight progression — instead of adjusting all sets uniformly, missed sets now drop 5% individually while hit sets hold, written to the DB per exercise
   - Improved program generation: compounds now get full sets/RPE while accessories get −1 set and −0.5 RPE; RPE ramps linearly across the training block with deload weeks getting an extra −2.0 cut
   - Built end-to-end PR tracking — detection on workout save, celebration modal, and a PR history modal in the History tab
   - Added a FAQ screen (15 items, accordion layout) and a Recovery & Mobility library (5 pre-built routines), both accessible from the home screen and profile
   - Added a swap nudge card on the home screen when the accessory rotation interval is reached, and menstrual cycle phase banners during Menstruation and Luteal phases
   - Added a password strength meter to sign-up with a 4-criteria checklist (uppercase, number, special character, 8-char min) and live visual feedback

   Challenges: Readiness scores from previous days were bleeding into the current workout because queries weren't scoped to today's date — fixed by filtering on `log_date = today`. Per-set progression was silently broken because the set query was mixing sessions via `created_at DESC`; scoping it to the most recent session ID resolved it. The PR count on History and Profile was crashing because it tried to read columns that don't exist on session rows — fixed by querying the `personal_records` table directly.

   Next week: Continue polish on the progression engine, validate the RPE periodization curve with real training data, explore exercise recommendation improvements, and address any edge cases surfaced from the new PR and swap nudge features.
