
export type FlashCardModel = GraphQLModel & {
  id: string;
  question: string;
  answer: string;
  notes: string;
  conceptId: string;
};

export default function () {
  return useGraphqlQuery('FlashCard', ['id', 'question', 'answer', 'notes', 'conceptId']);
}
