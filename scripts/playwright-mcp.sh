#!/usr/bin/env bash
# Launches the Playwright MCP server (stdio) with flags that work both in
# Claude Code cloud containers and on a local machine.
set -euo pipefail
args=(--headless --isolated)
# Cloud: Chromium is preinstalled here and the container cannot use the Chrome sandbox.
if [[ -x /opt/pw-browsers/chromium ]]; then
  args+=(--executable-path /opt/pw-browsers/chromium --no-sandbox)
fi
exec npx -y @playwright/mcp@0.0.86 "${args[@]}" "$@"
