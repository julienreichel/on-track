export type SubjectModel = GraphQLModel & {
  id: string;
  name: string;
  description: string;
  locale: Locale;
  competencies: CompetencyModel[];
};

export default function () {
  const competency = useCompetency();
  const competencyPrerequisite = useCompetencyPrerequisite();
  const concept = useConcept();
  const conceptPrerequisite = useConceptPrerequisite();
  const { querySubject, querySubjectV2 } = useOpenAI();

  const calls = useGraphqlQuery("Subject", [
    "id",
    "name",
    "description",
    "locale",

    "competencies.*",
    'competencies.prerequisites.*',
    "competencies.concepts.id",
    "competencies.concepts.name",
  ], [
    "id",
    "name",
    "description"
  ]);

  // Add missing service definitions for fetchUserSubjects
  const competencyActionService = useCompetencyAction();
  const conceptActionService = useConceptAction();

  /**
   * Delete a subject model
   *
   * @param {SubjectModel} model the model
   * @param {object} options the options
   * @returns {Promise<SubjectModel>}
   */
  const del = async (
    model: SubjectModel,
    options: GraphQLOptions = {}
  ): Promise<SubjectModel> => {
    if (!model?.id) return model;

    console.log("delete subject", JSON.stringify(model, null, 2));
    // Fetch related data if not already loaded
    if (!model.competencies) {
      model = await calls.get(model.id) as SubjectModel;
      console.log("got", JSON.stringify(model, null, 2));
    }
    if (!model) return model;


    // Delete related competencies
    await Promise.all(
      model.competencies.map(async (comp) => competency.delete(comp))
    );

    return calls.delete(model, options) as Promise<SubjectModel>;
  };

  const createWithAI = async (
    subjectDescription: string,
    locale: Locale = "en"
  ) : Promise<SubjectModel | null> => {
    const response = await querySubject(subjectDescription, locale);
    console.log("querySubject", response);

    if (!response) return null;

    // step 1 create the new subject
    const newSubject = await calls.create({
      name: response.name,
      description: response.description,
      locale
    }) as SubjectModel;

    // step 2 create the competencies
    const competencies = await Promise.all(
      response.competencies.map((comp: CompetencyResponse) =>
        competency.create({
          name: comp.name,
          description: comp.description,
          locale,
          objectives: comp.learning_objectives,
          subjectId: newSubject.id,
        }) as Promise<CompetencyModel>
      )
    );
    newSubject.competencies = competencies;

    // step 3 generate the prerequisites for the competencies
    await Promise.all(
      response.competencies.map(async (comp: CompetencyResponse) => {
        const currentCompetency = competencies.find((c) => c.name === comp.name);
        if (!currentCompetency) return;
        const prereqs = await Promise.all(
          comp.prerequisites.map((prereq: string) => {
            const existingComp = competencies.find((c) => c.name === prereq);
            if (existingComp) {
              return competencyPrerequisite.create({
                competencyId: currentCompetency.id,
                prerequisiteId: existingComp.id,
              });
            }
          })
        );
        currentCompetency.prerequisites = prereqs.filter(Boolean) as CompetencyPrerequisiteModel[];
      })
    );

    return newSubject;
  };

  const createWithAIV2 = async (
    subjectDescription: string,
    length: number,
    locale: Locale = "en"
  ): Promise<SubjectModel | null> => {
    const response = await querySubjectV2(subjectDescription, length, locale);
    console.log("querySubjectV2", response);
  
    if (!response) return null;
  
    // Step 1: create the subject
    const newSubject = (await calls.create({
      name: response.name,
      description: response.description,
      locale
    })) as SubjectModel;
  
    const allConcepts: {
      model: ConceptModel;
      response: ConceptResponse;
    }[] = [];
  
    // Step 2: create competencies and concepts (first pass)
    const competencies = await Promise.all(
      response.competencies.map(async (comp: CompetencyResponse) => {
        const compModel = (await competency.create({
          name: comp.name,
          description: comp.description,
          locale,
          objectives: comp.learning_objectives,
          subjectId: newSubject.id,
        })) as CompetencyModel;
  
        // Create concepts and collect for second-pass prerequisite linking
        const concepts = await Promise.all(
          comp.concepts.map(async (c: ConceptResponse) => {
            const conceptModel = (await concept.create({
              name: c.name,
              level: c.level,
              mva: c.mva,
              reflect: c.reflect,
              facts: c.facts,
              description: c.description,
              locale,
              objectives: c.learning_objectives,
              competencyId: compModel.id,
            })) as ConceptModel;
  
            allConcepts.push({ model: conceptModel, response: c });
            return conceptModel;
          })
        );
  
        compModel.concepts = concepts;
        return compModel;
      })
    );
  
    newSubject.competencies = competencies;
  
    // Step 3: create concept prerequisites (across all competencies)
    await Promise.all(
      allConcepts.map(async ({ model, response }) => {
        const prereqs = await Promise.all(
          response.prerequisites.map((prereqName: string) => {
            const prereqConcept = allConcepts.find((c) => c.model.name === prereqName);
            if (prereqConcept) {
              return conceptPrerequisite.create({
                conceptId: model.id,
                prerequisiteId: prereqConcept.model.id,
              });
            }
          })
        );
        model.prerequisites = prereqs.filter(Boolean) as ConceptPrerequisiteModel[];
      })
    );
  
    // Step 4: create competency prerequisites
    await Promise.all(
      response.competencies.map(async (comp: CompetencyResponse) => {
        const currentComp = competencies.find((c) => c.name === comp.name);
        if (!currentComp) return;
  
        const prereqs = await Promise.all(
          comp.prerequisites.map((prereq: string) => {
            const prereqComp = competencies.find((c) => c.name === prereq);
            if (prereqComp) {
              return competencyPrerequisite.create({
                competencyId: currentComp.id,
                prerequisiteId: prereqComp.id,
              });
            }
          })
        );
        currentComp.prerequisites = prereqs.filter(Boolean) as CompetencyPrerequisiteModel[];
      })
    );
  
    return newSubject;
  };
  
  // Types for actions and startedCompetency
  interface CompetencyAction {
    competencyId: string;
    state?: string;
    type?: string;
    [key: string]: unknown;
  }
  interface StartedCompetency extends CompetencyModel {
    state: string;
  }

  // Extend ConceptAction type for state computation
  interface ConceptAction {
    conceptId: string;
    answeredQuestions?: { isValid: boolean }[];
    actionTimestamps?: { actionType: string }[];
    [key: string]: unknown;
  }

  /**
   * Fetch the subjects the user is currently working on, sorted by most recent activity (max N, default 5)
   */
  const fetchUserSubjects = async (max: number = 5): Promise<SubjectModel[]> => {
    // @ts-expect-error: NuxtApp type is unknown, but $Amplify.Auth is present in runtime
    const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
    const currentUser = await getCurrentUser();
    const { userId, username } = currentUser;
    // Fetch all actions
    const [competencyActions, conceptActions] = await Promise.all([
      competencyActionService.list({ userId, username }),
      conceptActionService.list({ userId, username })
    ]);
    // Extract unique subjectIds and last action date
    const subjectIdToLastAction: Record<string, Date> = {};
    const subjectIds = new Set<string>();
    function extractActionWithSubject(a: Record<string, unknown>): { subjectId?: string, actionTimestamps?: { createdAt: string }[], createdAt?: string } {
      return {
        subjectId: typeof a.subjectId === 'string' ? a.subjectId : undefined,
        actionTimestamps: Array.isArray(a.actionTimestamps) ? a.actionTimestamps as { createdAt: string }[] : undefined,
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : undefined
      };
    }
    function processActionRaw(a: Record<string, unknown>) {
      const { subjectId, actionTimestamps, createdAt } = extractActionWithSubject(a);
      if (!subjectId) return;
      subjectIds.add(subjectId);
      let lastDate: Date | undefined = undefined;
      if (Array.isArray(actionTimestamps) && actionTimestamps.length) {
        const last = actionTimestamps[actionTimestamps.length-1];
        if (last && last.createdAt) lastDate = new Date(last.createdAt);
      } else if (createdAt) {
        lastDate = new Date(createdAt);
      }
      if (lastDate) {
        const prev = subjectIdToLastAction[subjectId];
        if (!prev || lastDate > prev) subjectIdToLastAction[subjectId] = lastDate;
      }
    }
    competencyActions.forEach(processActionRaw);
    conceptActions.forEach(processActionRaw);
    // Sort subjectIds by last action, take the top N, and fetch those subjects
    const sortedSubjectIds = Array.from(subjectIds)
      .sort((a, b) => {
        const dateA = subjectIdToLastAction[a] || new Date(0);
        const dateB = subjectIdToLastAction[b] || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, max);
    const subjectPromises = sortedSubjectIds.map(id => calls.get(id));
    const subjects = (await Promise.all(subjectPromises)).filter((s): s is SubjectModel => !!s);

    // Map competencyId to the latest action for quick lookup
    const competencyIdToAction: Record<string, CompetencyAction> = {};
    for (const action of competencyActions as CompetencyAction[]) {
      if (typeof action.competencyId === 'string') {
        // Always keep the latest action (assuming actions are sorted oldest to newest)
        competencyIdToAction[action.competencyId] = action;
      }
    }
    // Map conceptId to the latest action for quick lookup
    const conceptIdToAction: Record<string, ConceptAction> = {};
    for (const action of conceptActions as ConceptAction[]) {
      if (typeof action.conceptId === 'string') {
        conceptIdToAction[action.conceptId] = action;
      }
    }

    // Helper: determine state from action (customize as needed)
    function getCompetencyState(action?: CompetencyAction, concepts: Array<{ state?: string }> = []): string {
      if (!action) return 'not_started';
      // 1. If actionTimestamps has a final-quiz, state = mastered
      if (Array.isArray(action.actionTimestamps) && action.actionTimestamps.some((ts: { actionType: string }) => ts.actionType === 'final-quiz')) {
        return 'mastered';
      }
      // 2. If all concepts are in state revision or mastered, state = ready_for_final
      const totalConcepts = concepts.length;
      const revisionOrMastered = concepts.filter(c => c.state === 'revision' || c.state === 'mastered').length;
      const started = concepts.filter(c => c.state === 'started').length;
      if (totalConcepts > 0 && revisionOrMastered === totalConcepts) {
        return 'ready_for_final';
      }
      // 3. If some concepts are in revision/mastered or actionTimestamps has a pre-quiz, state = started
      if (
        (totalConcepts > 0 && revisionOrMastered + started > 0) ||
        (Array.isArray(action.actionTimestamps) && action.actionTimestamps.some((ts: { actionType: string }) => ts.actionType === 'pre-quiz'))
      ) {
        return 'started';
      }
      // 4. Otherwise, state = not_started
      return 'not_started';
    }

    // Helper: determine state from concept action
    function getConceptState(action?: ConceptAction): string {
      if (!action) return 'not_started';
      if (Array.isArray(action.answeredQuestions) && action.answeredQuestions.filter((q) => q.isValid).length >= 20) {
        return 'mastered';
      }
      if (Array.isArray(action.actionTimestamps) && action.actionTimestamps.some((ts) => ts.actionType === 'finished')) {
        return 'revision';
      }
      if (Array.isArray(action.actionTimestamps) && action.actionTimestamps.some((ts) => ts.actionType === 'started')) {
        return 'started';
      }
      return 'not_started';
    }

    // Helper: compute next review date for a concept
    function getConceptNextReview(action?: ConceptAction): Date | undefined {
      if (!action || !Array.isArray(action.actionTimestamps) || !Array.isArray(action.answeredQuestions)) return undefined;
      // If mastered, no review needed
      if (Array.isArray(action.answeredQuestions) && action.answeredQuestions.filter((q) => q.isValid).length >= 20) {
        return undefined;
      }
      const reviews = action.actionTimestamps.filter(({ actionType }) => ['review', 'quiz'].includes(actionType));
      const nbReviews = reviews.length;
      if (nbReviews === 0) return undefined;
      const lastReview = reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const nextReviewIn = Math.min(10, nbReviews * nbReviews) * 12 * 60 * 60 * 1000;
      let nextReviewDate = new Date(new Date(lastReview.createdAt).getTime() + nextReviewIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (nextReviewDate < today) {
        nextReviewDate = today;
      }
      return nextReviewDate;
    }

    // For each subject, add startedCompetencies with .state and inject action into competency and concepts
    for (const subject of subjects) {
      if (!subject.competencies) {
        (subject as SubjectModel & { startedCompetencies: StartedCompetency[] }).startedCompetencies = [];
        continue;
      }
      const started: StartedCompetency[] = [];
      for (const comp of subject.competencies) {
        const action = competencyIdToAction[comp.id];
        const compConcepts = comp.concepts || [];
        // Compute state for each concept first (already done below, but ensure we have it for state computation)
        if (Array.isArray(compConcepts)) {
          for (const concept of compConcepts) {
            const conceptAction = conceptIdToAction[concept.id];
            if (conceptAction) {
              concept.action = conceptAction;
              concept.state = getConceptState(conceptAction);
              const nextReview = getConceptNextReview(conceptAction);
              if (nextReview) concept.nextReview = nextReview;
            }
          }
        }
        if (action) {
          comp.action = action; // Inject action into competency
          // Compute completion count for revision/mastered concepts
          const revisionOrMasteredCount = compConcepts.filter(c => c.state === 'revision' || c.state === 'mastered').length;
          const state = getCompetencyState(action, compConcepts);
          const compWithState: StartedCompetency & { action?: CompetencyAction, revisionOrMasteredCount?: number, totalConcepts?: number } = {
            ...comp,
            state,
            action,
            revisionOrMasteredCount,
            totalConcepts: compConcepts.length
          };
          started.push(compWithState);
        }
      }
      (subject as SubjectModel & { startedCompetencies: StartedCompetency[] }).startedCompetencies = started;
    }

    return subjects;
  };

  return {
    ...calls,
    delete: del,
    createWithAI,
    createWithAIV2,
    fetchUserSubjects
  };
}
