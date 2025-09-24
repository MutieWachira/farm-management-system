//sticky navigation<script>
window.addEventListener("scroll", function () {
    const nav = document.querySelector(".navigation");
    if (window.scrollY > 50) {
        nav.classList.add("scrolled");
    } else {
        nav.classList.remove("scrolled");
    }
});

const minusBtn = document.querySelector(".minus");
const plusBtn = document.querySelector(".plus");
const quantityInput = document.querySelector(".quantity");

plusBtn.addEventListener("click", () => {
    let value = parseInt(quantityInput.value);
    quantityInput.value = value + 1;
});

minusBtn.addEventListener("click", () => {
    let value = parseInt(quantityInput.value);
    if (value > 1) {
        quantityInput.value = value - 1;
    }
});

const wishlistBtn = document.querySelector(".wishlist");
const wishlistIcon = document.querySelector(".wishlist-icon");
const wishlistText = document.querySelector(".wishlist-text");

wishlistBtn.addEventListener("click", () => {
  wishlistBtn.classList.toggle("active");

  if (wishlistBtn.classList.contains("active")) {
    wishlistIcon.classList.remove("fa-regular"); // empty heart
    wishlistIcon.classList.add("fa-solid"); // filled heart
    wishlistText.textContent = "Added to Wishlist";
  } else {
    wishlistIcon.classList.remove("fa-solid");
    wishlistIcon.classList.add("fa-regular");
    wishlistText.textContent = "Add to Wishlist";
  }
});
