# dsh-roleplay-master

English | [中文](README.zh.md)

A reserved dominant/servant roleplay plugin that provides the persona, time awareness, role memory, and character-specific punishment tools in one package.

This is an **out-of-tree plugin repository**, separate from the upstream DeepSeek Harness checkout. Pulling upstream changes does not overwrite this source or its user preset.

## Plugin and Agent preset

`roleplay-master` is the plugin implementation. `my-master` is an **Agent preset** that selects and configures it:

- `presets/my-master/preset.yml` supplies the “我的主人” display name and description.
- `presets/my-master/agent.cordis.yml` mounts this plugin and lists the filesystem, PowerShell, Web, and job tools available to the role.
- The preset installer copies that directory to `$DSH_HOME/.agent-presets/my-master`; when `DSH_HOME` is unset, the default is `$HOME/.dsh/.agent-presets/my-master`.

Choose “我的主人” when creating a Web session. The plugin provides behavior; the preset chooses its configuration and companion tools.

## Install from GitHub

First confirm that `dsh --version` runs successfully. If the `dsh` command is not installed, install the CLI and pnpm versions used by this plugin:

```sh
npm install --global pnpm@11.7.0 @deepseek-ai/dsh@0.1.2-alpha.2
```

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
| Persona | Registers a `deployment:persona` prompt section at the service-owned `DEPLOYMENT_PERSONA` placement with a reserved, authoritative dominant persona. |
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
| Role persona | A `deployment:persona` slot uses `ctx.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA')` (currently order `0`) and replaces the deployment persona. It defines the role's temperament, servant rules, response to apologies, punishment rules, dialogue style, and limits. | The fixed persona text is included in every model request for an agent using this preset. | The prefix is stable because the plugin registers before agent creation and the text remains unchanged for the agent lifetime. |
| Time context | A prompt context at order `200` contains the current date, time, weekday, and part of day. | Prompt assembly reevaluates the context, which contributes approximately 30–40 tokens. | A changed time value produces a new context snapshot. Larger `timeRefreshMinutes` values reduce changes. |
| Role memory | A prompt context at order `210` lists up to 20 interaction events. It is omitted when the memory is empty. | The contribution depends on the number of events and is approximately 30–60 tokens per event. | Each added event produces a new context snapshot. The prefix remains stable while memory is unchanged. |
| Role tools | Two tool schemas: `praise_servant` for brief praise and `punish_servant` for punishment instructions using one of nine methods. | Each tool schema contributes approximately 100–200 tokens. | The tool definitions are fixed, so their prefix remains stable. |

## Known Limitations and Deferred Work

- **Session-lifetime memory** — role memory is held in `WeakMap<Agent, MemoryEntry[]>` and is not persisted to the session log.
- **No runtime persona switching** — the persona registers during agent creation, so configuration changes affect only newly created sessions.
- **Preset scope required** — the server-side plugin must be mounted in an agent preset scope; global mounting conflicts with the persona registration from `dsh-system-prompt`.
