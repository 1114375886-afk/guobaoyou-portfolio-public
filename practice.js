(() => {
  const slide = document.querySelector('.practiceSlide');
  const shell = document.querySelector('.portfolioShell');
  const preview = document.querySelector('#practice-preview');
  const trigger = document.querySelector('#practice-open');
  const dialog = document.querySelector('#practice-player');
  const film = document.querySelector('#practice-film');
  const status = document.querySelector('#practice-playback-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const syncPreview = () => {
    const visible = shell.classList.contains('is-exploring')
      && slide.classList.contains('is-active') && !dialog.open
      && !document.hidden && !reducedMotion.matches;
    if (!visible) { preview.pause(); return; }
    if (!preview.getAttribute('src')) preview.src = preview.dataset.previewSrc;
    preview.muted = true;
    preview.play().catch(() => {}); // A static poster remains if autoplay is blocked.
  };

  trigger.addEventListener('click', () => {
    preview.pause();
    status.textContent = '';
    dialog.showModal();
    film.src = film.dataset.filmSrc;
    film.play().catch(() => {
      if (dialog.open && !film.error) status.textContent = '点击播放器中的播放按钮开始观看。';
    });
  });
  document.querySelector('#practice-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    film.pause();
    film.removeAttribute('src');
    film.load();
    status.textContent = '';
    syncPreview();
  });
  film.addEventListener('playing', () => { status.textContent = ''; });
  film.addEventListener('error', () => {
    if (dialog.open) status.textContent = '视频暂时无法加载，请尝试下方“单独打开视频”。';
  });
  const observer = new MutationObserver(syncPreview);
  observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
  observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncPreview);
  reducedMotion.addEventListener('change', syncPreview);
  window.addEventListener('pagehide', () => { preview.pause(); film.pause(); });
  syncPreview();
})();
