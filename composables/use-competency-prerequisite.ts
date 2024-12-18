
export type CompetencyPrerequisiteModel = GraphQLModel & {
  conceptId: string;
  prerequisiteId: string;
};

export default function () {
  return useGraphqlQuery('CompetencyDependency', ['competencyId', 'prerequisiteId']);
}
