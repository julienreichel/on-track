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
  createdAt: string;
  userResponse: string;
  isValid: boolean;
  level: string;
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
    'competencyId',
    'subjectId',
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
    } else if (params.competencyId) {
      query = "listConceptActionByCompetencyIdAndOwner";
      if (params.owner) {
        params.owner = { eq: params.owner };
      }
    } else if (params.subjectId) {
      query = "listConceptActionBySubjectIdAndOwner";
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


  const getQuizType = (conceptAction: ConceptActionModel) => {
    if (conceptAction.theory && conceptAction.examples) {
      if (conceptAction.inProgress) {
        return "quiz";
      } else {
        return "review";
      }
    } else {
      return "pre-quiz";
    }
  };

  const debouncedUpdate = calls.debounce(update, 500); // 500 milliseconds delay

  const updateStarted = (conceptAction: ConceptActionModel) => {
    if (conceptAction.actionTimestamps) {
      return false;
    }
    conceptAction.actionTimestamps = [];

    conceptAction.actionTimestamps.push({
      actionType: "started",
      createdAt: new Date().toISOString(),
    });
    return true;
  };

  const updateQuestionsProgress = async (questions:RunningQuestionModel[], conceptAction: ConceptActionModel) => {
    const quizType = getQuizType(conceptAction);
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

    if (!conceptAction.answeredQuestions) {
      conceptAction.answeredQuestions = [];
    }

    let hasChanges = updateStarted(conceptAction);
    validatedQuestions.forEach((q) => {
      const answeredQuestion = conceptAction.answeredQuestions.find(
        (aq) => aq.questionId === q.questionId
      );
      if (answeredQuestion?.userResponse === q.userResponse) {
        return;
      }
      hasChanges = true;
      conceptAction.answeredQuestions.push(q);
    });

    if (hasChanges) {
      await debouncedUpdate(conceptAction);
    }

  };

  const updateQuestionsResults = async (conceptAction: ConceptActionModel) => {

    if (!conceptAction.actionTimestamps) {
      conceptAction.actionTimestamps = [];
    }
    const actionType = getQuizType(conceptAction);
    conceptAction.actionTimestamps.push({
      actionType,
      createdAt: new Date().toISOString(),
    });
    await debouncedUpdate(conceptAction);
  };
  return { ...calls, list, update, updateQuestionsResults, updateQuestionsProgress, getQuizType, updateStarted };
}
