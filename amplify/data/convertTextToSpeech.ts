import type { Schema } from "./resource";
import type {
  VoiceId,
} from "@aws-sdk/client-polly";
import {
  PollyClient,
  SynthesizeSpeechCommand,
} from "@aws-sdk/client-polly";

export const handler: Schema["convertTextToSpeech"]["functionHandler"] = async (
  event
) => {

  const localeVoiceMap: Record<string, string> = {
    en: "Joanna",    // English (US)
    es: "Lucia",     // Spanish (European Spanish)
    fr: "Celine",    // French (France)
    de: "Vicki",     // German
    it: "Carla"      // Italian
  };
  const locale = event.arguments.locale || "en";
  const voiceId = (localeVoiceMap[locale] || "Joanna") as VoiceId;  // Cast to VoiceId
  const client = new PollyClient();
  const task = new SynthesizeSpeechCommand({
    OutputFormat: "mp3",
    SampleRate: "8000",
    TextType: "text",
    Text: event.arguments.text,
    VoiceId: voiceId
  });

  const result = await client.send(task);

  const audioBase64 = await result.AudioStream?.transformToString('base64') || "";
  return audioBase64;
};