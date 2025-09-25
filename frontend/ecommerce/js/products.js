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

document.addEventListener("DOMContentLoaded", () => {
  const addToCartBtn = document.getElementById("add-to-cart");

  addToCartBtn.addEventListener("click", () => {
    const productName = document.getElementById("product-name").textContent;
    const productPrice = parseFloat(document.getElementById("product-price").dataset.price);
    const productImage = "images/avocado.jfif"; // you can set dynamically

    // Get existing cart or empty
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Check if already in cart
    const existing = cart.find(item => item.name === productName);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        name: productName,
        price: productPrice,
        image: productImage,
        qty: 1
      });
    }

    // Save back to localStorage
    localStorage.setItem("cart", JSON.stringify(cart));

    //alert("✅ Item added to cart!");
    // Optional: redirect to cart page
    window.location.href = "cart.html";
  });
});
