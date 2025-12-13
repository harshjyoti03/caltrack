import { useEffect, useState } from "react";

function App() {
  const USER_ID = 1;

  const [summary, setSummary] = useState(null);
  const [recipes, setRecipes] = useState([]);

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

  useEffect(() => {
    fetchSummary();
  }, []);

  if (!summary) return <p>Loading...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>CalTrack — Daily Summary</h1>

      <p>🎯 Daily Goal: {summary.calorie_goal} kcal</p>
      <p>🔥 Consumed: {summary.consumed} kcal</p>
      <p>✅ Remaining: {summary.remaining} kcal</p>

      <h2>🍽️ Suggested Recipes</h2>
      <ul>
        {recipes.map((r) => (
          <li key={r.id}>
            {r.name} — {r.calories} kcal
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
