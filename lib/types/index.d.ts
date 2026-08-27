/**
 * Master/servant roleplay plugin: persona, time awareness, role memory, and
 * character-specific tools — all in one package.
 *
 * @module dsh-roleplay-master
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
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
