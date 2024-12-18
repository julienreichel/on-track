
export type FlashCardModel = GraphQLModel & {
  id: string;
  frontText: string;
  backText: string;
  conceptId: string;
};

export default function () {
  return useGraphqlQuery('FlashCard', ['id', 'frontText', 'backText', 'conceptId']);
}
