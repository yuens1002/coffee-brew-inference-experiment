# Coffee Brew Inference Experiment

> **Hermes Agent Challenge 2026** entry — validating open coffee community + AI brew inference with TypeScript-anchored codebase.

## Tech Stack
- **TypeScript** (main codebase, API, DB layer)
- **DSPy** (Python, brew inference pipeline)
- **SQLite** (sample brew database via better-sqlite3)
- **Hermes Agent** (coordination, automation, subagents)

## Structure
```
coffee-brew-inference-experiment/
├── src/                # TypeScript source (API, DB types, middleware)
├── db/                 # SQLite schema + sample data
├── inference/          # Python/DSPy brew inference scripts
├── hermes-automation/  # TypeScript scripts for Hermes cron/subagent tasks
├── landing/            # Simple landing page (TypeScript/HTML)
├── package.json
└── tsconfig.json
```

## Quick Start
```bash
npm install
npm run build
npm start
```

## Hermes Agent Usage
This project demonstrates:
- `delegate_task` for parallel R&D subagents
- `memory` for cross-session progress tracking
- `cronjob` for weekly coffee AI literature reviews
- `skills` for reusable brew inference workflows

## Competition
Submitting to [DEV Hermes Agent Challenge](https://dev.to/challenges/hermes-agent-2026-05-15) — Build With Hermes Agent track.
