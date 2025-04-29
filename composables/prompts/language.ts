export type LanguageLevelQuestion = {
  level: string,
  question: string,
  answers: {
    basic: string,
    average: string,
    advanced: string
  },
  userAnswer: string,
};

const levelDescriptions: Record<string, string> = {
  A1: `
Knowledge: Understand and use everyday expressions; introduce yourself and others; ask and answer basic personal questions.
Grammar: Use simple sentence structures; present tense; basic verb conjugations; articles and simple pronouns.
Vocabulary: Personal information (name, nationality, age), basic numbers, common everyday objects, simple family terms.
  `,
  A2: `
Knowledge: Describe daily routines, shopping experiences, immediate environment; talk about past activities and future plans at a basic level.
Grammar: Use present continuous, simple past, modal verbs for ability, comparatives and superlatives.
Vocabulary: Food and drink, clothing, places in the city, simple emotional states, basic travel and direction terms.
  `,
  B1: `
Knowledge: Handle travel and work situations; describe experiences, dreams, hopes, and ambitions; explain reasons and opinions simply.
Grammar: Present perfect, simple future forms, modal verbs (e.g., should, must), first conditional, basic reported speech.
Vocabulary: Work-related terms, hobbies and leisure, environmental topics, feelings and basic abstract terms.
  `,
  B2: `
Knowledge: Understand the main ideas of complex texts; discuss and argue about familiar and abstract topics; express and justify viewpoints in detail.
Grammar: Passive voice, second conditional, relative clauses, advanced modal structures.
Vocabulary: News and current affairs, science and technology topics, nuanced emotional expressions, everyday idiomatic expressions.
  `,
  C1: `
Knowledge: Understand a wide range of demanding, longer texts; produce clear, well-structured, detailed speech and writing on complex subjects; use language flexibly and effectively for social, academic, and professional purposes.
Grammar: Mixed conditional structures, inversion for emphasis, cleft sentences, complex reported speech.
Vocabulary: Academic and professional terminology, nuanced emotional and abstract vocabulary, cultural references, complex idiomatic language.
  `,
  C2: `
Knowledge: Easily understand virtually everything heard or read; summarize information from different spoken and written sources; express yourself spontaneously, fluently, and precisely, even in highly complex situations.
Grammar: Full mastery of all grammatical structures, including stylistic and rhetorical variations; shifts between formal and informal registers.
Vocabulary: Specialized and technical vocabulary (e.g., legal, scientific); subtle differences in word meaning and usage; creative language use including idioms, metaphors, and irony.
  `
};

const getLevelDescription = (level: string): string => levelDescriptions[level] || "";

const generateSystem = (language: string, level: string): string => `
Generate 3 questions for ${level} of the CEFR (A1–C2) in ${language}.

${level} is described as follows: ${getLevelDescription(level)}

For each question, provide 3 sample answers:
- basic: a basic answer showing understanding but limited ability
- average: an answer matching the expected level
- advanced: an answer matching a higher level

The purpose of the questions is to assess the student's ability to communicate in ${language} at ${level} level.

Return the result in a JSON format with the following structure:
{ 
  "level": "${level}",
  "questions": [
    {
      "level": "${level}",
      "question": "Question text",
      "answers": {
        "basic": "Basic sample answer",
        "average": "An answer matching the expected level",
        "advanced": "Advanced (higher-level) sample answer"
      }
    },
    ...
  ]
}

Ensure that questions and answers match the expected grammar, vocabulary, and skills for the specified ${level} level.
Ensure questions and answers are in ${language}.

Base the new question on the previous questions and answers provided to create a cohesive set of questions and avoid repetition.
`;

const generatePrompt = (questions: LanguageLevelQuestion[]): string => {
  return "Previous questions and answers:\n\n" +
  questions.map((q) => `
### Question 
${q.question}

### Answer: 
${q.userAnswer}

`).join('\n');
};


const evaluateSystem = (language: string, level: string): string => `
You are evaluating a user's spoken or written ${language} proficiency using the CEFR scale (A1–C2). 

For each of the provided questions, you are given:
- Question text
- User's actual answer
- Level of the question
- Sample responses for the expected level

${level} is described as follows: ${getLevelDescription(level)}

Your tasks are to evaluation of each answer:
 - Compare the user's answer with the sample responses.
 - Generate, using the user response as a base, what would be the expected answer for level "average" and "advanced".
 - Assess the quality of the user's answer using only one of these labels: "fail", "basic", "average", "good", or "advanced".
 - If the user did not answer or if the answer is irrelevant, mark it as "fail".
 - Provide a short reason explaining the rating choice.

Return the result in the following strict JSON format:

{
  "evaluations": [
    {
      "level": "Question level",
      "question": "Question text",
      "user_answer": "User's answer",
      "answers": {
        "average": "An answer matching the expected level",
        "advanced": "Advanced (higher-level) sample answer"
      }
      "quality": "fail | basic | average | good | advanced"
      "reason": "Why was the answer rated this way",
    },
    ...
  ]
}
`;

const evaluatePrompt = (questions: LanguageLevelQuestion[]): string => {
  return "Previous questions and answers:\n\n" +
  questions.map((q) => `
### Question 
${q.question}

### User's answer: 
${q.userAnswer}

### Level
${q.level}

### Sample answers:
Basic: ${q.answers.basic}
Average: ${q.answers.average}
Advanced: ${q.answers.advanced}


`).join('\n');
};

export default { generateSystem, generatePrompt, evaluateSystem, evaluatePrompt };
