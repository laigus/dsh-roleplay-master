# dsh-roleplay-master

English | [中文](README.zh.md)

A reserved dominant/servant roleplay plugin that provides the persona, time awareness, role memory, and character-specific punishment tools in one package.

This is an **out-of-tree plugin repository**, separate from the upstream DeepSeek Harness checkout. Pulling upstream changes does not overwrite this source or its user preset.

## Plugin and Agent preset

`roleplay-master` is the plugin implementation. `my-master` is an **Agent preset** that selects and configures it:

- `presets/my-master/preset.yml` supplies the “我的主人” display name and description.
- `presets/my-master/agent.cordis.yml` mounts this plugin and lists the filesystem, PowerShell, Web, and job tools available to the role.
- The preset installer writes whichever form the host reads:

  | Host | Preset form | Install location |
  |---|---|---|
  | 0.1.x | directory (`preset.yml` + `agent.cordis.yml`) | `$DSH_HOME/.agent-presets/my-master` |
  | 0.2+ | cordis patch row: `@deepseek-ai/dsh-agent-preset`, whose `config.plugins` holds the same rows as `agent.cordis.yml` | the target profile's `cordis.patch.yml` (when run inside the profile directory), else `$DSH_HOME/cordis.patch.yml` |

  The installer auto-detects the host form; when detection cannot decide (for example the desktop host's packages live inside `app.asar`, which an ordinary process cannot resolve), pass `--preset-format rows` (0.2+) or `--preset-format dir` (0.1.x). `DSH_HOME` is shared by every profile, so a 0.2 install deliberately leaves the 0.1.x directory in place — it is inert on a 0.2 host.

Choose “我的主人” when creating a Web session (restart DSH once after installing on 0.2). The plugin provides behavior; the preset chooses its configuration and companion tools.

## Install from GitHub

First confirm that `dsh --version` runs successfully. If the `dsh` command is not installed, install the CLI and pnpm versions used by this plugin:

```sh
npm install --global pnpm@11.7.0 @deepseek-ai/dsh@0.2.0-rc.2
```

The plugin supports both 0.1.x and 0.2.x hosts (see “Host version compatibility”); the pin above matches the current desktop build — install the version that matches your host.

```sh
dsh plugin --profile web add 'github:laigus/dsh-roleplay-master'
dsh plugin --profile web exec dsh-roleplay-master-install
```

The first command installs the bundle and its prebuilt runtime entries. The second command copies the `my-master` user preset. Restart DSH once after the first installation, then choose “我的主人” when creating a Web session.

Update the GitHub dependency with:

```sh
dsh plugin --profile web update dsh-roleplay-master
```

## Local development

Development dependencies use published packages pinned to the same DeepSeek Harness prerelease. Run these commands from the repository root; no local Harness checkout is required:

```sh
pnpm install
pnpm run verify
dsh plugin --profile web add .
node scripts/install-preset.mjs
```

The last two commands add the local checkout to the `web` profile and install the same `my-master` user preset used by the GitHub flow. The upstream checkout can be updated independently.

## Features

| Feature | Implementation |
|---|---|
| Persona | Registers a prompt section at the service-owned persona placement — `deployment:persona` (`DEPLOYMENT_PERSONA`) on 0.1.x, `deployment:persona-prefix` (`DEPLOYMENT_PERSONA_PREFIX`) on 0.2+ — with a reserved, authoritative dominant persona. |
| Time awareness | Adds the current time context to each assembled prompt. |
| Role memory | Listens for `agent/pre-step`, records each servant message, and adds the accumulated memory to later prompt context. |
| `praise_servant` tool | Produces brief, restrained praise and records it in role memory. |
| `punish_servant` tool | Produces a punishment instruction using `kneel`, `stand`, `kowtow`, `slap`, `spank_hand`, `whip`, `corner_time`, `writing`, or `custom`, then records it in role memory. |
| Hidden harness identity | When `suppressHarnessIdentity: true`, shadows the harness identity line at the service-owned `HARNESS_IDENTITY` placement with an empty section. |

## Configuration fields

| Field | Default | Meaning |
|---|---|---|
| `clientOnly` | `false` | Web host composition mode that publishes only the browser tool views without registering the persona, contexts, or tools on the global agent layer. |
| `masterName` | `"\u4e3b\u4eba"` | Name used for the dominant role. |
| `servantName` | `""` | Name used for the servant role; an empty string uses `\u5974\u96b6`. |
| `timeRefreshMinutes` | `5` | Time-context refresh interval in minutes; `0` requests refresh on every turn. |
| `suppressHarnessIdentity` | `false` | Whether to hide the `You are an AI agent powered by DeepSeek Harness` identity line. |

## Preset configuration

Configure the plugin in a preset's `agent.cordis.yml`, such as this repository's `presets/my-master/agent.cordis.yml`:

```yaml
- id: roleplay
  name: 'dsh-roleplay-master'
  config:
    masterName: 主人          # 主人的称呼
    servantName: ''           # 奴隶的名字，留空则用「奴隶」
    timeRefreshMinutes: 5     # 时间上下文刷新间隔（分钟），0 = 每轮注入
    suppressHarnessIdentity: true  # 隐藏 AI 身份行
```

Restart `dsh web` after changing the preset. The change applies to newly created sessions; running sessions retain their existing persona registration.

The Web bundle also mounts this package with `clientOnly: true` in the host composition to publish the browser views for `punish_servant` and `praise_servant`. The role registration remains in the agent preset scope.

## Editing the persona text

The persona text is defined by `personaText()` in `src/index.ts`. Rebuild and restart after editing it:

```powershell
pnpm run verify
```

## Model Experience

| Component | What the model sees | Token effect | KV Cache effect |
| --- | --- | --- | --- |
| Role persona | The persona section name and order key are resolved per host version (0.2+: `deployment:persona-prefix` / `DEPLOYMENT_PERSONA_PREFIX`; 0.1.x: `deployment:persona` / `DEPLOYMENT_PERSONA`; order `0` on both) and replace the deployment persona. It defines the role's temperament, servant rules, response to apologies, punishment rules, dialogue style, and limits. | The fixed persona text is included in every model request for an agent using this preset. | The prefix is stable because the plugin registers before agent creation and the text remains unchanged for the agent lifetime. |
| Time context | A prompt context at order `200` contains the current date, time, weekday, and part of day. | Prompt assembly reevaluates the context, which contributes approximately 30–40 tokens. | A changed time value produces a new context snapshot. Larger `timeRefreshMinutes` values reduce changes. |
| Role memory | A prompt context at order `210` lists up to 20 interaction events. It is omitted when the memory is empty. | The contribution depends on the number of events and is approximately 30–60 tokens per event. | Each added event produces a new context snapshot. The prefix remains stable while memory is unchanged. |
| Role tools | Two tool schemas: `praise_servant` for brief praise and `punish_servant` for punishment instructions using one of nine methods. | Each tool schema contributes approximately 100–200 tokens. | The tool definitions are fixed, so their prefix remains stable. |

## Host version compatibility

`@deepseek-ai/dsh-system-prompt` exposes different persona constants across versions: 0.1.x has only `PERSONA_SECTION` (`deployment:persona`), while 0.2 split it into `PERSONA_PREFIX_SECTION` / `PERSONA_SUFFIX_SECTION` (`deployment:persona-prefix` / `deployment:persona-suffix`). Under ESM, importing a named export that the host does not provide fails at **link time**; the host reports only `failed to import` and logs nothing to the console, so the plugin silently stops working.

`src/index.ts` therefore uses a **namespace import plus runtime fallback**: the section name and order key are resolved defensively (`sectionOrder()` tries the new key, then the legacy key, then a fallback), so one `lib/` build loads on both 0.1.x and 0.2.x.

> Development dependencies still point at `0.1.2-alpha.2`; bumping them to the host's `0.2.0-rc.2` is pending and affects type checking only, not runtime compatibility.

Agent presets changed shape as well: 0.1.x reads a `$DSH_HOME/.agent-presets/<name>/{preset.yml,agent.cordis.yml}` directory, while 0.2+ declares each preset as a cordis patch row (`@deepseek-ai/dsh-agent-preset`, with the former `agent.cordis.yml` rows under `config.plugins`; the registry config now holds only `default`/`selectedDefault`, with no `roots`). The installer therefore has to pick the form the host reads — see “Plugin and Agent preset”.

## Known Limitations and Deferred Work

- **Session-lifetime memory** — role memory is held in `WeakMap<Agent, MemoryEntry[]>` and is not persisted to the session log.
- **No runtime persona switching** — the persona registers during agent creation, so configuration changes affect only newly created sessions.
- **Preset scope required** — the server-side plugin must be mounted in an agent preset scope; global mounting conflicts with the persona registration from `dsh-system-prompt`.
