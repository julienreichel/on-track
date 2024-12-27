export type FlashCardActionModel = {
  flashCardId: string;
  isOk: boolean;
};

export type QuestionActionModel = {
  questionId: string;
  userResponse: string;
  isValid: boolean;
};

export type UserActionModel = GraphQLModel & {
  id: string;
  createdAt: string;
  owner: string;
  conceptId: string;
  inProgress: boolean;
  objectives: boolean[];
  theory: boolean;
  examples: boolean;
  usedFlashCards: FlashCardActionModel[];
  answeredQuestions: QuestionActionModel[];
};

export default function () {
  return useGraphqlQuery('UserAction', [
    'id',
    'createdAt',
    'owner',
    'conceptId',
    'inProgress',
    'objectives',
    'theory',
    'examples',
    'usedFlashCards.*',
    'answeredQuestions.*'
  ]);
}
