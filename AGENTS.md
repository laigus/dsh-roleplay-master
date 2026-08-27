# AGENTS.md

This repository contains one out-of-tree DeepSeek Harness bundle and its `my-master` user preset.

- Keep the plugin package, `cordis.patch.yml`, preset, scripts, and both READMEs synchronized.
- Do not edit the upstream DeepSeek Harness checkout to load this package.
- Use published package versions for development; do not add machine-specific paths or filesystem-backed dependencies.
- Keep the committed `lib/` runtime entries and declarations synchronized with `src/`; GitHub installation must not require a local build.
- Keep `scripts/install-preset.mjs` and local installation instructions cross-platform.
- Run `pnpm run verify` after source or build configuration changes.
- Preserve UTF-8 for Chinese Markdown and YAML.
