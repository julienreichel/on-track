import { jsonrepair } from "jsonrepair";
import subjectPrompt from "./prompts/subject";
import competencyPrompt from "./prompts/competency";
import conceptPrompt from "./prompts/concept";
import quizPrompt from "./prompts/quiz";
import languagePrompt from "./prompts/language";

export type OpenAIRequest = GraphQLModel & {
  system?: string;
  prompt: string;
  token: number;
  format?: string;
};

export type FlashCardResponse = {
  question: string;
  answer: string;
  notes?: string;
};

export type ConceptResponse = {
  name: string;
  description: string;
  level?: string;
  learning_objectives: string[];
  mva?: string;
  reflect?: string;
  facts: string[];
  theory?: string;
  examples?: string;
  guide?: string;
  resources?: string;
  prerequisites: string[];
  flashcards: FlashCardResponse[];
};

export type CompetencyResponse = {
  name: string;
  description: string;
  learning_objectives: string[];
  prerequisites: string[];
  concepts: ConceptResponse[];
};

// Define the structure of the Subject Response
export type SubjectResponse = {
  name: string;
  description: string;
  competencies: CompetencyResponse[];
};

export type SectionsResponse = {
  name: string;
  description: string | undefined;
  objectives: (string | undefined)[];
  theory: string | undefined;
  examples: string | undefined;
};

export type QuizResponse = {
  id: string;
  type: string;
  text: string;
  answers: { text: string; valid: boolean }[];
  level: string;
  explanations: string;
};

export type SectionNames = "description" | "objectives" | "theory" | "examples" | "guide" | "mva" | "resources" | "reflect" | "facts" | "flashcards" | null

export default function () {
  const { create, get } = useGraphqlQuery("OpenAIRequest");

  const query = async (request: OpenAIRequest) => {
    request.ttl = Math.floor(Date.now() / 1000) + 3600 * 24; // kep request for 24h

    console.log("useOpenAI", request.system, request.prompt);
    const data = await create(request);

    const requestId = data.id;
    if (!requestId) {
      return null;
    }

    let totalWaitTime = 0;
    let waitTime = 2000;
    while (totalWaitTime < 300 * 1000) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      totalWaitTime += waitTime;
      waitTime = Math.min(waitTime + 1000, 10000);

      const data = await get(requestId);

      if (data.finish_reason) {
        if (request.format === "json") {
          try {
            return JSON.parse(String(data.content));
          } catch (err) {
            console.log(err);
            return JSON.parse(jsonrepair(String(data.content)));
          }
        }
        return data.content;
      }
    }
  };

  const localeMap = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
  };

  const querySubject = async (
    subjectDescription: string,
    locale: Locale = "en"
  ): Promise<SubjectResponse> => {
    const request: OpenAIRequest = {
      system: subjectPrompt.system(localeMap[locale]),
      prompt: subjectPrompt.prompt(subjectDescription),
      token: 4000,
      format: "json",
    };
    return query(request);
  };

  const querySubjectV2 = async (
    subjectDescription: string,
    length: number,
    locale: Locale = "en"
  ): Promise<SubjectResponse> => {
    const request: OpenAIRequest = {
      system: subjectPrompt.systemV2(localeMap[locale]),
      prompt: subjectPrompt.promptV2(subjectDescription, length),
      token: 4000,
      format: "json",
    };
    return query(request);
  };
  

  const queryCompetency = async (
    subjectName: string,
    subjectDescription: string,
    name: string,
    description: string,
    objectives: string[],
    locale: Locale = "en"
  ): Promise<{ concepts: ConceptResponse[] }> => {
    const request: OpenAIRequest = {
      system: competencyPrompt.system(localeMap[locale]),
      prompt: competencyPrompt.prompt(subjectName, subjectDescription, name, description, objectives),
      token: 4000,
      format: "json",
    };
    return query(request);
  };

  /**
   *
   * @param name <string>
   * @param description <string>
   * @param objectives <string[]>
   * @param sections <string[]>
   * @returns <Promise<SectionsResponse[]>>
   */
  const queryConcept = async (
    subjectName: string,
    subjectDescription: string,
    competencyName: string,
    competencyDescription: string,
    name: string,
    description: string,
    objectives: string[],
    mva: string,
    reflect: string,
    facts: string[],
    locale: Locale = "en"
  ): Promise<ConceptResponse> => {
    const request: OpenAIRequest = {
      system: conceptPrompt.system(localeMap[locale]),
      prompt: conceptPrompt.prompt(subjectName, subjectDescription, competencyName, competencyDescription, name, description, objectives, mva, reflect, facts),
      token: 4000,
    };
    const response = await query(request);

    function convertMarkdownToJSON(markdown: string): ConceptResponse {
      const lines = markdown.split("\n");
      const response: ConceptResponse = {
        name: "",
        description: "",
        learning_objectives: [],
        theory: "",
        examples: "",
        mva: "",
        reflect: "",
        facts: [],
        guide: "",
        resources: "",
        prerequisites: [],
        flashcards: [],
      };

      let currentSection: SectionNames = null;

      let currentFlashcard: {
        question: string;
        answer: string;
        notes?: string;
      } | null = null;

      lines.forEach((line) => {
        if (line.startsWith("# ")) {
          response.name = line.replace("# ", "").trim();
        } else if (line.startsWith("### ")) {
          currentSection = line.replace("### ", "").trim().toLowerCase() as SectionNames;
        } else if (currentSection === "objectives") {
          if (line.startsWith("- ")) {
            response.learning_objectives.push(line.replace("- ", "").trim());
          }
        } else if (currentSection === "facts") {
          if (line.startsWith("- ")) {
            response.facts.push(line.replace("- ", "").trim());
          }
        } else if (currentSection === "flashcards") {
          if (line.startsWith("- **Question:**") || line.startsWith("- **Question :**")) {
            if (currentFlashcard) {
              response.flashcards.push(currentFlashcard);
            }
            currentFlashcard = {
              question: line.replace("- **Question:**", "").replace("- **Question :**", "").trim(),
              answer: "",
            };
          } else if (currentFlashcard) {
            if (line.trim().startsWith("**Answer:**") || line.trim().startsWith("**Answer :**")) {
              currentFlashcard.answer = line.replace("**Answer:**", "").replace("**Answer :**", "").trim();
            } else if (line.trim().startsWith("**Notes:**") || line.trim().startsWith("**Notes :**")) {
              currentFlashcard.notes = line.replace("**Notes:**", "").replace("**Notes :**", "").trim();
            }
          }
        } else if (currentSection === "theory" || currentSection === "examples" || currentSection === "description"
            || currentSection === "guide" || currentSection === "resources" || currentSection === "reflect" || currentSection === "mva"
        ) {
          response[currentSection] += `${line.trim()}\n`;
        }
      });

      // Add the last flashcard if any
      if (currentFlashcard) {
        response.flashcards.push(currentFlashcard);
      }

      // Clean up trailing newlines
      response.description = response.description?.trim();
      // openAi has a tendancy to not repsect the markdown headers, so we fix it here
      response.theory = response.theory
        ?.trim()
        .replaceAll("#### ", "##### ")
        .replaceAll("###### ", "##### ")
        //.replace(/^(?:\d+\.\s*)?\*\*(.*?)\*\*$/gm, "##### $1");
      response.examples = response.examples
        ?.trim()
        .replaceAll("#### ", "##### ")
        .replaceAll("###### ", "##### ")
        //.replace(/^(?:\d+\.\s*)?\*\*(.*?)\*\*$/gm, "##### $1");

      return response;
    }

    // Run the conversion
    return convertMarkdownToJSON(response);
  };

  const queryQuiz = async (
    name: string,
    summary: string,
    objectives: string[],
    theory: string,
    examples: string,
    difficultyLevel: number,
    locale: Locale = "en"
  ): Promise<QuizResponse[]> => {
    const request: OpenAIRequest = {
      system: quizPrompt.system(difficultyLevel, localeMap[locale]),
      prompt: quizPrompt.prompt(name, summary, objectives, theory, examples),
      token: 10 * 250,
      format: "json",
    };
    const response = await query(request);

    return response.questions;
  };

  const queryLanguageQuiz = async (
    level: string,
    previousQuestions: LanguageLevelQuestion[],
    language: string = "English",
  ): Promise<QuizResponse[]> => {

    const request: OpenAIRequest = {
      system: languagePrompt.generateSystem(language, level || "A1"),
      prompt: languagePrompt.generatePrompt(previousQuestions),
      token: 2000,
      format: "json",
    };
    const response = await query(request);
    return response;
  };

  const queryLanguageEval = async (
    level: string,
    previousQuestions: LanguageLevelQuestion[],
    language: string = "English",
  ): Promise<QuizResponse[]> => {

    const request: OpenAIRequest = {
      system: languagePrompt.evaluateSystem(language, level || "A1"),
      prompt: languagePrompt.evaluatePrompt(previousQuestions),
      token: 2000,
      format: "json",
    };
    const response = await query(request);
    return response;
  };

  // Add a function for answering a chat question about a concept
  const answerConceptChat = async ({
    question,
    context = "",
    theory,
    objectives,
    locale = "en"
  }: {
    question: string,
    context?: string,
    theory: string,
    objectives: string[],
    locale?: Locale
  }): Promise<string> => {
    const system = `
You are a helpful tutor. 
Answer student questions about the theory below. Give ONLY answers related to the given theory.
If the question is not related to the theory, say "Please ask questions related to the concept" or "I cannot answer that question".
Use the objectives as a guide for what is relevant.
Answer in one short sentence.
<Theory> 
${theory}
<Objectives>
- ${objectives.join("\n- ")}
<Locale>
- ${locale}
<ChatContext>
The following is the recent conversation between the user and the AI. Use it as context for your answer if relevant.
${context}
`.trim();

    const request: OpenAIRequest = {
      system,
      prompt: question,
      token: 120,
      format: "text",
    };
    return await query(request);
  };

  return {
    query,
    querySubject,
    querySubjectV2,
    queryCompetency,
    queryConcept,
    queryQuiz,
    queryLanguageQuiz,
    queryLanguageEval,
    answerConceptChat,
  };
}
