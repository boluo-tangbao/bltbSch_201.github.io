const symbols = ["~", "*", "+", "o"];

document.addEventListener("DOMContentLoaded", function () {
  initializePixelGallery();
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

async function initializePixelGallery() {
  const gallery = document.getElementById("pixel-characters");
  if (!gallery) return;
  const status = document.getElementById("pixel-gallery-status");
  const dialog = document.getElementById("pixel-dialog");
  try {
    const response = await fetch("rank/characters.json");
    if (!response.ok) throw new Error("Character gallery unavailable");
    const characters = await response.json();
    function framePortrait(stage, character) {
      stage.classList.toggle("original-art", !!character.frame);
      const frame = character.frame || { width: 100, left: 0, top: 0 };
      stage.style.setProperty("--art-width", `${frame.width}%`);
      stage.style.setProperty("--art-left", `${frame.left}%`);
      stage.style.setProperty("--art-top", `${frame.top}%`);
      stage.style.setProperty("--art-clip", frame.clip || "none");
    }
    let selected = 0;
    function showCharacter(index) {
      selected = (index + characters.length) % characters.length;
      const character = characters[selected];
      const image = document.getElementById("pixel-character-image");
      image.src = `rank/${character.portrait}`;
      image.alt = `${character.name}的正面半身像`;
      framePortrait(image.parentElement, character);
      const source = document.getElementById("pixel-character-source");
      source.hidden = !character.source;
      if (character.source) { source.href = character.source.url; source.textContent = `${character.source.label} ↗`; }
      document.getElementById("pixel-character-name").textContent = character.name;
      document.getElementById("pixel-character-description").textContent = character.description;
      document.getElementById("pixel-character-debut").textContent = character.debut;
      document.getElementById("pixel-character-position").textContent = `${selected + 1} / ${characters.length}`;
    }
    characters.forEach((character, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pixel-character";
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-label", `查看${character.name}的半身像与介绍`);
      const stage = document.createElement("span");
      stage.className = "pixel-character-stage";
      framePortrait(stage, character);
      const image = document.createElement("img");
      image.src = `rank/${character.portrait}`;
      image.alt = `${character.name}的正面半身像`;
      image.width = 512;
      image.height = 512;
      image.loading = "lazy";
      image.decoding = "async";
      const name = document.createElement("span");
      name.className = "pixel-character-name";
      name.textContent = character.name;
      stage.append(image);
      button.append(stage, name);
      button.addEventListener("click", () => {
        showCharacter(index);
        dialog.showModal();
      });
      item.append(button);
      gallery.append(item);
    });
    status.hidden = true;
    dialog.querySelector(".pixel-dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    document.getElementById("pixel-previous").addEventListener("click", () => showCharacter(selected - 1));
    document.getElementById("pixel-next").addEventListener("click", () => showCharacter(selected + 1));
    dialog.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        showCharacter(selected + (event.key === "ArrowLeft" ? -1 : 1));
      }
    });
  } catch {
    status.textContent = "角色相册暂时没有加载成功，请刷新页面再试试。";
  }
}

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
