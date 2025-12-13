import { useEffect, useState } from "react";
import "./App.css";

const USER_ID = 1;

function App() {
  const [summary, setSummary] = useState({
    calorie_goal: 0,
    consumed: 0,
    remaining: 0,
  });

  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  // =========================
  // FETCH DAILY SUMMARY
  // =========================
  const fetchSummary = async () => {
    const res = await fetch(
      `http://localhost:5000/api/summary/${USER_ID}`
    );
    const data = await res.json();
    setSummary(data);
  };

  // =========================
  // ADD WEIGHT
  // =========================
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

  // =========================
  // FETCH WEIGHT HISTORY
  // =========================
  const fetchWeightHistory = async () => {
    const res = await fetch(
      `http://localhost:5000/api/weight/${USER_ID}`
    );
    const data = await res.json();
    setWeightHistory(data);
  };

  // =========================
  // FETCH ML WORKOUTS
  // =========================
  const fetchWorkoutRecommendations = async () => {
    const res = await fetch(
      `http://localhost:5000/api/workouts/recommend/${USER_ID}`
    );
    const data = await res.json();
    setWorkouts(data);
  };

  // =========================
  // LOAD EVERYTHING
  // =========================
  useEffect(() => {
    fetchSummary();
    fetchWeightHistory();
    fetchWorkoutRecommendations();
  }, []);

  return (
    <div style={{ padding: "40px", maxWidth: "800px" }}>
      <h1>CalTrack — Progress Dashboard</h1>

      {/* ================= CALORIES ================= */}
      <h2>🔥 Calories</h2>
      <p>Daily Goal: {summary.calorie_goal}</p>
      <p>Consumed: {summary.consumed}</p>
      <p>Remaining: {summary.remaining}</p>

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
        <ul>
          {weightHistory.map((w, i) => (
            <li key={i}>
              {new Date(w.entry_date).toLocaleDateString()} —{" "}
              {w.weight_kg} kg
            </li>
          ))}
        </ul>
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
              <strong>{w.name}</strong> — {w.calories_burn} kcal
              <span style={{ opacity: 0.7 }}>
                {" "}
                ({w.type})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
