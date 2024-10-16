export type QuestionAnswerModel = {
  text: LocalizedText;
  valid: boolean;
};

export type QuestionModel = {
  id: string;
  text: LocalizedText;
  explanations: LocalizedText;
  answers: QuestionAnswerModel[];
  type: string;
  level: string;
};

export type SectionModel = GraphQLModel & {
  id: string;
  name: LocalizedText;
  introduction: LocalizedText;
  theory: LocalizedText;
  examples: LocalizedText;
  questions: QuestionModel[];
  lectureId: string;
  lecture: { id: string };
};

export default function () {
  const calls = useGraphqlQuery(
    "Section",
    [
      "id",
      "name.*",
      "introduction.*",
      "theory.*",
      "examples.*",
      "lecture.*",
      "questions.*",
    ],
    ["id", "name.*"]
  );
  return calls;
}
