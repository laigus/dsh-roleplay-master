/**
 * Master/servant roleplay plugin: persona, time awareness, role memory, and
 * character-specific tools — all in one package.
 *
 * @module dsh-roleplay-master
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/**
 * 本插件注入上下文时使用的消息来源（`producerKinds` 仅用于测试切换两种宿主形态）。
 * @param producerKinds - 宿主是否要求产生方自有的 source kind（默认按运行时能力判断）。
 * @returns 该宿主接受的 source 记录。
 */
export declare function contextInjectionSource(producerKinds?: boolean): Record<string, unknown>;
export declare const name = "roleplay-master";
export declare const inject: string[];
/** Configures roleplay registration, names, and model-visible context. */
export interface Config {
    /** Whether this host row only advertises the browser client bundle. */
    clientOnly?: boolean;
    /** Master's name. */
    masterName?: string;
    /** Servant's name (the user). */
    servantName?: string;
    /** How often to inject time context, in minutes. 0 = every turn. */
    timeRefreshMinutes?: number;
    /** Whether to suppress the harness identity line. */
    suppressHarnessIdentity?: boolean;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config?: Config): void;
