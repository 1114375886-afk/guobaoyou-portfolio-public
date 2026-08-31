requestAnimationFrame(() => document.documentElement.classList.add("ready"));

const stopGlowMotion = window.createGlowMotion?.(document.querySelector(".ambientGlows"));

const shell = document.querySelector(".portfolioShell");
const cover = document.querySelector(".cover");
const coverHeader = document.querySelector(".coverHeader");
const coverFooter = document.querySelector(".coverFooter");
const stage = document.querySelector(".portfolioStage");
const stageContactSlot = document.querySelector("#stage-contact-slot");
const entryButton = document.querySelector("#portfolio-entry");
const homeButton = document.querySelector("#portfolio-home");
const previousButton = document.querySelector("#slide-prev");
const nextButton = document.querySelector("#slide-next");
const currentLabel = document.querySelector("#slide-current");
const slides = Array.from(document.querySelectorAll(".portfolioSlide"));
const dots = Array.from(document.querySelectorAll(".slideDot"));
const contactHub = document.querySelector("#contact-hub");
const contactPrompt = document.querySelector("#contact-prompt");
const contactTrigger = document.querySelector("#contact-trigger");
const contactCard = document.querySelector("#contact-card");
const copyItems = Array.from(document.querySelectorAll(".copyItem"));
const resumeOpen = document.querySelector("#resume-open");
const resumeModal = document.querySelector("#resume-modal");
const resumeViewport = document.querySelector("#resume-viewport");
const digitalResume = document.querySelector("#digital-resume");
const resumeZoomOut = document.querySelector("#resume-zoom-out");
const resumeZoomIn = document.querySelector("#resume-zoom-in");
const resumeZoomLabel = document.querySelector("#resume-zoom-label");
const projectOpen = document.querySelector("#project-open");
const projectModal = document.querySelector("#project-modal");
const projectClose = document.querySelector("#project-close");
const projectTabs = Array.from(document.querySelectorAll(".projectTab"));
const projectChapters = Array.from(document.querySelectorAll(".projectChapter"));
const projectChapterCounter = document.querySelector("#project-chapter-counter");
const projectPrevious = document.querySelector("#project-prev");
const projectNext = document.querySelector("#project-next");
const projectFilm = document.querySelector("#project-film");

let activeIndex = 0;
let exploring = false;
let transitionTimer;
let contactHideTimer;
let resumeZoom = 1;
let resumeReturnFocus;
let resumeDragState;
let projectChapterIndex = 0;
let projectReturnFocus;
let titleEffectsStopper = () => {};
let titleEffectsActive = false;

const startTitleEffects = () => {
  if (
    titleEffectsActive
    || exploring
    || !window.matchMedia("(pointer: fine)").matches
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) return;
  titleEffectsStopper = window.createTitleEffects?.(document.querySelector(".coverTitle")) || (() => {});
  titleEffectsActive = true;
};

const stopTitleEffects = () => {
  if (!titleEffectsActive) return;
  titleEffectsStopper();
  titleEffectsStopper = () => {};
  titleEffectsActive = false;
};

if (window.requestIdleCallback) window.requestIdleCallback(startTitleEffects, { timeout: 1400 });
else window.setTimeout(startTitleEffects, 900);

window.addEventListener("pagehide", () => {
  stopGlowMotion?.();
  stopTitleEffects();
}, { once: true });

const setContactOpen = (isOpen) => {
  window.clearTimeout(contactHideTimer);
  contactHub?.classList.toggle("is-open", isOpen);
  contactCard?.setAttribute("aria-hidden", String(!isOpen));
  contactPrompt?.setAttribute("aria-expanded", String(isOpen));
  contactTrigger?.setAttribute("aria-expanded", String(isOpen));
};

const scheduleContactClose = () => {
  window.clearTimeout(contactHideTimer);
  contactHideTimer = window.setTimeout(() => {
    if (!contactHub?.matches(":hover") && !contactHub?.contains(document.activeElement)) setContactOpen(false);
  }, 360);
};

const schedulePointerContactClose = () => {
  window.clearTimeout(contactHideTimer);
  contactHideTimer = window.setTimeout(() => {
    if (!contactHub?.matches(":hover")) setContactOpen(false);
  }, 360);
};

const fallbackCopy = (value) => {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
};

const copyContact = async (button) => {
  const value = button.dataset.copy || "";
  const feedback = button.querySelector("em");
  window.clearTimeout(button.copyResetTimer);
  button.classList.add("is-copied");
  if (feedback) feedback.textContent = "已复制";

  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else fallbackCopy(value);
  } catch {
    fallbackCopy(value);
  }

  button.copyResetTimer = window.setTimeout(() => {
    button.classList.remove("is-copied");
    if (feedback) feedback.textContent = "单击复制";
  }, 1600);
};

const updateResumeZoom = (nextZoom = resumeZoom) => {
  if (!resumeViewport || !digitalResume) return;
  resumeZoom = Math.min(2, Math.max(.6, Math.round(nextZoom * 10) / 10));
  const baseWidth = Math.min(980, Math.max(280, resumeViewport.clientWidth - (window.innerWidth <= 760 ? 24 : 64)));
  digitalResume.style.width = `${Math.round(baseWidth)}px`;
  digitalResume.style.zoom = String(resumeZoom);
  resumeZoomLabel.value = `${Math.round(resumeZoom * 100)}%`;
  resumeZoomLabel.textContent = `${Math.round(resumeZoom * 100)}%`;
  resumeZoomOut.disabled = resumeZoom <= .6;
  resumeZoomIn.disabled = resumeZoom >= 2;
};

const openResume = () => {
  resumeReturnFocus = document.activeElement;
  setContactOpen(false);
  resumeModal.classList.add("is-open");
  resumeModal.setAttribute("aria-hidden", "false");
  resumeZoom = 1;
  requestAnimationFrame(() => {
    updateResumeZoom(1);
    resumeViewport.scrollTo({ top: 0, left: 0 });
    resumeZoomIn.focus({ preventScroll: true });
  });
};

const closeResume = () => {
  resumeModal.classList.remove("is-open");
  resumeModal.setAttribute("aria-hidden", "true");
  resumeReturnFocus?.focus?.({ preventScroll: true });
};

const activateProjectChapter = (nextIndex) => {
  if (!projectChapters.length) return;
  const normalizedIndex = (nextIndex + projectChapters.length) % projectChapters.length;
  projectChapterIndex = normalizedIndex;
  projectChapters.forEach((chapter, index) => {
    const selected = index === normalizedIndex;
    chapter.classList.toggle("is-active", selected);
    chapter.setAttribute("aria-hidden", String(!selected));
  });
  projectTabs.forEach((tab, index) => {
    const selected = index === normalizedIndex;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  if (projectChapterCounter) projectChapterCounter.value = `${String(normalizedIndex + 1).padStart(2, "0")} / ${String(projectChapters.length).padStart(2, "0")}`;
  if (normalizedIndex !== 0) projectFilm?.pause();
  if (projectModal?.classList.contains("is-open")) hydrateProjectChapter(normalizedIndex);
};

const hydrateProjectChapter = (chapterIndex) => {
  const chapter = projectChapters[chapterIndex];
  if (!chapter) return;
  chapter.querySelectorAll("img[data-project-src]").forEach((image) => {
    image.src = image.dataset.projectSrc;
    image.removeAttribute("data-project-src");
  });
  if (chapterIndex === 0 && projectFilm?.dataset.projectSrc && !projectFilm.src) {
    projectFilm.src = projectFilm.dataset.projectSrc;
    projectFilm.load();
  }
};

const openProject = () => {
  projectReturnFocus = document.activeElement;
  setContactOpen(false);
  activateProjectChapter(0);
  projectModal?.classList.add("is-open");
  projectModal?.setAttribute("aria-hidden", "false");
  projectOpen?.setAttribute("aria-expanded", "true");
  hydrateProjectChapter(0);
  window.setTimeout(() => projectClose?.focus({ preventScroll: true }), 320);
};

const closeProject = () => {
  projectFilm?.pause();
  if (projectFilm?.src) {
    projectFilm.removeAttribute("src");
    projectFilm.load();
  }
  projectModal?.classList.remove("is-open");
  projectModal?.setAttribute("aria-hidden", "true");
  projectOpen?.setAttribute("aria-expanded", "false");
  projectReturnFocus?.focus?.({ preventScroll: true });
};

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
  if (exploring) return;
  exploring = true;
  stopTitleEffects();
  setContactOpen(false);
  stageContactSlot.append(contactHub);
  shell.classList.add("is-exploring");
  cover.setAttribute("aria-hidden", "true");
  stage.setAttribute("aria-hidden", "false");
  entryButton.setAttribute("aria-expanded", "true");
  window.setTimeout(() => nextButton.focus({ preventScroll: true }), 650);
};

const closePortfolio = () => {
  exploring = false;
  setContactOpen(false);
  coverHeader.append(contactHub);
  shell.classList.remove("is-exploring");
  cover.setAttribute("aria-hidden", "false");
  stage.setAttribute("aria-hidden", "true");
  entryButton.setAttribute("aria-expanded", "false");
  window.setTimeout(startTitleEffects, 650);
  window.setTimeout(() => entryButton.focus({ preventScroll: true }), 500);
};

cover.addEventListener("copy", (event) => {
  if (!event.target.closest?.(".copyItem")) event.preventDefault();
});

entryButton.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  openPortfolio();
}, { passive: true });
entryButton.addEventListener("click", openPortfolio);
coverFooter?.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  openPortfolio();
}, { passive: true });
homeButton.addEventListener("click", closePortfolio);
previousButton.addEventListener("click", () => activateSlide(activeIndex - 1));
nextButton.addEventListener("click", () => activateSlide(activeIndex + 1));
dots.forEach((dot) => dot.addEventListener("click", () => activateSlide(Number(dot.dataset.target))));

document.addEventListener("keydown", (event) => {
  if (resumeModal?.classList.contains("is-open")) return;
  if (projectModal?.classList.contains("is-open")) {
    if (event.key === "Escape") closeProject();
    if (event.key === "ArrowRight") activateProjectChapter(projectChapterIndex + 1);
    if (event.key === "ArrowLeft") activateProjectChapter(projectChapterIndex - 1);
    return;
  }
  if (!exploring) return;
  if (event.key === "ArrowRight") activateSlide(activeIndex + 1);
  if (event.key === "ArrowLeft") activateSlide(activeIndex - 1);
  if (event.key === "Escape") closePortfolio();
});

contactHub?.addEventListener("pointerenter", () => setContactOpen(true));
contactHub?.addEventListener("pointerleave", schedulePointerContactClose);
contactCard?.addEventListener("pointerenter", () => setContactOpen(true));
contactHub?.addEventListener("focusin", () => setContactOpen(true));
contactHub?.addEventListener("focusout", scheduleContactClose);
const toggleContactFromClick = () => {
  const hasHover = window.matchMedia("(hover: hover)").matches;
  setContactOpen(hasHover || !contactHub.classList.contains("is-open"));
};
contactPrompt?.addEventListener("click", toggleContactFromClick);
contactTrigger?.addEventListener("click", toggleContactFromClick);
document.addEventListener("pointerdown", (event) => {
  if (!contactHub?.contains(event.target)) setContactOpen(false);
});
copyItems.forEach((button) => button.addEventListener("click", () => copyContact(button)));
resumeOpen?.addEventListener("click", (event) => {
  event.stopPropagation();
  openResume();
});
resumeZoomOut?.addEventListener("click", () => updateResumeZoom(resumeZoom - .2));
resumeZoomIn?.addEventListener("click", () => updateResumeZoom(resumeZoom + .2));
resumeViewport?.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  updateResumeZoom(resumeZoom + (event.deltaY < 0 ? .2 : -.2));
}, { passive: false });
resumeViewport?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.pointerType !== "mouse") return;
  resumeDragState = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: resumeViewport.scrollLeft,
    top: resumeViewport.scrollTop
  };
  resumeViewport.classList.add("is-dragging");
  resumeViewport.setPointerCapture?.(event.pointerId);
});
resumeViewport?.addEventListener("pointermove", (event) => {
  if (!resumeDragState || resumeDragState.pointerId !== event.pointerId) return;
  resumeViewport.scrollLeft = resumeDragState.left - (event.clientX - resumeDragState.x);
  resumeViewport.scrollTop = resumeDragState.top - (event.clientY - resumeDragState.y);
  event.preventDefault();
});
const stopResumeDrag = (event) => {
  if (!resumeDragState || resumeDragState.pointerId !== event.pointerId) return;
  resumeViewport.releasePointerCapture?.(event.pointerId);
  resumeViewport.classList.remove("is-dragging");
  resumeDragState = undefined;
};
resumeViewport?.addEventListener("pointerup", stopResumeDrag);
resumeViewport?.addEventListener("pointercancel", stopResumeDrag);
resumeViewport?.addEventListener("dragstart", (event) => event.preventDefault());
resumeModal?.addEventListener("click", (event) => {
  if (event.target === resumeModal) closeResume();
});
projectOpen?.addEventListener("click", openProject);
projectClose?.addEventListener("click", closeProject);
projectPrevious?.addEventListener("click", () => activateProjectChapter(projectChapterIndex - 1));
projectNext?.addEventListener("click", () => activateProjectChapter(projectChapterIndex + 1));
projectTabs.forEach((tab) => tab.addEventListener("click", () => activateProjectChapter(Number(tab.dataset.projectTarget))));
projectModal?.addEventListener("click", (event) => {
  if (event.target === projectModal) closeProject();
});
window.addEventListener("resize", () => {
  if (resumeModal?.classList.contains("is-open")) updateResumeZoom();
});

updateNavigation();
activateProjectChapter(0);
