export type PostModel = GraphQLModel & {
  id: string;
  subjectId?: string;
  isAIGenerated: boolean;
  owner: string;
  competencyId?: string;
  conceptId?: string;
  content: string;
  responseToId?: string;
  responseTo?: PostModel;
  createdAt: string;
  responses?: PostModel[];
  likes?: LikeModel[];
};

export type LikeModel = GraphQLModel & {
  id: string;
  postId: string;
  post?: PostModel;
  createdAt: string;
  type: string;
};

export default function () {
  const calls = useGraphqlQuery('Post', [
    'id',
    'subjectId',
    'isAIGenerated',
    'owner',
    'competencyId',
    'conceptId',
    'content',
    'createdAt',
    'responses.*',
    'likes.*',
  ]);

  const del = async (
    model: PostModel,
    options: GraphQLOptions = {}
  ): Promise<PostModel> => {
    if (!model?.id) return model;
    // Delete all responses recursively
    if (model.responses && model.responses.length) {
      await Promise.all(model.responses.map((resp) => del(resp)));
    }
    // Delete all likes
    if (model.likes?.length) {
      const likeCalls = useLike();
      await Promise.all(model.likes.map((like) => likeCalls.delete(like)));
    }
    return calls.delete(model, options) as Promise<PostModel>;
  };

  return {
    ...calls,
    delete: del,
  };
}
