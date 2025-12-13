const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// BASIC HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.send("CalTrack API is running 🚀");
});

// =====================
// USER PROFILE
// =====================
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
    console.error(err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

// =====================
// MEALS
// =====================
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

// =====================
// DAILY SUMMARY
// =====================
app.get("/api/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const goalResult = await pool.query(
      "SELECT calorie_goal FROM users WHERE id = $1",
      [userId]
    );

    const intakeResult = await pool.query(
      `SELECT COALESCE(SUM(calories), 0) AS consumed
       FROM meals
       WHERE user_id = $1
       AND DATE(meal_time) = CURRENT_DATE`,
      [userId]
    );

    const calorie_goal = goalResult.rows[0].calorie_goal;
    const consumed = intakeResult.rows[0].consumed;
    const remaining = calorie_goal - consumed;

    res.json({ calorie_goal, consumed, remaining });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// =====================
// RECIPES
// =====================
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

// =====================
// ⚖️ WEIGHT TRACKING (ORDER MATTERS)
// =====================

// GET weight history (MUST COME FIRST)
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

// ADD weight entry
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

// =====================
// SERVER START
// =====================
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
