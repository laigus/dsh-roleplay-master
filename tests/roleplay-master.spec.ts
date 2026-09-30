import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import { createScope, type Scope, type ScopeKey } from '@deepseek-ai/dsh-scope'
import SystemPrompt, { PERSONA_SECTION } from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import * as RoleplayMaster from '../src/index.ts'

interface Harness {
  ctx: Context
  key: ScopeKey
  scope: Scope
}

async function harness(config: RoleplayMaster.Config = {}): Promise<Harness> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt, { persona: 'deployment persona' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  const key: ScopeKey = { agent: 'roleplay-test' }
  const scope = createScope(ctx, key)
  await scope.ctx.plugin(RoleplayMaster, config)
  return { ctx, key, scope }
}

describe('roleplay-master composition', () => {
  it('shadows the persona and publishes its contexts and tools in one agent scope', async () => {
    const { ctx, key, scope } = await harness({
      masterName: 'Test Master',
      servantName: 'Test Servant',
      suppressHarnessIdentity: true,
    })

    const assembly = await ctx.systemPrompt.assemble({ scope: key })
    const persona = assembly.sections.find(section => section.name === PERSONA_SECTION)
    expect(persona?.text).toContain('Test Master')
    expect(persona?.text).toContain('Test Servant')
    expect(assembly.sections.find(section => section.name === 'harness:identity')?.text).toBe('')
    expect(assembly.contexts.find(context => context.name === 'roleplay:time')?.text)
      .toMatch(/^当前时间：\d{4}年\d{2}月\d{2}日 星期[日一二三四五六] \d{2}:\d{2}，/)
    expect(assembly.contexts.find(context => context.name === 'roleplay:memory')?.text).toBe('')
    expect(assembly.tools.map(tool => tool.name)).toEqual(['praise_servant', 'punish_servant'])
    expect(ctx.tools.get('praise_servant')).toBeUndefined()
    expect(ctx.tools.get('praise_servant', key)).toBeDefined()
    expect(ctx.tools.get('punish_servant', key)).toBeDefined()

    await scope.dispose()

    const disposed = await ctx.systemPrompt.assemble({ scope: key })
    expect(disposed.sections.find(section => section.name === PERSONA_SECTION)?.text)
      .toBe('deployment persona')
    expect(ctx.tools.get('praise_servant', key)).toBeUndefined()
    expect(ctx.tools.get('punish_servant', key)).toBeUndefined()
  })

  it('names a message source kind that each host generation admits', () => {
    // 0.2 起会话格式 v4 要求产生方自有的 kind，并明确拒绝通用的 'plugin'
    const producer = RoleplayMaster.contextInjectionSource(true)
    expect(producer.kind).toBe('roleplay-master')
    expect(typeof producer.kind).toBe('string')
    expect(producer.kind).not.toBe('plugin')

    // 0.1.x 的 v3 校验只认包装形态
    const legacy = RoleplayMaster.contextInjectionSource(false)
    expect(legacy).toMatchObject({ kind: 'plugin', plugin: 'dsh-roleplay-master' })
  })

  it('keeps host-only client publication free of server registrations', async () => {
    const { ctx, key, scope } = await harness({ clientOnly: true })

    const assembly = await ctx.systemPrompt.assemble({ scope: key })
    expect(assembly.sections.find(section => section.name === PERSONA_SECTION)?.text)
      .toBe('deployment persona')
    expect(assembly.contexts.some(context => context.name.startsWith('roleplay:'))).toBe(false)
    expect(ctx.tools.get('praise_servant', key)).toBeUndefined()
    expect(ctx.tools.get('punish_servant', key)).toBeUndefined()

    await scope.dispose()
  })
})
