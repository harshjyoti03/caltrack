const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* =====================================================
   BASIC HEALTH CHECK
===================================================== */
app.get("/", (req, res) => {
  res.send("CalTrack API is running 🚀");
});

/* =====================================================
   USER PROFILE
===================================================== */
app.post("/api/profile", async (req, res) => {
  try {
    const {
      name,
      height_cm,
      weight_kg,
      target_weight_kg,
      activity_level,
    } = req.body;

    const calorie_goal = 2000; // temp logic

    const result = await pool.query(
      `INSERT INTO users
       (name, height_cm, weight_kg, target_weight_kg, activity_level, calorie_goal)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        height_cm,
        weight_kg,
        target_weight_kg,
        activity_level,
        calorie_goal,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create profile" });
  }
});

/* =====================================================
   MEALS
===================================================== */
app.post("/api/meals", async (req, res) => {
  try {
    const { user_id, meal_name, calories } = req.body;

    const result = await pool.query(
      `INSERT INTO meals (user_id, meal_name, calories)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, meal_name, calories]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add meal" });
  }
});

app.get("/api/meals/today/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT COALESCE(SUM(calories), 0) AS total_calories
       FROM meals
       WHERE user_id = $1
       AND DATE(meal_time) = CURRENT_DATE`,
      [userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch calories" });
  }
});

/* =====================================================
   DAILY SUMMARY
===================================================== */
app.get("/api/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const goalRes = await pool.query(
      "SELECT calorie_goal FROM users WHERE id = $1",
      [userId]
    );

    const intakeRes = await pool.query(
      `SELECT COALESCE(SUM(calories), 0) AS consumed
       FROM meals
       WHERE user_id = $1
       AND DATE(meal_time) = CURRENT_DATE`,
      [userId]
    );

    const calorie_goal = goalRes.rows[0].calorie_goal;
    const consumed = intakeRes.rows[0].consumed;
    const remaining = calorie_goal - consumed;

    res.json({ calorie_goal, consumed, remaining });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

/* =====================================================
   RECIPES
===================================================== */
app.get("/api/recipes/suggest/:remaining", async (req, res) => {
  try {
    const remaining = Number(req.params.remaining);

    const result = await pool.query(
      `SELECT * FROM recipes
       WHERE calories <= $1
       ORDER BY calories DESC
       LIMIT 3`,
      [remaining]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to suggest recipes" });
  }
});

/* =====================================================
   WEIGHT TRACKING (ORDER MATTERS)
===================================================== */
app.get("/api/weight/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT weight_kg, entry_date
       FROM weight_entries
       WHERE user_id = $1
       ORDER BY entry_date ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weight history" });
  }
});

app.post("/api/weight", async (req, res) => {
  try {
    const { user_id, weight_kg } = req.body;

    const result = await pool.query(
      `INSERT INTO weight_entries (user_id, weight_kg)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, weight_kg]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add weight" });
  }
});

/* =====================================================
   🧠 ML WORKOUT RECOMMENDATION ENGINE (SPRINT 6)
===================================================== */

// ML scoring function
function scoreWorkout(workout, features) {
  const { remainingCalories, weightDelta } = features;

  // Feature 1: calorie suitability
  const calorieScore = workout.calories_burn / remainingCalories;

  // Feature 2: goal alignment
  let goalScore = 0;
  if (weightDelta > 0 && workout.type === "cardio") goalScore = 1;
  if (weightDelta < 0 && workout.type === "strength") goalScore = 1;

  // Feature 3: intensity
  const intensityScore = workout.calories_burn > 200 ? 1 : 0.5;

  // Weighted linear model
  return (
    0.5 * calorieScore +
    0.3 * goalScore +
    0.2 * intensityScore
  );
}

// ML Recommendation API
app.get("/api/workouts/recommend/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch user data
    const userRes = await pool.query(
      `SELECT weight_kg, target_weight_kg, calorie_goal
       FROM users WHERE id = $1`,
      [userId]
    );

    // Fetch today's calories
    const intakeRes = await pool.query(
      `SELECT COALESCE(SUM(calories), 0) AS consumed
       FROM meals
       WHERE user_id = $1
       AND DATE(meal_time) = CURRENT_DATE`,
      [userId]
    );

    const remainingCalories =
      userRes.rows[0].calorie_goal - intakeRes.rows[0].consumed;

    const weightDelta =
      userRes.rows[0].weight_kg - userRes.rows[0].target_weight_kg;

    // Fetch workouts
    const workoutsRes = await pool.query("SELECT * FROM workouts");

    // Score workouts (ML step)
    const scoredWorkouts = workoutsRes.rows.map((w) => ({
      ...w,
      score: scoreWorkout(w, { remainingCalories, weightDelta }),
    }));

    // Rank & return top 3
    scoredWorkouts.sort((a, b) => b.score - a.score);

    res.json(scoredWorkouts.slice(0, 3));
  } catch (err) {
    res.status(500).json({ error: "Workout recommendation failed" });
  }
});

/* =====================================================
   SERVER START
===================================================== */
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
