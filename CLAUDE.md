# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build   # Build plugin using Rollup (TypeScript → JavaScript bundle)
npm run watch   # Watch mode: rebuild on changes and restart the Stream Deck plugin
```

No lint or test scripts are configured.

## Architecture

This is a Stream Deck plugin (plugin ID: `com.joerncodes.kimai-time-tracking`) that integrates with Kimai time tracking. It is written in TypeScript and uses the official `@elgato/streamdeck` SDK v2.

**Data flow:**
1. `src/plugin.ts` — entry point; registers actions and connects to the Stream Deck daemon
2. `src/actions/` — each file exports a `SingletonAction` subclass for a Stream Deck button action
3. Rollup bundles everything to `com.joerncodes.kimai-time-tracking.sdPlugin/bin/plugin.js`
4. `com.joerncodes.kimai-time-tracking.sdPlugin/manifest.json` — declares the plugin and its actions to Stream Deck
5. `com.joerncodes.kimai-time-tracking.sdPlugin/ui/` — HTML property inspector UIs (use Elgato's `sdpi-components` library) for per-action settings in the Stream Deck app

**Actions** implement lifecycle hooks: `onWillAppear()` for initial state, `onKeyDown()` for button presses. Per-action settings are persisted via the SDK (`action.getSettings()` / `action.setSettings()`).

**Current state:** The only action is a placeholder counter (`start-tracking`). The intended feature — start/stop Kimai time tracking entries — is not yet implemented.

## Key files

| Path | Role |
|------|------|
| `src/plugin.ts` | Plugin init; register new actions here |
| `src/actions/start-tracking.ts` | Example/placeholder action |
| `com.joerncodes.kimai-time-tracking.sdPlugin/manifest.json` | Plugin metadata; must list every action |
| `rollup.config.mjs` | Build config; output goes to `sdPlugin/bin/plugin.js` |
| `.vscode/launch.json` | Attaches Node.js debugger to the running plugin process |
