const calculateHardScore = (userAnswer, correctAnswer, maxScore) => {
  if (userAnswer === correctAnswer) return maxScore;
  // return Math.max(0, maxScore - 2); // Deduct 2 points for incorrect answer
};

module.exports = { calculateHardScore };