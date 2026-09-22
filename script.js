const symbols = ["~", "*", "+", "o"];

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("section[data-link]").forEach(function (section) {
    section.classList.add("is-clickable");

    section.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        return;
      }

      goToSectionPage(section);
    });

    section.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      goToSectionPage(section);
    });
  });
});

document.addEventListener("click", function (event) {
  createRipple(event.clientX, event.clientY);
  createSparkles(event.clientX, event.clientY);
});

function goToSectionPage(section) {
  const target = section.dataset.link;
  if (!target) {
    return;
  }

  window.setTimeout(() => {
    window.location.href = target;
  }, 120);
}

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
