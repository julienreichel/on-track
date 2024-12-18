
export type ConceptPrerequisiteModel = GraphQLModel & {
  conceptId: string;
  prerequisiteId: string;
};

export default function () {
  return useGraphqlQuery('ConceptDependency', ['conceptId', 'prerequisiteId']);
}
