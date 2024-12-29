export default function () {
  let previousQuestions = [];
  let questions;
  const levels = ["novice", "beginner", "intermediate", "advanced", "expert"];

  let questionsPerLevels = {};

  const getActiveQuestions = ({ adaptative = true, examMode = false, max = 0 }) => {
    const realMax = max ? Math.min(max, questions.length) : questions.length;

    if (!previousQuestions.length) {
      // check if there are some questions that have been validated, and add them to the list
      questions
        .filter((q) => q.validated)
        .forEach((q) => {
          previousQuestions.push(q);
        });
      if (previousQuestions.length >= realMax) {
        return previousQuestions;
      }
    }

    if (previousQuestions.length >= realMax) {
      return previousQuestions;
    }
    // pick the questions to display
    if (!adaptative || realMax === questions.length) {
      let q = [...questions];
      previousQuestions = q
        .sort((a, b) => a.order - b.order)
        .slice(0, realMax);
      return previousQuestions;
    }

    if (examMode) {
      // create the final quiz
      let q = [];
      let i = 0;
      while (q.length < realMax) {
        const keys = Object.keys(questionsPerLevels.filter((q) => q.length));
        let level = keys[i % keys.length];
        if (questionsPerLevels[level].length) {
          q.push(questionsPerLevels[level].pop());
        }
        i++;
      }
      previousQuestions = q;
      return previousQuestions;
    }
    // we update the question that have not been validated, depending on what the
    // user has answered, if the user success rate for a difficulty and all the ones below
    // is under 60% of success rate, we show questions of the lower difficulty
    // if this is above 80% we show questions of the next difficulty
    // if we do not know, we use difficulty=2
    // then we add one extra question to the quiz

    // compute the success rate per level
    let acc = [0, 1, 2, 3, 4].map(() => ({ total: 0, valid: 0 }));
    let validatedQuestions = [];
    let difficulties = previousQuestions.reduce((acc, q) => {
      if (!q.validated) return acc;
      validatedQuestions.push(q);
      acc[q.difficulty - 1].total++;
      if (q.valid) acc[q.difficulty - 1].valid++;
      return acc;
    }, acc);

    // accumulate the lower levels failures
    for (let i = 0; i < 4; i++) {
      const failure = difficulties[i].total - difficulties[i].valid;
      difficulties[i + 1].total += failure;
    }
    // accumulate higher level success
    for (let i = 4; i > 0; i--) {
      difficulties[i - 1].total += difficulties[i].valid;
      difficulties[i - 1].valid += difficulties[i].valid;
    }
    // find the difficulty to use for the next question
    console.log("difficulties", difficulties);
    // start with novice level
    if (difficulties[1].total < 3) {
      let level = levels[0];
      if (questionsPerLevels[level]?.length) {
        console.log("initial level", level);
        previousQuestions.push(questionsPerLevels[level].pop());
        return previousQuestions;
      }
      let j = 0;
      while (j < 5) {
        let level = levels[j];
        if (questionsPerLevels[level]?.length) {
          console.log("initial level", level);
          previousQuestions.push(questionsPerLevels[level].pop());
          return previousQuestions;
        }
        j++;
      }
    }
    // If the user failed twice in a row for the same level, we go down one level
    validatedQuestions = validatedQuestions.reverse();
    if (
      validatedQuestions.length > 2 &&
      validatedQuestions[0].difficulty > 1 &&
      validatedQuestions[0].difficulty === validatedQuestions[1].difficulty &&
      !validatedQuestions[0].valid &&
      !validatedQuestions[1].valid
    ) {
      let level = levels[validatedQuestions[0].difficulty - 2];
      // no loop here, if there are no easier questions, then we keep the current level
      if (questionsPerLevels[level]?.length) {
        console.log("down level", level);
        previousQuestions.push(questionsPerLevels[level].pop());
        return previousQuestions;
      }
    }

    for (let i = 0; i < 5; i++) {
      const rate = difficulties[i].total
        ? difficulties[i].valid / difficulties[i].total
        : 0;
      if (rate < 0.75) {
        let j = i;
        // we get questions from this level, or lower, if there are any
        while (j >= 0) {
          let level = levels[j];
          if (questionsPerLevels[level]?.length) {
            console.log("getting level", level);
            previousQuestions.push(questionsPerLevels[level].pop());
            return previousQuestions;
          }
          j--;
        }
      }
    }
    // we get questions from the expert level, or lower, if there aren't any
    let j = 4;
    while (j >= 0) {
      let level = levels[j];
      if (questionsPerLevels[level]?.length) {
        console.log("highest level", level);
        previousQuestions.push(questionsPerLevels[level].pop());
        return previousQuestions;
      }
      j--;
    }
    // this case cannot happen we have scanned all the questions
    console.log("no more questions");
    return previousQuestions;
  };

  const getQuestionsPerLevels = (questions) => {
    let questionsPerLevels = questions
      .filter((q) => !q.validated)
      .reduce((acc, q) => {
        const level = q.level;
        if (!acc[level]) acc[level] = [];
        acc[level].push(q);
        return acc;
      }, {});

    // randomize the order of the questions in the levels
    questionsPerLevels = Object.keys(questionsPerLevels).reduce((acc, level) => {
      acc[level] = questionsPerLevels[level].sort((a, b) => a.order - b.order);
      return acc;
    }, {});
    return questionsPerLevels;
  };

  const initQuestionResponse = (question) => {
    if (question.response !== undefined)
      return question.response;
    return question.type === "checkbox" ? [] : undefined
  };
  const initQuestionResponseWithAnswer = (question, answeredQuestion) => {
    if(question.type === "checkbox") {
      return answeredQuestion.response.split(",");
    }
    if(question.type === "radio") {
      return Number(answeredQuestion.response);
    }
    return answeredQuestion.response;
  };

  const resetQuestions = (inputQuestions, answeredQuestions = []) => {
    previousQuestions = [];
    questions = inputQuestions.map((q) => ({ ...q }));

    questionsPerLevels = getQuestionsPerLevels(questions);

    // pre-populate the questions with the answers
    if (answeredQuestions?.length) {
      answeredQuestions.forEach((answeredQuestion, idx) => {
        if (!answeredQuestion || answeredQuestion.valid === null) {
          // the question has not been validated otherwise it would be true or false
          return;
        }
        const question = questions.find(
          (q) => q.id === answeredQuestion.questionId,
        );
        if (!question) {
          return;
        }
        question.response = initQuestionResponseWithAnswer(question, answeredQuestion);
        question.validated = true;
        question.valid = answeredQuestion.valid;
        question.order = -answeredQuestions.length + idx;
      });
    }
    let validAnswers = 0;
    questions.forEach((question) => {
      question.answers.forEach((answer) => {
        answer.order = answer.order || Math.random();
      });
      if (question.validated) {
        validAnswers++;
      }
      question.response = initQuestionResponse(question);
      question.time = question.time || 0;
      question.level = question.level || "intermediate";
      question.order = question.order || Math.random();
      question.difficulty =
        question.difficulty || levels.indexOf(question.level) + 1 || 3;
      if (!question.explanations && (question.type === "shorttext" || question.type === "word")) {
        question.explanations =
          "Valid answers: '" +
          question.answers
            .filter((a) => a.valid)
            .map((a) => a.text)
            .join("', '") +
          "'";
      }
    });
    return validAnswers ? validAnswers < questions.length : false;
  };

  const getColor = (question, answer) => {
    if (!question.validated) return undefined;
    return answer.valid ? "positive" : "negative";
  }
  const getOptions = (question) => {
    if (!question) return {};
    if (question.type === "radio" || question.type === "checkbox") {
      const options = question.answers.map((answer, index) => ({
        order: answer.order,
        label: answer.text,
        value: index,
        checkedIcon: question.type === "radio" ? "task_alt" : undefined,
        color: getColor(question, answer)
      }));
      // randomize order of options
      options.sort((a, b) => a.order - b.order);
      return options;
    } else {
      if (question.validated) {
        return {
          icon: question.valid ? "check" : "close",
          color: question.valid ? "positive" : "negative",
        };
      }
      return {};
    }
  };

  const validateAnswers = (question) => {
    question.validated = true;
    let valid = false;

    if (question.type === "radio") {
      valid = question.answers[question.response]?.valid;
    }
    if (question.type === "checkbox") {
      valid = true;
      question.answers.forEach((answer, idx2) => {
        const found =
          question.response.find((value) => value === idx2) !== undefined;
        if (found && !answer.valid) valid = false;
        if (!found && answer.valid) valid = false;
      });
    }
    if (question.type === "shorttext" || question.type === "word") {
      valid = false;
      question.answers.forEach((answer) => {
        if (question.response?.toLowerCase() === answer.text.toLowerCase()) {
          valid = answer.valid;
        }
      });
    }
    question.valid = valid;
    question.points = valid ? 5 : 0;
    return valid;
  };
  return { getActiveQuestions, resetQuestions, getOptions, validateAnswers };
}
