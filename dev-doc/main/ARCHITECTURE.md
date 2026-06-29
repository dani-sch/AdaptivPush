# Active Architecture Summary

## Overview

AdaptivPush is an Expo Router mobile app with most orchestration in the client. Routing, theme state, program generation, readiness overlays, workout logging, and most user-facing logic live in the app itself. Supabase provides authentication, relational storage, and asset storage.

## Core runtime layers

| Layer | Current implementation |
|---|---|
| App shell | Expo Router stack in `app/_layout.tsx` with auth, quick setup, tabs, and detail screens |
| UI | `app/` screens plus reusable cards, modals, and panels in `components/` |
| Theme | `contexts/ThemeContext.tsx` backed by `constants/themes.ts` and `constants/palettes.ts` |
| Active program state | `hooks/useCurrentProgram.ts` |
| Domain helpers | `utils/programGenerator.ts`, `utils/progressionEngine.ts`, `utils/cyclePhase.ts`, `utils/profilePreferences.ts`, `utils/notifications.ts` |
| Data access | `utils/supabase.ts` and Supabase tables for programs, workouts, readiness, and profile data |

## Important current seams

1. `hooks/useCurrentProgram.ts` is the main orchestration layer for loading and mutating active-program state.
2. Readiness is currently handled as a display-time overlay in key flows, while progression uses logged performance as the persistence baseline.
3. Theme switching already supports dark, light, and system-driven appearance, which must remain intact during UI redesign work.

## Current architecture references

- deeper architecture detail: `reports/ARCHITECTURE.md`
- active feature plan: `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md`
- active UI plan: `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md`

