import type { ContextBudget, ContextLevel } from "./types.ts";
import { DEFAULT_CONTEXT_BUDGETS } from "./types.ts";

export interface ContextEnvelope {
  intent: string;
  userMessage: string;
  conversation?: Array<{ role: string; content: string }>;
  learner?: Record<string, unknown>;
  lesson?: Record<string, unknown>;
  resourceChunks?: Array<{ page?: number; text: string; score?: number }>;
  taskData?: Record<string, unknown>;
}

export function composeContext(input: ContextEnvelope, level: ContextLevel): {
  context: ContextEnvelope;
  budget: ContextBudget;
} {
  const budget = DEFAULT_CONTEXT_BUDGETS[level];
  const context: ContextEnvelope = {
    intent: input.intent,
    userMessage: input.userMessage,
  };

  if (level >= 2 && input.conversation?.length) {
    context.conversation = input.conversation.slice(-4);
  }
  if (input.learner && (level === 4 || level === 5)) context.learner = input.learner;
  if (input.lesson && (level === 2 || level === 5)) context.lesson = input.lesson;
  if (input.resourceChunks?.length && level >= 3) {
    context.resourceChunks = input.resourceChunks.slice(0, 5);
  }
  if (input.taskData && level >= 4) context.taskData = input.taskData;

  return { context, budget };
}
