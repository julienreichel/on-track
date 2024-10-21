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
  const { querySection } = useOpenAI();

  const calls = useGraphqlQuery(
    "Section",
    [
      "id",
      "name.*",
      "introduction.*",
      "theory.*",
      "examples.*",
      "lecture.*",
      "lecture.sections.*",
      "questions.*",
    ],
    ["id", "name.*"]
  );

  const createWithAI = async (lecture: LectureModel, locale: locale = "en") => {
    const name = lecture.name[locale];
    const description = lecture.description[locale];
    const objectives = lecture.objectives
      .map((o) => o[locale])
      .filter(Boolean) as string[];
    const sections = lecture.sections
      .filter((s) => !s.introduction)
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

    // need to update the sections with the response
    await Promise.all(
      response.map((newSection: SectionsResponse) => {
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

        calls.update(section);
      })
    );

    return response;
  };

  calls.createWithAI = createWithAI;

  return calls;
}
