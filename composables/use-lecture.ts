import type { SectionModel } from "./use-section";

export type LectureModel = GraphQLModel & {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  sections: SectionModel[];
  prerequisites: { prerequisite: { id: string } }[];
  followUps: { lecture: { id: string } }[];
};

export default function () {
  const prerequisiteService = useLecturePrerequisite();
  const sectionService = useSection();
  const { queryPrerequisites } = useOpenAI();

  const calls = useGraphqlQuery(
    "Lecture",
    [
      "id",
      "name",
      "description",
      "objectives",
      "sections.id",
      "sections.name",
      "prerequisites.id",
      "prerequisites.prerequisite.*",
      "followUps.id",
      "followUps.lecture.*",
    ],
    ["id", "name", "description.*", "objectives.*"]
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
    //must delete the prerequisites and followUps and sections first
    if (!model.prerequisites || !model.followUps || !model.sections) {
      model = (await calls.get(model.id)) as LectureModel;
    }
    // this no longer exists
    if (!model) return model;

    await Promise.all(
      model.prerequisites.map((link) => prerequisiteService.delete(link))
    );
    await Promise.all(
      model.followUps.map(async (link) => prerequisiteService.delete(link))
    );
    await Promise.all(
      model.sections.map(async (sec) => sectionService.delete(sec))
    );

    return calls.delete(model, options) as Promise<LectureModel>;
  };

  const createWithAI = async (lectureList: string[]) => {
    const existingLectures: LectureModel[] = ((await calls.list()) ||
      []) as LectureModel[];

    const existingLectureNames: string[] = existingLectures
      .map((l: LectureModel) => l.name || "")
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
      return {
        createdLectures,
        additionalLectures,
        touchedLectures,
        touchedPrerequisites,
      };
    }

    // step 1 create the new lectures
    await Promise.all(
      Object.keys(response).map(async (key) => {
        const existing = existingLectures.find(
          (l: LectureModel) => l.name === key
        );
        const data = response[key];

        const newLecture = {
          name: key,
          description: data["Description"],
          objectives: data["Objectives"],
        } as LectureModel;
        let lecture;
        if (!existing) {
          lecture = (await calls.create(newLecture)) as LectureModel;
          existingLectures.push(lecture);
          createdLectures.push(lecture);
        } else {
          newLecture.id = existing.id;
          lecture = (await calls.update(newLecture)) as LectureModel;
        }
        touchedLectures.push(lecture);

        // create the sections with only the title so far
        await Promise.all(
          data["Sections Names"].map(async (name: string) => {
            if (lecture.sections?.find((s) => s.name === name)) {
              return; // already exists
            }
            const section = (await sectionService.create({
              name,
              lectureId: lecture.id,
            })) as SectionModel;
            lecture.sections.push(section);
          })
        );
      })
    );
    if (!createdLectures.length) {
      return {
        createdLectures,
        additionalLectures,
        touchedLectures,
        touchedPrerequisites,
      };
    }
    // step 2 create the prerequisites
    const linkMap: Map<string, boolean> = new Map();
    await Promise.all(
      Object.keys(response).map(async (key) => {
        const lecture = existingLectures.find(
          (l: LectureModel) => l.name === key
        );
        if (!lecture) {
          return;
        }
        await Promise.all(
          response[key]["Prerequisite"].map(
            async (prerequisiteName: string) => {
              const prerequisite = existingLectures.find(
                (l: LectureModel) => l.name === prerequisiteName
              );
              if (!prerequisite) {
                return;
              }
              if (!touchedLectures.includes(prerequisite)) {
                touchedLectures.push(prerequisite);
              }
              linkMap.set(lecture.id + "->" + prerequisite.id, true);
              linkMap.set(prerequisite.id + "->" + lecture.id, true); // do make sure no loop are created
              const pre = (await prerequisiteService.create({
                lectureId: lecture.id,
                prerequisiteId: prerequisite.id,
              })) as LecturePrerequisiteModel;
              touchedPrerequisites.push(pre);
            }
          )
        );
        await Promise.all(
          response[key]["Is Prerequisite Of"].map(
            async (lectureName: string) => {
              const target = existingLectures.find(
                (l: LectureModel) => l.name === lectureName
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
              const pre = (await prerequisiteService.create({
                lectureId: target.id,
                prerequisiteId: lecture.id,
              })) as LecturePrerequisiteModel;
              touchedPrerequisites.push(pre);
            }
          )
        );
        // propose to the new user new prerequisites to be created
        additionalLectures.push(...response[key]["Additional Prerequisites"]);
        const relatedLectures = response[key]["Related Lectures"]
          .map((lectureName: string) =>
            existingLectures.find(
              (l: LectureModel) => l.name === lectureName
            )
          )
          .filter(Boolean);
        touchedLectures.push(...relatedLectures);
      })
    );

    return {
      createdLectures,
      additionalLectures,
      touchedLectures,
      touchedPrerequisites,
    };
  };
  return {
    ...calls,
    delete: del,
    createWithAI,
  };
}
