interface LectureModel {
  id: string;
  name: { en?: string; fr?: string };
  prerequisites?: { prerequisite: { id: string } }[];
  followUps?: { lecture: { id: string } }[];
}

export default function () {
  return useGraphqlQuery('Lecture', ['id', 'name.*', 'prerequisites.prerequisite.*', 'followUps.lecture.*'], ['id', 'name.*']);
}
