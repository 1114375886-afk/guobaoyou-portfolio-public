(() => {
  const OWNER = '1114375886-afk';
  const REPO = 'guobaoyou-portfolio-public';
  const REPOSITORY = `${OWNER}/${REPO}`;
  const BRANCH = 'main';
  const CONTENT_PATH = 'content.json';
  const SESSION_KEY = 'portfolio-admin-token';

  const loginPanel = document.querySelector('#login-panel');
  const loginForm = document.querySelector('#login-form');
  const tokenField = document.querySelector('#token');
  const rememberToken = document.querySelector('#remember-token');
  const workspace = document.querySelector('#workspace');
  const publishBar = document.querySelector('#publish-bar');
  const status = document.querySelector('#status');
  const saveButton = document.querySelector('#save');
  const logoutButton = document.querySelector('#logout');
  const fileInput = document.querySelector('#file-input');
  const jsonEditor = document.querySelector('#json-editor');

  let token = '';
  let content = null;
  let contentSha = '';
  let pendingUpload = null;
  let dirty = false;
  let localPreview = false;

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const setStatus = (message, tone = 'ready') => {
    status.textContent = message;
    publishBar.classList.toggle('is-busy', tone === 'busy');
    publishBar.classList.toggle('is-error', tone === 'error');
    saveButton.disabled = tone === 'busy';
  };

  const markDirty = () => {
    dirty = true;
    setStatus('有尚未发布的修改。');
  };

  const encodePath = path => path.split('/').map(encodeURIComponent).join('/');

  const request = async (path, options = {}) => {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body && !(options.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.message || `GitHub 请求失败（${response.status}）`);
      error.status = response.status;
      throw error;
    }
    return data;
  };

  const decodeBase64 = encoded => {
    const binary = atob(encoded.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const encodeBytes = bytes => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  };

  const encodeText = value => encodeBytes(new TextEncoder().encode(value));

  const getValue = path => path.split('.').reduce((value, key) => value?.[key], content);
  const setValue = (path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((value, key) => value[key], content);
    target[last] = value;
  };

  const field = (label, path, options = {}) => {
    const value = getValue(path);
    const wide = options.wide ? ' fieldWide' : '';
    const help = options.help ? `<small>${escapeHtml(options.help)}</small>` : '';
    const attrs = `data-path="${escapeHtml(path)}" data-format="${options.format || 'text'}"`;
    let control;
    if (options.area) {
      control = `<textarea rows="${options.rows || 4}" ${attrs}>${escapeHtml(value)}</textarea>`;
    } else if (options.media) {
      control = `<div class="mediaFieldRow"><input type="text" value="${escapeHtml(value)}" ${attrs} /><button class="uploadButton" type="button" data-upload="${escapeHtml(path)}" data-accept="${escapeHtml(options.accept || '*/*')}">${options.video ? '上传视频' : '上传素材'}</button></div>`;
    } else {
      const shown = options.format === 'list' && Array.isArray(value) ? value.join('、') : value;
      control = `<input type="${options.type || 'text'}" value="${escapeHtml(shown)}" ${attrs} />`;
    }
    return `<label class="field${wide}"><span>${escapeHtml(label)}</span>${control}${help}</label>`;
  };

  const renderSite = () => {
    document.querySelector('#site-fields').innerHTML = [
      field('封面标签', 'site.kicker'),
      field('封面副标题', 'site.coverSubtitle'),
      field('封面主标题', 'site.coverTitle'),
      field('年份', 'site.coverYear'),
      field('进入按钮', 'site.entryLabel'),
      field('联系按钮', 'site.contactLabel'),
      field('英文名', 'contact.displayName'),
      field('中文名', 'contact.fullName'),
      field('学校', 'contact.school'),
      field('年级', 'contact.grade'),
      field('专业', 'contact.degree'),
      field('手机号（复制值）', 'contact.phone'),
      field('手机号（显示）', 'contact.phoneDisplay'),
      field('邮箱', 'contact.email', { type: 'email' }),
      field('微信', 'contact.wechat'),
      field('头像', 'contact.portrait', { media: true, accept: 'image/*', wide: true, help: '上传后会生成新素材路径，发布内容后生效。' })
    ].join('');
  };

  const renderProjects = () => {
    document.querySelector('#project-fields').innerHTML = content.projects.map((project, index) => `
      <article class="projectEditor">
        <h3>${String(index + 1).padStart(2, '0')} / ${escapeHtml(project.title)}</h3>
        <div class="fieldGrid">
          ${field('项目标题', `projects.${index}.title`)}
          ${field('项目标签', `projects.${index}.kicker`)}
          ${field('列表简介', `projects.${index}.summary`, { area: true, wide: true })}
          ${field('栏目标签', `projects.${index}.tags`, { format: 'list', wide: true, help: '使用逗号或顿号分隔。' })}
          ${field('项目封面', `projects.${index}.cover`, { media: true, accept: 'image/*', wide: true })}
          ${field('封面替代文字', `projects.${index}.coverAlt`, { wide: true })}
          ${field('正片视频', `projects.${index}.filmSrc`, { media: true, video: true, accept: 'video/*', wide: true, help: '可上传 90MB 以内的视频；更大的文件请粘贴现有 GitHub Release 或云存储直链。' })}
          ${field('播放器封面', `projects.${index}.filmPoster`, { media: true, accept: 'image/*', wide: true })}
          ${field('详情英文标签', `projects.${index}.modalEyebrow`)}
          ${field('详情标题', `projects.${index}.modalHeadline`, { help: '换行会保留。' })}
          ${field('详情简介', `projects.${index}.modalSummary`, { area: true, wide: true })}
          ${field('类型 / 形式 / 职责', `projects.${index}.facts`, { format: 'list', wide: true, help: '依次填写三项，使用逗号或顿号分隔。' })}
        </div>
      </article>
    `).join('');
  };

  const renderPractice = () => {
    document.querySelector('#practice-fields').innerHTML = content.practice.map((item, index) => `
      <article class="practiceEditor">
        <h3>${String(index + 1).padStart(2, '0')} / ${escapeHtml(item.title)}</h3>
        <div class="fieldGrid">
          ${field('标题', `practice.${index}.title`)}
          ${field('时长', `practice.${index}.duration`, { help: '格式示例：00:56' })}
          ${field('封面', `practice.${index}.poster`, { media: true, accept: 'image/*' })}
          ${field('悬停预览', `practice.${index}.previewSrc`, { media: true, video: true, accept: 'video/*' })}
          ${field('完整视频', `practice.${index}.filmSrc`, { media: true, video: true, accept: 'video/*' })}
        </div>
      </article>
    `).join('');
  };

  const render = () => {
    renderSite();
    renderProjects();
    renderPractice();
    jsonEditor.value = JSON.stringify(content, null, 2);
  };

  const connect = async nextToken => {
    token = nextToken.trim();
    if (!token) return;
    localPreview = false;
    setStatus('正在连接 GitHub…', 'busy');
    publishBar.hidden = false;
    try {
      await request('');
      const file = await request(`/contents/${CONTENT_PATH}?ref=${BRANCH}`);
      content = JSON.parse(decodeBase64(file.content));
      contentSha = file.sha;
      render();
      loginPanel.hidden = true;
      workspace.hidden = false;
      logoutButton.hidden = false;
      if (rememberToken.checked) sessionStorage.setItem(SESSION_KEY, token);
      else sessionStorage.removeItem(SESSION_KEY);
      dirty = false;
      setStatus('内容已载入，可以编辑。');
    } catch (error) {
      token = '';
      setStatus(`连接失败：${error.message}`, 'error');
    }
  };

  const safeName = value => value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'asset';

  const uploadImage = async (file, path) => {
    if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10MB。');
    const extension = safeName(file.name).split('.').pop();
    const logicalName = safeName(path.replaceAll('.', '-'));
    const target = `assets/uploads/${logicalName}-${Date.now()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await request(`/contents/${encodePath(target)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Upload portfolio asset: ${file.name}`,
        content: encodeBytes(bytes),
        branch: BRANCH
      })
    });
    return `./${target}`;
  };

  const uploadVideo = async (file, path) => {
    if (file.size > 90 * 1024 * 1024) {
      throw new Error('纯网页直传的视频上限为 90MB；请压缩视频或在输入框粘贴现有视频直链。');
    }
    const extension = safeName(file.name).split('.').pop();
    const logicalName = safeName(path.replaceAll('.', '-'));
    const target = `assets/uploads/${logicalName}-${Date.now()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await request(`/contents/${encodePath(target)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Upload portfolio video: ${file.name}`,
        content: encodeBytes(bytes),
        branch: BRANCH
      })
    });
    return `./${target}`;
  };

  const handleUpload = async file => {
    if (!file || !pendingUpload) return;
    const { path } = pendingUpload;
    pendingUpload = null;
    setStatus(`正在上传 ${file.name}…`, 'busy');
    try {
      const isVideo = file.type.startsWith('video/');
      const value = isVideo ? await uploadVideo(file, path) : await uploadImage(file, path);
      setValue(path, value);
      const input = document.querySelector(`[data-path="${CSS.escape(path)}"]`);
      if (input) input.value = value;
      jsonEditor.value = JSON.stringify(content, null, 2);
      dirty = true;
      setStatus(`${file.name} 已上传；点击“保存并发布”使新素材生效。`);
    } catch (error) {
      setStatus(`上传失败：${error.message}`, 'error');
    } finally {
      fileInput.value = '';
    }
  };

  const save = async () => {
    if (!content || !contentSha) return;
    if (localPreview) {
      setStatus('本地预览模式不会发布；请在线上管理端连接 GitHub。', 'error');
      return;
    }
    setStatus('正在提交内容并触发发布…', 'busy');
    content.meta = { ...(content.meta || {}), version: 1, updatedAt: new Date().toISOString() };
    try {
      const result = await request(`/contents/${CONTENT_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Update portfolio content from admin',
          content: encodeText(`${JSON.stringify(content, null, 2)}\n`),
          sha: contentSha,
          branch: BRANCH
        })
      });
      contentSha = result.content.sha;
      jsonEditor.value = JSON.stringify(content, null, 2);
      dirty = false;
      setStatus('已提交到 GitHub，网站正在自动发布。');
    } catch (error) {
      const message = error.status === 409
        ? '远程内容已更新，请退出后重新连接再编辑。'
        : error.message;
      setStatus(`发布失败：${message}`, 'error');
    }
  };

  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    connect(tokenField.value);
  });

  document.addEventListener('input', event => {
    const control = event.target.closest('[data-path]');
    if (!control || !content) return;
    const nextValue = control.dataset.format === 'list'
      ? control.value.split(/[，,、]/).map(value => value.trim()).filter(Boolean)
      : control.value;
    setValue(control.dataset.path, nextValue);
    jsonEditor.value = JSON.stringify(content, null, 2);
    markDirty();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-upload]');
    if (!button) return;
    pendingUpload = { path: button.dataset.upload };
    fileInput.accept = button.dataset.accept || '*/*';
    fileInput.click();
  });

  fileInput.addEventListener('change', () => handleUpload(fileInput.files[0]));
  saveButton.addEventListener('click', save);

  document.querySelector('#apply-json').addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonEditor.value);
      if (!parsed.site || !parsed.contact || !Array.isArray(parsed.projects) || !Array.isArray(parsed.practice)) {
        throw new Error('缺少 site、contact、projects 或 practice。');
      }
      content = parsed;
      render();
      markDirty();
      setStatus('JSON 已应用；确认内容后点击“保存并发布”。');
    } catch (error) {
      setStatus(`JSON 无法应用：${error.message}`, 'error');
    }
  });

  logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    token = '';
    content = null;
    contentSha = '';
    workspace.hidden = true;
    publishBar.hidden = true;
    logoutButton.hidden = true;
    loginPanel.hidden = false;
    tokenField.value = '';
  });

  window.addEventListener('beforeunload', event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  const savedToken = sessionStorage.getItem(SESSION_KEY);
  if (savedToken) {
    tokenField.value = savedToken;
    connect(savedToken);
  } else if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    fetch('../content.json', { cache: 'no-store' })
      .then(response => response.json())
      .then(localContent => {
        content = localContent;
        contentSha = 'local-preview';
        localPreview = true;
        render();
        loginPanel.hidden = true;
        workspace.hidden = false;
        publishBar.hidden = false;
        setStatus('本地预览模式：表单可检查，但不会连接或发布 GitHub。');
        saveButton.disabled = true;
      })
      .catch(error => setStatus(`本地预览失败：${error.message}`, 'error'));
  }
})();
