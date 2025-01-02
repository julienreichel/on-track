
export type ConceptPrerequisiteModel = GraphQLModel & {
  conceptId: string;
  prerequisiteId: string;
  concept: ConceptModel;
  prerequisite: ConceptModel;
};

export default function () {
  return useGraphqlQuery('ConceptDependency', ['id', 'conceptId', 'prerequisiteId']);
}
