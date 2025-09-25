//sticky navigation<script>
window.addEventListener("scroll", function () {
    const nav = document.querySelector(".navigation");
    if (window.scrollY > 50) {
        nav.classList.add("scrolled");
    } else {
        nav.classList.remove("scrolled");
    }
});

document.addEventListener("DOMContentLoaded", () => {
  const cartItemsContainer = document.querySelector(".cart-items");
  const subtotalEl = document.querySelector(".cart-summary p span");
  const totalEl = document.querySelector(".grand-total span");

  function updateTotals() {
    let subtotal = 0;
    document.querySelectorAll(".cart-item").forEach(item => {
      const price = parseFloat(item.dataset.price);
      const qty = parseInt(item.querySelector(".quantity input").value);
      const itemTotal = price * qty;
      item.querySelector(".item-total").textContent = `$${itemTotal.toFixed(2)}`;
      subtotal += itemTotal;
    });
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    const shipping = subtotal > 0 ? 2.0 : 0;
    totalEl.textContent = `$${(subtotal + shipping).toFixed(2)}`;
  }

  function addItemEvents(item) {
    const minusBtn = item.querySelector(".qty-btn:first-child");
    const plusBtn = item.querySelector(".qty-btn:last-child");
    const qtyInput = item.querySelector(".quantity input");
    const removeBtn = item.querySelector(".remove-btn");

    minusBtn.addEventListener("click", () => {
      let qty = parseInt(qtyInput.value);
      if (qty > 1) qtyInput.value = qty - 1;
      updateTotals();
      saveCart();
    });

    plusBtn.addEventListener("click", () => {
      let qty = parseInt(qtyInput.value);
      qtyInput.value = qty + 1;
      updateTotals();
      saveCart();
    });

    removeBtn.addEventListener("click", () => {
      item.remove();
      updateTotals();
      saveCart();
    });
  }

  function saveCart() {
    const cart = [];
    document.querySelectorAll(".cart-item").forEach(item => {
      cart.push({
        name: item.querySelector("h3").textContent,
        price: parseFloat(item.dataset.price),
        image: item.querySelector("img").src,
        qty: parseInt(item.querySelector(".quantity input").value)
      });
    });
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  function loadCart() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    cartItemsContainer.innerHTML = "";

    cart.forEach(product => {
  const price = parseFloat(product.price) || 0;
  const qty = parseInt(product.qty) || 1;

  const item = document.createElement("div");
  item.classList.add("cart-item");
  item.dataset.price = price;
  item.innerHTML = `
    <img src="${product.image}" alt="${product.name}">
    <div class="item-details">
      <h3>${product.name}</h3>
      <p class="price">$${price.toFixed(2)}</p>
    </div>
    <div class="quantity">
      <button class="qty-btn">-</button>
      <input type="text" value="${qty}">
      <button class="qty-btn">+</button>
    </div>
    <p class="item-total">$${(price * qty).toFixed(2)}</p>
    <button class="remove-btn">🗑️</button>
  `;
  cartItemsContainer.appendChild(item);
  addItemEvents(item);
});

    updateTotals();
  }

  loadCart();
});
