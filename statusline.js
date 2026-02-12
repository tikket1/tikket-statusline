#!/usr/bin/env node
// tikket-statusline — a feature-rich statusline for Claude Code
// https://github.com/tikket1/tikket-statusline

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const git = (cmd, cwd) => {
  try { return execSync(`git ${cmd} 2>/dev/null`, { cwd, timeout: 500 }).toString().trim(); }
  catch { return ''; }
};

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;
    const homeDir = os.homedir();

    const c = {
      reset: '\x1b[0m',
      dim: '\x1b[2m',
      bold: '\x1b[1m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      orange: '\x1b[38;5;208m',
      red: '\x1b[31m',
      blink: '\x1b[5m',
      blue: '\x1b[38;5;75m',
      purple: '\x1b[38;5;141m',
      grey: '\x1b[38;5;242m',
      white: '\x1b[97m',
      pink: '\x1b[38;5;213m',
    };

    const sep = `${c.grey} · ${c.reset}`;
    const parts = [];

    // ◆ Model
    const modelShort = model.replace('Claude ', '');
    parts.push(`${c.purple}◆${c.reset} ${c.dim}${modelShort}${c.reset}`);

    // ⌥ Git branch + dirty + ahead/behind
    const branch = git('rev-parse --abbrev-ref HEAD', dir);
    if (branch) {
      let flags = '';

      // Dirty
      const status = git('status --porcelain', dir);
      if (status) flags += `${c.yellow}*${c.reset}`;

      // Ahead/behind remote
      const upstream = git(`rev-parse --abbrev-ref ${branch}@{upstream}`, dir);
      if (upstream) {
        const ahead = git(`rev-list --count ${upstream}..HEAD`, dir);
        const behind = git(`rev-list --count HEAD..${upstream}`, dir);
        if (ahead && parseInt(ahead) > 0) flags += `${c.green}↑${ahead}${c.reset}`;
        if (behind && parseInt(behind) > 0) flags += `${c.red}↓${behind}${c.reset}`;
      }

      parts.push(`${c.cyan}⌥${c.reset} ${c.dim}${branch}${c.reset}${flags}`);
    }

    // ⚑ Stash count
    const stashList = git('stash list', dir);
    if (stashList) {
      const stashCount = stashList.split('\n').filter(Boolean).length;
      if (stashCount > 0) {
        parts.push(`${c.yellow}⚑${c.reset} ${c.dim}${stashCount}${c.reset}`);
      }
    }

    // ⌂ Directory + worktree indicator
    const dirname = path.basename(dir);
    const mainWorktree = git('worktree list --porcelain', dir);
    let worktreeLabel = '';
    if (mainWorktree) {
      const worktrees = mainWorktree.split('\n\n').filter(Boolean);
      if (worktrees.length > 1) {
        const lines = mainWorktree.split('\n');
        const mainPath = lines[0]?.replace('worktree ', '');
        const realDir = git('rev-parse --show-toplevel', dir);
        if (mainPath && realDir && realDir !== mainPath) {
          worktreeLabel = ` ${c.pink}⊕wt${c.reset}`;
        }
      }
    }
    parts.push(`${c.blue}⌂${c.reset} ${c.dim}${dirname}${c.reset}${worktreeLabel}`);

    // Package version
    try {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version) {
          parts.push(`${c.green}v${pkg.version}${c.reset}`);
        }
      }
    } catch (e) {}

    // ⏱ Last commit age
    const timestamp = git('log -1 --format=%ct', dir);
    if (timestamp) {
      const secs = Math.floor(Date.now() / 1000) - parseInt(timestamp);
      let age;
      if (secs < 60) age = 'just now';
      else if (secs < 3600) age = `${Math.floor(secs / 60)}m ago`;
      else if (secs < 86400) age = `${Math.floor(secs / 3600)}h ago`;
      else if (secs < 604800) age = `${Math.floor(secs / 86400)}d ago`;
      else age = `${Math.floor(secs / 604800)}w ago`;
      parts.push(`${c.grey}⏱ ${age}${c.reset}`);
    }

    // ▸ Current task [done/total]
    const todosDir = path.join(homeDir, '.claude', 'todos');
    if (session && fs.existsSync(todosDir)) {
      try {
        const files = fs.readdirSync(todosDir)
          .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
          .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
          const inProgress = todos.find(t => t.status === 'in_progress');
          const done = todos.filter(t => t.status === 'completed').length;
          const total = todos.length;

          if (inProgress) {
            const label = inProgress.activeForm || inProgress.subject || '';
            parts.push(`${c.magenta}▸${c.reset} ${c.bold}${label}${c.reset} ${c.grey}[${done}/${total}]${c.reset}`);
          } else if (total > 0) {
            parts.push(`${c.green}✓${c.reset} ${c.dim}${done}/${total} tasks${c.reset}`);
          }
        }
      } catch (e) {}
    }

    // ⊙ Active subagents
    const tasksDir = path.join(homeDir, '.claude', 'tasks');
    if (session && fs.existsSync(tasksDir)) {
      try {
        const taskFiles = fs.readdirSync(tasksDir)
          .filter(f => f.startsWith(session) && f.endsWith('.json'));
        let running = 0;
        for (const f of taskFiles) {
          try {
            const task = JSON.parse(fs.readFileSync(path.join(tasksDir, f), 'utf8'));
            if (task.status === 'running') running++;
          } catch (e) {}
        }
        if (running > 0) {
          parts.push(`${c.orange}⊙${c.reset} ${c.dim}${running} agent${running > 1 ? 's' : ''}${c.reset}`);
        }
      } catch (e) {}
    }

    // Context window — gradient bar
    let contextPart = '';
    if (remaining != null) {
      const rawUsed = Math.max(0, Math.min(100, 100 - Math.round(remaining)));
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));
      const segs = 15;
      const filled = Math.round((used / 100) * segs);

      let bar = '';
      for (let i = 0; i < segs; i++) {
        if (i < filled) {
          const pct = i / segs;
          let color;
          if (pct < 0.4) color = c.green;
          else if (pct < 0.6) color = c.yellow;
          else if (pct < 0.8) color = c.orange;
          else color = c.red;
          bar += `${color}━${c.reset}`;
        } else {
          bar += `${c.grey}─${c.reset}`;
        }
      }

      let label;
      if (used < 63) {
        label = `${c.green}${used}%${c.reset}`;
      } else if (used < 81) {
        label = `${c.yellow}${used}%${c.reset}`;
      } else if (used < 95) {
        label = `${c.orange}${used}%${c.reset}`;
      } else {
        label = `${c.blink}${c.red}${used}% 💀${c.reset}`;
      }

      contextPart = `${bar} ${label}`;
    }

    // Strip ANSI codes to measure visible width
    const visLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length;

    const cols = process.stdout.columns || 120;
    const sepVis = 3; // " · "

    // Build output that fits terminal width.
    // Context bar is always kept on the right; left parts are trimmed as needed.
    const contextVis = visLen(contextPart);
    const rightReserve = contextPart ? contextVis + sepVis : 0;
    const maxLeft = cols - rightReserve;

    // Progressively add left parts, dropping from the end if too wide
    let leftStr = '';
    let leftVis = 0;
    for (let i = 0; i < parts.length; i++) {
      const partVis = visLen(parts[i]);
      const addedVis = i === 0 ? partVis : sepVis + partVis;
      if (leftVis + addedVis > maxLeft) break;
      leftStr += (i === 0 ? '' : sep) + parts[i];
      leftVis += addedVis;
    }

    // If even the first part doesn't fit, just truncate
    if (!leftStr && parts.length > 0) {
      leftStr = parts[0];
      leftVis = visLen(parts[0]);
    }

    const output = contextPart ? leftStr + sep + contextPart : leftStr;
    process.stdout.write(output);
  } catch (e) {}
});
