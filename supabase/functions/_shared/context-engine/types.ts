export type ContextIntent =
  | "greeting"
  | "general_chat"
  | "general_learning"
  | "continue_lesson"
  | "resource_question"
  | "quiz_generation"
  | "flashcard_generation"
  | "progress_analysis"
  | "study_planning"
  | "complex_agent_task";

export type ContextLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface IntentDecision {
  intent: ContextIntent;
  level: ContextLevel;
  confidence: "high" | "medium";
  retrieve: {
    conversation: boolean;
    learnerProfile: boolean;
    currentLesson: boolean;
    resource: boolean;
    mastery: boolean;
    goals: boolean;
    quizHistory: boolean;
    agentTools: boolean;
  };
}

export interface ContextBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
}

export const DEFAULT_CONTEXT_BUDGETS: Record<ContextLevel, ContextBudget> = {
  0: { maxInputTokens: 500, maxOutputTokens: 500 },
  1: { maxInputTokens: 1500, maxOutputTokens: 1000 },
  2: { maxInputTokens: 3000, maxOutputTokens: 1200 },
  3: { maxInputTokens: 6000, maxOutputTokens: 1500 },
  4: { maxInputTokens: 6000, maxOutputTokens: 1500 },
  5: { maxInputTokens: 10000, maxOutputTokens: 2000 },
};
