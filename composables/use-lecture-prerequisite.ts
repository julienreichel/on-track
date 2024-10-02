export default function () {
  return useGraphqlQuery('LecturePrerequisite', ['prerequisiteId', 'lectureId']);
}
