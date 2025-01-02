
export type ConceptPrerequisiteModel = GraphQLModel & {
  conceptId: string;
  prerequisiteId: string;
  concept: ConceptModel | undefined;
  prerequisite: ConceptModel | undefined;
};

export default function () {
  return useGraphqlQuery('ConceptDependency', ['id', 'conceptId', 'prerequisiteId']);
}
