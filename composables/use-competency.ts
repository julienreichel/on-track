export type CompetencyModel = GraphQLModel & {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  subjectId: string;
  concepts: ConceptModel[];
  prerequisites: CompetencyPrerequisiteModel[];
  followUps: CompetencyPrerequisiteModel[];
};

export default function () {
  const prerequisite = useCompetencyPrerequisite();
  const concept = useConcept();
  const conceptPrerequisite = useConceptPrerequisite();
  const { queryCompetency } = useOpenAI();


  const calls = useGraphqlQuery('Competency', [
    'id',
    'name',
    'description',
    'objectives',

    'subjectId',
    'subject.*',

    'concepts.*',

    'prerequisites.id',
    'prerequisites.prerequisite.*',
    'followUps.id',
    'followUps.competency.*',
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
    await Promise.all(
      model.concepts.map(async (c) => concept.delete(c))
    );

    return calls.delete(model, options) as Promise<CompetencyModel>;
  };

  const createWithAI = async (competency: CompetencyModel, locale: Locale = "en") => {
    const response = await queryCompetency(
      competency.name,
      competency.description,
      competency.objectives,
      locale
    );
    console.log("queryCompetency", response);

    if (!response) return null;

    // step 1: create the concepts
    const concepts = await Promise.all(
      response.concepts.map((c: ConceptResponse) =>
        concept.create({
          name: c.name,
          description: c.description,
          objectives: c.learning_objectives,
          competencyId: competency.id,
        }) as Promise<ConceptModel>
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
          }
        ));
        currentConcept.prerequisites = prereqs.filter(Boolean) as ConceptPrerequisiteModel[];
      })
    );

    return competency;
  };


  return {
    ...calls,
    delete: del,
    createWithAI
  };
}
