import { jsonrepair } from "jsonrepair";
import subjectPrompt from "./prompts/subject";
import competencyPrompt from "./prompts/competency";
import conceptPrompt from "./prompts/concept";
import quizPrompt from "./prompts/quiz";

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
  learning_objectives: string[];
  theory?: string;
  examples?: string;
  prerequisites: string[];
  flashcards: FlashCardResponse[];
};

export type CompetencyResponse = {
  name: string;
  description: string;
  learning_objectives: string[];
  prerequisites: string[];
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

  const queryCompetency = async (
    name: string,
    description: string,
    objectives: string[],
    locale: Locale = "en"
  ): Promise<{ concepts: ConceptResponse[] }> => {
    const request: OpenAIRequest = {
      system: competencyPrompt.system(localeMap[locale]),
      prompt: competencyPrompt.prompt(name, description, objectives),
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
    name: string,
    description: string,
    objectives: string[],
    locale: Locale = "en"
  ): Promise<ConceptResponse> => {
    const request: OpenAIRequest = {
      system: conceptPrompt.system(localeMap[locale]),
      prompt: conceptPrompt.prompt(name, description, objectives),
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
        prerequisites: [],
        flashcards: [],
      };

      let currentSection:
        | "description"
        | "objectives"
        | "theory"
        | "examples"
        | "flashcards"
        | null = null;
      let currentFlashcard: {
        question: string;
        answer: string;
        notes?: string;
      } | null = null;

      lines.forEach((line) => {
        if (line.startsWith("# ")) {
          response.name = line.replace("# ", "").trim();
        } else if (line.startsWith("### ")) {
          currentSection = line.replace("### ", "").trim().toLowerCase() as
            | "description"
            | "objectives"
            | "theory"
            | "examples"
            | "flashcards";
        } else if (currentSection === "objectives") {
          if (line.startsWith("- ")) {
            response.learning_objectives.push(line.replace("- ", "").trim());
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
        } else if (currentSection === "theory" || currentSection === "examples" || currentSection === "description") {
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

  return { query, querySubject, queryCompetency, queryConcept, queryQuiz };
}
