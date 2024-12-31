export type FlashCardActionModel = {
  flashCardId: string;
  isOk: boolean;
};

export type ObjectiveActionModel = {
  objective: string;
  isDone: boolean;
};

export type QuestionActionModel = {
  questionId: string;
  userResponse: string;
  isValid: boolean;
  quizType: string;
};

export type ActionTimestampsModel = {
  createdAt: string;
  actionType: string;
}

export type ConceptActionModel = GraphQLModel & {
  id: string;
  createdAt: string;
  owner: string;
  conceptId: string;
  inProgress: boolean;
  objectives: ObjectiveActionModel[];
  theory: boolean;
  examples: boolean;
  usedFlashCards: FlashCardActionModel[];
  answeredQuestions: QuestionActionModel[];
  actionTimestamps: ActionTimestampsModel[];
};

export default function () {
  const calls = useGraphqlQuery('ConceptAction', [
    'id',
    'createdAt',
    'owner',
    'conceptId',
    'inProgress',
    'objectives.*',
    'theory',
    'examples',
    'usedFlashCards.*',
    'answeredQuestions.*',
    'actionTimestamps.*'
  ]);

  const list = (params: GraphQLParams = {}, options: GraphQLOptions = {}) => {
    if (params.userId && params.username) {
      params.owner = `${params.userId}::${params.username}`;
    }

    let query = null;
    if (params.conceptId) {
      query = "listConceptActionByConceptIdAndOwner";
      if (params.owner) {
        params.owner = { eq: params.owner };
      }
    } else if (params.owner) {
      query = "listConceptActionByOwnerAndCreatedAt";
      if (!params.sortDirection) {
        params.sortDirection = "DESC";
      }
    } else {
      query = "list";
    }

    return calls.call(query, {...params, ...options}) as unknown as GraphQLModel[];
  }
  const update = async (input: GraphQLModel, options: GraphQLOptions = {}) => {
    // never update the owner
    delete input.owner;
    return calls.update(input, options);
  };
  return { ...calls, list, update };
}
