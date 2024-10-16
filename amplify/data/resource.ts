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

  QuestionAnswer: a.customType({
    text: a.ref("LocalizedText"),
    valid: a.boolean(),
  }),

  Question: a.customType({
    id: a.id().required(),
    type: a.string(),
    text: a.ref("LocalizedText"),
    explanations: a.ref("LocalizedText"),
    level: a.string(),
    answers: a.ref("QuestionAnswer").array(),
  }),

  Section: a.model({
    id: a.id().required(),
    lectureId: a.id().required(),
    name: a.ref("LocalizedText"),
    introduction: a.ref("LocalizedText"),
    theory: a.ref("LocalizedText"),
    examples: a.ref("LocalizedText"),
    questions: a.ref("Question").array(),
    lecture: a.belongsTo("Lecture", "lectureId"),
  }).authorization((allow) => [allow.guest()]),

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
      description: a.ref("LocalizedText"),
      objectives: a.ref("LocalizedText").array(),
      prerequisites: a.hasMany("LecturePrerequisite", "lectureId"),
      followUps: a.hasMany("LecturePrerequisite", "prerequisiteId"),
      sections: a.hasMany("Section", "lectureId"),
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
