export type LectureModel = GraphQLModel & {
  id: string;
  name: { en?: string; fr?: string };
  prerequisites: { prerequisite: { id: string } }[];
  followUps: { lecture: { id: string } }[];
};

type locale = "en" | "fr";

export default function () {
  const prerequisiteService = useLecturePrerequisite();
  const { queryPrerequisites } = useOpenAI();

  const calls = useGraphqlQuery(
    "Lecture",
    ["id", "name.*", "prerequisites.prerequisite.*", "followUps.lecture.*"],
    ["id", "name.*"]
  );

  /**
   * Delete a model
   *
   * @param {LectureModel} model the model
   * @param {object} options the options
   * @returns {Promise<LectureModel>}
   */
  const del = async (
    model: LectureModel,
    options: GraphQLOptions = {}
  ): Promise<LectureModel> => {
    if (!model?.id) return model;
    //must delete the prerequisites and followUps first
    if (!model.prerequisites || !model.followUps) {
      model = (await calls.get(model.id)) as LectureModel;
    }
    // this no longer exists
    if (!model) return model;

    await Promise.all(
      model.prerequisites.map((pred) => prerequisiteService.delete(pred))
    );
    await Promise.all(
      model.followUps.map(async (pred) => prerequisiteService.delete(pred))
    );
    for (const { prerequisite } of model.prerequisites) {
      await prerequisiteService.delete(prerequisite);
    }

    return calls.delete(model, options) as Promise<LectureModel>;
  };

  const createWithAI = async (lectureList: string[], locale: locale = "en") => {
    const existingLectures: LectureModel[] = ((await calls.list()) ||
      []) as LectureModel[];

    const existingLectureNames: string[] = existingLectures
      .map((l: LectureModel) => l.name[locale] || "")
      .filter(Boolean);
    const response = await queryPrerequisites(
      existingLectureNames,
      lectureList
    );
    console.log("queryPrerequisites", response);

    const createdLectures: LectureModel[] = [];
    const additionalLectures: string[] = [];
    const touchedLectures: LectureModel[] = [];
    const touchedPrerequisites: LecturePrerequisiteModel[] = [];
    if (!response) {
      return { createdLectures, additionalLectures, touchedLectures, touchedPrerequisites };
    }

    // step 1 create the new lectures
    await Promise.all(
      Object.keys(response).map(async (key) => {
        const existing = existingLectures.find(
          (l: LectureModel) => l.name[locale] === key
        );
        if (existing) {
          return;
        }
        const newLecture = {
          name: {
            en: key,
          },
        };
        const lecture = (await calls.create(
          newLecture
        )) as LectureModel;
        existingLectures.push(lecture);
        createdLectures.push(lecture);
        touchedLectures.push(lecture);
      })
    );

    // step 2 create the prerequisites
    const linkMap: Map<string, boolean> = new Map();
    await Promise.all(
      Object.keys(response).map(async (key) => {
        const lecture = existingLectures.find(
          (l: LectureModel) => l.name[locale] === key
        );
        if (!lecture) {
          return;
        }
        await Promise.all(
          response[key]["Prerequisite"].map(
            async (prerequisiteName: string) => {
              const prerequisite = existingLectures.find(
                (l: LectureModel) => l.name[locale] === prerequisiteName
              );
              if (!prerequisite) {
                return;
              }
              if (!touchedLectures.includes(prerequisite)) {
                touchedLectures.push(prerequisite);
              }
              linkMap.set(lecture.id + "->" + prerequisite.id, true);
              const pre = await prerequisiteService.create({
                lectureId: lecture.id,
                prerequisiteId: prerequisite.id,
              }) as LecturePrerequisiteModel;
              touchedPrerequisites.push(pre);
            }
          )
        );
        await Promise.all(
          response[key]["Dependent Existing Lectures"].map(
            async (lectureName: string) => {
              const target = existingLectures.find(
                (l: LectureModel) => l.name[locale] === lectureName
              );
              if (!target) {
                return;
              }
              if (!touchedLectures.includes(target)) {
                touchedLectures.push(target);
              }
              // check if this was already added in the previous step
              if (linkMap.has(target.id + "->" + lecture.id)) {
                return;
              }
              linkMap.set(lecture.id + "->" + lecture.id, true);
              const pre = await prerequisiteService.create({
                lectureId: target.id,
                prerequisiteId: lecture.id,
              }) as LecturePrerequisiteModel;;
              touchedPrerequisites.push(pre);
            }
          )
        );
        // propose to the new user new prerequisites to be created
        additionalLectures.push(...response[key]["Additional Prerequisites"]);
      })
    );

    return { createdLectures, additionalLectures, touchedLectures, touchedPrerequisites };
  };
  return {
    ...calls,
    delete: del,
    createWithAI,
  };
}
