#!/bin/bash
# tikket-statusline installer

set -e

HOOK_DIR="$HOME/.claude/hooks"
SETTINGS="$HOME/.claude/settings.json"
SCRIPT_URL="https://raw.githubusercontent.com/tikket1/tikket-statusline/main/statusline.js"
DEST="$HOOK_DIR/statusline.js"

echo "⚡ Installing tikket-statusline..."

# Create hooks dir
mkdir -p "$HOOK_DIR"

# Download the script
if command -v curl &>/dev/null; then
  curl -fsSL "$SCRIPT_URL" -o "$DEST"
elif command -v wget &>/dev/null; then
  wget -qO "$DEST" "$SCRIPT_URL"
else
  echo "Error: curl or wget required"
  exit 1
fi

chmod +x "$DEST"

# Configure Claude Code settings
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

# Check if statusLine is already configured
if grep -q '"statusLine"' "$SETTINGS" 2>/dev/null; then
  echo ""
  echo "⚠  statusLine already configured in $SETTINGS"
  echo "   Replace it manually with:"
  echo ""
  echo '  "statusLine": {'
  echo '    "type": "command",'
  echo "    \"command\": \"node \\\"$DEST\\\"\""
  echo '  }'
  echo ""
else
  # Use node to safely merge into settings JSON
  node -e "
    const fs = require('fs');
    const settings = JSON.parse(fs.readFileSync('$SETTINGS', 'utf8'));
    settings.statusLine = {
      type: 'command',
      command: 'node \"$DEST\"'
    };
    fs.writeFileSync('$SETTINGS', JSON.stringify(settings, null, 2) + '\n');
  "
  echo "✓ Added statusLine to $SETTINGS"
fi

echo "✓ Installed to $DEST"
echo ""
echo "Restart Claude Code to see your new statusline!"
