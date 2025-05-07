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
    'subjectId',
    'answeredQuestions.*',
    'actionTimestamps.*'
  ]);

  const list = (input: GraphQLParams = {}, options: GraphQLOptions = {}) => {
    const params = {...input};
    if (params.userId && params.username) {
      params.owner = `${params.userId}::${params.username}`;
    }

    let query = null;
    if (params.competencyId) {
      query = "listCompetencyActionByCompetencyIdAndOwner";
      if (params.owner) {
        params.owner = { eq: params.owner };
      }
    } else if (params.subjectId) {
      query = "listCompetencyActionBySubjectIdAndOwner";
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

  const listFormated = async (params: GraphQLParams = {}, options: GraphQLOptions = {}) => {
    const actions = await list(params, options);
    actions.forEach((action) => {
      if (!action.actionTimestamps) {
        action.actionTimestamps = [];
      }
      action.actionTimestamps.forEach((a) => {
        a.createdAt = new Date(a.createdAt);
      });
      action.actionTimestamps.sort((a, b) => a.createdAt - b.createdAt);

      if (!action.answeredQuestions) {
        action.answeredQuestions = [];
      }
      action.answeredQuestions.forEach((q) => {
        q.createdAt = new Date(q.createdAt);
      });
      action.answeredQuestions.sort((a, b) => a.createdAt - b.createdAt);

    });
    return actions;
  };
  const update = async (input: GraphQLModel, options: GraphQLOptions = {}) => {
    // never update the owner
    delete input.owner;
    return calls.update(input, options);
  };

  const debouncedUpdate = calls.debounce(update, 500); // 500 milliseconds delay

  const getQuizType = (competencyAction: CompetencyActionModel) => {
    if (!competencyAction.actionTimestamps?.length) {
      return "pre-quiz";
    }
    const isFinished = competencyAction.actionTimestamps.some( (a) => a.actionType === "finished");
    if (isFinished) {
      return "final-quiz";
    } else {
      return "quiz";
    }
  };

  const updateQuestionsProgress = async (questions:RunningQuestionModel[], competencyAction: CompetencyActionModel, quizType: string) => {
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
        level: q.level,
        createdAt: new Date().toISOString(),
      }));

    if (!competencyAction.answeredQuestions) {
      competencyAction.answeredQuestions = [];
    }

    // find the latest quiz timestamp (if any)
    const lastQuizTimestamp = competencyAction.actionTimestamps?.reduce((acc, curr) => {
      const date = new Date(curr.createdAt).getTime();;
      if (date > acc) {
        return date;
      }
      return acc;
    }, 0) || 0;

    let hasChanges = false;
    validatedQuestions.forEach((q) => {
      const answeredQuestion = competencyAction.answeredQuestions.find(
        (aq) => aq.questionId === q.questionId && new Date(aq.createdAt).getTime() > lastQuizTimestamp
      );
      if (answeredQuestion && answeredQuestion.userResponse === q.userResponse) {
        return;
      }
      hasChanges = true;
      competencyAction.answeredQuestions.push(q);
    });

    if (hasChanges) {
      await debouncedUpdate(competencyAction);
    }

  };

  const updateQuestionsResults = async (competencyAction: CompetencyActionModel, actionType: string) => {
    if (!competencyAction.actionTimestamps) {
      competencyAction.actionTimestamps = [];
    }
    competencyAction.actionTimestamps.push({
      actionType,
      createdAt: new Date().toISOString(),
    });
    await debouncedUpdate(competencyAction);
  };

  const getQuizzes = (competencyAction: CompetencyActionModel) => {
    if (!competencyAction.actionTimestamps || !competencyAction.answeredQuestions) {
      return [];
    }

    const quizzes = [];
    let previousTimestamp = new Date(0); // Start from the epoch

    competencyAction.actionTimestamps.forEach((timestamp) => {
      if (timestamp.actionType === "quiz" || timestamp.actionType === "final-quiz" || timestamp.actionType === "pre-quiz") {
        const createdAt = timestamp.createdAt as unknown as Date;
        const quizQuestions = competencyAction.answeredQuestions.filter((q) => {
          const questionTime = q.createdAt as unknown as Date;
          return questionTime > previousTimestamp && questionTime <= createdAt;
        });

        quizzes.push({
          type: timestamp.actionType,
          answeredQuestions: quizQuestions,
        });

        previousTimestamp = createdAt;
      }
    });

    return quizzes;
  };

  return { ...calls, list, listFormated, update, updateQuestionsResults, updateQuestionsProgress, getQuizType, getQuizzes };
}
