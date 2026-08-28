(function attachGlowMotion(global) {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  function createGlowMotion(root) {
    if (!root) return function noop() {};

    const elements = Array.from(root.querySelectorAll(".glow"));
    if (!elements.length) return function noop() {};

    const startingPoints = [
      [.1, .18],
      [.8, .16],
      [.78, .78],
      [.18, .76],
    ];
    const directions = [
      [.82, .57],
      [-.72, .69],
      [-.8, -.6],
      [.68, -.74],
    ];
    const sizeRules = [
      [.62, 360, 680],
      [.42, 245, 460],
      [.52, 300, 580],
      [.32, 200, 390],
    ];
    const speedFactors = [1, .88, .94, .82];

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let previousTime = performance.now();

    const states = elements.map((element, index) => ({
      element,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      baseSize: 0,
      size: 0,
      phase: index * 1.73,
      squish: 0,
      squishVelocity: 0,
      collisionAngle: 0,
    }));

    const measure = (initial) => {
      const oldWidth = width || global.innerWidth;
      const oldHeight = height || global.innerHeight;
      width = root.clientWidth || global.innerWidth;
      height = root.clientHeight || global.innerHeight;
      const shortSide = Math.min(width, height);
      const speed = clamp(shortSide * .04, 23, 38);

      states.forEach((state, index) => {
        const [ratio, minimum, maximum] = sizeRules[index % sizeRules.length];
        state.baseSize = clamp(shortSide * ratio, minimum, maximum);
        state.speed = speed * speedFactors[index];

        if (initial) {
          const directionLength = Math.hypot(directions[index][0], directions[index][1]);
          state.x = width * startingPoints[index][0];
          state.y = height * startingPoints[index][1];
          state.vx = directions[index][0] / directionLength * state.speed;
          state.vy = directions[index][1] / directionLength * state.speed;
        } else {
          state.x = clamp(state.x * width / oldWidth, 0, width);
          state.y = clamp(state.y * height / oldHeight, 0, height);
        }

        state.element.style.left = "0";
        state.element.style.top = "0";
        state.element.style.right = "auto";
        state.element.style.bottom = "auto";
        state.element.style.animation = "none";
      });
    };

    const updateBreathing = (time) => {
      states.forEach((state) => {
        const pulse = 1 + Math.sin(time * .00034 + state.phase) * .07;
        state.size = state.baseSize * pulse;
      });
    };

    const keepInside = (state) => {
      const minimumX = 0;
      const maximumX = width;
      const minimumY = 0;
      const maximumY = height;

      if (state.x < minimumX) {
        state.x = minimumX;
        state.vx = Math.abs(state.vx);
      } else if (state.x > maximumX) {
        state.x = maximumX;
        state.vx = -Math.abs(state.vx);
      }

      if (state.y < minimumY) {
        state.y = minimumY;
        state.vy = Math.abs(state.vy);
      } else if (state.y > maximumY) {
        state.y = maximumY;
        state.vy = -Math.abs(state.vy);
      }
    };

    const resolveCollisions = () => {
      const restoreSpeed = (state) => {
        const currentSpeed = Math.hypot(state.vx, state.vy);
        if (currentSpeed < .001) return;
        const correction = state.speed / currentSpeed;
        state.vx *= correction;
        state.vy *= correction;
      };

      for (let firstIndex = 0; firstIndex < states.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < states.length; secondIndex += 1) {
          const first = states[firstIndex];
          const second = states[secondIndex];
          const deltaX = second.x - first.x;
          const deltaY = second.y - first.y;
          const distance = Math.max(1, Math.hypot(deltaX, deltaY));
          const normalX = deltaX / distance;
          const normalY = deltaY / distance;
          const safeDistance = (first.size + second.size) * .48 + 14;
          const approachDistance = 46;

          if (distance >= safeDistance + approachDistance) continue;

          const proximity = clamp((safeDistance + approachDistance - distance) / approachDistance, 0, 1);
          const deformation = proximity * .095;
          first.squish = Math.max(first.squish, deformation);
          second.squish = Math.max(second.squish, deformation);
          first.collisionAngle = Math.atan2(normalY, normalX);
          second.collisionAngle = first.collisionAngle;

          if (distance >= safeDistance) continue;

          const overlap = safeDistance - distance;
          first.x -= normalX * overlap * .5;
          first.y -= normalY * overlap * .5;
          second.x += normalX * overlap * .5;
          second.y += normalY * overlap * .5;

          const relativeVelocity = (second.vx - first.vx) * normalX + (second.vy - first.vy) * normalY;
          if (relativeVelocity < 0) {
            const impulse = -relativeVelocity * 1.03;
            first.vx -= impulse * normalX;
            first.vy -= impulse * normalY;
            second.vx += impulse * normalX;
            second.vy += impulse * normalY;
            restoreSpeed(first);
            restoreSpeed(second);
          }

          first.squish = Math.max(first.squish, .16);
          second.squish = Math.max(second.squish, .16);
          first.squishVelocity = 0;
          second.squishVelocity = 0;
        }
      }
    };

    const updateElasticity = (state, deltaTime) => {
      state.squishVelocity += (-58 * state.squish - 10.5 * state.squishVelocity) * deltaTime;
      state.squish += state.squishVelocity * deltaTime;
      state.squish = clamp(state.squish, -.052, .18);
      if (Math.abs(state.squish) < .001 && Math.abs(state.squishVelocity) < .001) {
        state.squish = 0;
        state.squishVelocity = 0;
      }
    };

    const render = (time) => {
      states.forEach((state) => {
        const scaleX = 1 - state.squish;
        const scaleY = 1 + state.squish * .68;
        const x = state.x - state.size / 2;
        const y = state.y - state.size / 2;
        const opacity = .3 + (Math.sin(time * .00038 + state.phase) + 1) * .055;
        state.element.style.width = `${state.size.toFixed(2)}px`;
        state.element.style.opacity = opacity.toFixed(3);
        state.element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${state.collisionAngle.toFixed(4)}rad) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
      });
    };

    const tick = (time) => {
      const deltaTime = Math.min((time - previousTime) / 1000, .034);
      previousTime = time;

      if (!document.hidden) {
        updateBreathing(time);
        states.forEach((state) => {
          state.x += state.vx * deltaTime;
          state.y += state.vy * deltaTime;
          keepInside(state);
        });
        resolveCollisions();
        states.forEach(keepInside);
        states.forEach((state) => updateElasticity(state, deltaTime));
        render(time);
      }

      animationFrame = global.requestAnimationFrame(tick);
    };

    const onResize = () => measure(false);
    measure(true);
    updateBreathing(previousTime);
    render(previousTime);

    if (!global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animationFrame = global.requestAnimationFrame(tick);
      global.addEventListener("resize", onResize, { passive: true });
    }

    return function stopGlowMotion() {
      global.cancelAnimationFrame(animationFrame);
      global.removeEventListener("resize", onResize);
    };
  }

  function createTitleEffects(title) {
    if (!title || !title.parentNode) return function noop() {};

    const lines = Array.from(title.children);
    lines.forEach((line) => line.setAttribute("data-text", line.textContent.trim()));

    const projection = title.cloneNode(true);
    projection.className = "coverTitle coverTitleProjection";
    projection.setAttribute("aria-hidden", "true");
    projection.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    title.parentNode.insertBefore(projection, title);

    const reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let targetX = title.clientWidth / 2;
    let targetY = title.clientHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let animationFrame = 0;
    let active = false;

    const writePosition = () => {
      projection.style.setProperty("--projection-x", `${currentX.toFixed(2)}px`);
      projection.style.setProperty("--projection-y", `${currentY.toFixed(2)}px`);
    };

    const followPointer = () => {
      currentX += (targetX - currentX) * .14;
      currentY += (targetY - currentY) * .14;
      writePosition();

      if (active || Math.abs(targetX - currentX) > .12 || Math.abs(targetY - currentY) > .12) {
        animationFrame = global.requestAnimationFrame(followPointer);
      } else {
        animationFrame = 0;
      }
    };

    const updateTarget = (event) => {
      const rect = title.getBoundingClientRect();
      targetX = clamp(event.clientX - rect.left, 0, rect.width);
      targetY = clamp(event.clientY - rect.top, 0, rect.height);

      if (reducedMotion) {
        currentX = targetX;
        currentY = targetY;
        writePosition();
      } else if (!animationFrame) {
        animationFrame = global.requestAnimationFrame(followPointer);
      }
    };

    const onPointerEnter = (event) => {
      updateTarget(event);
      currentX = targetX;
      currentY = targetY;
      writePosition();
      active = true;
      projection.classList.add("is-active");
    };

    const onPointerLeave = () => {
      active = false;
      projection.classList.remove("is-active");
    };

    title.addEventListener("pointerenter", onPointerEnter);
    title.addEventListener("pointermove", updateTarget);
    title.addEventListener("pointerleave", onPointerLeave);
    writePosition();

    return function stopTitleEffects() {
      global.cancelAnimationFrame(animationFrame);
      title.removeEventListener("pointerenter", onPointerEnter);
      title.removeEventListener("pointermove", updateTarget);
      title.removeEventListener("pointerleave", onPointerLeave);
      projection.remove();
      lines.forEach((line) => line.removeAttribute("data-text"));
    };
  }

  global.createGlowMotion = createGlowMotion;
  global.createTitleEffects = createTitleEffects;
})(window);
