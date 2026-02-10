# tikket-statusline

A feature-rich statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![License: MIT](https://img.shields.io/badge/license-MIT-blue)

## What you get

```
◆ Opus 4.6 · ⌥ main*↑2 · ⚑ 3 · ⌂ myproject · v1.2.0 · ⏱ 3h ago · ▸ Fixing bug [2/5] · ⊙ 2 agents · ━━━━━━───────── 40%
```

| Indicator | Description |
|---|---|
| `◆ Opus 4.6` | Active model |
| `⌥ main*↑2↓1` | Git branch, dirty state (`*`), commits ahead (`↑`) / behind (`↓`) remote |
| `⚑ 3` | Git stash count (hidden if none) |
| `⌂ myproject ⊕wt` | Working directory + worktree indicator if in a non-main worktree |
| `v1.2.0` | Version from `package.json` (hidden if none) |
| `⏱ 3h ago` | Time since last commit |
| `▸ Fixing bug [2/5]` | Active task + progress from Claude's task list |
| `⊙ 2 agents` | Running subagents (hidden if none) |
| `━━━───────── 25%` | Context window usage with color gradient (green → yellow → orange → red → 💀) |

Everything hides gracefully when not applicable — no stashes, no stash indicator. No agents running, no agent count. Clean and minimal by default.

## Install

**One-liner:**

```bash
curl -fsSL https://raw.githubusercontent.com/tikket1/tikket-statusline/main/install.sh | bash
```

**Manual:**

1. Download `statusline.js` to `~/.claude/hooks/`:
   ```bash
   mkdir -p ~/.claude/hooks
   curl -fsSL https://raw.githubusercontent.com/tikket1/tikket-statusline/main/statusline.js -o ~/.claude/hooks/statusline.js
   ```

2. Add to `~/.claude/settings.json`:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node \"~/.claude/hooks/statusline.js\""
     }
   }
   ```

3. Restart Claude Code.

## Uninstall

```bash
rm ~/.claude/hooks/statusline.js
```

Then remove the `"statusLine"` block from `~/.claude/settings.json`.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with statusLine support
- Node.js (ships with Claude Code)
- Git (for branch/stash/worktree indicators)

## License

MIT
