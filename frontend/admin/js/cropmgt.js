// sidebar toggle
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

const filterSelect = document.getElementById("filterSelect");
document.addEventListener("DOMContentLoaded", () => {
  const filterSelect = document.getElementById("filterSelect"); // Replace with the actual ID of your select element
  const tableBody = document.getElementById("table-wrapper"); // Replace with the actual ID of your table body

  if (filterSelect && tableBody) { // Add a check to ensure elements exist
    filterSelect.addEventListener("change", () => {
      const filterValue = filterSelect.value.toLowerCase();
      const rows = tableBody.getElementsByTagName("tr");

      for (let row of rows) {
        const statusCell = row.cells[3].textContent.toLowerCase();
        if (filterValue === "all" || statusCell === filterValue) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      }
    });
}
});