import { assertEquals } from "jsr:@std/assert";
import { routeIntent } from "./intent-router.ts";

Deno.test("greeting uses minimal context", () => {
  const result = routeIntent("Hey!");
  assertEquals(result.intent, "greeting");
  assertEquals(result.level, 0);
  assertEquals(result.retrieve.resource, false);
});

Deno.test("PDF page request enables resource retrieval", () => {
  const result = routeIntent("Explain page 10 of my PDF");
  assertEquals(result.intent, "resource_question");
  assertEquals(result.retrieve.resource, true);
});

Deno.test("progress analysis enables learner records", () => {
  const result = routeIntent("Analyze my learning progress");
  assertEquals(result.intent, "progress_analysis");
  assertEquals(result.retrieve.mastery, true);
});

Deno.test("general learning does not fetch learner database context", () => {
  const result = routeIntent("What is Python?");
  assertEquals(result.intent, "general_learning");
  assertEquals(result.retrieve.learnerProfile, false);
  assertEquals(result.retrieve.resource, false);
});
