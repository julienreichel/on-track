import { jsonrepair } from "jsonrepair";
import subjectPrompt from "./prompts/subject";
import competencyPrompt from "./prompts/competency";
import sectionsPrompt from "./prompts/sections";
import quizPrompt from "./prompts/quiz";

export type OpenAIRequest = GraphQLModel & {
  system?: string;
  prompt: string;
  token: number;
  format?: string;
};

export type ConceptResponse = {
  name: string;
  description: string;
  learning_objectives: string[];
  theory: [string];
  examples: [string];
  prerequisites: string[];
}

export type CompetencyResponse = {
  name: string;
  description: string;
  learning_objectives: string[];
  prerequisites: string[];
}

// Define the structure of the Subject Response
export type SubjectResponse = {
  name: string;
  description: string;
  competencies: CompetencyResponse[];
}

export type SectionsResponse = {
  name: string;
  introduction: string | undefined;
  objectives: (string | undefined)[];
  theory: string | undefined;
  examples: string | undefined;
}

export type QuizResponse = {
  id: string;
  type: string;
  text: string;
  answers: { text: string; valid: boolean }[];
  level: string;
  explanations: string;
}

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
  }

  const querySubject = async (
    subjectDescription: string,
    locale: Locale = "en"
  ): Promise<SubjectResponse>  => {
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
  ): Promise<{concepts: ConceptResponse[]}>  => {
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
    sections: string[]
  ): Promise<SectionsResponse[]> => {
    const request: OpenAIRequest = {
      system: sectionsPrompt.system(),
      prompt: sectionsPrompt.prompt(name, description, objectives, sections),
      token: sections.length * 800,
    };
    const response = await query(request);
    // fomat the response to an object

    function convertMarkdownToJSON(markdown: string): SectionsResponse[] {
      const sectionsText = markdown.split(/\n---\n/).filter(Boolean); // Split by '---' and filter out empty strings
      const output = [] as SectionsResponse[];

      sectionsText.forEach((section) => {
        const nameMatch = section.match(/# (.+)/);
        const introductionMatch = section.match(
          /### Summary\n(.+?)(?=\n### Objectives)/s
        );
        const objectivesMatch = section.match(
          /### Objectives\n- (.+?)(?=\n### Theory)/s
        );
        const theoryMatch = section.match(
          /### Theory\n(.+?)(?=\n### Examples)/s
        );
        const examplesMatch = section.match(/### Examples\n(.+)/s);

        if (nameMatch) {
          const name = nameMatch[1].trim();
          const introduction = introductionMatch && introductionMatch[1].trim() || undefined;

          const objectives = objectivesMatch
            ? objectivesMatch[0]
                .split(/\n- /)
                .slice(1)
                .map((obj) => obj.trim())
            : [];
          const theory = theoryMatch && theoryMatch[1].trim() || undefined;
          const examples = examplesMatch && examplesMatch[1].trim() || undefined;

          output.push({
            name,
            introduction,
            objectives,
            theory,
            examples,
          });
        }
      });

      return output;
    }

    // Run the conversion
    const jsonResponse = convertMarkdownToJSON(response);
    console.log(response, jsonResponse);

    return jsonResponse;
  };

  const queryQuiz = async (
    name: string, summary: string, objectives: string[], theory: string, examples: string, difficultyLevel: number
  ): Promise<QuizResponse[]> => {

    const request: OpenAIRequest = {
      system: quizPrompt.system(difficultyLevel),
      prompt: quizPrompt.prompt(name, summary, objectives, theory, examples),
      token: 10 * 250,
      format: "json",
    };
    const response = await query(request);

    return response.questions;
  }

  return { query, querySubject, queryCompetency, queryConcept, queryQuiz };
}
