


export type ConceptModel = GraphQLModel & {
  id: string;
  name: string;
  description: string;
  locale: Locale;
  objectives: string[];
  theory: string;
  examples: string;
  questions: QuestionModel[];
  flashCards: FlashCardModel[];
  prerequisites: ConceptPrerequisiteModel[];
  followUps: ConceptPrerequisiteModel[];
  competencyId: string;
};



export default function () {
  const question = useQuestion();
  const flashCard = useFlashCard();
  const prerequisite = useConceptPrerequisite();
  const { queryConcept, queryQuiz } = useOpenAI();

  const calls = useGraphqlQuery('Concept', [
    'id',
    'name',
    'description',
    'objectives',
    'theory',
    'examples',
    "locale",

    'questions.*',
    'flashCards.*',

    "prerequisites.id",
    "prerequisites.prerequisite.*",
    "followUps.id",
    "followUps.concept.*",

    'competency.*'
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

  const update = async (input: GraphQLModel, options: GraphQLOptions = {}) => {
    // keep only known fields
    input = calls.pick(input, [ 'id', 'name', 'description', 'objectives', 'theory', 'examples', 'competencyId']);
    return calls.update(input, options);
  };

  const createWithAI = async (concept: ConceptModel) => {
    const response = await queryConcept(
      concept.name,
      concept.description,
      concept.objectives,
      concept.locale
    );
    console.log("queryConcept", response);

    // Step 1, update the concept from the response and save it
    concept.description = response.description;
    concept.objectives = response.learning_objectives;
    if(response.theory){
      concept.theory = response.theory;
    }
    if (response.examples){
      concept.examples = response.examples
    }
    await update(concept);

    // Step 2 create the flashcards
    concept.flashCards = await Promise.all(
      response.flashcards.map((fc: FlashCardResponse) =>
        flashCard.create({
          question: fc.question,
          answer: fc.answer,
          notes: fc.notes,
          conceptId: concept.id
        }) as Promise<FlashCardModel>
      )
    );
    return concept;
  };

  const addQuizWithAI = async (concept: ConceptModel, level: number, locale: Locale = "en") => {
    const name = concept.name;
    const summary = concept.description;
    const objectives = concept.objectives.filter(Boolean);
    const theory = concept.theory;
    const examples = concept.examples;

    if (!name || !summary || !objectives || !theory || !examples) {
      return null;
    }

    const response = await queryQuiz(name, summary, objectives, theory, examples, level, locale);
    console.log("response", response);

    const filteredResponse = response.filter((q) => q.text && q.answers?.length && q.type);
    const questions = await Promise.all(filteredResponse.map((q) =>
      question.create({
        text: q.text,
        explanations: q.explanations,
        answers: q.answers.map((a) => ({
          text: a.text,
          valid: a.valid,
        })),
        type: q.type,
        level: q.level,
        conceptId: concept.id
      }))) as QuestionModel[];

      if (!concept.questions) concept.questions = [];
      concept.questions = [...concept.questions, ...questions];
      return concept;
  };

  const sort = (concepts: ConceptModel[]) => {
    concepts.forEach((c) => {
      c.prerequisites = c.prerequisites?.map((p) => ({...p, prerequisite: concepts.find((c) => c.id === p.prerequisiteId)})) || [];
    });
    let run = true;
    while (run){
      run = false;
      let updated = false;
      concepts.forEach((c) => {
        if (c.order === undefined){
          if (!c.prerequisites?.length) {
            c.order = 0;
            updated = true;
          } else if (c.prerequisites.every((p) => p.prerequisite?.order !== undefined)){
            c.order = Math.max(...c.prerequisites.map((p) => p.prerequisite?.order)) + 1;
            updated = true;
          } else {
            run = true;
          }
        }
      });
      if (!updated){
        // in case of loops, we stop the loop
        run = false;
      }
    }
    concepts.sort((a, b) => a.order - b.order);
  }


  return {
    ...calls,
    delete: del,
    update,
    createWithAI,
    addQuizWithAI,
    sort
  };
}
