# TrustVeil / PhishRadar

Two-layer web threat detection as a Chrome extension (Manifest V3), all in TypeScript.
Detection runs on the device. The cloud is used only when the user presses **Deep Check**.

```
packages/shared    types everyone agrees on (Finding, PageSnapshot, RiskResult) + URL stripper
packages/engine    Layer 1 rules (rules.json), scoring, English/Hinglish messages, Layer 2 hook
apps/extension     content script, Shadow DOM banner, popup, background worker
apps/backend       Hono server: URL check, TinyFish call, converts the result to Findings
demo-pages         fake scam / fake bank / safe pages for the demo
```

## Quick start (about 5 minutes)

Needs Node 18+ and Chrome.

```bash
npm install

# 1. backend (works without a TinyFish key: it falls back to a canned "mock" audit)
cp apps/backend/.env.example apps/backend/.env      # Windows: copy apps\backend\.env.example apps\backend\.env
npm run dev:backend                                 # http://localhost:8787

# 2. extension
npm run build:ext                                   # or: npm run dev:ext  (rebuilds on save)
#    chrome://extensions -> Developer mode -> Load unpacked -> apps/extension/dist
#    after each rebuild, press the reload icon on the extension card

# 3. demo pages
npm run demo                                        # http://localhost:5000
```

Open `http://localhost:5000`, visit the three pages, and press **Deep Check** on the trial page.

Tests: `npm test` (engine rules and backend logic) and `npm run typecheck`.

## What the prototype does

| Piece | Status |
|---|---|
| Page capture: text, checkboxes, button size/colour, timers, tiny text, URL | Done |
| Re-analysis when popups appear (debounced MutationObserver) | Done |
| Layer 1 rules in `rules.json`: pre-ticked consent, tiny/low-contrast decline button, countdown, English + Hinglish urgency phrases, Rs 1 vs Rs 999/month price trap, hidden fine print, no HTTPS on login/payment, look-alike domain, brand mismatch, punycode | Done |
| Scoring: low / medium / high, a single weak signal can never reach high | Done |
| Plain English / Hinglish reasons, toggle in the banner | Done |
| Shadow DOM banner (page CSS cannot break it) and a popup with counts and settings | Done |
| Deep Check: URL stripped of `?query`, validated, rate limited, cached, TinyFish Agent run, result converted to the same Finding format and merged into the verdict | Done (see notes) |
| Layer 2 local ML classifier | **Not built.** `engine/src/layer2.ts` is a no-op hook so you can add it later without touching anything else |
| TinyFish Fetch and Search (terms pages, complaint lookup) | Not built. Only the Agent endpoint is used. The agent goal already asks it to open Terms/Refund/Cancellation pages |

## Notes you should know

- **Mock mode.** Without `TINYFISH_API_KEY` (or with `MOCK_TINYFISH=true`) the backend returns a canned audit, so the demo works offline. The TinyFish cloud browser cannot open `localhost`, so for a **live** Deep Check you need a public URL: deploy `demo-pages` (Netlify Drop, Vercel, GitHub Pages) or use a tunnel like ngrok, then put that URL in the browser.
- **TinyFish call.** The client uses the synchronous endpoint `POST https://agent.tinyfish.ai/v1/automation/run` with an `X-API-Key` header, as in their docs. The agent is asked to return JSON in a fixed shape; `apps/backend/src/analyzer.ts` parses that defensively. After your first real run, look at what comes back and adjust `analyzer.ts` or the goal in `tinyfish.ts` if needed.
- **Backend is TypeScript (Hono), not FastAPI** as in the slides. Same design: the key stays server-side and the extension only sends the stripped URL.
- **Deployed backend.** `host_permissions` in `apps/extension/manifest.json` lists only localhost:8787. If you deploy the backend, add its URL there and set it in the extension popup ("Deep Check server").
- **Look-alike domain demo.** Add `127.0.0.1 sbi-secure-login.com` to your hosts file and open `http://sbi-secure-login.com:5000/fake-bank.html`.
- **Brand list is small.** Rules and weights live in `packages/engine/src/rules.json`. Tune them without touching code.
- No extension icon is included (Chrome shows a default one). Add `icons` to the manifest if you want one.

## Who owns what (4 people)

| Person | Folders |
|---|---|
| A: extension plumbing | `apps/extension/src/{content,background,extract,storage,messages}.ts`, `manifest.json`, `build.mjs` |
| B: engine | `packages/engine`, `packages/shared` |
| C: backend + TinyFish | `apps/backend` |
| D: UI + demo | `apps/extension/src/ui`, `apps/extension/src/popup.ts`, `popup.html`, `demo-pages`, slides |

Change `packages/shared` only after telling the team. Everything talks through `Finding`, `PageSnapshot` and `RiskResult`.

## Demo script (2 minutes)

1. Safe article: "Looks OK" note, no false alarm.
2. Fake trial page: High risk within a second. Read two reasons out loud. A late popup appears and the banner reacts.
3. Press **Deep Check**: "Step 3 charges Rs 999/month" and "Cancelling is hard" appear. Explain that only the stripped URL left the browser.
4. Toggle Hinglish.
5. Fake bank page: High risk (not secure, claims to be SBI).
