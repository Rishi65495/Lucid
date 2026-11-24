import { assertEquals } from "jsr:@std/assert";
import { composeContext } from "./context-composer.ts";
import { enforceContextBudget, estimateTokens } from "./token-controller.ts";

Deno.test("context composer excludes learner and resource data at general-learning level", () => {
  const result = composeContext({
    intent: "general_learning",
    userMessage: "Explain neural networks",
    learner: { privateProfile: true },
    resourceChunks: [{ page: 1, text: "private PDF content" }],
    taskData: { internal: true },
  }, 1);

  assertEquals(result.context.userMessage, "Explain neural networks");
  assertEquals("learner" in result.context, false);
  assertEquals("resourceChunks" in result.context, false);
  assertEquals("taskData" in result.context, false);
});

Deno.test("context composer keeps only the latest four conversation turns", () => {
  const history = Array.from({ length: 6 }, (_, i) => ({ role: "user", content: String(i + 1) }));
  const result = composeContext({
    intent: "continue_lesson",
    userMessage: "Continue",
    conversation: history,
    lesson: { title: "Current lesson" },
  }, 2);

  assertEquals(result.context.conversation?.map((turn) => turn.content), ["3", "4", "5", "6"]);
  assertEquals(result.context.lesson?.title, "Current lesson");
});

Deno.test("token estimator and budget controller report oversized context", () => {
  assertEquals(estimateTokens("1234567"), 2);
  const result = enforceContextBudget({ text: "x".repeat(5000) }, 0);
  assertEquals(result.withinBudget, false);
  assertEquals(result.value, null);
});
