interface LectureModel extends GraphQLModel {
  id: string;
  name: { en?: string; fr?: string };
  prerequisites: { prerequisite: { id: string } }[];
  followUps: { lecture: { id: string } }[];
}

export default function () {
  const prerequisiteService = useLecturePrerequisite();
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
      model = await calls.get(model.id);
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

    return calls.delete(model, options);
  };
  return {
    ...calls,
    delete: del,
  };
}
