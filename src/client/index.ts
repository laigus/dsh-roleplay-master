/**
 * Client-side registrant for roleplay-master: registers inline tool views
 * for punish_servant and praise_servant into the keyed tool.call.toolview slot.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { PunishServantView, PraiseServantView } from './RoleplayToolView.tsx'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'punish_servant',
  }, PunishServantView))

  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'praise_servant',
  }, PraiseServantView))
}
