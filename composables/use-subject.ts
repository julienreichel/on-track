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
  
  

  return {
    ...calls,
    delete: del,
    createWithAI,
    createWithAIV2
  };
}
