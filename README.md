# Cindia

Built at Cal Hacks 13.0 (Oct 23 to 25, 2026) by Gordon Yang.

Cindia lets buyers get heritage crafts straight from the makers, while an AI agent named Cindy runs the makers' money.

This repo is being built during the event. The README gets rewritten at the end with what works, what's simulated, and how to run it.

## How it's built

The code is written by a team of Claude Code agents that follow a fixed process:

- `CLAUDE.md` is the build manual every agent reads.
- `docs/harness/` holds the runbook, the live status board and the decision log.
- `docs/common/` holds the shared contracts every agent builds against.
- `.claude/` holds the agent roles, the skills, and the hooks that keep each agent inside its own files.
