export type LectureModel = GraphQLModel & {
  id: string;
  name: { en?: string; fr?: string };
  prerequisites: { prerequisite: { id: string } }[];
  followUps: { lecture: { id: string } }[];
}

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

  const createWithAI = async (lectureList: string[], locale: locale = 'en') => {
    const existingLectures:LectureModel[] = ((await calls.list()) || []) as LectureModel[];

    const newLectures = lectureList.filter(
      (lecture) => !existingLectures.some((l:LectureModel) => l.name[locale] === lecture)
    );

    const existingLectureNames: string[] = existingLectures.map((l:LectureModel) => l.name[locale] || "").filter(Boolean);
    const response = await queryPrerequisites(
      existingLectureNames,
      newLectures
    );
    console.log("queryPrerequisites", response);

    const createdLectures : LectureModel[] = [];
    const additionalLectures : string[] = [];
    if (!response) {
      return {createdLectures, additionalLectures};
    }

  // step 1 create the new lectures
  await Promise.all(
    Object.keys(response).map(async (key) => {
      const existing = existingLectures.find((l:LectureModel) => l.name[locale] === key);
      if (existing) {
        return;
      }
      const newLecture = {
        name: {
          en: key,
        },
      };
      const lecture = await calls.create(newLecture) as unknown as LectureModel;
      existingLectures.push(lecture);
      createdLectures.push(lecture as unknown as LectureModel);
    })
  );

  console.log("existingLectures", existingLectures);
  // step 2 create the prerequisites
  const linkMap: Map<string, boolean> = new Map();
  await Promise.all(
    Object.keys(response).map(async (key) => {
      const lecture = existingLectures.find((l:LectureModel) => l.name[locale] === key);
      console.log("Processing", key, lecture);
      if (!lecture) {
        return;
      }
      await Promise.all(
        response[key]["Prerequisite"].map(async (prerequisiteName:string) => {
          const prerequisiteId = existingLectures.find(
            (l:LectureModel) => l.name[locale] === prerequisiteName
          )?.id;
          if (!prerequisiteId) {
            return;
          }
          console.log("Prerequisite", prerequisiteName, prerequisiteId);
          linkMap.set(lecture.id + "->" + prerequisiteId, true);
          await prerequisiteService.create({
            lectureId: lecture.id,
            prerequisiteId,
          });
        })
      );
      await Promise.all(
        response[key]["Dependent Existing Lectures"].map(
          async (lectureName: string) => {
            const lectureId = existingLectures.find(
              (l:LectureModel) => l.name[locale] === lectureName
            )?.id;
            if (!lectureId) {
              return;
            }
            // check if this was already added in the previous step
            if (linkMap.has(lectureId + "->" + lecture.id)) {
              return;
            }
            linkMap.set(lecture.id + "->" + lecture.id, true);
            await prerequisiteService.create({
              lectureId,
              prerequisiteId: lecture.id,
            });
          }
        )
      );
      // propose to the new user new prerequisites to be created
      additionalLectures.push(... response[key]["Additional Prerequisites"]);
    }));

    return {createdLectures, additionalLectures};
  };
  return {
    ...calls,
    delete: del,
    createWithAI
  };
}
