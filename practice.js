(() => {
  const slide = document.querySelector('.practiceSlide');
  const shell = document.querySelector('.portfolioShell');
  const cards = Array.from(document.querySelectorAll('.practiceCard'));
  const dialog = document.querySelector('#practice-player');
  const film = document.querySelector('#practice-film');
  const status = document.querySelector('#practice-playback-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverSupported = window.matchMedia('(hover: hover)');
  let hoveredCard = null;
  let playRequest = 0;

  const syncPreviews = () => {
    const visible = shell.classList.contains('is-exploring')
      && slide.classList.contains('is-active') && !dialog.open
      && !document.hidden && !reducedMotion.matches;
    const focused = cards.find(card => card.contains(document.activeElement));
    const selected = hoveredCard || focused;
    cards.forEach(card => {
      const preview = card.querySelector('video');
      if (!visible || card !== selected) { preview.pause(); return; }
      if (!preview.getAttribute('src')) preview.src = preview.dataset.previewSrc;
      preview.muted = true;
      preview.play().catch(() => {}); // Keep the poster when autoplay is unavailable.
    });
  };

  cards.forEach((card, index) => {
    card.addEventListener('pointerenter', () => {
      if (!hoverSupported.matches) return;
      hoveredCard = card;
      syncPreviews();
    });
    card.addEventListener('pointerleave', () => { hoveredCard = null; syncPreviews(); });
    card.addEventListener('focus', syncPreviews);
    card.addEventListener('blur', () => queueMicrotask(syncPreviews));
    card.addEventListener('click', () => {
      const request = ++playRequest;
      cards.forEach(item => item.querySelector('video').pause());
      status.textContent = '';
      document.querySelector('#practice-player-title').textContent = card.dataset.title;
      document.querySelector('#practice-player-index').textContent = `PRACTICE / ${String(index + 1).padStart(2, '0')}`;
      document.querySelector('#practice-player-meta').textContent = `${card.dataset.duration} · 练习作品`;
      document.querySelector('#practice-video-link').href = card.dataset.filmSrc;
      film.poster = card.querySelector('video').poster;
      dialog.showModal();
      film.src = card.dataset.filmSrc;
      film.play().catch(() => {
        if (dialog.open && request === playRequest && !film.error) status.textContent = '点击播放器中的播放按钮开始观看。';
      });
    });
  });
  document.querySelector('#practice-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    playRequest++;
    film.pause();
    film.removeAttribute('src');
    film.load();
    status.textContent = '';
    syncPreviews();
  });
  film.addEventListener('playing', () => { status.textContent = ''; });
  film.addEventListener('error', () => {
    if (dialog.open) status.textContent = '视频暂时无法加载，请尝试下方“单独打开视频”。';
  });
  const observer = new MutationObserver(syncPreviews);
  observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
  observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncPreviews);
  reducedMotion.addEventListener('change', syncPreviews);
  window.addEventListener('pagehide', () => {
    cards.forEach(card => card.querySelector('video').pause());
    film.pause();
  });
  syncPreviews();
})();
