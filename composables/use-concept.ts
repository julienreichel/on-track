
export type ConceptModel = GraphQLModel & {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  theory: string;
  examples: string;
  questions: QuestionModel[];
  flashCards: FlashCardModel[];
  prerequisites: ConceptModel[];
  followUps: ConceptModel[];
  competencyId: string;
};

export default function () {
  const question = useQuestion();
  const flashCard = useFlashCard();
  const prerequisite = useConceptPrerequisite();

  const calls = useGraphqlQuery('Concept', [
    'id',
    'name',
    'description',
    'objectives',
    'theory',
    'examples',

    'questions.*',
    'flashCards.*',

    "prerequisites.id",
    "prerequisites.prerequisite.*",
    "followUps.id",
    "followUps.concept.*",

    'competencyId'
  ]);

  /**
   * Delete a model
   *
   * @param {ConceptModel} model the model
   * @param {object} options the options
   * @returns {Promise<LectureModel>}
   */
  const del = async (
    model: ConceptModel,
    options: GraphQLOptions = {}
  ): Promise<ConceptModel> => {
    if (!model?.id) return model;
    //must delete the prerequisites and followUps and sections first
    if (!model.prerequisites || !model.followUps || !model.questions || !model.flashCards) {
      model = (await calls.get(model.id)) as ConceptModel;
    }
    // this no longer exists
    if (!model) return model;

    await Promise.all(
      model.prerequisites.map((link) => prerequisite.delete(link))
    );
    await Promise.all(
      model.followUps.map(async (link) => prerequisite.delete(link))
    );
    await Promise.all(
      model.questions.map(async (q) => question.delete(q))
    );
    await Promise.all(
      model.flashCards.map(async (fc) => flashCard.delete(fc))
    );

    return calls.delete(model, options) as Promise<ConceptModel>;
  };

  const createWithAI = async (competency: CompetencyModel, locale: Locale = "en") => {
    return { touchedConcepts: [] };  // TODO
  };

  return {
    ...calls,
    delete: del,
    createWithAI
  };
}
