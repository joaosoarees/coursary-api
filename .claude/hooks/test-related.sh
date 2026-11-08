#!/usr/bin/env bash
# Exit 2 hands the failing output back to Claude; any other code would only be logged.
file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')
case "$file" in "$CLAUDE_PROJECT_DIR"/*.ts|"$CLAUDE_PROJECT_DIR"/*.tsx) ;; *) exit 0 ;; esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(pnpm exec vitest related "$file" --run --passWithNoTests --project unit 2>&1); then
  echo "$out" | tail -40 >&2
  exit 2
fi
