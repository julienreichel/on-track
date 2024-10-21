export type QuestionAnswerModel = {
  text: LocalizedText;
  valid: boolean;
};

export type QuestionModel = {
  id: string;
  text: LocalizedText;
  explanations: LocalizedText;
  answers: QuestionAnswerModel[];
  type: string;
  level: string;
};

export type SectionModel = GraphQLModel & {
  id: string;
  name: LocalizedText;
  introduction: LocalizedText;
  theory: LocalizedText;
  examples: LocalizedText;
  questions: QuestionModel[];
  lectureId: string;
  objectives: LocalizedText[];
  lecture: { id: string };
};

type locale = "en" | "fr";

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

  const addQuizWithAI = async (section: SectionModel, level: number, locale: locale = "en") => {
    const name = section.name[locale];
    const summary = section.introduction[locale];
    const objectives = section.objectives
      .map((o) => o[locale])
      .filter(Boolean) as string[];
    const theory = section.theory[locale];
    const examples = section.examples[locale];

    if (!name || !summary || !objectives || !theory || !examples) {
      return null;
    }

    const response = await queryQuiz(name, summary, objectives, theory, examples, level);
    console.log("response", response);

    if (!section.questions) section.questions = [];
    section.questions.push(...response.map((q) => {
      return {
        text: { [locale]: q.text },
        explanations: { [locale]: q.explanations },
        answers: q.answers.map((a) => ({
          text: { [locale]: a.text },
          valid: a.valid,
        })),
        type: q.type,
        level: q.level,
        id: Math.random().toString(34).substring(2)
      } as QuestionModel;
    }));
  };

  const createWithAI = async (lecture: LectureModel, locale: locale = "en") => {
    const name = lecture.name[locale];
    const description = lecture.description[locale];
    const objectives = lecture.objectives
      .map((o) => o[locale])
      .filter(Boolean) as string[];
    const sections = lecture.sections
      .filter((s) => !s.introduction || !s.theory || !s.examples)
      .map((s) => s.name[locale])
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
          (s) => s.name[locale] === newSection.name
        );
        if (!section) return;
        if (!section.introduction) section.introduction = {};
        section.introduction[locale] = newSection.introduction;

        if (!section.theory) section.theory = {};
        section.theory[locale] = newSection.theory;

        if (!section.examples) section.examples = {};
        section.examples[locale] = newSection.examples;

        if (!section.objectives) section.objectives = [];
        newSection.objectives.forEach((obj) => {
          section.objectives.push({ [locale]: obj });
        });

        await calls.update(section);

        await Promise.all([1, 2, 3, 4].map(l => addQuizWithAI(section, l, locale)));

        calls.update(section);
      })
    );

    return response;
  };

  calls.createWithAI = createWithAI;
  calls.addQuizWithAI = addQuizWithAI;

  return calls;
}
