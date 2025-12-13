import { useEffect, useState } from "react";

function App() {
  const USER_ID = 1;

  const [summary, setSummary] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);

  // --- SUMMARY ---
  const fetchSummary = async () => {
    const res = await fetch(
      `http://localhost:5000/api/summary/${USER_ID}`
    );
    const data = await res.json();
    setSummary(data);
    fetchRecipes(data.remaining);
  };

  const fetchRecipes = async (remaining) => {
    const res = await fetch(
      `http://localhost:5000/api/recipes/suggest/${remaining}`
    );
    const data = await res.json();
    setRecipes(data);
  };

  // --- WEIGHT ---
  const addWeight = async () => {
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

  const fetchWeightHistory = async () => {
    const res = await fetch(
      `http://localhost:5000/api/weight/${USER_ID}`
    );

    const data = await res.json();
    console.log("WEIGHT HISTORY:", data); //  DEBUG LINE

    setWeightHistory(data);
  };


  useEffect(() => {
    fetchSummary();
    fetchWeightHistory();
  }, []);

  if (!summary) return <p>Loading...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>CalTrack — Progress Dashboard</h1>

      {/* CALORIE SUMMARY */}
      <h2>🔥 Calories</h2>
      <p>Daily Goal: {summary.calorie_goal}</p>
      <p>Consumed: {summary.consumed}</p>
      <p>Remaining: {summary.remaining}</p>

      <h3>🍽️ Suggested Recipes</h3>
      <ul>
        {recipes.map((r) => (
          <li key={r.id}>
            {r.name} — {r.calories} kcal
          </li>
        ))}
      </ul>

      <hr />

      {/* WEIGHT TRACKING */}
      <h2>⚖️ Weight Tracking</h2>

      <input
        placeholder="Enter weight (kg)"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />
      <button onClick={addWeight}>Add Weight</button>

      <h3>📈 Weight History</h3>
      <ul>
        {Array.isArray(weightHistory) && weightHistory.length > 0 ? (
          weightHistory.map((w) => (
            <li key={w.entry_date + w.weight_kg + Math.random()}>
              {new Date(w.entry_date).toLocaleDateString()} — {w.weight_kg} kg
            </li>
          ))
        ) : (
          <li>No weight entries yet</li>
        )}
      </ul>

    </div>
  );
}

export default App;
