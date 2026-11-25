-- Seed one clearly labelled, source-grounded practice quiz from an existing JavaScript PDF.
-- This is a quiz bank fixture, not a fabricated learner attempt or score.
with existing_quiz as (
  select id from public.quizzes
  where owner_id = '232bd192-e303-491f-8b7d-64d4776ec5a9'::uuid
    and resource_id = '7f2e375c-5855-4aac-b2fe-606dc233a0b7'::uuid
    and title = 'JavaScript Fundamentals · Sample Quiz'
  limit 1
), inserted_quiz as (
  insert into public.quizzes (owner_id, resource_id, quiz_type, title, difficulty, source_context, skippable, milestone_required)
  select
    '232bd192-e303-491f-8b7d-64d4776ec5a9'::uuid,
    '7f2e375c-5855-4aac-b2fe-606dc233a0b7'::uuid,
    'mcq',
    'JavaScript Fundamentals · Sample Quiz',
    'Easy',
    jsonb_build_object(
      'sample_data', true,
      'source_title', 'JS_Learn_Everything',
      'source_resource_ids', jsonb_build_array('7f2e375c-5855-4aac-b2fe-606dc233a0b7'),
      'source_pages', jsonb_build_array(1,2,3,5,6,7,8),
      'note', 'Preloaded practice questions derived from extracted resource text. Not an attempted quiz.'
    ),
    true,
    false
  where not exists (select 1 from existing_quiz)
  returning id
), target_quiz as (
  select id from inserted_quiz
  union all
  select id from existing_quiz
  limit 1
), seed_questions as (
  select * from (values
    (0, 'Which statement correctly describes the scope of let and const in JavaScript?', jsonb_build_array('Function-scoped','Block-scoped','Global-only','Module-only'), 1, 'let and const are block-scoped; var is function-scoped.'),
    (1, 'A const variable stores an object. Which operation is allowed?', jsonb_build_array('Reassign the variable to a new object','Redeclare the same const in the same block','Change a property inside the existing object','Leave the declaration uninitialized'), 2, 'const prevents reassignment of the binding, but object properties can still be mutated.'),
    (2, 'What happens when a var-declared variable is accessed before its declaration is evaluated?', jsonb_build_array('ReferenceError','It evaluates to undefined','It evaluates to null','SyntaxError'), 1, 'var declarations are hoisted and initialized to undefined.'),
    (3, 'What does typeof null return in JavaScript?', jsonb_build_array('null','undefined','object','boolean'), 2, 'typeof null returns object, a longstanding JavaScript quirk.'),
    (4, 'What is the result of the expression "5" + 1?', jsonb_build_array('6','51','4','NaN'), 1, 'The + operator concatenates when one operand is a string, producing "51".')
  ) as q(order_index,prompt,options,answer_index,explanation)
)
insert into public.questions (quiz_id, question_type, prompt, options, answer, explanation, difficulty, order_index)
select tq.id, 'mcq', sq.prompt, sq.options, jsonb_build_object('answer_index', sq.answer_index), sq.explanation, 2, sq.order_index
from target_quiz tq cross join seed_questions sq
where not exists (select 1 from public.questions q where q.quiz_id = tq.id);
