const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CalTrack API is running 🚀");
});

// CREATE USER PROFILE
app.post("/api/profile", async (req, res) => {
  try {
    const {
      name,
      height_cm,
      weight_kg,
      target_weight_kg,
      activity_level,
    } = req.body;

    // Temporary calorie logic (we improve later)
    const calorie_goal = 2000;

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// ADD MEAL
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add meal" });
  }
});

// GET TODAY'S CALORIES
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch calories" });
  }
});




// GET DAILY SUMMARY (goal vs consumed)
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

    res.json({
      calorie_goal,
      consumed,
      remaining,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});




// SUGGEST RECIPES BASED ON REMAINING CALORIES
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
    console.error(err);
    res.status(500).json({ error: "Failed to suggest recipes" });
  }
});




app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
