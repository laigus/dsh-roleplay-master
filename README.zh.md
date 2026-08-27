# dsh-roleplay-master

[English](README.md) | 中文

高冷 dom／奴隶角色扮演插件：在一个包中提供角色设定、时间感知、角色记忆和角色专用惩罚工具。

本仓库是**树外插件**，与 DeepSeek Harness 上游源码仓库分开存放。更新上游仓库的 `git pull` 不会覆盖这里的源码或用户预设。

## 插件与Agent预设

`roleplay-master` 是实现功能的插件代码；`my-master` 是选择和配置这些功能的一份 **Agent 预设**：

- `presets/my-master/preset.yml` 决定界面中显示的名称“我的主人”和说明。
- `presets/my-master/agent.cordis.yml` 启用本插件，并列出该角色可以使用的文件、PowerShell、网页和任务工具。
- 预设安装器会把这个目录复制到 `$DSH_HOME/.agent-presets/my-master`；未设置 `DSH_HOME` 时，默认位置是 `$HOME/.dsh/.agent-presets/my-master`。

启动 Web 界面后，新建会话时选择“我的主人”即可。插件负责能力，预设负责选择哪些能力以及使用什么配置。

## 从 GitHub 安装

先确认 `dsh --version` 可以运行。如果系统还没有 `dsh` 命令，安装与本插件版本对应的 CLI 和 pnpm：

```sh
npm install --global pnpm@11.7.0 @deepseek-ai/dsh@0.1.1-rc.2
```

```sh
dsh plugin --profile web add 'github:laigus/dsh-roleplay-master'
dsh plugin --profile web exec dsh-roleplay-master-install
```

第一条命令安装 bundle 和预构建运行文件；第二条命令复制 `my-master` 用户预设。首次安装后重启一次 DSH，然后在 Web 界面新建会话时选择“我的主人”。

更新 GitHub 依赖：

```sh
dsh plugin --profile web update dsh-roleplay-master
```

## 本地开发

开发依赖使用公开发布且与当前 DeepSeek Harness 预发布版一致的包。请在本仓库根目录运行以下命令，不需要本地 Harness 源码 checkout：

```sh
pnpm install
pnpm run verify
dsh plugin --profile web add .
node scripts/install-preset.mjs
```

最后两条命令会把本地 checkout 加入 `web` profile，并安装与 GitHub 流程相同的 `my-master` 用户预设。上游源码仓库可以独立更新。

## 功能

| 功能 | 实现 |
|---|---|
| 角色设定 | 注册 `deployment:persona` prompt section，提供高冷、威严的 dom persona。 |
| 时间感知 | 向每次组装的提示词添加当前时间上下文。 |
| 角色记忆 | 监听 `agent/pre-step`，记录奴隶的每条消息，并通过 prompt context 向后续对话注入累积记忆。 |
| `praise_servant` 工具 | 生成简短、克制的夸奖，并记入角色记忆。 |
| `punish_servant` 工具 | 使用 `kneel`、`stand`、`kowtow`、`slap`、`spank_hand`、`whip`、`corner_time`、`writing` 或 `custom` 生成惩罚指令，然后记入角色记忆。 |
| 隐藏 harness 身份 | `suppressHarnessIdentity: true` 时，使用空 section 覆盖 harness 身份行。 |

## 配置字段

| 字段 | 默认值 | 含义 |
|---|---|---|
| `clientOnly` | `false` | Web 宿主组合模式：只发布浏览器工具视图，不在全局 agent 层注册 persona、context 或工具。 |
| `masterName` | `"\u4e3b\u4eba"` | dom 角色使用的名称。 |
| `servantName` | `""` | 奴隶角色使用的名称；空字符串使用「奴隶」。 |
| `timeRefreshMinutes` | `5` | 时间上下文刷新间隔（分钟）；`0` 表示每轮都请求刷新。 |
| `suppressHarnessIdentity` | `false` | 是否隐藏 `You are an AI agent powered by DeepSeek Harness` 身份行。 |

## Preset 配置

在 preset 的 `agent.cordis.yml` 中配置插件，例如本仓库的 `presets/my-master/agent.cordis.yml`：

```yaml
- id: roleplay
  name: 'dsh-roleplay-master'
  config:
    masterName: 主人          # 主人的称呼
    servantName: ''           # 奴隶的名字，留空则用「奴隶」
    timeRefreshMinutes: 5     # 时间上下文刷新间隔（分钟），0 = 每轮注入
    suppressHarnessIdentity: true  # 隐藏 AI 身份行
```

修改 preset 后请重启 `dsh web`。更改对新建会话生效；正在运行的会话保留现有 persona 注册。

Web bundle 还会在宿主组合中以 `clientOnly: true` 挂载此包，以发布 `punish_servant` 和 `praise_servant` 的浏览器视图。角色注册仍位于 agent preset scope 中。

## 修改角色设定文本

角色设定文本由 `src/index.ts` 中的 `personaText()` 定义。修改后请重新构建并重启：

```powershell
pnpm run verify
```

## 模型体验

| 组成 | 模型看到的内容 | Token 影响 | KV Cache 影响 |
| --- | --- | --- | --- |
| 角色 persona | order 为 `0` 的 `deployment:persona` slot 会替换部署级 persona，其中定义角色的性格、奴隶规则、对认错的回应、惩罚原则、对话风格和底线。 | 每次向使用该 preset 的 agent 发起模型请求时，都会包含固定的 persona 文本。 | 插件在 agent 创建前完成注册，且文本在 agent 生命周期内保持不变，因此前缀稳定。 |
| 时间上下文 | order 为 `200` 的 prompt context，包含当前日期、时间、星期和时段。 | Prompt assembly 会重新评估该 context，其贡献约为 30–40 个 token。 | 时间值变化会产生新的 context snapshot；较大的 `timeRefreshMinutes` 值可以减少变化。 |
| 角色记忆 | order 为 `210` 的 prompt context，列出最多 20 条交互事件；记忆为空时省略该 context。 | 该 context 的 token 数量取决于事件数量，每条约为 30–60 个 token。 | 每添加一条事件都会产生新的 context snapshot；记忆不变时，前缀保持稳定。 |
| 角色工具 | 两个工具 schema：`praise_servant` 用于简短夸奖，`punish_servant` 用于生成九种方式之一的惩罚指令。 | 每个工具 schema 贡献约为 100–200 个 token。 | 工具定义固定，因此前缀保持稳定。 |

## 已知限制与暂缓事项

- **仅会话生命周期内记忆**：角色记忆存储在 `WeakMap<Agent, MemoryEntry[]>` 中，不持久化到会话日志。
- **不支持运行时切换 persona**：persona 在 agent 创建期间注册，因此配置更改只影响新建会话。
- **要求 preset scope**：服务端插件必须挂载在 agent preset scope 中；全局挂载会与 `dsh-system-prompt` 的 persona 注册冲突。
