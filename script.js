requestAnimationFrame(() => document.documentElement.classList.add("ready"));

const contactButtons = document.querySelectorAll(".contactButton");
const bars = document.querySelectorAll(".waveBar");

bars.forEach((bar, index) => {
  bar.style.setProperty("--wave-index", String(Math.abs(index - (bars.length - 1) / 2)));
});

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  contactButtons.forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.11;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.2;
      button.style.transform = `translate(${x}px, ${y}px) scale(1.035)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "translate(0, 0) scale(1)";
    });
  });
}
