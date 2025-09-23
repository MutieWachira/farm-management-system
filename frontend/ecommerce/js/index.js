const itemsPerPage = 6;
let currentPage = 1;
let activeCategory = "all";

const cards = document.querySelectorAll(".groceries-card");
const categories = document.querySelectorAll(".category-card");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const paginationNumbers = document.getElementById("paginationNumbers"); // container for numbers

function getFilteredCards() {
  if (activeCategory === "all") return [...cards];
  return [...cards].filter(
    (card) => card.dataset.category === activeCategory
  );
}

function showPage(page) {
  const filteredCards = getFilteredCards();
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);

  // Hide all cards
  cards.forEach((card) => (card.style.display = "none"));

  // Show only current page cards
  filteredCards.forEach((card, index) => {
    if (index >= (page - 1) * itemsPerPage && index < page * itemsPerPage) {
      card.style.display = "block";
    }
  });

  // Disable prev/next buttons
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page === totalPages;

}


// Pagination event listeners
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    showPage(currentPage);
  }
});

nextBtn.addEventListener("click", () => {
  const filteredCards = getFilteredCards();
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);

  if (currentPage < totalPages) {
    currentPage++;
    showPage(currentPage);
  }
});

// Category filtering
categories.forEach((cat) => {
  cat.addEventListener("click", () => {
    // Remove active from all, add to clicked
    categories.forEach((c) => c.classList.remove("active-category"));
    cat.classList.add("active-category");

    activeCategory = cat.dataset.category;
    currentPage = 1;
    showPage(currentPage);
  });
});

// Initial load
showPage(currentPage);
