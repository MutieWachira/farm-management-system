const API_URL = "http://localhost:5000/api/crops";

// Fetch crops and show them in table
async function loadCrops() {
  try {
    const res = await fetch(API_URL);
    const crops = await res.json();

    const tbody = document.getElementById("cropTableBody");
    tbody.innerHTML = ""; // Clear old rows

    crops.forEach(crop => {
      const row = `
        <tr>
          <td>${crop.name}</td>
          <td>${crop.quantity}</td>
          <td>${crop.price}</td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error("Error loading crops:", err);
  }
}

// Add new crop
document.getElementById("addcropForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("cropName").value;
  const quantity = document.getElementById("cropQuantity").value;
  const price = document.getElementById("cropPrice").value;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity, price }),
    });

    // Reload crops after adding
    loadCrops();

    // Clear form
    e.target.reset();
  } catch (err) {
    console.error("Error adding crop:", err);
  }
});

// Load crops when page opens
window.onload = loadCrops;

//harvest Chart
