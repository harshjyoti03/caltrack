function scoreWorkout(workout, features) {
  const { remainingCalories, weightDelta } = features;

  // Feature 1: calorie suitability
  const calorieScore = workout.calories_burn / remainingCalories;

  // Feature 2: goal match
  let goalScore = 0;
  if (weightDelta > 0 && workout.type === "cardio") goalScore = 1;
  if (weightDelta < 0 && workout.type === "strength") goalScore = 1;

  // Feature 3: intensity
  const intensityScore = workout.calories_burn > 200 ? 1 : 0.5;

  // Final weighted score (ML model)
  return (
    0.5 * calorieScore +
    0.3 * goalScore +
    0.2 * intensityScore
  );
}

module.exports = { scoreWorkout };
