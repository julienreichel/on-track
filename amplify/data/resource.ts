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
    .authorization((allow) => [allow.authenticated()]),

  QuestionAnswer: a.customType({
    text: a.string(),
    valid: a.boolean(),
  }),

  Question: a
    .model({
      id: a.id().required(),
      type: a.string(),
      text: a.string(),
      explanations: a.string(),
      level: a.string(),
      answers: a.ref("QuestionAnswer").array(),
      conceptId: a.id().required(),
      concept: a.belongsTo("Concept", "conceptId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  FlashCard: a
    .model({
      id: a.id().required(),
      question: a.string(),
      answer: a.string(),
      notes: a.string(),
      conceptId: a.id().required(),
      concept: a.belongsTo("Concept", "conceptId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  Concept: a
    .model({
      id: a.id().required(),
      level: a.string(),
      name: a.string(),
      description: a.string(),
      locale: a.string(),
      objectives: a.string().array(),
      theory: a.string(),
      examples: a.string(),
      questions: a.hasMany("Question", "conceptId"),
      flashCards: a.hasMany("FlashCard", "conceptId"),
      prerequisites: a.hasMany("ConceptDependency", "conceptId"),
      followUps: a.hasMany("ConceptDependency", "prerequisiteId"),
      competencyId: a.id().required(),
      competency: a.belongsTo("Competency", "competencyId"),

      conceptActions: a.hasMany("ConceptAction", "conceptId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  ConceptDependency: a
    .model({
      conceptId: a.id().required(),
      prerequisiteId: a.id().required(),
      concept: a.belongsTo("Concept", "conceptId"),
      prerequisite: a.belongsTo("Concept", "prerequisiteId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  Competency: a
    .model({
      id: a.id().required(),
      name: a.string(),
      description: a.string(),
      locale: a.string(),
      objectives: a.string().array(),
      subjectId: a.id().required(),
      subject: a.belongsTo("Subject", "subjectId"),
      concepts: a.hasMany("Concept", "competencyId"),
      prerequisites: a.hasMany("CompetencyDependency", "competencyId"),
      followUps: a.hasMany("CompetencyDependency", "prerequisiteId"),

      competencyActions: a.hasMany("CompetencyAction", "competencyId"),
      conceptActions: a.hasMany("ConceptAction", "competencyId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  CompetencyDependency: a
    .model({
      competencyId: a.id().required(),
      prerequisiteId: a.id().required(),
      competency: a.belongsTo("Competency", "competencyId"),
      prerequisite: a.belongsTo("Competency", "prerequisiteId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  Subject: a
    .model({
      id: a.id().required(),
      name: a.string(),
      locale: a.string(),
      description: a.string(),
      competencies: a.hasMany("Competency", "subjectId"),

      competencyActions: a.hasMany("CompetencyAction", "subjectId"),
      conceptActions: a.hasMany("ConceptAction", "subjectId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  ObjectiveAction: a.customType({
    objective: a.string(),
    isDone: a.boolean(),
  }),

  FlashCardAction: a.customType({
    flashCardId: a.id(),
    isOk: a.boolean(),
  }),

  QuestionAction: a.customType({
    questionId: a.id(),
    createdAt: a.datetime(),
    userResponse: a.string(),
    level: a.string(),
    isValid: a.boolean(),
    quizType: a.string(),
  }),

  ActionTimestamp: a.customType({
    createdAt: a.datetime(),
    actionType: a.string(),
  }),

  ConceptAction: a
    .model({
      id: a.id().required(),
      createdAt: a.datetime(),
      owner: a.string(),
      conceptId: a.id().required(),
      concept: a.belongsTo("Concept", "conceptId"),

      competencyId: a.id().required(),
      competency: a.belongsTo("Competency", "competencyId"),

      subjectId: a.id().required(),
      subject: a.belongsTo("Subject", "subjectId"),

      inProgress: a.boolean(),
      objectives: a.ref("ObjectiveAction").array(),
      theory: a.boolean(),
      examples: a.boolean(),
      usedFlashCards: a.ref("FlashCardAction").array(),
      answeredQuestions: a.ref("QuestionAction").array(),
      actionTimestamps: a.ref("ActionTimestamp").array(),
    })
    .secondaryIndexes((index) => [
      index("owner").name("byOwner").sortKeys(["createdAt"]),
      index("conceptId").name("byConcept").sortKeys(["owner"]),
      index("competencyId").name("byCompetency").sortKeys(["owner"]),
      index("subjectId").name("bySubject").sortKeys(["owner"])
    ])
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read"]),
    ]),

    CompetencyAction: a
    .model({
      id: a.id().required(),
      createdAt: a.datetime(),
      owner: a.string(),
      competencyId: a.id().required(),
      competency: a.belongsTo("Competency", "competencyId"),

      subjectId: a.id().required(),
      subject: a.belongsTo("Subject", "subjectId"),

      answeredQuestions: a.ref("QuestionAction").array(),
      actionTimestamps: a.ref("ActionTimestamp").array(),
    })
    .secondaryIndexes((index) => [
      index("owner").name("byOwner").sortKeys(["createdAt"]),
      index("competencyId").name("byCompetency").sortKeys(["owner"]),
      index("subjectId").name("bySubject").sortKeys(["owner"])
    ])
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam",
  },
});
