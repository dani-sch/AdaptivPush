---
title: "AdaptivPush evidence-backed implementation plan"
created: "2026-05-07"
status: draft
workflow: pydev-workflow
estimated_effort: XL
---

# Problem and approach

AdaptivPush already has promising adaptive-training primitives, but the current product only partially expresses the research it aims to embody. The next implementation arc should convert the deep research report into a coherent product system: evidence-backed generation, evidence-backed day-of-workout adaptation, evidence-backed recovery education, and transparent in-app explanations that help users understand *why* the app is making each recommendation.

The recommended approach is to treat this as a multi-phase product architecture effort rather than a single feature. We should first normalize the evidence into stable product rules, then harden the data model and decision engines, then layer the new logic into generation, readiness, cycle/symptom personalization, workout execution, analytics, and education surfaces.

# Scope definition

## In scope

- Build an evidence-backed planning foundation for the full AdaptivPush experience.
- Expand current physiology features into a coherent adaptive system across onboarding, profile, home, plan, next workout, progression, history, FAQ, and recovery-library surfaces.
- Add transparent explanation layers so research-backed decisions are visible in-app instead of being hidden in code.
- Define the data model, engine boundaries, UI surfaces, rollout order, and verification strategy for implementation.
- Include direct source links alongside each research-backed feature or implementation decision in this plan.

## Out of scope for the first implementation wave

- Nutrition coaching beyond lightweight recovery/protein guidance.
- Android health-platform parity if HealthKit ships first.
- Coach marketplace, social features, or community programming.
- Fully personalized ML recommendations; this plan assumes explicit rules and trend-based heuristics first.
- Replacing the whole visual design system unless it is required to support evidence display cleanly.

## Working assumptions

- The active working plan lives in the session plan file first; once the scope stabilizes, it can be exported into `reports/plans/`.
- Research integration should remain autonomy-supportive and avoid pretending the literature is stronger than it is.
- Existing readiness architecture remains UI-overlay-based unless we intentionally redesign progression persistence.
- Evidence-backed behavior should prefer conservative, reversible defaults.

# Current-state analysis

## Sources reviewed

- `research/deep-research-report.md`
- `reports/plans/IMPLEMENTATION-PLAN.md`
- `reports/plans/POSSIBLE-FEATURES.md`
- `README.md`
- `package.json`
- `utils/programGenerator.ts`
- `utils/progressionEngine.ts`
- `utils/cyclePhase.ts`
- `hooks/useCurrentProgram.ts`
- `components/GenerateProgramModal.tsx`
- `app/next-workout.tsx`
- `app/(tabs)/home.tsx`
- `app/(tabs)/plan.tsx`
- `app/(tabs)/profile/index.tsx`
- `app/(tabs)/profile/personal-information.tsx`
- `app/(qsetup)/quick-setup.tsx`
- `app/faq.tsx`
- `app/recovery-library.tsx`
- `utils/profilePreferences.ts`
- `utils/saveProgramToDb.ts`

## Key findings affecting the plan

1. **There is already a partial evidence engine, but it is fragmented.**  
   `utils/programGenerator.ts` already contains goal params, experience modifiers, split templates, cycle-phase adjustments, session-length-aware exercise counts, and compound/accessory ordering logic. That means the right strategy is to extract and expand existing logic, not replace it wholesale.

2. **Readiness exists in two separate modes today: UI overlay and progression adjustment.**  
   `app/next-workout.tsx` applies readiness and cycle modifiers as a display-time overlay, while `utils/progressionEngine.ts` also applies readiness to next-week progression. This is useful but currently simplistic: the app treats readiness as a single score rather than a multi-signal context.

3. **Cycle support exists, but it is currently calendar-first rather than symptom-first.**  
   `utils/cyclePhase.ts`, `GenerateProgramModal`, `useCurrentProgram`, and the profile screen support cycle-aware behavior, but the logic is still based on a fixed phase model with a blanket weight/RPE reduction in menstrual/luteal phases.

4. **The app already has candidate education surfaces, but they are mostly static and not source-linked.**  
   `app/faq.tsx` and `app/recovery-library.tsx` are good footholds for research-backed explanations, but they currently present generalized copy rather than evidence-aware guidance with links and nuance.

5. **The current codebase lacks a central “evidence registry” or policy layer.**  
   The research is not yet represented as reusable product constants, explanation content, or rule metadata. Without that layer, future adaptive features will drift or duplicate logic.

6. **The repository does not expose the `dev-doc/main/*` planning docs expected by the workflow instructions.**  
   Planning had to be grounded from `reports/plans`, the research report, and source files instead. This makes an internal implementation plan especially important.

7. **Tooling is lightweight.**  
   `package.json` exposes Expo commands and `expo lint`, but there is no visible test script today. The implementation plan should therefore include an explicit verification and regression phase.

# Product principles derived from the research

1. **Consistency beats complexity.**  
   Programs should bias toward repeatable, recoverable structure instead of chasing novelty.  
   Evidence: ACSM 2026 position stand; hypertrophy umbrella review.  
   Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

2. **Volume, effort, and recoverability matter more than split mystique.**  
   Split selection should be explained as a volume-distribution and adherence choice, not marketed as magic.  
   Evidence: ACSM 2026 position stand; split-vs-full-body review cited in the research report.  
   Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

3. **Autoregulation should be trend-aware and conservative.**  
   Poor recovery should usually reduce volume first, then complexity, then load.  
   Evidence: readiness/recovery summary in the research report; subjective self-report literature.  
   Links: https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml | https://journals.lww.com/nsca-jscr/fulltext/2010/06000/autoregulatory_progressive_resistance_exercise_vs_.11.aspx

4. **Menstrual-cycle support should be optional, individualized, and symptom-informed.**  
   The app should never imply that all users need phase-based reductions.  
   Evidence: menstrual-cycle reviews and consensus documents cited in the report.  
   Links: https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full | https://doi.org/10.3389/fspor.2023.1054542

5. **Primary lifts should stay stable long enough to measure progress.**  
   Variation is useful, but random churn undermines progression clarity.  
   Evidence: progression models and variation guidance in the research report.  
   Links: https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

6. **Warm-up support is more justified than cooldown prescriptions.**  
   The app should confidently guide warm-up structure and present cooldowns as optional/comfort-focused.  
   Evidence: warm-up/cooldown section in the research report.  
   Links: https://journals.lww.com/nsca-jscr/fulltext/2010/01000/effects_of_warming_up_on_physical_performance__a.20.aspx | https://bjsm.bmj.com/content/47/9/526

7. **Research explanations must present uncertainty honestly.**  
   Deloads, wearable readiness, SFR/MEV/MRV, and cycle effects should be framed as useful heuristics, not hard physiology truths.  
   Evidence: research limitations/open questions section.  
   Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full

# Target experience

The end-state product should make a user feel:

- “My program matches my goal, time budget, equipment, and recovery reality.”
- “The app explains why it suggested this workout structure.”
- “If I’m under-recovered, it adapts intelligently instead of just telling me to push or quit.”
- “If I track cycle symptoms, the app uses that respectfully and optionally.”
- “Recovery, warm-up, deload, and progression guidance all feel like one coherent coaching system.”

# Planning decisions captured so far

- **Decision 1 — Primary product promise:** *all three equally from the start*  
  This means the roadmap cannot be engine-first with education/UI deferred. Program generation, daily adaptation, and research transparency need to move as synchronized product tracks.

- **Decision 2 — Transparency is a product feature, not a documentation afterthought.**  
  Existing surfaces like Home, Next Workout, Program Overview, FAQ, Recovery Library, and Profile already give us enough UI real estate to expose evidence-backed reasoning during the first implementation wave.

- **Decision 3 — User depth should be configurable.**  
  The app should not force every user into the same physiology-detail experience. Instead, AdaptivPush should support multiple depth modes so a beginner can keep things light while an advanced user can opt into richer readiness, symptom, and explanation workflows.

# Front-loaded question bank

This is the complete planning question inventory to keep future planning flowing without repeated pauses. Questions are grouped so answers can be resolved in batches.

## A. Product positioning and core promise

1. Should AdaptivPush position itself primarily as an **adaptive coach**, an **evidence-based planner**, a **performance optimizer**, or a hybrid?
   - **Answer:** Hybrid.
2. How “scientific” should the public tone feel: clinical, coach-like, premium-athlete, or friendly evidence-informed?
   - **Answer:** Friendly evidence-informed.
3. Should the app prioritize **better decisions** or **better understanding of those decisions** when trade-offs appear?
   - **Answer:** Balance both equally.
4. Should the first release optimize more for **broad appeal** or for **serious lifter credibility**?
   - **Answer:** Balance both.
5. Is the goal to feel more like **Fitbod-style adaptive convenience**, **Boostcamp-style programming rigor**, or something more transparent than both?
   - **Answer:** Something more transparent than both, with a holistic, health-and-improvement focus that feels personalized, user-focused, helps people feel good, and supports consistency.

## B. User segmentation and depth modes

6. What user tiers should exist for experience depth: simple / guided / advanced, or another model?
   - **Answer:** Essential / Guided / Advanced.
7. Should the chosen depth mode be set during onboarding, changeable later, or inferred from behavior?
   - **Answer:** Set during onboarding and changeable later, with small examples shown during onboarding so users can quickly understand the differences before choosing.
8. Should depth mode influence only UI complexity, or also the adaptation logic itself?
   - **Answer:** UI complexity, adaptation logic, and explanation density.
9. Should beginners be shielded from RPE/RIR detail unless they opt in?
   - **Answer:** Yes.
10. Should advanced users be able to opt into more assertive autoregulation and denser analytics?
   - **Answer:** Yes.
11. Should users be able to separately tune **data depth**, **adaptation aggressiveness**, and **explanation verbosity**?
   - **Answer:** Yes.

## C. Onboarding and profile capture

12. What must be mandatory in onboarding versus optional?
   - **Answer:** Mandatory: primary goal, training days per week, experience level, equipment access, and session length/time budget.
13. Should onboarding stay short and defer advanced physiology questions until after first workout/program generation?
   - **Answer:** Yes.
14. Should onboarding ask about equipment access in more detail than it does now?
   - **Answer:** Yes, a bit more detail.
15. Should onboarding ask about injury/pain history, or is that too sensitive for first-run flow?
   - **Answer:** Yes, but lightly and optionally.
16. Should the app ask about primary goal time horizon: physique, strength, general health, sport performance, return from inconsistency?
   - **Answer:** Yes.
17. Should the app ask about lifestyle constraints like sleep schedule, job stress, or available recovery time?
   - **Answer:** Yes, but keep it optional or defer it until later.
18. Should onboarding ask about prior familiarity with RPE, reps in reserve, and structured training?
   - **Answer:** Yes, mainly for Guided and Advanced contexts.

## D. Program generation philosophy

19. Should generation remain mostly template-driven with smarter rules, or become a more explicit decision engine?
   - **Answer:** Hybrid.
20. How flexible should split selection be versus user-directed split selection?
   - **Answer:** Balanced.
21. Should the app recommend a split, allow override, or do both?
   - **Answer:** Recommend a split and allow override.
22. How strongly should focus muscles change weekly volume and exercise order?
   - **Answer:** Moderately.
23. Should the app expose weekly set targets by muscle group to the user?
   - **Answer:** Yes.
24. Should session length be treated as a hard cap or a target band?
   - **Answer:** A soft target with user override.
25. Should exercise order, rest recommendations, and warm-up structure be visible in generated programs by default?
   - **Answer:** Yes.
26. Should the generator account for exercise stability windows automatically, or let users control variation cadence?
   - **Answer:** Automatic by default, with optional user controls.
27. Should “program generation” include default deload philosophy up front, or wait until fatigue signals emerge?
   - **Answer:** Mention the deload policy up front, but do not schedule anything initially.

## E. Readiness and daily adaptation

28. How much authority should readiness have over a planned workout?
   - **Answer:** Moderate authority.
29. Should low readiness reduce volume, complexity, load, or all three depending on severity?
   - **Answer:** All three depending on severity.
30. Should high readiness ever increase planned difficulty automatically, or only offer an optional “push” suggestion?
   - **Answer:** Only offer an optional “push” suggestion.
31. Should readiness support a one-tap simplified check-in and a deeper optional check-in?
   - **Answer:** Yes. Use a one-tap check-in plus an optional deeper check-in.
32. Which inputs should count in readiness v2: sleep, stress, soreness, motivation, pain, illness, menstrual symptoms, workload, resting heart rate, HRV, bodyweight fluctuation?
   - **Answer:** Sleep, stress, soreness, motivation, pain, illness, and workload/life load.
33. Should readiness primarily shape **today’s session overlay**, **future progression**, or both with different rules?
   - **Answer:** Both, with different rules.
34. Should users be allowed to ignore readiness adjustments without penalty or nudging?
   - **Answer:** Yes.
35. Should the app ever recommend converting a session into a recovery session?
   - **Answer:** Yes.
36. Should poor readiness trigger an explanation that references evidence strength and uncertainty?
   - **Answer:** Yes.

## F. Menstrual-cycle and symptom support

37. Should cycle support be completely hidden unless the user opts in?
   - **Answer:** Yes.
38. Should cycle handling be symptom-first, calendar-first, or hybrid with symptom priority?
   - **Answer:** Hybrid with symptom priority.
39. Which symptoms should be trackable: cramps, fatigue, sleep disruption, mood, pain, GI discomfort, motivation, bloating?
   - **Answer:** Cramps, fatigue, sleep disruption, mood, pain, motivation, and bloating.
40. Should the app show phase names openly or just use them in background logic?
   - **Answer:** Show them lightly when relevant.
41. Should cycle-aware guidance change generation, day-of suggestions, recovery prompts, analytics, or all four?
   - **Answer:** All four: generation, day-of suggestions, recovery prompts, and analytics.
42. How prominent should privacy reassurance be in the UX?
   - **Answer:** Clear but not overbearing.
43. Should the app store historical cycle patterns for better personalization later?
   - **Answer:** Yes.
44. How should the app behave for irregular cycles or uncertain dates?
   - **Answer:** Use symptoms first, with light calendar context only when available.

## G. Progression, plateau, and deload logic

45. Should double progression remain the universal default or vary by goal?
   - **Answer:** Double progression should stay the default, with more advanced variants added later.
46. Should strength-focused users get more explicit top-set/back-off or percentage-style options later?
   - **Answer:** Yes.
47. How much should adherence and missed sessions affect progression decisions?
   - **Answer:** Moderately.
48. What qualifies as a plateau in the product: missed top rep range, repeated high RPE, stagnant estimated strength, user frustration input?
   - **Answer:** Missing the top rep range repeatedly, repeated high RPE, stagnant estimated strength, and user frustration input.
49. Should deloads be reactive only, optionally scheduled, or both?
   - **Answer:** Both reactive and optionally scheduled.
50. Should the app proactively explain *why* it is recommending a deload?
   - **Answer:** Yes.
51. Should users be able to reject a suggested deload and continue normally?
   - **Answer:** Yes.
52. Should deload logic prioritize volume reduction while preserving movement practice?
   - **Answer:** Yes. Reduce volume while preserving movement practice.

## H. Warm-up, cooldown, mobility, and recovery content

53. Should warm-up guidance be auto-generated per workout or delivered as reusable templates?
   - **Answer:** Both.
54. Should cooldowns be framed as optional comfort tools rather than recovery essentials?
   - **Answer:** Yes.
55. Should mobility guidance be linked to specific movement limitations instead of generic routines?
   - **Answer:** Yes.
56. Should recovery content remain in a library, or also surface contextually after certain sessions/readiness states?
   - **Answer:** Both a library and contextual surfaces.
57. Should the app include evidence notes explaining why some popular recovery rituals are “optional” rather than required?
   - **Answer:** Yes.
58. Should prehab/rehab-style modules exist only when tied to a stated issue?
   - **Answer:** They can exist more broadly, but should be de-emphasized unless tied to a stated issue.

## I. Transparency, explanations, and source links

59. How visible should source links be across the app?
   - **Answer:** Use subtle affordances such as “Learn why.”
60. Should every adaptive decision show a short rationale with optional deep dive?
   - **Answer:** Yes. Show a short rationale with an optional deep dive.
61. Should each recommendation carry an evidence label like **strong**, **moderate**, **mixed**, **emerging**, or **expert heuristic**?
   - **Answer:** Yes.
62. Should the app distinguish between “research-backed,” “best-practice,” and “product heuristic” rules?
   - **Answer:** Yes.
63. Should source links open in-app, on web, or inside a dedicated evidence screen?
   - **Answer:** Inside a dedicated evidence screen.
64. Should users be able to choose explanation verbosity by depth mode?
   - **Answer:** Yes.
65. Should the FAQ and Recovery Library reuse the same evidence registry as live workout decisions?
   - **Answer:** Yes.

## J. Analytics and insight surfaces

66. Which insights matter most: readiness trends, weekly volume, consistency streaks, plateau flags, muscle-group distribution, fatigue accumulation, PR momentum?
   - **Answer:** Readiness trends, weekly volume, consistency streaks, plateau flags, and fatigue accumulation.
67. Should analytics emphasize coaching interpretation or raw numbers?
   - **Answer:** Balanced.
68. Should the app surface estimated “too much / too little / just right” workload guidance?
   - **Answer:** Yes.
69. Should analytics compare planned versus completed work?
   - **Answer:** No.
70. Should analytics show when adjustments were driven by readiness, symptoms, or deload logic?
   - **Answer:** Yes.
71. Should users be able to trace back “why did my program change over the last 4 weeks?”
   - **Answer:** Yes.

## K. Integrations and external signals

72. Should HealthKit be part of the first implementation wave or only a later enrichment?
   - **Answer:** Design the foundation for it now, but ship the feature later.
73. If HealthKit is used, which data matters most first: body mass, cycle tracking, sleep, resting heart rate, HRV, workouts?
   - **Answer:** Body mass, sleep, workouts, and cycle tracking.
74. How much trust should the app place in wearables versus subjective check-ins and training performance?
   - **Answer:** Wearables should remain secondary.
75. Should integrations be optional enhancements rather than central dependencies?
   - **Answer:** Yes.
76. Should the app be designed from the start for Android parity, even if iOS launches first?
   - **Answer:** Core product parity should be designed from the start, even if integrations lag behind on Android.

## L. UX and interaction style

77. Should the app feel calm and quietly intelligent, or actively conversational and coach-like?
   - **Answer:** Calm and quietly intelligent.
78. Should the app proactively explain changes, or only when the user taps “why?”
   - **Answer:** Hybrid.
79. Should the home screen prioritize today’s action or high-level training context?
   - **Answer:** Today’s action.
80. Should the program overview emphasize prescription clarity, rationale, or both?
   - **Answer:** Both.
81. Should adaptation surfaces show uncertainty notes when the evidence is mixed?
   - **Answer:** No.
82. Should the app nudge users toward learning concepts like RPE progressively?
   - **Answer:** Yes.

## M. Risk, privacy, and safety framing

83. How explicit should the app be about not replacing medical advice?
   - **Answer:** Clear.
84. Should pain and symptom guidance include red-flag education?
   - **Answer:** Yes.
85. Should the app avoid moralizing language around missed sessions, body composition, pain, or menstrual symptoms?
   - **Answer:** Yes.
86. Should sensitive physiology data have special privacy copy and controls?
   - **Answer:** Yes.
87. Should users be able to disable physiology-aware adaptation entirely and still use the app as a clean logger/program builder?
   - **Answer:** Yes.

## N. Rollout and sequencing

88. Should the first shippable milestone focus on architectural foundations only, or include visible UI wins immediately?
   - **Answer:** Include architectural foundations plus visible UI wins immediately.
89. Which is more important for the first visible milestone: better generation, better readiness, or visible research transparency?
   - **Answer:** Balance all three.
90. Should big physiology changes roll out behind feature flags by user depth mode?
   - **Answer:** Yes, behind feature flags aligned to depth mode.
91. Do you want a single master implementation plan, or a master plan plus separate execution plans per milestone/workstream?
   - **Answer:** A master plan plus separate execution plans per milestone/workstream.

# User depth model proposal

The research and your guidance both point toward a configurable product rather than one fixed sophistication level.

## Mode 1 — Essential

- Fast onboarding
- Minimal readiness input
- Light explanations
- Simple program generation
- Conservative adjustments
- Hidden advanced analytics

**Best for:** new lifters, casual users, low-friction adoption.

## Mode 2 — Guided

- Moderate onboarding detail
- Structured readiness and optional symptom prompts
- More visible rationale
- Weekly insights and adaptive coaching summaries
- Moderate explanation density

**Best for:** most engaged users who want smarter coaching without complexity overload.

## Mode 3 — Advanced

- Richer readiness and recovery input options
- More detailed evidence displays
- Deeper analytics
- More configurable adaptation settings
- Greater transparency into progression, deload, and workload logic

**Best for:** experienced lifters, coaches, and high-agency users.

## Implementation implications of depth modes

1. **UI implications**  
   Home, onboarding, profile, FAQ, and analytics screens should progressively disclose complexity based on mode.

2. **Engine implications**  
   Core evidence rules stay consistent, but adaptation aggressiveness, prompt density, and explanation verbosity can vary.

3. **Data implications**  
   The data model should support richer inputs even if Essential users provide only a small subset.

4. **Trust implications**  
   Users should always be able to move up or down in depth without losing control.

# Research-to-feature implementation matrix

This section translates the research report directly into product capabilities and display surfaces.

| Research theme | Product implication | Likely surfaces | Evidence links |
|---|---|---|---|
| Weekly volume matters strongly for hypertrophy | Show/generate weekly set targets and distribute them intelligently across split choices | Generate Program, Program Overview, History/Analytics | https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/ |
| Frequency mostly distributes work rather than being magical | Explain split recommendations as logistics + recoverability choices | Generate Program, FAQ, Program Overview | https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/ |
| Progressive overload can be achieved via reps, sets, load, density, quality | Broaden progression explanations beyond load-only thinking | Workout history, Progression engine, FAQ | https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx |
| Primary lifts benefit from continuity | Add variation cadence rules and explain why some lifts stay stable longer | Program generator, Swap modal, Program Overview | https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/ |
| Low readiness should usually reduce volume first | Redesign readiness engine around volume-first adaptation hierarchy | Home, Next Workout, Progression engine | https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml ; https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ |
| Subjective readiness is useful but imperfect | Treat readiness as context/trend, not absolute truth | Home, analytics, readiness settings | https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml |
| Menstrual effects are mixed on average but symptoms matter individually | Make cycle support optional, symptom-first, privacy-aware | Profile, readiness check-in, Next Workout, FAQ | https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full |
| Warm-ups have stronger support than cooldowns | Auto-generate warm-up support; label cooldowns as optional comfort tools | Next Workout, Recovery Library, FAQ | https://journals.lww.com/nsca-jscr/fulltext/2010/01000/effects_of_warming_up_on_physical_performance__a.20.aspx ; https://bjsm.bmj.com/content/47/9/526 |
| Deloads are practical but not always necessary | Use reactive deload recommendations with clear rationale | Progression, notifications, analytics, FAQ | https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ |
| Preference and adherence matter | Offer depth modes and configurable explanation density | Onboarding, Profile, Home, FAQ | https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/ |

# Architecture additions implied by the research

## Proposed core modules

- `constants/evidenceRegistry.ts` — source metadata, evidence strength, short summaries, links
- `constants/programDefaults.ts` — evidence-backed goal and split defaults
- `constants/adaptationPolicies.ts` — readiness, deload, variation, warm-up, and progression policy tables
- `utils/readinessEngine.ts` — interprets daily readiness context into recommendations
- `utils/cycleAdaptation.ts` — symptom-first cycle handling and optional calendar context
- `utils/deloadEngine.ts` — reactive deload detection and recommendation
- `utils/splitRecommendation.ts` — split and volume distribution guidance
- `components/EvidenceWhySheet.tsx` — reusable explanation sheet with source links
- `components/TodayAdjustmentSummary.tsx` — compact “what changed today and why” surface
- `constants/recoveryProtocols.ts` — research-backed warm-up, mobility, active recovery, and optional cooldown content

## Proposed cross-cutting data entities

- `user_adaptation_preferences`
- `readiness_checkins`
- `cycle_symptom_logs`
- `program_generation_context`
- `adaptation_events`
- `deload_recommendations`
- `evidence_display_preferences`

These can be implemented as dedicated tables or, where appropriate, user/program metadata plus normalized event tables. The exact persistence strategy is still open, but the product shape is now clear.

# Proposed implementation phases

## Phase 1 — Evidence normalization and rule architecture

### Goal

Create a single evidence-backed source of truth that can feed generation, readiness, education, and analytics without duplicating physiology logic.

### Tasks

- **P1.1 Create an evidence registry and decision taxonomy** — **Effort: M**  
  Build a typed source layer for research summaries, confidence levels, links, and “how this affects product behavior” notes.  
  Proposed files:  
  - `constants/evidenceRegistry.ts`  
  - `types/evidence.ts`  
  - `constants/adaptationPolicies.ts`  
  Research basis: explicit evidence-strength mapping and “strong vs mixed vs emerging” distinctions.  
  Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

- **P1.2 Extract program defaults from hardcoded generation rules** — **Effort: M**  
  Move goal defaults, split assumptions, volume targets, rest guidance, exercise-order rules, and adaptation thresholds out of scattered logic into named policy objects.  
  Proposed files:  
  - modify `utils/programGenerator.ts`  
  - create `constants/programDefaults.ts`  
  - create `constants/adaptationPolicies.ts`  
  Research basis: progressive overload, specificity, volume, intensity/load, frequency, exercise order.  
  Links: https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/ | https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx

- **P1.3 Define explanation payloads for every adaptive decision** — **Effort: S**  
  Every generated choice that is user-visible should be able to return: `reason`, `evidenceLevel`, `sources[]`, and `confidenceNote`.  
  Research basis: honest uncertainty communication.  
  Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full

## Phase 2 — Data model and user-state expansion

### Goal

Support richer physiology-aware adaptation without over-collecting data or reducing user autonomy.

### Tasks

- **P2.1 Expand user physiology preferences** — **Effort: M**  
  Add explicit preferences for readiness source, symptom tracking opt-in, evidence display verbosity, and conservative/aggressive adaptation style.  
  Proposed surfaces/files:  
  - modify `types/database.ts`  
  - modify `app/(qsetup)/quick-setup.tsx`  
  - modify `app/(tabs)/profile/index.tsx`  
  - add migration(s) for `user_profile`  
  Research basis: adherence improves when autonomy and preference are respected; subjective context matters.  
  Links: https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml | https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/

- **P2.2 Introduce structured readiness check-ins** — **Effort: M**  
  Replace the notion of a single opaque readiness number with component inputs such as sleep, stress, soreness, motivation, pain, illness, and optional cycle symptoms. Keep derived score/trend internal.  
  Proposed data model additions:  
  - `readiness_checkins` table  
  - `readiness_component_scores` or JSON payload  
  - optional `cycle_symptom_logs`  
  Research basis: subjective self-report is useful; readiness should be treated as trend/context rather than a single truth value.  
  Links: https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml | https://journals.lww.com/nsca-jscr/fulltext/2010/06000/autoregulatory_progressive_resistance_exercise_vs_.11.aspx

- **P2.3 Snapshot generation assumptions onto each program** — **Effort: S**  
  Persist the rules used to create a program: goal policy version, experience level, focus muscles, cycle mode, readiness strategy, warm-up mode, and evidence version.  
  Proposed files:  
  - modify `utils/saveProgramToDb.ts`  
  - migration for `programs` metadata columns or JSON config  
  Research basis: progression and interpretation require stable context over time.  
  Links: https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx

## Phase 3 — Readiness and recovery engine v2

### Goal

Convert readiness from a simple score-based multiplier into a coaching system that makes safer and more physiologically defensible decisions.

### Tasks

- **P3.1 Build a readiness interpretation engine** — **Effort: L**  
  Output categories like `train_as_planned`, `reduce_volume`, `reduce_complexity`, `hold_load`, `switch_to_recovery_session`, plus explanation payloads.  
  Proposed files:  
  - create `utils/readinessEngine.ts`  
  - modify `utils/progressionEngine.ts`  
  - modify `app/(tabs)/home.tsx`  
  - modify `app/next-workout.tsx`  
  Research-backed decision: volume-first reduction should take precedence over aggressive load swings when recovery is poor.  
  Links: https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml | https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/

- **P3.2 Separate “today overlay” from “next-week progression” rules** — **Effort: M**  
  Preserve the current architecture distinction but formalize it: acute readiness affects today’s session recommendation; persistent performance plus recovery trends affect progression.  
  Proposed files:  
  - modify `hooks/useCurrentProgram.ts`  
  - modify `utils/progressionEngine.ts`  
  - modify `types/progression.ts`  
  Research-backed decision: daily variability should not fully rewrite the longer-term training signal.  
  Links: https://journals.lww.com/nsca-jscr/fulltext/2010/06000/autoregulatory_progressive_resistance_exercise_vs_.11.aspx | https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx

- **P3.3 Add readiness trend and recovery messaging to the home surface** — **Effort: M**  
  Replace the raw “readiness score” feel with clearer states: trend, current recommendation, and what changed today.  
  Proposed files:  
  - modify `app/(tabs)/home.tsx`  
  - modify `components/NextWorkoutCard.tsx`  
  - possible new `components/ReadinessInsightCard.tsx`  
  Research basis: trend interpretation is more defensible than single-score absolutism.  
  Links: https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml

## Phase 4 — Menstrual-cycle and symptom personalization

### Goal

Keep cycle support, but redesign it so symptoms and user consent drive the behavior rather than a rigid 28-day model.

### Tasks

- **P4.1 Redesign cycle tracking as optional symptom-aware support** — **Effort: M**  
  Preserve the existing phase calculator as a fallback context signal, but prioritize symptom burden, sleep disruption, pain, motivation, and user preference.  
  Proposed files:  
  - modify `utils/cyclePhase.ts`  
  - create `utils/cycleAdaptation.ts`  
  - modify `app/(tabs)/profile/index.tsx`  
  - modify `app/(qsetup)/quick-setup.tsx`  
  Research-backed decision: symptom-informed adjustments are more defensible than universal phase prescriptions.  
  Links: https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full | https://doi.org/10.3389/fspor.2023.1054542

- **P4.2 Introduce private, autonomy-supportive cycle settings copy** — **Effort: S**  
  The UI should explicitly say the feature is optional, imperfect, and designed to spot personal patterns rather than impose stereotypes.  
  Proposed files:  
  - modify `app/(tabs)/profile/index.tsx`  
  - modify `app/faq.tsx`  
  - add copy constants if needed  
  Research basis: privacy, symptom diversity, and limited average phase effects.  
  Links: https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full

- **P4.3 Use cycle context in workout recommendations, not just generation** — **Effort: M**  
  If enabled, cycle context should influence daily coaching explanations and readiness summaries, not only the initial program build.  
  Proposed files:  
  - modify `app/next-workout.tsx`  
  - modify `hooks/useCurrentProgram.ts`  
  - modify `app/(tabs)/home.tsx`  
  Research-backed decision: real-world symptom context matters more on the day than static calendar estimates.  
  Links: https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full

## Phase 5 — Program generation v2

### Goal

Turn the current generator into a transparent, evidence-backed planning engine that better balances goal specificity, frequency, weekly volume, session length, exercise stability, and focus muscles.

### Tasks

- **P5.1 Refactor split selection and weekly volume distribution** — **Effort: L**  
  Move from “days per week → fixed split” toward “days per week + goal + focus muscles + time budget → recommended split family and volume map,” while preserving simple defaults for beginners.  
  Proposed files:  
  - modify `utils/programGenerator.ts`  
  - create `utils/splitRecommendation.ts`  
  Research-backed decision: frequency mainly distributes weekly work; simpler programming is usually enough for beginners.  
  Links: https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/ | https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/

- **P5.2 Add exercise-stability windows and smarter variation cadence** — **Effort: M**  
  Keep primary compounds stable for longer blocks and rotate accessories more flexibly, instead of letting swap logic become random churn.  
  Proposed files:  
  - modify `utils/programGenerator.ts`  
  - modify `hooks/useCurrentProgram.ts`  
  - modify `components/SwapExerciseModal.tsx`  
  Research-backed decision: primary lifts should remain stable long enough to track progress; accessory variation can be more fluid.  
  Links: https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

- **P5.3 Add warm-up and session-structure prescriptions to generated workouts** — **Effort: M**  
  Generated plans should include a concise warm-up recipe, exercise order logic, and optional cooldown guidance.  
  Proposed files:  
  - modify `types/program.ts`  
  - modify `utils/programGenerator.ts`  
  - modify `app/next-workout.tsx`  
  - modify `app/program-overview.tsx`  
  Research-backed decision: warm-up support is strong; cooldown support is weaker and should be framed as optional.  
  Links: https://journals.lww.com/nsca-jscr/fulltext/2010/01000/effects_of_warming_up_on_physical_performance__a.20.aspx | https://bjsm.bmj.com/content/47/9/526

- **P5.4 Add explanation metadata to every generated day and slot** — **Effort: M**  
  Each workout/day should be able to answer: why this split, why this muscle emphasis, why this rep range, why this session length, why this exercise order.  
  Proposed files:  
  - modify `types/program.ts`  
  - modify `utils/programGenerator.ts`  
  - create `components/EvidenceWhySheet.tsx`  
  Research-backed decision: the app should surface rationale, not just prescriptions.  
  Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

## Phase 6 — Workout execution, progression, deload, and analytics

### Goal

Bring day-of-workout behavior and long-term adaptation into alignment with the research hierarchy.

### Tasks

- **P6.1 Evolve progression into a richer adaptive model** — **Effort: L**  
  Keep double progression as the base, then add plateau interpretation, adherence checks, and exercise-specific load-jump logic.  
  Proposed files:  
  - modify `utils/progressionEngine.ts`  
  - modify `types/progression.ts`  
  - modify `hooks/useCurrentProgram.ts`  
  Research-backed decision: double progression is practical for general fitness/hypertrophy; load jumps should be small and context-aware.  
  Links: https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

- **P6.2 Add reactive deload logic rather than blanket scheduled deloading** — **Effort: M**  
  Support deload triggers based on fatigue, repeated underperformance, symptom burden, or explicit user request; keep scheduled deloads optional for advanced blocks.  
  Proposed files:  
  - create `utils/deloadEngine.ts`  
  - modify `hooks/useCurrentProgram.ts`  
  - modify `utils/notifications.ts`  
  Research-backed decision: deloads are reasonable but should be purposeful, not automatic.  
  Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/

- **P6.3 Build analytics that explain adaptation, not just record history** — **Effort: M**  
  Add views for weekly volume distribution, missed-session impact, readiness trend, plateau flags, and deload rationale.  
  Proposed files:  
  - modify `app/workout-history.tsx`  
  - modify `app/(tabs)/history.tsx`  
  - modify `app/(tabs)/profile/index.tsx`  
  - create analytics helpers under `utils/`  
  Research-backed decision: plateaus are diagnostic questions, and training load should be understood in context.  
  Links: https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.40.aspx | https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml

## Phase 7 — Education, transparency, and trust surfaces

### Goal

Make the science visible in a calm, elegant, non-overbearing way throughout the app.

### Tasks

- **P7.1 Replace static FAQ answers with evidence-aware explanations** — **Effort: M**  
  Introduce answer blocks that distinguish `well supported`, `mixed`, and `personalized` topics, each with linked sources.  
  Proposed files:  
  - modify `app/faq.tsx`  
  - reuse `constants/evidenceRegistry.ts`  
  Research-backed decision: uncertainty should be communicated explicitly.  
  Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/ | https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/full

- **P7.2 Rebuild Recovery Library around purpose-driven routines** — **Effort: M**  
  Shift from generic routines to evidence-tagged modules: warm-up, mobility-for-ROM limits, active recovery, symptom-tolerant movement, optional cooldown.  
  Proposed files:  
  - modify `app/recovery-library.tsx`  
  - create `constants/recoveryProtocols.ts`  
  Research-backed decision: warm-ups are more defensible than cooldowns; mobility is best when tied to an actual ROM need.  
  Links: https://journals.lww.com/nsca-jscr/fulltext/2010/01000/effects_of_warming_up_on_physical_performance__a.20.aspx | https://bjsm.bmj.com/content/47/9/526

- **P7.3 Add “why this changed today” panels to home and next-workout** — **Effort: M**  
  If readiness/cycle context changes the session, users should see the logic and the evidence level directly in the UI.  
  Proposed files:  
  - modify `app/(tabs)/home.tsx`  
  - modify `app/next-workout.tsx`  
  - create `components/TodayAdjustmentSummary.tsx`  
  Research-backed decision: adaptive systems earn trust when they explain their reasoning.  
  Links: https://journals.humankinetics.com/view/journals/ijspp/11/2/article-p137.xml

## Phase 8 — Integrations, rollout, and quality gates

### Goal

Ship the physiology system safely and incrementally.

### Tasks

- **P8.1 Revisit Apple Health integration as a second-order input, not a primary authority** — **Effort: M**  
  HealthKit can enrich body mass, cycle logging, and future trend views, but it should not outrank training performance and self-report in decision logic.  
  Proposed files:  
  - existing planned HealthKit surfaces from `reports/plans/IMPLEMENTATION-PLAN.md`  
  - new `utils/healthKit.ts` if approved later  
  Research-backed decision: wearable/readiness metrics are helpful trends, not validated stand-ins for context-aware coaching.  
  Links: https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/

- **P8.2 Add feature flags and staged rollout order** — **Effort: S**  
  Gate major physiology behaviors: readiness-v2, cycle-symptom support, evidence panels, reactive deloads.  
  Proposed files:  
  - feature config under `constants/` or `utils/`  
  - optional profile toggles  

- **P8.3 Add verification coverage and regression checklist** — **Effort: M**  
  Because the repo currently exposes minimal test automation, this wave should add targeted validation for generators, progression, and adaptation logic.  
  Proposed focus areas:  
  - generation snapshots by goal/frequency/experience  
  - readiness-engine branch coverage  
  - cycle/symptom opt-in behavior  
  - UI rendering of explanations and source links

# Critical path

1. **Evidence registry and policy extraction**  
2. **Data model expansion for readiness/cycle/context**  
3. **Readiness engine v2**  
4. **Program generator v2**  
5. **Progression/deload alignment**  
6. **Explanation surfaces and analytics**  

If we skip step 1, the rest will become duplicate heuristics. If we skip step 2, the adaptation logic will remain too coarse. If we skip step 6, the product will feel opaque even if the physiology is improved.

# Delivery shape after Decision 1

Because you want all three pillars equally from the start, execution should be organized as **three synchronized workstreams** rather than a long single-lane sequence:

1. **Workstream A — Intelligence**  
   Evidence architecture, program generation, progression, deloads, and adaptation engines.

2. **Workstream B — Experience**  
   Home, Next Workout, Program Overview, Profile, and Generate Program flows that expose the engine cleanly.

3. **Workstream C — Trust**  
   Evidence labels, linked sources, FAQ/recovery-library refactor, privacy/autonomy copy, and uncertainty framing.

Each milestone should ship something in all three workstreams, even if the engineering weight is uneven.

# Task graph

| Task ID | Title | Depends on |
|---|---|---|
| evidence-architecture | Evidence registry + policy extraction | — |
| physiology-schema | User/context data model expansion | evidence-architecture |
| readiness-v2 | Readiness interpretation engine | evidence-architecture, physiology-schema |
| cycle-personalization | Optional symptom-first cycle support | physiology-schema |
| generator-v2 | Program generation refactor | evidence-architecture, physiology-schema |
| progression-deload | Progression + reactive deload alignment | readiness-v2, generator-v2 |
| explanation-ui | In-app rationale and source-link surfaces | evidence-architecture, readiness-v2, generator-v2 |
| analytics-insights | Trend and adaptation analytics | progression-deload |
| recovery-content | Recovery library + FAQ evidence rebuild | explanation-ui |
| integration-rollout | Health inputs, flags, rollout, verification | progression-deload, explanation-ui, analytics-insights |

# Resource mapping

| Task | Files to Create | Files to Modify | Tools/Commands |
|---|---|---|---|
| evidence-architecture | `constants/evidenceRegistry.ts`, `types/evidence.ts`, `constants/programDefaults.ts`, `constants/adaptationPolicies.ts` | `utils/programGenerator.ts` | TypeScript, Expo lint |
| physiology-schema | migrations for `user_profile`, readiness/cycle tables | `types/database.ts`, `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/profile/index.tsx`, `utils/saveProgramToDb.ts` | SQL, TypeScript |
| readiness-v2 | `utils/readinessEngine.ts`, possible `components/ReadinessInsightCard.tsx` | `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `hooks/useCurrentProgram.ts`, `utils/progressionEngine.ts` | TypeScript, Expo lint |
| cycle-personalization | `utils/cycleAdaptation.ts` | `utils/cyclePhase.ts`, `app/(tabs)/profile/index.tsx`, `app/(qsetup)/quick-setup.tsx`, `app/next-workout.tsx` | TypeScript, Expo lint |
| generator-v2 | `utils/splitRecommendation.ts`, possible new helper modules | `utils/programGenerator.ts`, `components/GenerateProgramModal.tsx`, `types/program.ts`, `app/program-overview.tsx` | TypeScript, Expo lint |
| progression-deload | `utils/deloadEngine.ts` | `utils/progressionEngine.ts`, `hooks/useCurrentProgram.ts`, `utils/notifications.ts` | TypeScript, Expo lint |
| explanation-ui | `components/EvidenceWhySheet.tsx`, `components/TodayAdjustmentSummary.tsx` | `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `app/faq.tsx` | TypeScript, Expo lint |
| analytics-insights | analytics helpers/components | `app/workout-history.tsx`, `app/(tabs)/history.tsx`, `app/(tabs)/profile/index.tsx` | TypeScript, Expo lint |
| recovery-content | `constants/recoveryProtocols.ts` | `app/recovery-library.tsx`, `app/faq.tsx` | TypeScript, content review |
| integration-rollout | optional `utils/healthKit.ts` | planned HealthKit/settings surfaces | TypeScript, Expo lint |

# Recommended workflow

- **Workflow:** `/pydev-workflow`
- **Why:** this is a full product-system refactor/addition touching data model, decision engines, multiple UI surfaces, explanations, and rollout strategy.
- **Delivery style:** phased implementation with checkpoints after Phase 1, Phase 3, Phase 5, and Phase 7.

# Proposed implementation order for execution

1. Establish evidence architecture and policy extraction.
2. Lock the schema and user preference surfaces.
3. Ship **Milestone A** across all three pillars:
   - generator explanation payloads
   - readiness-v2 skeleton
   - basic “why this plan / why this workout” UI
4. Ship **Milestone B** across all three pillars:
   - split/volume/generation refactor
   - symptom-aware cycle support
   - linked evidence cards in Home, Next Workout, and Program Overview
5. Ship **Milestone C** across all three pillars:
   - progression + reactive deload alignment
   - adaptation analytics
   - FAQ and Recovery Library evidence overhaul
6. Add integrations, flags, and rollout protections.

# Risks and trade-offs

- **Risk: overfitting product behavior to mixed evidence.**  
  Mitigation: add evidence levels and confidence notes for every research-backed rule.

- **Risk: too much user input friction.**  
  Mitigation: make advanced physiology inputs optional, progressive, and preference-aware.

- **Risk: opaque adaptation reduces trust.**  
  Mitigation: ship explanation payloads with every meaningful adjustment.

- **Risk: cycle features feel exclusionary or deterministic.**  
  Mitigation: default to optional, symptom-first, privacy-forward design.

- **Risk: generator refactor destabilizes existing program creation.**  
  Mitigation: preserve existing output shapes first, then iterate on richer policy inputs behind flags.

# Clarification pass resolutions

1. **Primary product promise:** all three equally, delivered as a hybrid product that blends adaptive coaching, evidence-based planning, and transparent decision support.
2. **Physiology capture:** start with minimal, user-friendly required inputs and defer richer physiology logging into optional later flows or deeper modes.
3. **Brand posture:** friendly evidence-informed rather than clinical or aggressively “performance engine” branded.
4. **Source-link visibility:** subtle “Learn why” style affordances that open into a dedicated evidence screen.
5. **Menstrual support:** hidden unless explicitly enabled, using a hybrid model with symptom priority and light calendar context where available.
6. **Readiness aggressiveness:** moderate authority by default, with optional stronger controls for advanced users.
7. **Deload timing:** include reactive deload logic in the implementation wave, while also allowing optionally scheduled deloads later for advanced use cases.
8. **Education depth:** make FAQ and Recovery Library research-linked and evidence-aware, while keeping live-product explanations concise with optional deep dives.
9. **HealthKit timing:** prepare the foundation now, but treat HealthKit as a later enrichment rather than a first-wave dependency.
10. **Plan structure:** keep this master plan and break execution into separate milestone/workstream plans.

# Recommendation for the next planning turn

Convert the resolved clarification answers into a milestone-based execution packet: one master roadmap plus separate implementation plans for Intelligence, Experience, and Trust workstreams.
