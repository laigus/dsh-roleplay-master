/**
 * Package-owned invariant companion for `dsh-roleplay-master`.
 * @module dsh-roleplay-master/invariant
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "roleplay-master-invariant";
export declare const inject: string[];
export declare const apply: (ctx: Context) => Promise<() => void>;
