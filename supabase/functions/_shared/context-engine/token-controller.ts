import { DEFAULT_CONTEXT_BUDGETS, type ContextBudget, type ContextLevel } from "./types.ts";

/**
 * Conservative preflight estimate only. Use the provider's token counter when
 * available; this estimate is a safety fallback, not an exact tokenizer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export function enforceContextBudget<T>(
  value: T,
  level: ContextLevel,
  budgetOverride?: Partial<ContextBudget>,
): { value: T | null; estimatedTokens: number; budget: ContextBudget; withinBudget: boolean } {
  const budget = { ...DEFAULT_CONTEXT_BUDGETS[level], ...budgetOverride };
  const estimatedTokens = estimateTokens(JSON.stringify(value));
  return {
    value: estimatedTokens <= budget.maxInputTokens ? value : null,
    estimatedTokens,
    budget,
    withinBudget: estimatedTokens <= budget.maxInputTokens,
  };
}
