const symbols = ["~", "*", "+", "o"];

document.addEventListener("click", function (event) {
  createRipple(event.clientX, event.clientY);
  createSparkles(event.clientX, event.clientY);

  const section = event.target.closest("[data-link]");
  if (!section || event.target.closest("a")) {
    return;
  }

  const target = section.dataset.link;
  if (target) {
    window.setTimeout(() => {
      window.location.href = target;
    }, 120);
  }
});

document.addEventListener("keydown", function (event) {
  const section = event.target.closest("[data-link]");
  if (!section || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }

  event.preventDefault();
  window.location.href = section.dataset.link;
});

function createRipple(x, y) {
  const ripple = document.createElement("div");
  ripple.className = "ripple";
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  document.body.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 750);
}

function createSparkles(x, y) {
  const count = 12;

  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle";

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 70;
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;
    const rotation = Math.floor(Math.random() * 240 - 120);
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    sparkle.textContent = symbol;
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    sparkle.style.setProperty("--x", `${offsetX}px`);
    sparkle.style.setProperty("--y", `${offsetY}px`);
    sparkle.style.setProperty("--r", `${rotation}deg`);

    document.body.appendChild(sparkle);

    setTimeout(() => {
      sparkle.remove();
    }, 900);
  }
}
