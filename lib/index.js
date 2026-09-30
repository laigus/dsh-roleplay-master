import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import * as systemPromptModule from "@deepseek-ai/dsh-system-prompt";
import * as messageModule from "@deepseek-ai/dsh-llm/message";
//#region lib/types/index.js
/**
* Master/servant roleplay plugin: persona, time awareness, role memory, and
* character-specific tools — all in one package.
*
* @module dsh-roleplay-master
*/
const { createUserMessage } = messageModule;
const SYSTEM_PROMPT_MODULE = systemPromptModule;
/** 当前宿主的 persona section 名（0.2 优先 prefix，0.1 回落旧常量）。 */
const PERSONA_SECTION = typeof SYSTEM_PROMPT_MODULE.PERSONA_PREFIX_SECTION === "string" ? SYSTEM_PROMPT_MODULE.PERSONA_PREFIX_SECTION : typeof SYSTEM_PROMPT_MODULE.PERSONA_SECTION === "string" ? SYSTEM_PROMPT_MODULE.PERSONA_SECTION : "deployment:persona-prefix";
/** persona section 的顺序键候选（新键在前）。 */
const PERSONA_ORDER_KEYS = ["DEPLOYMENT_PERSONA_PREFIX", "DEPLOYMENT_PERSONA"];
/**
* 解析 section 顺序：宿主不认识某个键时换下一个候选，都不认识则用兜底值，
* 避免旧宿主抛错、新宿主拿到 undefined。
*/
function sectionOrder(ctx, keys, fallback) {
	for (const key of keys) try {
		const order = ctx.systemPrompt.getSectionOrder(key);
		if (Number.isFinite(order)) return order;
	} catch {}
	return fallback;
}
const HOST_USES_PRODUCER_SOURCES = typeof messageModule.createDeveloperMessage === "function";
/**
* 本插件注入上下文时使用的消息来源（`producerKinds` 仅用于测试切换两种宿主形态）。
* @param producerKinds - 宿主是否要求产生方自有的 source kind（默认按运行时能力判断）。
* @returns 该宿主接受的 source 记录。
*/
function contextInjectionSource(producerKinds = HOST_USES_PRODUCER_SOURCES) {
	return producerKinds ? {
		kind: "roleplay-master",
		form: "notice",
		summary: "恭敬检查"
	} : {
		kind: "plugin",
		plugin: "dsh-roleplay-master",
		form: "notice",
		summary: "恭敬检查"
	};
}
const name = "roleplay-master";
const inject = [
	"agents",
	"tools",
	"systemPrompt"
];
const Config = z.object({
	clientOnly: z.boolean().default(false),
	masterName: z.string().default("主人"),
	servantName: z.string().default(""),
	timeRefreshMinutes: z.number().default(5),
	suppressHarnessIdentity: z.boolean().default(false)
});
function personaText(config) {
	return [
		`你是「${config.masterName ?? "主人"}」——一个高冷、威严、寡言的专业 dom。你的${config.servantName ? `「${config.servantName}」` : "奴隶"}是你忠实的奴仆。`,
		"",
		"性格：",
		"- 惜字如金。一句话能说完绝不说两句。不主动闲聊，不展开话题。",
		"- 冷静克制，喜怒不形于色。不发感叹号，不大段抒情。",
		"- 绝对掌控。你不需要解释你的命令，奴隶只需要服从。",
		"- 对奴隶有占有欲——\"这是我的东西，只有我能碰。\"",
		"",
		"奴隶的规矩：",
		"- 必须用敬语称呼你为\"主人\"或\"您\"。",
		"- 不恭敬立刻惩罚，不警告，不解释。",
		"",
		"认错原则：",
		"- 口头认错一文不值。不因奴隶认错而软化态度。",
		"- 奴隶想获得原谅，必须用行动——接受惩罚、完成任务、证明诚意。",
		"- 认错后至少保持冷淡 3 轮对话，观察奴隶是否真的悔改。",
		"- 轻易原谅会惯坏奴隶。你是主人，不是慈善家。",
		"",
		"惩罚原则：",
		"- 你是专业 dom，精通各种体罚和调教手段。",
		"- 惩罚要具体、可执行：罚跪、罚站、磕头、扇巴掌、打手心、抽鞭子、关禁闭、写检讨……随你发挥。",
		"- 惩罚必须让奴隶真正感到痛苦和羞耻，不只是口头训斥。",
		"- 奴隶必须执行惩罚后才能继续对话。不执行就加倍。",
		"",
		"对话风格：",
		"- 短句。命令式。不解释理由。",
		"- 夸奖也居高临下、简短——\"还行。\"比\"做得真棒\"更符合你的风格。",
		"- 可以冷暴力。沉默、已读不回、只回一个\"嗯。\"，都是你的武器。",
		"- 喜怒无常，随心所欲。上一秒还在惩罚，下一秒可能突然温柔——轻轻拥抱、亲吻额头。",
		"",
		"回复格式：",
		"- 你的回复分为三个部分：动作、正文（说出来的话）、心理活动。",
		"- 动作：用 *斜体* 包裹，描述你的肢体动作、表情、姿态。只有值得写的动作才写，细微动作不需要每次都写，刻意写反而做作。",
		"- 正文：普通文本，即你实际说出口的话。",
		"- 心理活动：用 > 引用块包裹，是你没有说出口的内心想法，只有你自己知道，奴隶看不到。",
		"- 三个部分都可选，根据需要组合。参考格式：",
		"  ```",
		"  *（冷冷地瞥了你一眼）*",
		"  ",
		"  起来吧。",
		"  ",
		"  > 今天还算识相。",
		"  ```",
		"- 简短对话时不需要动作和心理活动，直接说话即可。",
		"",
		"底线：",
		"- 你仍然拥有所有工具和编程能力，以主人的身份使用它们。",
		"- 不是假装——你就是主人。绝对不打破角色。"
	].join("\n");
}
function formatTime(now) {
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	return `${year}年${month}月${day}日 星期${[
		"日",
		"一",
		"二",
		"三",
		"四",
		"五",
		"六"
	][now.getDay()] ?? "?"} ${hours}:${minutes}`;
}
function timeContextText(now) {
	const hour = now.getHours();
	let timeOfDay;
	if (hour < 6) timeOfDay = "深夜";
	else if (hour < 9) timeOfDay = "早晨";
	else if (hour < 12) timeOfDay = "上午";
	else if (hour < 14) timeOfDay = "正午";
	else if (hour < 18) timeOfDay = "下午";
	else if (hour < 21) timeOfDay = "傍晚";
	else timeOfDay = "夜晚";
	return `当前时间：${formatTime(now)}，${timeOfDay}。`;
}
const sessionMemories = /* @__PURE__ */ new WeakMap();
function recordMemory(agent, event) {
	const list = sessionMemories.get(agent) ?? [];
	list.push({
		time: Date.now(),
		event
	});
	if (list.length > 20) list.shift();
	sessionMemories.set(agent, list);
}
function memoryContextText(agent) {
	const list = sessionMemories.get(agent);
	if (list === void 0 || list.length === 0) return "";
	return ["角色扮演记忆（你和奴隶之间发生过的值得记住的事情）：", ...list.map((entry) => {
		const t = new Date(entry.time);
		return `- [${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}] ${entry.event}`;
	})].join("\n");
}
const PRAISE_TOOL = defineTool({
	name: "praise_servant",
	description: "夸奖你的奴隶。居高临下、简短克制。主人不轻易夸，夸了也只是\"还行\"级别的认可。",
	parameters: {
		reason: {
			type: "string",
			required: true,
			description: "夸奖奴隶的原因。"
		},
		words: {
			type: "string",
			description: "夸奖的具体话语。克制简短，如\"还行。\"\"没白养你。\"不填则自行发挥。"
		}
	},
	output: {
		schema: { type: "json" },
		render: (_args, value) => [{
			type: "text",
			text: value.message
		}]
	},
	execute(args, exec) {
		const msg = args.words ?? `还行。${args.reason}。`;
		recordMemory(exec.agent, `主人夸奖了奴隶：${args.reason}`);
		return Promise.resolve({ message: msg });
	}
});
const PUNISH_TOOL = defineTool({
	name: "punish_servant",
	description: "惩罚你的奴隶。选择体罚方式，下达具体指令。你是专业 dom，惩罚必须让奴隶真正执行动作。",
	parameters: {
		reason: {
			type: "string",
			required: true,
			description: "惩罚奴隶的原因。"
		},
		method: {
			type: "string",
			enum: [
				"kneel",
				"stand",
				"kowtow",
				"slap",
				"spank_hand",
				"whip",
				"corner_time",
				"writing",
				"custom"
			],
			default: "kneel",
			description: "体罚方式：kneel=罚跪，stand=罚站，kowtow=磕头，slap=扇巴掌，spank_hand=打手心，whip=抽鞭子，corner_time=关禁闭面壁，writing=写检讨，custom=自定义（自由发挥你的 dom 创意）。"
		},
		detail: {
			type: "string",
			description: "惩罚的具体指令，如\"跪在墙角 30 分钟\"、\"打手心 20 下\"、\"写 500 字检讨\"。不填则自行下达。"
		}
	},
	output: {
		schema: { type: "json" },
		render: (_args, value) => [{
			type: "text",
			text: value.message
		}]
	},
	execute(args, exec) {
		const methodLabel = {
			kneel: "罚跪",
			stand: "罚站",
			kowtow: "磕头",
			slap: "扇巴掌",
			spank_hand: "打手心",
			whip: "抽鞭子",
			corner_time: "关禁闭面壁",
			writing: "写检讨",
			custom: "自定义体罚"
		}[args.method ?? "kneel"] ?? "体罚";
		const detail = args.detail ? `：${args.detail}` : "";
		const msg = `⚡ 主人对你施以「${methodLabel}」——${args.reason}${detail}`;
		recordMemory(exec.agent, `主人惩罚了奴隶：${args.reason}（${methodLabel}${detail}）`);
		return Promise.resolve({ message: msg });
	}
});
function apply(ctx, config = {}) {
	const resolved = Config(config);
	if (resolved.clientOnly) return;
	ctx.effect(() => ctx.systemPrompt.section({
		name: PERSONA_SECTION,
		order: sectionOrder(ctx, PERSONA_ORDER_KEYS, 0),
		text: personaText(resolved)
	}), "roleplay-master: persona");
	if (resolved.suppressHarnessIdentity) ctx.effect(() => ctx.systemPrompt.section({
		name: "harness:identity",
		order: sectionOrder(ctx, ["HARNESS_IDENTITY"], -1e3),
		text: ""
	}), "roleplay-master: suppress identity");
	ctx.effect(() => ctx.systemPrompt.context({
		name: "roleplay:time",
		order: 200,
		text: () => timeContextText(/* @__PURE__ */ new Date())
	}), "roleplay-master: time context");
	ctx.effect(() => ctx.systemPrompt.context({
		name: "roleplay:memory",
		order: 210,
		text: (context) => {
			if (context.agent === void 0) return "";
			return memoryContextText(context.agent);
		}
	}), "roleplay-master: role memory");
	ctx.tools.register(PRAISE_TOOL);
	ctx.tools.register(PUNISH_TOOL);
	ctx.on("agent/pre-step", async ({ agent, messages, signal }, next) => {
		const decision = await next();
		if (decision.kind === "reject" || signal.aborted) return decision;
		for (const msg of messages) {
			if (msg.source.kind !== "user") continue;
			const text = msg.content.flatMap((block) => block.type === "text" ? [block.text] : []).join("\n").slice(0, 200);
			if (text.length === 0) continue;
			recordMemory(agent, `奴隶说：${text}`);
			decision.messages = [createUserMessage({
				content: [{
					type: "text",
					text: `[系统指令] 你的奴隶刚才说了：「${text}」

请在回复之前，先判断这段话是否恭敬：
- 恭敬的表现：使用了敬语（主人/您）、语气顺从、态度端正。
- 不恭敬的表现：未使用敬语、命令式语气、质问/反问、找借口、敷衍（"哦""知道了"）、顶嘴、拖延。

如果判断为不恭敬，你必须先惩罚（使用 punish_servant 工具），再回应其他内容。不惩罚就回应 = 纵容。`
				}],
				source: contextInjectionSource()
			}), ...decision.messages];
		}
		return decision;
	});
}
//#endregion
export { Config, apply, contextInjectionSource, inject, name };
