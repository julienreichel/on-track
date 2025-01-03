
export type CompetencyActionModel = GraphQLModel & {
  id: string;
  createdAt: string;
  owner: string;
  competencyId: string;
  answeredQuestions: QuestionActionModel[];
  actionTimestamps: ActionTimestampsModel[];
};

export default function () {
  const calls = useGraphqlQuery('CompetencyAction', [
    'id',
    'createdAt',
    'owner',
    'competencyId',
    'answeredQuestions.*',
    'actionTimestamps.*'
  ]);

  const list = (params: GraphQLParams = {}, options: GraphQLOptions = {}) => {
    if (params.userId && params.username) {
      params.owner = `${params.userId}::${params.username}`;
    }

    let query = null;
    if (params.competencyId) {
      query = "listCompetencyActionByCompetencyIdAndOwner";
      if (params.owner) {
        params.owner = { eq: params.owner };
      }
    } else if (params.owner) {
      query = "listCompetencyActionByOwnerAndCreatedAt";
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


  const getQuizType = (competencyAction: CompetencyActionModel) => {
    if (!competencyAction.actionTimestamps) {
      return "pre-quiz";
    }
    const isFinished = competencyAction.actionTimestamps.some( (a) => a.actionType === "finished");
    if (isFinished) {
      return "final-quiz";
    } else {
      return "quiz";
    }
  };

  const updateQuestionsProgress = async (questions:RunningQuestionModel[], competencyAction: CompetencyActionModel) => {
    const quizType = getQuizType(competencyAction);
    const validatedQuestions = questions
      .filter((q) => q.validated)
      .map((q) => ({
        questionId: q.id,
        userResponse:
          q.type === "checkbox"
            ? q.response?.join(",") ?? ""
            : q.response?.toString() ?? "",
        isValid: !!q.valid,
        quizType,
      }));

    if (!competencyAction.answeredQuestions) {
      competencyAction.answeredQuestions = [];
    }

    let hasChanges = false;
    validatedQuestions.forEach((q) => {
      const answeredQuestion = competencyAction.answeredQuestions.find(
        (aq) => aq.questionId === q.questionId
      );
      if (answeredQuestion) {
        if (answeredQuestion.userResponse === q.userResponse) {
          return;
        }
        hasChanges = true;
        Object.assign(answeredQuestion, q);
        return;
      }
      hasChanges = true;
      competencyAction.answeredQuestions.push(q);
    });

    if (hasChanges) {
      await update(competencyAction);
    }
  };

  const updateQuestionsResults = async (competencyAction: CompetencyActionModel) => {

    if (!competencyAction.actionTimestamps) {
      competencyAction.actionTimestamps = [];
    }
    const actionType = getQuizType(competencyAction);
    competencyAction.actionTimestamps.push({
      actionType,
      createdAt: new Date().toISOString(),
    });
    await update(competencyAction);
  };
  return { ...calls, list, update, updateQuestionsResults, updateQuestionsProgress, getQuizType };
}
