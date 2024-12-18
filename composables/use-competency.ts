export type CompetencyModel = GraphQLModel & {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  subjectId: string;
  concepts: ConceptModel[];
  prerequisites: CompetencyModel[];
  followUps: CompetencyModel[];
};

export default function () {
  const prerequisite = useCompetencyPrerequisite();
  const concept = useConcept();

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

  const createWithAI = async (subject: SubjectModel, locale: Locale = "en") => {
    return { touchedCompetencies: [] };  // TODO
  };


  return {
    ...calls,
    delete: del,
    createWithAI
  };
}
