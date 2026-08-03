---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript and React Native review - AdaptivPush

## Stack

- Expo 54 with Expo Router 6
- React Native 0.81 and React 19
- TypeScript 5.9 in strict mode
- Supabase Auth, Postgres, and Storage
- React Native `StyleSheet` with repository theme tokens
- npm package manager

This is a mobile Expo app. Next.js, server components, Tailwind, and shadcn conventions do not apply unless the repository is intentionally migrated in a separately approved plan.

## Critical review checks

### Security and privacy

- Never hardcode Supabase keys, service-role tokens, third-party API keys, or secrets.
- Client code may use only the Supabase anon/publishable configuration intended for public clients.
- Every user-owned table must use verified row-level security and ownership policies before release.
- Treat readiness, cycle symptoms, injury considerations, profile data, and workout history as sensitive user data.
- UI copy must accurately describe whether data is stored locally, in Supabase, or sent to an integration.
- Do not claim an export, deletion, support, email, SMS, or HealthKit action succeeded when code only stores a preference or request marker.

### TypeScript strictness

- Prefer explicit interfaces for durable data contracts and discriminated unions for state machines.
- Avoid `any`; use `unknown` and narrow it. Existing `any` should not be copied into new code.
- Give exported functions and public component props explicit types.
- Prefer schema-compatible row/update types from `types/database.ts`.
- Avoid broad type assertions around Supabase results; validate optional and legacy shapes.

### Expo Router and React Native

- Keep route ownership inside `app/` and reusable UI inside `components/`.
- Preserve authentication/onboarding redirects in `app/_layout.tsx` unless the routing contract is intentionally changed.
- Use React Native primitives and Expo-compatible libraries; do not introduce browser-only APIs into native paths.
- Use `Pressable`, `TouchableOpacity`, or accessible native controls with labels, roles, disabled state, and adequate target size.
- Account for safe areas, keyboard interaction, dynamic text, and one-handed reach.
- Keep iOS and Android core behavior equivalent; platform integrations must be optional enrichments.

### Theme and visual behavior

- Use `useTheme()` and tokens from `constants/themes.ts`; do not hardcode screen-specific light/dark colors where a semantic token exists.
- Preserve dark, light, system, and palette preferences from `contexts/ThemeContext.tsx`.
- Verify loading, empty, error, disabled, pressed, offline, and gated states in both light and dark modes.
- Do not rely on color alone for readiness, evidence strength, success, or warning meaning.

### State and domain behavior

- Keep pure training decisions in testable utilities rather than embedding them in screen components.
- Adaptive decisions must carry a reason, confidence/fallback posture, evidence keys where applicable, and whether the user may override.
- Prefer conservative, reversible changes and explicit user control.
- Keep legacy readers/writers during an approved compatibility window; do not silently drop support for existing rows.
- Avoid expanding `hooks/useCurrentProgram.ts` without considering extraction into focused data/domain services.

### Supabase operations

- Check and handle every material Supabase error.
- Design multi-table flows for retry, idempotency, transaction/RPC use, or explicit cleanup.
- Never assume a Phase 2 table exists in every environment until the compatibility window closes.
- Do not swallow failures that would make trust/history surfaces inaccurate.

### Testing and verification

- Run `npm run lint` for TypeScript/TSX changes.
- Add pure unit tests for generator, readiness, feature gates, progression, deload, evidence mapping, and analytics logic as those modules are implemented.
- Manually exercise the smallest affected mobile flow and record externally dependent checks.
- Treat lint as a static gate, not a behavior test.
