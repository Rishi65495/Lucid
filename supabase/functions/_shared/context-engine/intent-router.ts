import type { ContextIntent, IntentDecision } from "./types.ts";

const RULES: Array<{ intent: ContextIntent; patterns: RegExp[] }> = [
  { intent: "greeting", patterns: [/^(hi|hello|hey|hii|hola|नमस्ते|नमस्कार|हाय|हेलो)[!?.\s]*$/i] },
  { intent: "continue_lesson", patterns: [/(continue|resume|next topic|where did we stop|पिछला पाठ|आगे पढ़|अगला टॉपिक|जहाँ छोड़ा|वहीं से शुरू)/i] },
  { intent: "quiz_generation", patterns: [/(make|create|generate|take|start).{0,40}(quiz|test|mcq|questions)|\bquiz\b|\bmcq\b|क्विज़|टेस्ट बनाओ/i] },
  { intent: "flashcard_generation", patterns: [/(flash ?cards?|कार्ड बनाओ|फ्लैशकार्ड)/i] },
  { intent: "progress_analysis", patterns: [/(my progress|learning progress|progress report|performance|weak areas|mastery|quiz history|मेरी प्रगति|कमज़ोर टॉपिक|प्रदर्शन)/i] },
  { intent: "study_planning", patterns: [/(study plan|timetable|learning plan|schedule|roadmap|पढ़ाई का प्लान|स्टडी प्लान|समय सारणी)/i] },
  { intent: "resource_question", patterns: [/(pdf|document|uploaded file|my notes|this page|page\s*\d+|chapter|syllabus|मेरी पीडीएफ|इस पेज|पेज\s*\d+|नोट्स|दस्तावेज़|अध्याय)/i] },
  { intent: "complex_agent_task", patterns: [/(analy[sz]e|compare|organize|plan|recommend|manage|update|save|complete|विश्लेषण|तुलना|योजना|सुझाव|मैनेज)/i] },
];

const LEVELS: Record<ContextIntent, IntentDecision["level"]> = {
  greeting: 0, general_chat: 0, general_learning: 1, continue_lesson: 2,
  resource_question: 3, quiz_generation: 3, flashcard_generation: 3,
  progress_analysis: 4, study_planning: 5, complex_agent_task: 5,
};

const RETRIEVAL: Record<ContextIntent, IntentDecision["retrieve"]> = {
  greeting: { conversation: false, learnerProfile: false, currentLesson: false, resource: false, mastery: false, goals: false, quizHistory: false, agentTools: false },
  general_chat: { conversation: true, learnerProfile: false, currentLesson: false, resource: false, mastery: false, goals: false, quizHistory: false, agentTools: false },
  general_learning: { conversation: true, learnerProfile: false, currentLesson: false, resource: false, mastery: false, goals: false, quizHistory: false, agentTools: false },
  continue_lesson: { conversation: true, learnerProfile: false, currentLesson: true, resource: false, mastery: false, goals: false, quizHistory: false, agentTools: false },
  resource_question: { conversation: true, learnerProfile: false, currentLesson: false, resource: true, mastery: false, goals: false, quizHistory: false, agentTools: false },
  quiz_generation: { conversation: false, learnerProfile: false, currentLesson: false, resource: true, mastery: false, goals: false, quizHistory: false, agentTools: false },
  flashcard_generation: { conversation: false, learnerProfile: false, currentLesson: false, resource: true, mastery: false, goals: false, quizHistory: false, agentTools: false },
  progress_analysis: { conversation: false, learnerProfile: true, currentLesson: false, resource: false, mastery: true, goals: true, quizHistory: true, agentTools: false },
  study_planning: { conversation: true, learnerProfile: true, currentLesson: true, resource: true, mastery: false, goals: true, quizHistory: false, agentTools: true },
  complex_agent_task: { conversation: true, learnerProfile: false, currentLesson: false, resource: false, mastery: false, goals: false, quizHistory: false, agentTools: true },
};

export function routeIntent(message: string): IntentDecision {
  const normalized = message.trim();
  if (!normalized) return { intent: "general_chat", level: 0, confidence: "high", retrieve: RETRIEVAL.general_chat };

  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      const intent = rule.intent;
      return { intent, level: LEVELS[intent], confidence: "high", retrieve: RETRIEVAL[intent] };
    }
  }

  const looksLikeQuestion = /\?|\b(what|why|how|when|where|who|explain|define|difference)\b|क्यों|कैसे|क्या|समझाओ/i.test(normalized);
  const intent: ContextIntent = looksLikeQuestion ? "general_learning" : "general_chat";
  return { intent, level: LEVELS[intent], confidence: "medium", retrieve: RETRIEVAL[intent] };
}
