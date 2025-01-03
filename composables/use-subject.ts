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
  const { querySubject } = useOpenAI();

  const calls = useGraphqlQuery("Subject", [
    "id",
    "name",
    "description",
    "locale",

    "competencies.*",
    'competencies.prerequisites.*',
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

  return {
    ...calls,
    delete: del,
    createWithAI,
  };
}
