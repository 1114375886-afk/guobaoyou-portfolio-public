requestAnimationFrame(() => document.documentElement.classList.add("ready"));

const stopGlowMotion = window.createGlowMotion?.(document.querySelector(".ambientGlows"));
window.addEventListener("pagehide", () => stopGlowMotion?.(), { once: true });

const shell = document.querySelector(".portfolioShell");
const cover = document.querySelector(".cover");
const stage = document.querySelector(".portfolioStage");
const entryButton = document.querySelector("#portfolio-entry");
const homeButton = document.querySelector("#portfolio-home");
const previousButton = document.querySelector("#slide-prev");
const nextButton = document.querySelector("#slide-next");
const currentLabel = document.querySelector("#slide-current");
const slides = Array.from(document.querySelectorAll(".portfolioSlide"));
const dots = Array.from(document.querySelectorAll(".slideDot"));
const contactButtons = document.querySelectorAll(".contactButton");

let activeIndex = 0;
let exploring = false;
let transitionTimer;

const updateNavigation = () => {
  currentLabel.textContent = String(activeIndex + 1).padStart(2, "0");
  dots.forEach((dot, index) => {
    const selected = index === activeIndex;
    dot.classList.toggle("is-active", selected);
    dot.setAttribute("aria-selected", String(selected));
  });
};

const activateSlide = (nextIndex) => {
  if (!slides.length) return;
  const normalizedIndex = (nextIndex + slides.length) % slides.length;
  if (normalizedIndex === activeIndex) return;

  clearTimeout(transitionTimer);
  const direction = normalizedIndex > activeIndex ? "forward" : "backward";
  const currentSlide = slides[activeIndex];
  const nextSlide = slides[normalizedIndex];

  slides.forEach((slide) => slide.classList.remove("is-entering-forward", "is-entering-backward", "is-leaving-forward", "is-leaving-backward"));
  currentSlide.classList.add(`is-leaving-${direction}`);
  currentSlide.classList.remove("is-active");
  nextSlide.classList.add(`is-entering-${direction}`);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      nextSlide.classList.add("is-active");
      nextSlide.classList.remove(`is-entering-${direction}`);
    });
  });

  transitionTimer = window.setTimeout(() => {
    currentSlide.classList.remove(`is-leaving-${direction}`);
  }, 760);

  activeIndex = normalizedIndex;
  updateNavigation();
};

const openPortfolio = () => {
  exploring = true;
  shell.classList.add("is-exploring");
  cover.setAttribute("aria-hidden", "true");
  stage.setAttribute("aria-hidden", "false");
  entryButton.setAttribute("aria-expanded", "true");
  window.setTimeout(() => nextButton.focus({ preventScroll: true }), 650);
};

const closePortfolio = () => {
  exploring = false;
  shell.classList.remove("is-exploring");
  cover.setAttribute("aria-hidden", "false");
  stage.setAttribute("aria-hidden", "true");
  entryButton.setAttribute("aria-expanded", "false");
  window.setTimeout(() => entryButton.focus({ preventScroll: true }), 500);
};

entryButton.addEventListener("click", openPortfolio);
homeButton.addEventListener("click", closePortfolio);
previousButton.addEventListener("click", () => activateSlide(activeIndex - 1));
nextButton.addEventListener("click", () => activateSlide(activeIndex + 1));
dots.forEach((dot) => dot.addEventListener("click", () => activateSlide(Number(dot.dataset.target))));

document.addEventListener("keydown", (event) => {
  if (!exploring) return;
  if (event.key === "ArrowRight") activateSlide(activeIndex + 1);
  if (event.key === "ArrowLeft") activateSlide(activeIndex - 1);
  if (event.key === "Escape") closePortfolio();
});

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  contactButtons.forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.1;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.18;
      button.style.transform = `translate(${x}px, ${y}px) scale(1.035)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "translate(0, 0) scale(1)";
    });
  });
}

updateNavigation();
