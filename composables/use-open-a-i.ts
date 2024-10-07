import { jsonrepair } from "jsonrepair";
import prerequisitePrompt from "./prompts/prerequisites.js";

interface OpenAIRequest extends GraphQLModel {
  system?: string;
  prompt: string;
  token: number;
  format?: string;
}

export default function () {
  const { create, get } = useGraphqlQuery("OpenAIRequest");

  const query = async (request: OpenAIRequest) => {

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

  const queryPrerequisites = async (existingLectures: string[], newLectures: string[]) => {
    const request: OpenAIRequest = {
      system: prerequisitePrompt.system(),
      prompt: prerequisitePrompt.prompt(existingLectures, newLectures),
      token: newLectures.length * 300,
      format: "json",
    };
    return query(request);
  };

  return {query, queryPrerequisites};
}
