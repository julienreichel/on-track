
export type QuestionAnswerModel = {
  text: string;
  valid: boolean;
};

export type QuestionModel = GraphQLModel & {
  id: string;
  type: string;
  text: string;
  explanations: string;
  level: string;
  answers: QuestionAnswerModel[];
  conceptId: string;
};

export type RunningQuestionModel ={
  id: string;
  type: string;
  text: string;
  explanations: string;
  level: string;
  answers: QuestionAnswerModel[];
  conceptId: string;
  validated: boolean;
  response: number | number[] | string | undefined;
  valid: boolean;
  points: number;
};

export default function () {
  return useGraphqlQuery('Question', ['id', 'type', 'text', 'explanations', 'level', 'answers.*', 'conceptId']);
}
