import { assertEquals } from "jsr:@std/assert";
import { routeIntent } from "./intent-router.ts";

Deno.test("greeting uses minimal context", () => {
  const result = routeIntent("Hey!");
  assertEquals(result.intent, "greeting");
  assertEquals(result.level, 0);
  assertEquals(result.retrieve.resource, false);
  assertEquals(result.retrieve.learnerProfile, false);
});

Deno.test("empty message stays lightweight", () => {
  const result = routeIntent("   ");
  assertEquals(result.intent, "general_chat");
  assertEquals(result.level, 0);
});

Deno.test("PDF page request enables resource retrieval", () => {
  const result = routeIntent("Explain page 10 of my PDF");
  assertEquals(result.intent, "resource_question");
  assertEquals(result.retrieve.resource, true);
});

Deno.test("quiz request based on a PDF is classified as quiz generation", () => {
  const result = routeIntent("Create a quiz from my PDF");
  assertEquals(result.intent, "quiz_generation");
  assertEquals(result.retrieve.resource, true);
});

Deno.test("progress analysis enables learner records", () => {
  const result = routeIntent("Analyze my learning progress");
  assertEquals(result.intent, "progress_analysis");
  assertEquals(result.retrieve.mastery, true);
  assertEquals(result.retrieve.quizHistory, true);
});

Deno.test("general learning does not fetch learner database context", () => {
  const result = routeIntent("What is Python?");
  assertEquals(result.intent, "general_learning");
  assertEquals(result.retrieve.learnerProfile, false);
  assertEquals(result.retrieve.resource, false);
});

Deno.test("greeting followed by a question is not treated as greeting", () => {
  const result = routeIntent("Hey, can you explain Python?");
  assertEquals(result.intent, "general_learning");
  assertEquals(result.retrieve.resource, false);
});

Deno.test("Hindi syllabus request is routed to resource retrieval", () => {
  const result = routeIntent("मेरे syllabus का दूसरा chapter समझाओ");
  assertEquals(result.intent, "resource_question");
  assertEquals(result.retrieve.resource, true);
});

Deno.test("continuing a lesson retrieves current lesson only", () => {
  const result = routeIntent("Continue my lesson");
  assertEquals(result.intent, "continue_lesson");
  assertEquals(result.retrieve.currentLesson, true);
  assertEquals(result.retrieve.mastery, false);
});

Deno.test("Hindi progress request enables learner evidence retrieval", () => {
  const result = routeIntent("मेरी प्रगति और कमज़ोर टॉपिक बताओ");
  assertEquals(result.intent, "progress_analysis");
  assertEquals(result.retrieve.learnerProfile, true);
  assertEquals(result.retrieve.mastery, true);
  assertEquals(result.retrieve.quizHistory, true);
});

Deno.test("study planning enables goal and agent context", () => {
  const result = routeIntent("Create a study plan for this week");
  assertEquals(result.intent, "study_planning");
  assertEquals(result.retrieve.goals, true);
  assertEquals(result.retrieve.agentTools, true);
});
