# LLM Picker

A cross-platform (iOS + Android) mobile app that unifies multiple LLM providers
(Google Gemini, OpenAI, Anthropic) behind a single chat interface, like
OpenWebUI but for mobile. All conversations and API keys are stored locally
on-device.

## Stack

- Expo SDK 54 · React Native 0.76 · TypeScript 5.6
- expo-router v4 (file-based routing in `src/app/`)
- expo-secure-store (encrypted API keys in Keychain/Keystore)
- expo-sqlite (conversations and messages)
- expo-image-picker + expo-document-picker (attachments)
- zustand (state management)
- Plain StyleSheet + the existing `ThemedText`/`ThemedView` theme system

> Note: SDK is pinned to 54 to match the user's installed Expo Go. Do not
> upgrade to 55/56 without coordinating — it breaks Expo Go compatibility.

## Architecture

- `src/providers/` — LLM provider abstraction (one interface, multiple impls).
  Each provider implements `listModels`, `streamMessage`, `supportsAttachments`.
- `src/store/` — zustand stores for API keys, conversations, UI state.
- `src/db/` — SQLite persistence layer (schema, queries).
- `src/app/` — expo-router screens. `(tabs)` group for Chat list + Settings;
  `chat/[id]` for the active conversation; modal routes for model picker.
- `src/components/` — reusable UI (message bubble, chat input, model picker).
- `src/constants/models.ts` — model catalog with capability flags
  (`vision`, `documents`, `streaming`) so the UI can grey out unsupported
  features per the selected model.

## Commands

- `npm start` — start Expo dev server (use Expo Go on a physical device)
- `npm run android` — start + open Android
- `npm run ios` — start + open iOS (requires macOS)
- `npm run web` — start + open web
- `npm run lint` — lint with `expo lint` (eslint)
- `npx tsc --noEmit` — typecheck
- `npm run reset-project` — reset to fresh scaffold (destructive, do not run)

## Conventions

- TypeScript strict mode. No `any`.
- No comments in code unless asked.
- Use the existing theme: `ThemedText`, `ThemedView`, `useTheme()`,
  `Colors`, `Spacing` from `@/constants/theme`.
- Path alias: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- Secrets (API keys) NEVER leave `expo-secure-store`. Never log them.

## Notes for cross-platform

- Dev is on Windows; iOS simulator isn't available. Test via Expo Go on a
  physical iPhone, or via web/Android. Production iOS builds use EAS Build
  (cloud, no Mac required).

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code that touches Expo modules (secure-store, sqlite, image-picker,
document-picker, file-system).
