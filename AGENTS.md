# AGENTS.md

## Project
Avtovoz Mini App is a Telegram Mini App frontend for AvtovozBot. It is currently a plain HTML/CSS/JavaScript frontend with tabs for borders, route/map, documents, fuel, and trips.

## Read first
Before editing code, inspect:
1. `index.html`
2. `css/style.css`
3. `js/app.js`
4. any backend API contract docs if added later

## Core rules
- Keep changes small and focused.
- Do not introduce a build system, framework, bundler, or package manager unless explicitly requested.
- Preserve Telegram WebApp initialization.
- Keep the UI mobile-first and Telegram-friendly.
- Keep Ukrainian UI text unless the task asks for localization.
- Document backend endpoint assumptions before changing API calls.

## Architecture hints
- `index.html` contains the main markup and fallback styles.
- `css/style.css` contains the main styling.
- `js/app.js` contains app behavior and backend calls.
- The app is expected to run inside Telegram WebApp.

## Frontend rules
- Do not break bottom navigation.
- Avoid large inline rewrites unless necessary.
- Keep loading, empty, and error states visible to users.
- Be careful with geolocation, map, document, fuel, and trip flows.
- Do not hardcode production-only backend URLs unless the project already uses them consistently.

## Validation
Use the smallest relevant manual check:
1. open the Mini App page locally or from its hosting URL
2. test tab navigation
3. test the changed flow inside Telegram WebApp when possible
4. check browser console for errors

## Finish format
End every task with:
1. changed files
2. what changed
3. how to test
4. risks or follow-up notes
