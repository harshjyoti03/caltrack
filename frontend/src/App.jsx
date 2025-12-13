import { useEffect, useState } from "react";
import "./App.css";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const USER_ID = 1;

function App() {
  // ================= STATE =================
  const [summary, setSummary] = useState({
    calorie_goal: 0,
    consumed: 0,
    remaining: 0,
  });

  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");

  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  // ================= FETCH SUMMARY =================
  const fetchSummary = async () => {
    const res = await fetch(
      `http://localhost:5000/api/summary/${USER_ID}`
    );
    const data = await res.json();
    setSummary(data);
  };

  // ================= ADD MEAL =================
  const addMeal = async () => {
    if (!mealName || !mealCalories) return;

    await fetch("http://localhost:5000/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        meal_name: mealName,
        calories: Number(mealCalories),
      }),
    });

    setMealName("");
    setMealCalories("");

    // Refresh everything affected by calories
    fetchSummary();
    fetchWorkoutRecommendations();
  };

  // ================= ADD WEIGHT =================
  const addWeight = async () => {
    if (!weight) return;

    await fetch("http://localhost:5000/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        weight_kg: Number(weight),
      }),
    });

    setWeight("");
    fetchWeightHistory();
  };

  // ================= FETCH WEIGHT HISTORY =================
  const fetchWeightHistory = async () => {
    const res = await fetch(
      `http://localhost:5000/api/weight/${USER_ID}`
    );
    const data = await res.json();
    setWeightHistory(data);
  };

  // ================= FETCH ML WORKOUTS =================
  const fetchWorkoutRecommendations = async () => {
    const res = await fetch(
      `http://localhost:5000/api/workouts/recommend/${USER_ID}`
    );
    const data = await res.json();
    setWorkouts(data);
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    fetchSummary();
    fetchWeightHistory();
    fetchWorkoutRecommendations();
  }, []);

  // ================= CHART DATA =================

  const calorieChartData = {
    labels: ["Consumed", "Remaining"],
    datasets: [
      {
        data: [summary.consumed, summary.remaining],
        backgroundColor: ["#f97316", "#22c55e"],
      },
    ],
  };

  const weightChartData = {
    labels: weightHistory.map((w) =>
      new Date(w.entry_date).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Weight (kg)",
        data: weightHistory.map((w) => w.weight_kg),
        borderColor: "#4ade80",
        tension: 0.3,
      },
    ],
  };

  // ================= UI =================
  return (
    <div style={{ padding: "40px", maxWidth: "900px" }}>
      <h1>📊 CalTrack — Analytics Dashboard</h1>

      {/* ================= CALORIES ================= */}
      <h2>🔥 Calories</h2>
      <p>Daily Goal: {summary.calorie_goal}</p>
      <p>Consumed: {summary.consumed}</p>
      <p>Remaining: {summary.remaining}</p>

      <div style={{ maxWidth: "300px" }}>
        <Doughnut data={calorieChartData} />
      </div>

      <h3>🍽️ Add Meal</h3>
      <input
        placeholder="Meal name"
        value={mealName}
        onChange={(e) => setMealName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Calories"
        value={mealCalories}
        onChange={(e) => setMealCalories(e.target.value)}
        style={{ marginLeft: "10px" }}
      />
      <button onClick={addMeal} style={{ marginLeft: "10px" }}>
        Add Meal
      </button>

      <hr />

      {/* ================= WEIGHT TRACKING ================= */}
      <h2>⚖️ Weight Tracking</h2>

      <input
        type="number"
        placeholder="Enter weight (kg)"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />
      <button onClick={addWeight} style={{ marginLeft: "10px" }}>
        Add Weight
      </button>

      <h3>📉 Weight History</h3>

      {weightHistory.length === 0 ? (
        <p>No weight entries yet</p>
      ) : (
        <>
          <ul>
            {weightHistory.map((w, i) => (
              <li key={i}>
                {new Date(w.entry_date).toLocaleDateString()} —{" "}
                {w.weight_kg} kg
              </li>
            ))}
          </ul>

          <div style={{ maxWidth: "600px" }}>
            <Line data={weightChartData} />
          </div>
        </>
      )}

      <hr />

      {/* ================= ML WORKOUTS ================= */}
      <h2>🏋️ Recommended Workouts (ML)</h2>

      {workouts.length === 0 ? (
        <p>No workout recommendations yet</p>
      ) : (
        <ul>
          {workouts.map((w) => (
            <li key={w.id}>
              <strong>{w.name}</strong> — {w.calories_burn} kcal (
              {w.type})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
