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
import { useAuth } from "./AuthContext";

const CAL_COLORS = ["#ff7a18", "#2ecc71"]; // consumed, remaining

export default function Dashboard() {
  const { token, logout } = useAuth();

  const [summary, setSummary] = useState(null);
  const [meals, setMeals] = useState([]);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  // ---------------- FETCHERS ----------------

  const fetchSummary = async () => {
    const res = await fetch("http://localhost:5000/api/summary", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSummary(await res.json());
  };

  const fetchMeals = async () => {
    const res = await fetch("http://localhost:5000/api/meals", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMeals(await res.json());
  };

  const fetchWeightHistory = async () => {
    const res = await fetch("http://localhost:5000/api/weight", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setWeightHistory(await res.json());
  };

  const fetchWorkouts = async () => {
    const res = await fetch("http://localhost:5000/api/workouts/recommend", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setWorkouts(await res.json());
  };

  // ---------------- ACTIONS ----------------

  const addMeal = async () => {
    if (!mealName || !mealCalories) return;

    await fetch("http://localhost:5000/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        meal_name: mealName,
        calories: Number(mealCalories),
      }),
    });

    setMealName("");
    setMealCalories("");
    fetchSummary();
    fetchMeals();
  };

  const addWeight = async () => {
    await fetch("http://localhost:5000/api/weight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ weight_kg: Number(weight) }),
    });

    setWeight("");
    fetchWeightHistory();
  };

  // ---------------- INIT ----------------

  useEffect(() => {
    fetchSummary();
    fetchMeals();
    fetchWeightHistory();
    fetchWorkouts();
  }, []);

  if (!summary) return <p>Loading dashboard...</p>;

  const calorieData = [
    { name: "Consumed", value: summary.consumed },
    { name: "Remaining", value: summary.remaining },
  ];

  return (
    <div style={{ padding: 40 }}>
      <h1>🏋️ CalTrack — Fitness Dashboard</h1>
      <button onClick={logout}>Logout</button>

      {/* ---------------- CALORIES ---------------- */}
      <section>
        <h2>🔥 Calories</h2>

        <PieChart width={300} height={300}>
          <Pie
            data={calorieData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
          >
            {calorieData.map((_, i) => (
              <Cell key={i} fill={CAL_COLORS[i]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>

        <p style={{ color: "#ff7a18" }}>
          Consumed: {summary.consumed} kcal
        </p>
        <p style={{ color: "#2ecc71" }}>
          Remaining: {summary.remaining} kcal
        </p>

        <input
          placeholder="Meal name"
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
        />
        <input
          placeholder="Calories"
          value={mealCalories}
          onChange={(e) => setMealCalories(e.target.value)}
        />
        <button onClick={addMeal}>Add Meal</button>

        <ul>
          {meals.map((m) => (
            <li key={m.id}>
              🍽️ {m.meal_name} — {m.calories} kcal
              <br />
              <small>{new Date(m.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      </section>

      <hr />

      {/* ---------------- WEIGHT ---------------- */}
      <section>
        <h2>⚖️ Weight Progress</h2>

        <LineChart width={500} height={300} data={weightHistory}>
          <XAxis dataKey="created_at" tickFormatter={(d) =>
            new Date(d).toLocaleDateString()
          } />
          <YAxis />
          <Tooltip />
          <CartesianGrid stroke="#333" />
          <Line
            type="monotone"
            dataKey="weight_kg"
            stroke="#00cec9"
          />
        </LineChart>

        <input
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button onClick={addWeight}>Add Weight</button>

        <ul>
          {weightHistory.map((w) => (
            <li key={w.id}>
              {w.weight_kg} kg —
              {new Date(w.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>

      <hr />

      {/* ---------------- WORKOUTS ---------------- */}
      <section>
        <h2>🏃 Recommended Workouts</h2>
        <ul>
          {workouts.map((w) => (
            <li key={w.id}>
              {w.name} — 🔥 {w.calories_burn} kcal
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
