import type { Schema } from '../../data/resource'
import { env } from "$amplify/env/deepgram-api-key";
import { createClient } from "@deepgram/sdk";

export const handler: Schema["deepGramAPIKey"]["functionHandler"] = async () => {
  
  const client = createClient(env.DEEPGRAM_API_KEY);

  const getProjectId = async () => {
    const { result, error } = await client.manage.getProjects();
  
    if (error) {
      throw error;
    }
  
    return result.projects[0].project_id;
  };

  const getTempApiKey = async (projectId: string) => {
    const { result, error } = await client.manage.createProjectKey(projectId, {
      comment: "short lived",
      scopes: ["usage:read", "usage:write"],
      time_to_live_in_seconds: 60,
    });
  
    if (error) {
      throw error;
    }
  
    return result;
  };

  const projectId = await getProjectId();
  const response = await getTempApiKey(projectId);
  console.log("response", response);

  return response.key;
};