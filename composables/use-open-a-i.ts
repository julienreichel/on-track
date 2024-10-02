import { jsonrepair } from "jsonrepair";

interface OpenAIRequest {
  system?: string;
  prompt: string;
  token: number;
  format?: string;
}

export default function () {
  const { create, get } = useGraphqlQuery("OpenAIRequest");

  const query = async (request: OpenAIRequest) => {

    console.log(request);
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

  return query;
}
