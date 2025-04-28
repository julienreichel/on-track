export type LanguageLevelQuestion = {
  level: string,
  question: string,
  answers: {
    basic: string,
    normal: string,
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

const getAdjacentLevels = (level: string): string => {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const currentIndex = levels.indexOf(level);
  const descriptions = [];

  if (currentIndex > 0) {
    descriptions.push(`### lower: ${levels[currentIndex - 1]}${levelDescriptions[levels[currentIndex - 1]]}`);
  }

  descriptions.push(`### ${level}${levelDescriptions[level]}`);

  if (currentIndex < levels.length - 1) {
    descriptions.push(`### higher: ${levels[currentIndex + 1]}${levelDescriptions[levels[currentIndex + 1]]}`);
  }

  return descriptions.join("\n");
};

const initialPrompt = (language: string, level: string): string => `
Generate 3 questions for ${level} of the CEFR (A1–C2) in ${language}.

${level} is described as follows: ${getLevelDescription(level)}

For each question, provide 3 sample answers:
- basic: a basic answer showing understanding but limited ability
- normal: an answer matching the expected level
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
        "normal": "Normal sample answer",
        "advanced": "Advanced (higher-level) sample answer"
      }
    },
    ...
  ]
}

Ensure that questions and answers match the expected grammar, vocabulary, and skills for the specified ${level} level.
Ensure questions and answers are in ${language}.
`;

const system = (language: string, level: string): string => `
You are evaluating a user's spoken or written ${language} proficiency using the CEFR scale (A1–C2).

For each of the provided questions, you are given a set of:
- LEVEL
- question text
- sample response for the expected level
- the user's actual answer

The level descriptions are as follows:
${getAdjacentLevels(level)}

Your tasks are:
1. For each question:
   - Compare the user's answer with the sample response.
   - Assess the quality of the user's answer using one of these labels: "fail", "basic", "normal", "good", or "advanced".
   - If the user did not answer, mark it as "fail".
   - If the answer is not relevant to the question, mark it as "fail".

2. Based on the evaluations of the last 3 questions:
   - If any answer is "fail" or more than 2 are "basic", suggest a lower level.
   - If answers are "normal", "good" or "advanced" suggest a higher level.
   - In case of doubt, keep the same level.
   - Do not keep the same level more than 2 times (6 questions) in a row, always probe for a higher level.
   - Let's call this NEW_LEVEL.

3. Create 3 new questions for the user based on the user's previous answers (topics they mentioned), 
   to make the conversation continuous and natural.
   - Each new question must have 3 sample answers:
     - basic: a simple answer showing understanding but limited expression
     - normal: a correct answer expected at NEW_LEVEL
     - advanced: a richer, more complex answer showing higher mastery

4. Ensure the new questions match the complexity, grammar, and vocabulary expected at NEW_LEVEL and are in ${language}.

Return the result in the following strict JSON format:

{
  "evaluation": [
    {
      "level": "Question level",
      "question": "Question text",
      "user_answer": "User's answer",
      "quality": "fail | basic | normal | good | advanced"
    },
    ...
  ],
  "level": "NEW_LEVEL",
  "questions": [
    {
      "level": "NEW_LEVEL",
      "question": "New Question 1 text",
      "answers": {
        "basic": "Basic sample answer",
        "normal": "Normal sample answer",
        "advanced": "Advanced sample answer"
      }
    },
    {
      "level": "NEW_LEVEL",
      "question": "New Question 2 text",
      "answers": {
        "basic": "Basic sample answer",
        "normal": "Normal sample answer",
        "advanced": "Advanced sample answer"
      }
    },
    {
      "level": "NEW_LEVEL",
      "question": "New Question 3 text",
      "answers": {
        "basic": "Basic sample answer",
        "normal": "Normal sample answer",
        "advanced": "Advanced sample answer"
      }
    }
  ]
}

Ensure that questions and answers match the expected grammar, vocabulary, and skills for the specified NEW_LEVEL level.
Ensure questions and answers are in ${language}.
`;

const prompt = (questions: LanguageLevelQuestion[]): string => {
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
Normal: ${q.answers.normal}
Advanced: ${q.answers.advanced}


`).join('\n');
};

export default { initialPrompt, system, prompt };
