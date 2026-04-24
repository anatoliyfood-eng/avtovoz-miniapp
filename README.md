# Avtovoz Mini App

Avtovoz Mini App is a Telegram Mini App frontend for AvtovozBot. It provides mobile-first tools for drivers and carriers directly inside Telegram.

## Main features

- border queue tab
- route and map tab
- document archive tab
- fuel price tab
- trip statistics and active trip tab
- Telegram WebApp initialization
- mobile-first bottom navigation
- Ukrainian user interface

## Tech stack

This project is currently a plain frontend application:

- HTML
- CSS
- JavaScript
- Telegram WebApp SDK

There is no build system unless one is added later.

## Repository structure

```text
index.html              Main Mini App markup and fallback styles
css/style.css           Main styling
js/app.js               Client-side behavior and backend API calls
AGENTS.md               Codex instructions for this repository
```

## Local development

Open `index.html` in a browser for basic layout checks.

For full behavior, test inside Telegram WebApp because Telegram-specific APIs such as `window.Telegram.WebApp` are only available there.

## Backend assumptions

The Mini App expects backend endpoints for features such as:

- borders
- fuel prices
- cameras or route monitoring
- documents
- trips
- document generation

Keep endpoint assumptions documented before changing frontend API calls.

## Development notes

- Keep the app mobile-first.
- Preserve Telegram WebApp initialization.
- Keep Ukrainian UI text unless localization is explicitly requested.
- Do not add a framework, bundler, or package manager unless explicitly requested.
- Keep loading, empty, and error states visible to users.
- Be careful with geolocation, maps, documents, fuel, and trip flows.

## Manual checks

After frontend changes:

1. open the Mini App page locally or from the hosted URL
2. check tab navigation
3. check the browser console for errors
4. test the changed flow inside Telegram WebApp when possible

## Codex

Read `AGENTS.md` before asking Codex to make changes in this repository.
