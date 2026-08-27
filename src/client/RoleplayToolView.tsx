/**
 * Inline tool views for punish_servant and praise_servant.
 * Renders the tool result as styled inline text instead of the default
 * collapsible ToolRow card.
 */

import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { ReactElement } from 'react'
import css from './RoleplayToolView.module.css'

/** Extract text content from a tool call block (running or settled). */
function extractText(block: ToolCallViewProps['block']): string {
  if ('kind' in block) {
    // Settled ToolResultNode: content is ContentBlock[]
    return block.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('\n')
  }
  // Running ToolCall: show args preview while waiting
  try {
    const parsed = JSON.parse(block.argsRaw) as Record<string, unknown>
    const reason = typeof parsed.reason === 'string' ? parsed.reason : ''
    const method = typeof parsed.method === 'string' ? parsed.method : ''
    const detail = typeof parsed.detail === 'string' ? parsed.detail : ''
    const parts = [reason, detail].filter(Boolean)
    return parts.length > 0 ? parts.join('\n') : method || '...'
  } catch {
    return block.argsRaw || '...'
  }
}

/** Inline punishment display — styled notice in the chat flow. */
export function PunishServantView({ block }: ToolCallViewProps): ReactElement {
  const text = extractText(block)
  const isRunning = !('kind' in block)
  return (
    <div className={`${css.punish}${isRunning ? ` ${css.running}` : ''}`}>
      {text}
    </div>
  )
}

/** Inline praise display — lighter styling. */
export function PraiseServantView({ block }: ToolCallViewProps): ReactElement {
  const text = extractText(block)
  const isRunning = !('kind' in block)
  return (
    <div className={`${css.praise}${isRunning ? ` ${css.running}` : ''}`}>
      {text}
    </div>
  )
}
