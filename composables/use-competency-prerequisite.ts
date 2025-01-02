
export type CompetencyPrerequisiteModel = GraphQLModel & {
  competencyId: string;
  prerequisiteId: string;
  competency: CompetencyModel | undefined;
  prerequisite: CompetencyModel  | undefined;
};

export default function () {
  return useGraphqlQuery('CompetencyDependency', ['id', 'competencyId', 'prerequisiteId']);
}
