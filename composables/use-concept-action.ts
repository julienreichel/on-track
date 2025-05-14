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
    'actionTimestamps.*',
    'notes'
  ]);

  const list = (input: GraphQLParams = {}, options: GraphQLOptions = {}) => {
    const params = {...input};
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

      action.startAction = action.actionTimestamps.find((a) => a.actionType === "started");
      action.finishAction = action.actionTimestamps.find((a) => a.actionType === "finished");
      

      if (!action.answeredQuestions) {
        action.answeredQuestions = [];
      }
      action.answeredQuestions.forEach((q) => {
        q.createdAt = new Date(q.createdAt);
      });
      action.answeredQuestions.sort((a, b) => a.createdAt - b.createdAt);

      action.reviewed = action.answeredQuestions.filter((q) => q.isValid).length >= 20;
    });
    return actions;
  };
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
    if (!conceptAction.actionTimestamps) {
      conceptAction.actionTimestamps = [];
    }
    if (conceptAction.actionTimestamps.some((a) => a.actionType === "started")) {
      return false;
    }
    
    conceptAction.actionTimestamps.push({
      actionType: "started",
      createdAt: new Date().toISOString(),
    });
    return true;
  };

  const updateQuestionsProgress = async (questions:RunningQuestionModel[], conceptAction: ConceptActionModel) => {
    const quizType = getQuizType(conceptAction);
    const validatedQuestions = questions
      .filter((q) => q.validated && !q.saved)
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

    questions.forEach((q) => {
      q.saved = true;
    });
      

    if (!conceptAction.answeredQuestions) {
      conceptAction.answeredQuestions = [];
    }

    let hasChanges = updateStarted(conceptAction);
    if(validatedQuestions.length) {
      hasChanges = true;
      conceptAction.answeredQuestions.push(...validatedQuestions);
    }

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

  const toHumanDuration = (duration: number) => {
    duration = duration / 1000;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    let text = "";
    if (hours > 0) text += `${hours}h `;
    if (minutes > 0) text += `${minutes}min `;
    if (text.length > 0 && hours > 0) {
      return text.trim();
    }
    if (seconds > 0) text += `${seconds}s`;
    return text.length > 0 ? text.trim() : "N/A";
  };

  const calculateDuration = (startAction, finishAction) => {
    if (!startAction || !finishAction) return 0;
    return finishAction.createdAt - startAction.createdAt;
  };

  const filterActionsByDuration = (actions: ConceptActionModel[], maxDuration: number, isLessThan = true) => {
    return actions.filter((action) => {
      const duration = calculateDuration(action.startAction, action.finishAction);
      return duration !== 0 && (isLessThan ? duration < maxDuration : duration >= maxDuration);
    });
  };

  const computeAverageDuration = (actions: ConceptActionModel[], maxDuration: number, isLessThan = true) => {
    const filteredActions = filterActionsByDuration(actions, maxDuration, isLessThan);
    const durations = filteredActions.map((action) =>
      calculateDuration(action.startAction, action.finishAction)
    );
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length || 0;
    return toHumanDuration(avg);
  };

  const computeMedianDuration = (actions: ConceptActionModel[], maxDuration: number, isLessThan = true) => {
    const filteredActions = filterActionsByDuration(actions, maxDuration, isLessThan);
    const durations = filteredActions.map((action) =>
      calculateDuration(action.startAction, action.finishAction)
    );
    const [p15, median, p85] = calculatePercentiles(durations, [15, 50, 85]);
    return {
      median: toHumanDuration(median),
      p15: toHumanDuration(p15),
      p85: toHumanDuration(p85),
    };
  };

  const computeAverageRuns = (actions: ConceptActionModel[], maxDuration: number) => {
    const multipleRunActions = filterActionsByDuration(actions, maxDuration, false);
    const totalRuns = multipleRunActions.reduce((sum, action) => {
      if (!action.startAction || !action.finishAction) return 0;
      const pageActions = action.actionTimestamps.filter(
        (a) =>
          a.actionType === "page" &&
          a.createdAt > action.startAction?.createdAt &&
          a.createdAt < action.finishAction?.createdAt
      );
      return sum + (pageActions.length ? pageActions.length + 1 : 2);
    }, 0);
    return (totalRuns / multipleRunActions.length).toFixed(1);
  };

  const calculatePercentiles = (values, percentiles) => {
    values.sort((a, b) => a - b);
    return percentiles.map((p) => {
      const index = (p / 100) * (values.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return values[lower];
      return values[lower] + (index - lower) * (values[upper] - values[lower]);
    });
  };

  const computeLevelStatistics = (actions: ConceptActionModel[], maxAllowedQuizTime: number) => {
    const levels: Record<string, { success: number; total: number; times: number[] }> = {};
    actions.forEach((action) => {
      action.answeredQuestions.forEach((q, index, questions) => {
        if (!levels[q.level]) levels[q.level] = { success: 0, total: 0, times: [] };
        levels[q.level].success += q.isValid ? 1 : 0;
        levels[q.level].total += 1;

        if (index > 0) {
          const prevQuestion = questions[index - 1];
          const timeDiff = q.createdAt - prevQuestion.createdAt;
          if (timeDiff <= maxAllowedQuizTime) levels[q.level].times.push(timeDiff);
        }
      });
    });

    const levelOrder = ["novice", "beginner", "intermediate", "advanced", "expert"];
    return Object.keys(levels)
      .sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b))
      .map((level) => {
        const { times, success, total } = levels[level];
        const [p15, median, p85] = calculatePercentiles(times, [15, 50, 85]);
        return {
          level,
          successPercentage: total ? ((success / total) * 100).toFixed(0) : "0",
          medianTime: median ? toHumanDuration(median) : "N/A",
          p15Time: p15 ? toHumanDuration(p15) : "N/A",
          p85Time: p85 ? toHumanDuration(p85) : "N/A",
        };
      });
  };

  return {
    ...calls,
    list,
    listFormated,
    update,
    updateQuestionsResults,
    updateQuestionsProgress,
    getQuizType,
    updateStarted,
    toHumanDuration,
    calculateDuration,
    filterActionsByDuration,
    computeAverageDuration,
    computeMedianDuration,
    computeAverageRuns,
    computeLevelStatistics,
  };
}
