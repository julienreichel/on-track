import type { ClientSchema } from "@aws-amplify/backend";
import { a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  OpenAIUsage: a.customType({
    prompt_tokens: a.integer(),
    completion_tokens: a.integer(),
    total_tokens: a.integer(),
  }),

  OpenAIRequest: a
    .model({
      id: a.id().required(),
      system: a.string(),
      prompt: a.string(),
      token: a.integer(),
      format: a.string(),
      model: a.string(),
      content: a.string(),
      token_usage: a.ref("OpenAIUsage"),
      finish_reason: a.string(),
      ttl: a.integer(),
    })
    .authorization((allow) => [allow.guest()]),

  LocalizedText: a.customType({
    en: a.string(),
    fr: a.string(),
  }),

  LecturePrerequisite: a
    .model({
      prerequisiteId: a.id().required(),
      lectureId: a.id().required(),
      prerequisite: a.belongsTo("Lecture", "prerequisiteId"),
      lecture: a.belongsTo("Lecture", "lectureId"),
    })
    .authorization((allow) => [allow.guest()]),

  Lecture: a
    .model({
      id: a.id().required(),
      name: a.ref("LocalizedText"),
      prerequisites: a.hasMany("LecturePrerequisite", "lectureId"),
      followUps: a.hasMany("LecturePrerequisite", "prerequisiteId"),
    })
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam",
  },
});
