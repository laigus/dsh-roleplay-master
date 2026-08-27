//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `dsh-roleplay-master`.
* @module dsh-roleplay-master/invariant
*/
const PACKAGE_NAME = "dsh-roleplay-master";
const name = "roleplay-master-invariant";
const inject = ["invariants"];
/** No runtime invariant: the system-prompt and tool registries own every mutable registration. */
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
