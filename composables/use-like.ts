export type LikeModel = GraphQLModel & {
  id: string;
  postId: string;
  createdAt: string;
  type: string;
};

export default function () {
  return useGraphqlQuery('Like', [
    'id',
    'postId',
    'createdAt',
    'type',
  ]);
}
