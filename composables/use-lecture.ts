export default function () {
  return useGraphqlQuery('Lecture', ['id', 'name.*', 'prerequisites.prerequisite.*', 'followUps.lecture.*'], ['id', 'name.*']);
}
