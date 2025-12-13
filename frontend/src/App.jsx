import { useEffect, useState } from "react";

function App() {
  const USER_ID = 1; // temporary hardcoded user

  const [meal, setMeal] = useState({
    meal_name: "",
    calories: "",
  });

  const [totalCalories, setTotalCalories] = useState(0);

  const handleChange = (e) => {
    setMeal({ ...meal, [e.target.name]: e.target.value });
  };

  const addMeal = async () => {
    await fetch("http://localhost:5000/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        meal_name: meal.meal_name,
        calories: Number(meal.calories),
      }),
    });

    setMeal({ meal_name: "", calories: "" });
    fetchTodayCalories();
  };

  const fetchTodayCalories = async () => {
    const res = await fetch(
      `http://localhost:5000/api/meals/today/${USER_ID}`
    );
    const data = await res.json();
    setTotalCalories(data.total_calories);
  };

  useEffect(() => {
    fetchTodayCalories();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>CalTrack — Meal Tracker</h1>

      <h2>Today's Calories: {totalCalories}</h2>

      <input
        name="meal_name"
        placeholder="Meal name"
        value={meal.meal_name}
        onChange={handleChange}
      />
      <br />

      <input
        name="calories"
        placeholder="Calories"
        value={meal.calories}
        onChange={handleChange}
      />
      <br />

      <button onClick={addMeal}>Add Meal</button>
    </div>
  );
}

export default App;
