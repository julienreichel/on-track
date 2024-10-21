import { jsonrepair } from "jsonrepair";
import prerequisitePrompt from "./prompts/prerequisites";
import sectionsPrompt from "./prompts/sections";
import quizPrompt from "./prompts/quiz";

export type OpenAIRequest = GraphQLModel & {
  system?: string;
  prompt: string;
  token: number;
  format?: string;
};

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

  const queryPrerequisites = async (
    existingLectures: string[],
    newLectures: string[]
  ) => {
    const request: OpenAIRequest = {
      system: prerequisitePrompt.system(),
      prompt: prerequisitePrompt.prompt(existingLectures, newLectures),
      token: newLectures.length * 300,
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
  const querySection = async (
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
      const sectionsText = markdown.split(/---/).filter(Boolean); // Split by '---' and filter out empty strings
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

  return { query, queryPrerequisites, querySection, queryQuiz };
}
