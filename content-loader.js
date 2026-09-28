(() => {
  const setText = (selector, value, root = document) => {
    const node = root.querySelector(selector);
    if (node && value !== undefined && value !== null) node.textContent = value;
  };

  const setSource = (node, attribute, value) => {
    if (!node || !value) return;
    node.setAttribute(attribute, value);
  };

  const setHeadingWithBreaks = (node, value) => {
    if (!node || typeof value !== 'string') return;
    node.replaceChildren();
    value.split('\n').forEach((line, index) => {
      if (index) node.append(document.createElement('br'));
      node.append(document.createTextNode(line));
    });
  };

  const setResumeContact = (index, label, value) => {
    const item = document.querySelectorAll('.resumeContactStrip > span')[index];
    if (!item || value === undefined) return;
    item.replaceChildren();
    const heading = document.createElement('b');
    heading.textContent = label;
    item.append(heading, document.createTextNode(` ${value}`));
  };

  const setCopyItem = (index, value, displayValue = value) => {
    const item = document.querySelectorAll('#contact-card .copyItem')[index];
    if (!item || value === undefined) return;
    item.dataset.copy = value;
    setText('strong', displayValue, item);
  };

  const applyProject = (project, index) => {
    if (!project) return;
    const slide = document.querySelector(`.portfolioSlide[data-slide="${index}"]`);
    const copy = slide?.querySelector('.featuredProjectCopy');
    const cover = slide?.querySelector('img');
    const summary = copy?.querySelectorAll(':scope > p')[1];
    setText('.slideKicker', project.kicker, slide);
    setText('h2', project.title, copy);
    if (summary && project.summary !== undefined) summary.textContent = project.summary;
    setSource(cover, 'src', project.cover);
    setSource(cover, 'alt', project.coverAlt);

    const tagList = copy?.querySelector('ul');
    if (tagList && Array.isArray(project.tags)) {
      tagList.replaceChildren(...project.tags.map(tag => {
        const item = document.createElement('li');
        item.textContent = tag;
        return item;
      }));
    }

    const modal = document.querySelector(`[data-project-modal="${project.id}"]`);
    if (!modal) return;
    setText('.projectHeader strong', project.title, modal);
    const film = modal.querySelector('.filmChapter video');
    if (film) {
      if (project.filmSrc) film.dataset.projectSrc = project.filmSrc;
      setSource(film, 'poster', project.filmPoster);
    }
    const synopsis = modal.querySelector('.filmSynopsis');
    setText('.projectEyebrow', project.modalEyebrow, synopsis);
    setHeadingWithBreaks(synopsis?.querySelector('h2'), project.modalHeadline);
    const modalSummary = synopsis?.querySelector(':scope > p:last-of-type');
    if (modalSummary && project.modalSummary !== undefined) modalSummary.textContent = project.modalSummary;
    if (Array.isArray(project.facts)) {
      synopsis?.querySelectorAll('.filmFacts dd').forEach((node, factIndex) => {
        if (project.facts[factIndex] !== undefined) node.textContent = project.facts[factIndex];
      });
    }
  };

  const applyPractice = (items = []) => {
    const cards = Array.from(document.querySelectorAll('.practiceCard'));
    cards.forEach((card, index) => {
      const item = items[index];
      if (!item) return;
      card.dataset.title = item.title;
      card.dataset.duration = item.duration;
      card.dataset.filmSrc = item.filmSrc;
      card.setAttribute('aria-label', `播放${item.title}完整视频`);
      const video = card.querySelector('video');
      setSource(video, 'poster', item.poster);
      if (video && item.previewSrc) video.dataset.previewSrc = item.previewSrc;
      setText('.practiceDuration', item.duration, card);
      const caption = card.querySelector('.practiceCardCaption > span');
      const number = caption?.querySelector('small');
      if (caption && number) {
        while (number.nextSibling) number.nextSibling.remove();
        caption.append(document.createTextNode(item.title));
      }
    });
    setText('.practiceLabel', `${items.length} 个片段 · 2026`);
  };

  const applyContent = content => {
    const { site = {}, contact = {}, projects = [], practice = [] } = content;
    setText('.coverKicker span', site.kicker);
    setText('.coverTitle > p', site.coverSubtitle);
    setText('#cover-title', site.coverTitle);
    setText('.coverTitle > span', site.coverYear);
    setText('#portfolio-entry .contactText', site.entryLabel);
    setText('#contact-prompt span', site.contactLabel);

    setText('#contact-trigger', contact.displayName);
    setText('.contactCardTitle > b', contact.fullName);
    setText('.contactSchool', contact.school);
    setText('.contactCardTitle small > em', contact.grade);
    setText('.contactCardTitle small > span', contact.degree);
    setSource(document.querySelector('.contactPortrait'), 'src', contact.portrait);
    setCopyItem(0, contact.phone, contact.phoneDisplay);
    setCopyItem(1, contact.email);
    setCopyItem(2, contact.wechat);

    setText('.resumeIdentity h2', contact.fullName);
    setText('.resumeIdentity h3', contact.displayName?.toUpperCase());
    setSource(document.querySelector('.resumePortrait img'), 'src', contact.portrait);
    setResumeContact(0, 'PHONE', contact.phoneDisplay);
    setResumeContact(1, 'EMAIL', contact.email);
    setResumeContact(2, 'WECHAT', contact.wechat);

    projects.forEach(applyProject);
    applyPractice(practice);
    window.portfolioContent = content;
    document.dispatchEvent(new CustomEvent('portfolio:content-ready', { detail: content }));
  };

  fetch('./content.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
      return response.json();
    })
    .then(applyContent)
    .catch(error => console.warn('Portfolio content fallback is active.', error));
})();
