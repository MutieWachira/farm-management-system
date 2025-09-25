document.getElementById("payment-form").addEventListener("submit", function(e) {
  e.preventDefault();

  // Fake validation
  const card = document.getElementById("cardNumber").value;
  const expiry = document.getElementById("expiry").value;
  const cvv = document.getElementById("cvv").value;
  const name = document.getElementById("name").value;

  if (card && expiry && cvv && name) {
    // Redirect to confirmation page
    window.location.href = "confirmation.html";
  } else {
    alert("Please fill all details correctly.");
  }
});

