const express = require("express");
const cors = require("cors");
const pool = require("./db");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

/* =====================================================
   HEALTH CHECK
===================================================== */
app.get("/", (req, res) => {
  res.send("CalTrack API is running 🚀");
});

/* =====================================================
   AUTH — REGISTER
===================================================== */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, calorie_goal)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email`,
      [name, email, hashedPassword, 2000]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

/* =====================================================
   AUTH — LOGIN
===================================================== */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

/* =====================================================
   MEALS (PROTECTED)
===================================================== */
app.post("/api/meals", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meal_name, calories } = req.body;

    const result = await pool.query(
      `INSERT INTO meals (user_id, meal_name, calories)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, meal_name, calories]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add meal" });
  }
});

/* =====================================================
   DAILY SUMMARY (PROTECTED)
===================================================== */
app.get("/api/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const goalRes = await pool.query(
      "SELECT calorie_goal FROM users WHERE id = $1",
      [userId]
    );

    const intakeRes = await pool.query(
      `
      SELECT COALESCE(SUM(calories), 0) AS consumed
      FROM meals
      WHERE user_id = $1
      AND meal_time >= date_trunc('day', now() - interval '2 hours')
      AND meal_time < date_trunc('day', now() - interval '2 hours') + interval '1 day'
      `,
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
   WEIGHT TRACKING (PROTECTED)
===================================================== */
app.get("/api/weight", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

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

app.post("/api/weight", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { weight_kg } = req.body;

    const result = await pool.query(
      `INSERT INTO weight_entries (user_id, weight_kg)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, weight_kg]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add weight" });
  }
});

/* =====================================================
   🧠 ML WORKOUT RECOMMENDATION ENGINE (PROTECTED)
===================================================== */

function scoreWorkout(workout, features) {
  const { remainingCalories, weightDelta } = features;

  const calorieScore =
    remainingCalories > 0
      ? workout.calories_burn / remainingCalories
      : 0;

  let goalScore = 0;
  if (weightDelta > 0 && workout.type === "cardio") goalScore = 1;
  if (weightDelta < 0 && workout.type === "strength") goalScore = 1;

  const intensityScore = workout.calories_burn > 200 ? 1 : 0.5;

  return (
    0.5 * calorieScore +
    0.3 * goalScore +
    0.2 * intensityScore
  );
}

app.get("/api/workouts/recommend", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const userRes = await pool.query(
      `SELECT weight_kg, target_weight_kg, calorie_goal
       FROM users WHERE id = $1`,
      [userId]
    );

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
      userRes.rows[0].weight_kg -
      userRes.rows[0].target_weight_kg;

    const workoutsRes = await pool.query("SELECT * FROM workouts");

    const scored = workoutsRes.rows.map((w) => ({
      ...w,
      score: scoreWorkout(w, { remainingCalories, weightDelta }),
    }));

    scored.sort((a, b) => b.score - a.score);

    res.json(scored.slice(0, 3));
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
