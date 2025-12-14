import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./App.css";

const API = "http://localhost:5000";
const TOKEN = localStorage.getItem("token");

const CAL_COLORS = ["#ff9f43", "#2ecc71"]; // Consumed, Remaining

export default function App() {
  const [summary, setSummary] = useState(null);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [meals, setMeals] = useState([]);
  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  /* ---------------- FETCHERS ---------------- */

  const fetchSummary = async () => {
    const res = await fetch(`${API}/api/summary`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    setSummary(await res.json());
  };

  const fetchMeals = async () => {
    const res = await fetch(`${API}/api/meals/today`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    setMeals(await res.json());
  };

  const fetchWeightHistory = async () => {
    const res = await fetch(`${API}/api/weight`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    setWeightHistory(await res.json());
  };

  const fetchWorkouts = async () => {
    try {
      const res = await fetch(
        `${API}/api/workouts/recommend/${USER_ID}`
      );
      const data = await res.json();

      console.log("WORKOUTS:", data); // 🔥 DEBUG LINE
      setWorkouts(data);
    } catch (err) {
      console.error("Workout fetch failed", err);
    }
  };


  /* ---------------- ACTIONS ---------------- */

  const addMeal = async () => {
    if (!mealName || !mealCalories) return;

    await fetch(`${API}/api/meals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        name: mealName,
        calories: Number(mealCalories),
      }),
    });

    setMealName("");
    setMealCalories("");
    fetchSummary();
    fetchMeals();
  };

  const addWeight = async () => {
    if (!weight) return;

    await fetch(`${API}/api/weight`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ weight_kg: Number(weight) }),
    });

    setWeight("");
    fetchWeightHistory();
  };

  /* ---------------- EFFECT ---------------- */

  useEffect(() => {
    fetchSummary();
    fetchMeals();
    fetchWeightHistory();
    fetchWorkouts();
  }, []);

  if (!summary) return null;

  /* ---------------- DATA FORMATTING ---------------- */

  const calorieData = [
    { name: "Consumed", value: Number(summary.consumed) },
    { name: "Remaining", value: Number(summary.remaining) },
  ];

  const formattedWeight = weightHistory.map((w) => ({
    ...w,
    date: new Date(w.created_at).toLocaleDateString(),
    time: new Date(w.created_at).toLocaleTimeString(),
  }));

  /* ---------------- UI ---------------- */

  return (
    <div className="container">
      <h1>🏋️ CalTrack — Fitness Dashboard</h1>

      {/* ---------------- CALORIES ---------------- */}
      <section>
        <h2>🔥 Calories</h2>

        <PieChart width={300} height={300}>
          <Pie
            data={calorieData}
            dataKey="value"
            innerRadius={70}
            outerRadius={120}
            paddingAngle={4}
            stroke="#1e1e1e"
            strokeWidth={2}
          >
            {calorieData.map((_, i) => (
              <Cell key={i} fill={CAL_COLORS[i]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>

        <p style={{ color: CAL_COLORS[0] }}>
          Consumed: {summary.consumed} kcal
        </p>
        <p style={{ color: CAL_COLORS[1] }}>
          Remaining: {summary.remaining} kcal
        </p>

        {/* ADD MEAL */}
        <div className="row">
          <input
            placeholder="Meal name"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
          />
          <input
            placeholder="Calories"
            type="number"
            value={mealCalories}
            onChange={(e) => setMealCalories(e.target.value)}
          />
          <button onClick={addMeal}>Add Meal</button>
        </div>

        {/* MEAL LOG */}
        <ul>
          {meals.map((m) => (
            <li key={m.id}>
              🍽️ {m.name} — {m.calories} kcal (
              {new Date(m.created_at).toLocaleTimeString()})
            </li>
          ))}
        </ul>
      </section>

      <hr />

      {/* ---------------- WEIGHT ---------------- */}
      <section>
        <h2>⚖️ Weight Progress</h2>

        <LineChart width={500} height={300} data={formattedWeight}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <CartesianGrid stroke="#333" />
          <Line
            type="monotone"
            dataKey="weight_kg"
            stroke="#00cec9"
            strokeWidth={3}
          />
        </LineChart>

        <div className="row">
          <input
            placeholder="Weight (kg)"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button onClick={addWeight}>Add Weight</button>
        </div>

        <ul>
          {formattedWeight.map((w) => (
            <li key={w.id}>
              {w.weight_kg} kg — {w.date} {w.time}
            </li>
          ))}
        </ul>
      </section>

      <hr />

      {/* ---------------- WORKOUTS ---------------- */}
      <section>
        <h2>🏃 Recommended Workouts</h2>

        {workouts.length === 0 ? (
          <p style={{ color: "#888" }}>No recommendations yet</p>
        ) : (
          <ul>
            {workouts.map((w) => (
              <li key={w.id}>
                {w.name} — 🔥 {w.calories_burn} kcal
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
