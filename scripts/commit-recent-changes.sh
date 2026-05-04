#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

files=(
  "src/modules/dashboard/actions/index.ts"
)

echo "Validando TypeScript..."
npx tsc --noEmit

echo "Preparando cambios recientes..."
git add "${files[@]}"

echo "Diff staged:"
git diff --cached --stat

git commit -m "fix: revalidate dashboard after transaction changes"

echo "Commit creado."
