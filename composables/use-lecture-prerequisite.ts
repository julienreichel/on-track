interface LecturePrerequisiteModel {
  prerequisiteId: string;
  lectureId: string;
  prerequisite?: { id: string } ;
  followUp?: { id: string } ;
}

export default function () {
  return useGraphqlQuery('LecturePrerequisite', ['prerequisiteId', 'lectureId']);
}
