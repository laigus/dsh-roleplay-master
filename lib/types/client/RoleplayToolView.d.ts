/**
 * Inline tool views for punish_servant and praise_servant.
 * Renders the tool result as styled inline text instead of the default
 * collapsible ToolRow card.
 */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
import type { ReactElement } from 'react';
/** Inline punishment display — styled notice in the chat flow. */
export declare function PunishServantView({ block }: ToolCallViewProps): ReactElement;
/** Inline praise display — lighter styling. */
export declare function PraiseServantView({ block }: ToolCallViewProps): ReactElement;
