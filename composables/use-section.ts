export type QuestionAnswerModel = {
  text: string;
  valid: boolean;
};

export type QuestionModel = {
  id: string;
  text: string;
  explanations: string;
  answers: QuestionAnswerModel[];
  type: string;
  level: string;
};

export type SectionModel = GraphQLModel & {
  id: string;
  name: string;
  introduction: string;
  theory: string;
  examples: string;
  questions: QuestionModel[];
  lectureId: string;
  objectives: string[];
  lecture: { id: string };
};

export default function () {
  const { querySection, queryQuiz } = useOpenAI();

  const calls = useGraphqlQuery(
    "Section",
    [
      "id",
      "name.*",
      "introduction.*",
      "objectives.*",
      "theory.*",
      "examples.*",
      "lecture.*",
      "lecture.sections.*",
      "questions.*",
    ],
    ["id", "name.*"]
  );

  const addQuizWithAI = async (section: SectionModel, level: number) => {
    const name = section.name;
    const summary = section.introduction;
    const objectives = section.objectives
      .filter(Boolean) as string[];
    const theory = section.theory;
    const examples = section.examples;

    if (!name || !summary || !objectives || !theory || !examples) {
      return null;
    }

    const response = await queryQuiz(name, summary, objectives, theory, examples, level);
    console.log("response", response);

    if (!section.questions) section.questions = [];
    section.questions.push(...response.map((q) => {
      return {
        text: q.text,
        explanations: q.explanations,
        answers: q.answers.map((a) => ({
          text: a.text,
          valid: a.valid,
        })),
        type: q.type,
        level: q.level,
        id: Math.random().toString(34).substring(2)
      } as QuestionModel;
    }));
  };

  const createWithAI = async (lecture: LectureModel) => {
    const name = lecture.name;
    const description = lecture.description;
    const objectives = lecture.objectives
      .filter(Boolean) as string[];
    const sections = lecture.sections
      .filter((s) => !s.introduction || !s.theory || !s.examples)
      .map((s) => s.name)
      .filter(Boolean) as string[];

    if (!name || !description || !objectives || !sections) {
      return null;
    }

    const response = await querySection(
      name,
      description,
      objectives,
      sections
    );

    // need to update the sections with the response from AI, and generate the questions
    await Promise.all(
      response.map(async (newSection: SectionsResponse) => {
        // find the section in the lecture
        const section = lecture.sections.find(
          (s) => s.name === newSection.name
        );
        if (!section) return;
        section.introduction = newSection.introduction || "";
        section.theory = newSection.theory || "";
        section.examples = newSection.examples || "";

        if (!section.objectives) section.objectives = [];
        newSection.objectives.forEach((obj) => {
          if (obj) section.objectives.push(obj);
        });

        await calls.update(section);

        await Promise.all([1, 2, 3, 4].map(l => addQuizWithAI(section, l)));

        calls.update(section);
      })
    );

    return response;
  };

  calls.createWithAI = createWithAI;
  calls.addQuizWithAI = addQuizWithAI;

  return calls;
}
