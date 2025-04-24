export type CompetencyModel = GraphQLModel & {
  id: string;
  name: string;
  description: string;
  locale: Locale;
  objectives: string[];
  subjectId: string;
  subject: SubjectModel;
  concepts: ConceptModel[];
  prerequisites: CompetencyPrerequisiteModel[];
  followUps: CompetencyPrerequisiteModel[];
};

export default function () {
  const prerequisite = useCompetencyPrerequisite();
  const concept = useConcept();
  const conceptPrerequisite = useConceptPrerequisite();
  const { queryCompetency } = useOpenAI();

  const calls = useGraphqlQuery("Competency", [
    "id",
    "name",
    "description",
    "objectives",
    "locale",

    "subjectId",
    "subject.*",

    "concepts.*",
    "concepts.prerequisites.*",

    "prerequisites.id",
    "prerequisites.prerequisite.*",
    "followUps.id",
    "followUps.competency.*",
  ]);

  /**
   * Delete a competency model
   *
   * @param {CompetencyModel} model the model
   * @param {object} options the options
   * @returns {Promise<CompetencyModel>}
   */
  const del = async (
    model: CompetencyModel,
    options: GraphQLOptions = {}
  ): Promise<CompetencyModel> => {
    if (!model?.id) return model;

    // Fetch related data if not already loaded
    if (!model.prerequisites || !model.followUps || !model.concepts) {
      model = (await calls.get(model.id)) as CompetencyModel;
    }
    if (!model) return model;

    // Delete dependencies
    await Promise.all(
      model.prerequisites.map((link) => prerequisite.delete(link))
    );
    await Promise.all(
      model.followUps.map(async (link) => prerequisite.delete(link))
    );

    // Delete related concepts
    await Promise.all(model.concepts.map(async (c) => concept.delete(c)));

    return calls.delete(model, options) as Promise<CompetencyModel>;
  };

  const update = async (input: GraphQLModel, options: GraphQLOptions = {}) => {
    // keep only known fields
    input = calls.pick(input, [
      "id",
      "name",
      "description",
      "objectives",
      "subjectId",
    ]);
    return calls.update(input, options);
  };

  const createWithAI = async (competency: CompetencyModel) => {
    const response = await queryCompetency(
      competency.subject?.name,
      competency.subject?.description,
      competency.name,
      competency.description,
      competency.objectives,
      competency.locale
    );
    console.log("queryCompetency", response);

    if (!response) return null;

    // step 1: create the concepts
    const concepts = (await Promise.all(
      response.concepts.map(
        (c: ConceptResponse) =>
          concept.create({
            name: c.name,
            level: c.level,
            description: c.description,
            locale: competency.locale,
            objectives: c.learning_objectives,
            competencyId: competency.id,
          }) as Promise<ConceptModel>
      )
    )) as ConceptModel[];
    competency.concepts = concepts;

    // step 2: save the prerequisites for the concepts
    await Promise.all(
      response.concepts.map(async (conc: ConceptResponse) => {
        const currentConcept = concepts.find((c) => c.name === conc.name);
        if (!currentConcept) return;
        const prereqs = await Promise.all(
          conc.prerequisites.map((prereq: string) => {
            const existingConcept = concepts.find((c) => c.name === prereq);
            if (existingConcept) {
              return conceptPrerequisite.create({
                conceptId: currentConcept.id,
                prerequisiteId: existingConcept.id,
              });
            }
          })
        );
        currentConcept.prerequisites = prereqs.filter(
          Boolean
        ) as ConceptPrerequisiteModel[];
      })
    );

    return competency;
  };

  const sort = (competencies: CompetencyModel[]) => {
    competencies.forEach((c) => {
      c.prerequisites =
        c.prerequisites?.map((p) => ({
          ...p,
          prerequisite: competencies.find((c) => c.id === p.prerequisiteId),
        })) || [];
    });
    let run = true;
    while (run) {
      run = false;
      let updated = false;
      competencies.forEach((c) => {
        if (c.order === undefined) {
          if (!c.prerequisites?.length) {
            c.order = 0;
            updated = true;
          } else if (
            c.prerequisites.every((p) => p.prerequisite?.order !== undefined)
          ) {
            c.order =
              Math.max(...c.prerequisites.map((p) => p.prerequisite?.order)) +
              1;
            updated = true;
          } else {
            run = true;
          }
        }
      });
      if (!updated) {
        // in case of loops, we stop the loop
        run = false;
      }
    }
    competencies.sort((a, b) => a.order - b.order);
  };

  const getLastQuizTime = (action, lastQuizTime = 0) => {
    return (
      action?.actionTimestamps?.reduce(
        (acc, a) => {
          if (a.actionType === "started" || a.actionType === "finished") {
            return acc;
          } 
          const time = new Date(a.createdAt).getTime();
          if (lastQuizTime && time >= lastQuizTime) {
            return acc;
          }
          return time > acc.time ? { time, type: a.actionType } : acc;
        },
        { time: 0 }
      ) || { time: 0 }
    );
  };

  const levels = ["novice", "beginner", "intermediate", "advanced", "expert"];

  const computeLevel = (competency) => {

    const action = competency.action;

    const lastQuizTime = getLastQuizTime(action).time;
    const prevQuizTime = getLastQuizTime(action, lastQuizTime).time;

    let questions = action?.answeredQuestions?.filter((q) => {
      const date = new Date(q.createdAt).getTime();
      return date > prevQuizTime && date <= lastQuizTime;
    }) || [];

    // did we run question in the conconcept, if yes:
    // - find all the question that are part of the conceptm and remove them from the list
    // - add the latest run of question 
    competency.concepts?.forEach((concept) => {
      if (!concept.action) {
        return;
      }
      // have we run a quiz for this concept
      const conceptLastQuizTime = getLastQuizTime(concept.action).time;
      if (!conceptLastQuizTime) {
        return;
      }
      // remove questions that are in the answeredQuestions of the concept
      const conceptQuestionsIds = concept.action.answeredQuestions?.map((q) => q.questionId);
      questions = questions.filter((q) => !conceptQuestionsIds?.includes(q.questionId));

      // add the latest question
      const conceptPrevQuizTime = getLastQuizTime(concept.action, conceptLastQuizTime).time;
      const conceptQuestions = concept.action.answeredQuestions?.filter((q) => {
        const date = new Date(q.createdAt).getTime();
        return date > conceptPrevQuizTime && date <= conceptLastQuizTime;
      }) || [];
      questions.push(...conceptQuestions);
    });

    if (!questions || questions.length === 0) {
      return null;
    }

    const levelCount = levels.reduce((acc, level) => {
      acc[level] = { total: 0, correct: 0 };
      return acc;
    }, {});

    questions?.forEach((q) => {
      const level = q.level;
      levelCount[level].total++;
      if (q.isValid) {
        levelCount[level].correct++;
        for (let i = levels.indexOf(level) - 1; i >= 0; i--) {
          levelCount[levels[i]].correct++;
          levelCount[levels[i]].total++;
        }
      } else {
        for (let i = levels.indexOf(level) + 1; i < levels.length; i++) {
          levelCount[levels[i]].total++;
        }
      }
    });

    return levels.reduce((currentLevel, level) => {
      const successRate = levelCount[level].correct / levelCount[level].total;
      return successRate >= 0.75 && levelCount[level].total >= 3
        ? level
        : currentLevel;
    }, "novice");
  };

  return {
    ...calls,
    update,
    delete: del,
    createWithAI,
    sort,
    getLastQuizTime,
    computeLevel,
  };
}
