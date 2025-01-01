
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
  answers: {
    text: number | number[] | string | undefined;
    valid: boolean;
  }
  conceptId: string;
  validated: boolean;
};

export default function () {
  return useGraphqlQuery('Question', ['id', 'type', 'text', 'explanations', 'level', 'answers.*', 'conceptId']);
}
