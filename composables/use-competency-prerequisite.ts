
export type CompetencyPrerequisiteModel = GraphQLModel & {
  competencyId: string;
  prerequisiteId: string;
  competency?: CompetencyModel;
  prerequisite?: CompetencyModel;
};

export default function () {
  return useGraphqlQuery('CompetencyDependency', ['id', 'competencyId', 'prerequisiteId']);
}
