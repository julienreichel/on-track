import { defineFunction, secret } from "@aws-amplify/backend";

export const deepgramAPIKeyHandler = defineFunction({
  name: "deepgram-api-key",
  timeoutSeconds: 300,
  environment: {
    DEEPGRAM_API_KEY: secret("DEEPGRAM_API_KEY")
  },
});
