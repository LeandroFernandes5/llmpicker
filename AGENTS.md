# LLM Picker

A cross-platform (iOS + Android + Web/PWA) app that unifies multiple LLM
providers (Google Gemini, OpenAI, Anthropic) behind a single chat interface,
like OpenWebUI but for mobile. All conversations, templates, and API keys are
stored locally on-device (or in the browser on web).

## Stack

- Expo SDK 54 · React Native 0.76 · TypeScript 5.6
- expo-router v4 (file-based routing in `src/app/`)
- expo-secure-store (encrypted API keys in Keychain/Keystore on native)
- expo-sqlite (conversations, messages, templates)
- expo-image-picker + expo-document-picker (attachments)
- zustand (state management)
- react-native-web (web/PWA target, deployed as a static site)
- Plain StyleSheet + the existing `ThemedText`/`ThemedView` theme system

> Note: SDK is pinned to 54 to match the user's installed Expo Go. Do not
> upgrade to 55/56 without coordinating — it breaks Expo Go compatibility.

## Architecture

- `src/providers/` — LLM provider abstraction (one interface, multiple impls).
  Each provider implements `listModels`, `streamMessage`, `supportsAttachments`.
- `src/store/` — zustand stores for API keys, conversations, templates.
- `src/db/` — SQLite persistence layer (schema, queries). Schema is versioned
  via migrations in `schema.ts` (currently v3).
- `src/lib/` — platform helpers: `secure-storage` (platform-split key store),
  `attachments` (image/document picking).
- `src/app/` — expo-router screens. `(tabs)` group for Chats + Templates +
  Settings; `chat/[id]` for the active conversation; modal routes for model
  picker and the template editor; `+html.tsx` is the web HTML shell.
- `src/components/` — reusable UI (message bubble, chat input, model picker).
- `src/constants/models.ts` — model catalog with capability flags
  (`vision`, `documents`, `streaming`) so the UI can grey out unsupported
  features per the selected model.
- `public/` — static web assets (PWA manifest, icons, `_headers`, `_redirects`).
- `scripts/fix-web-assets.js` — post-build fixup for web asset paths (see Web).

## Commands

- `npm start` — start Expo dev server (use Expo Go on a physical device)
- `npm run android` — start + open Android
- `npm run ios` — start + open iOS (requires macOS)
- `npm run web` — start + open web (add `-- --offline` if Expo's version-check fetch fails behind a VPN)
- `npm run build:web` — export static web build to `dist/` (also runs the asset-path fixup)
- `npm run lint` — lint with `expo lint` (eslint)
- `npx tsc --noEmit` — typecheck
- `npm run reset-project` — reset to fresh scaffold (destructive, do not run)

## Conventions

- TypeScript strict mode. No `any`.
- No comments in code unless asked.
- Use the existing theme: `ThemedText`, `ThemedView`, `useTheme()`,
  `Colors`, `Spacing` from `@/constants/theme`.
- Path alias: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- Secrets (API keys) NEVER leave the device. On native they live in
  `expo-secure-store`; on web in the browser's `localStorage` (no hardware
  keystore on web). Never log them.

## Notes for cross-platform

- Dev is on Windows; iOS simulator isn't available. Test via Expo Go on a
  physical iPhone, or via web/Android. Production iOS builds use EAS Build
  (cloud, no Mac required).

## Templates

A Template bundles a system prompt + a pre-selected model. Starting a chat
from a Template (chip row on the Chats screen) pre-applies both. The prompt is
injected at send time as a `role: 'system'` message (in `conversations.ts`
`sendMessage`) — it is never written to the `messages` table, so chats stay
clean. Templates live in the `templates` table; conversations reference them
via `templateId`. Editing a Template propagates to future messages in every
chat that uses it. The model stays swappable mid-chat.

## Web / PWA

The web build is a local-first PWA (same codebase, react-native-web). Several
platform-specific things to know before touching web code:

- **Storage is platform-split.** `src/lib/secure-storage.{ts,native.ts}`
  resolves to `localStorage` on web and `expo-secure-store` on native, behind
  the same `getItemAsync/setItemAsync/deleteItemAsync` API. The API-keys store
  imports from `@/lib/secure-storage`, never from `expo-secure-store` directly.
- **SQLite-web is alpha and has requirements.** It uses SharedArrayBuffer, so
  the host must send `Cross-Origin-Embedder-Policy: require-corp` and
  `Cross-Origin-Opener-Policy: same-origin`. These are in `public/_headers`
  (production) and `metro.config.js` (dev server).
- **`node_modules` asset paths aren't served by static hosts** (Cloudflare
  Pages strips them), and expo-router emits bundled assets under
  `dist/assets/node_modules/...`. `scripts/fix-web-assets.js` renames that to
  `dist/assets/nm/` and rewrites references; it runs automatically via
  `npm run build:web`. If a web asset 404s after adding a native dep, look here.
- **`src/app/+html.tsx` is the web HTML shell.** It MUST keep the height-reset
  style (`#root,body,html{height:100%}`) — dropping it collapses every
  navigator to zero height (tab bar pinned to top, blank screens). It also
  carries the PWA manifest + apple-touch meta.
- **iOS PWA safe areas** require the root `SafeAreaProvider`
  (`src/app/_layout.tsx`) plus `viewport-fit=cover` (in `+html.tsx`); without
  them `useSafeAreaInsets()` returns 0 on web and the tab bar / chat input
  underlap the home indicator. The tab bar is sized from the inset in
  `(tabs)/_layout.tsx`.
- **No LLM proxy needed on web.** All three providers allow direct browser
  calls (OpenAI echoes the origin; Anthropic sends
  `anthropic-dangerous-direct-browser-access`, already in `anthropic.ts`;
  Gemini supports CORS).
- **OPFS quirk in local dev:** expo-sqlite-web holds an exclusive OPFS handle
  on the DB file, so a stale worker from a crashed/reloaded dev session can
  throw `createSyncAccessHandle` errors. Fix: keep one localhost tab and clear
  site data (DevTools → Application → Clear site data). Production is unaffected
  (different origin, single tab).
- **Deploy:** Cloudflare Pages connected to GitHub. Production branch `main`;
  build command `npm run build:web`; output `dist`; env `NODE_VERSION=20`
  (optionally `EXPO_OFFLINE=1`). Pushing to `main` auto-deploys; PRs get
  preview URLs.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code that touches Expo modules (secure-store, sqlite, image-picker,
document-picker, file-system).
