const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'articles.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, crypto.randomBytes(8).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Faqat rasm fayllari qabul qilinadi'));
  },
});

app.post('/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Rasm topilmadi' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// ---------- Oddiy fayl-asosli saqlash ----------
function loadArticles() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveArticles(articles) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2));
}

function randomId(length) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Oddiy matn belgilarini formatlash: **qalin**, *kursiv*, ![alt](url) rasm
function inlineMarkdown(escaped) {
  return escaped
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/uploads\/[^\s)]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
}

// Matnni paragraflarga ajratib HTML qilish (bo'sh qatordan ajraladi, "# " bilan boshlangan qator sarlavha bo'ladi)
function contentToHtml(raw) {
  return raw
    .split(/\n\s*\n/)
    .map((block) => {
      const trimmed = block.trim();
      if (trimmed.startsWith('# ')) {
        return `<h2>${inlineMarkdown(escapeHtml(trimmed.slice(2)))}</h2>`;
      }
      const escaped = escapeHtml(trimmed).replace(/\n/g, '<br>');
      return `<p>${inlineMarkdown(escaped)}</p>`;
    })
    .join('\n');
}

// ---------- Sahifalar ----------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/create', (req, res) => {
  const title = (req.body.title || '').trim();
  const content = (req.body.content || '').trim();

  if (!title || !content) {
    return res.status(400).send('Sarlavha va matn kiritilishi shart. <a href="/">Orqaga</a>');
  }

  const articles = loadArticles();
  let slug;
  do {
    slug = randomId(6);
  } while (articles[slug]);

  const editToken = randomId(24);

  articles[slug] = {
    title,
    content,
    editToken,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveArticles(articles);

  res.redirect(`/${slug}?edit_token=${editToken}`);
});

app.get('/:slug/edit/:token', (req, res) => {
  const { slug, token } = req.params;
  const articles = loadArticles();
  const article = articles[slug];

  if (!article || article.editToken !== token) {
    return res.status(403).send('Tahrirlash havolasi noto\'g\'ri yoki eskirgan.');
  }

  res.send(renderEditPage(slug, token, article));
});

app.post('/:slug/edit/:token', (req, res) => {
  const { slug, token } = req.params;
  const articles = loadArticles();
  const article = articles[slug];

  if (!article || article.editToken !== token) {
    return res.status(403).send('Tahrirlash havolasi noto\'g\'ri yoki eskirgan.');
  }

  const title = (req.body.title || '').trim();
  const content = (req.body.content || '').trim();
  if (!title || !content) {
    return res.status(400).send('Sarlavha va matn kiritilishi shart.');
  }

  article.title = title;
  article.content = content;
  article.updatedAt = new Date().toISOString();
  articles[slug] = article;
  saveArticles(articles);

  res.redirect(`/${slug}?edit_token=${token}`);
});

app.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const editToken = req.query.edit_token;
  const articles = loadArticles();
  const article = articles[slug];

  if (!article) {
    return res.status(404).send('Bunday maqola topilmadi. <a href="/">Bosh sahifaga</a>');
  }

  const isOwner = editToken && editToken === article.editToken;
  res.send(renderArticlePage(slug, article, isOwner));
});

// ---------- HTML shablonlar ----------

const baseStyle = `
  <style>
    :root {
      --paper: #f7f4ee;
      --ink: #1a1917;
      --ink-soft: #57534a;
      --stamp: #a8391f;
      --line: #ddd6c7;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: 'Iowan Old Style', 'Georgia', 'Source Serif Pro', serif;
      margin: 0;
      padding: 0;
      line-height: 1.7;
    }
    .wrap {
      max-width: 640px;
      margin: 0 auto;
      padding: 64px 24px 100px;
    }
    a { color: var(--stamp); }
    .brand {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-soft);
      margin-bottom: 32px;
      display: block;
      text-decoration: none;
    }
    h1 { font-size: 40px; font-weight: 600; margin: 0 0 8px; }
    input[type=text], textarea {
      width: 100%;
      border: none;
      border-bottom: 1px solid var(--line);
      background: transparent;
      font-family: inherit;
      color: var(--ink);
      padding: 10px 2px;
      outline: none;
    }
    input[type=text] { font-size: 32px; font-weight: 600; margin-bottom: 24px; }
    input[type=text]:focus, textarea:focus { border-color: var(--stamp); }
    textarea {
      font-size: 18px;
      min-height: 320px;
      resize: vertical;
      line-height: 1.8;
    }
    button, .btn {
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 13px;
      background: var(--stamp);
      color: var(--paper);
      border: none;
      padding: 12px 22px;
      border-radius: 3px;
      cursor: pointer;
      margin-top: 20px;
      display: inline-block;
      text-decoration: none;
    }
    button:hover, .btn:hover { opacity: 0.9; }
    .meta {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: var(--ink-soft);
      margin-bottom: 40px;
    }
    .stamp {
      display: inline-block;
      border: 2px solid var(--stamp);
      color: var(--stamp);
      font-family: 'Courier New', monospace;
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 6px 12px;
      transform: rotate(-2deg);
      border-radius: 2px;
      margin-bottom: 28px;
    }
    .article p { margin: 0 0 22px; font-size: 19px; }
    .article h2 { font-size: 26px; font-weight: 600; margin: 40px 0 14px; }
    .article img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0 26px; display: block; }
    .toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .toolbar button {
      margin-top: 0;
      background: transparent;
      color: var(--ink-soft);
      border: 1px solid var(--line);
      padding: 6px 12px;
      font-size: 12px;
    }
    .toolbar button:hover { border-color: var(--stamp); color: var(--stamp); opacity: 1; }
    .toolbar input[type=file] { display: none; }
    .share-box {
      margin-top: 40px;
      padding: 16px;
      border: 1px dashed var(--line);
      font-family: 'Courier New', monospace;
      font-size: 13px;
      word-break: break-all;
    }
    .share-box b { display: block; margin-bottom: 6px; color: var(--ink-soft); }
  </style>
`;

const formattingScript = `
function wrapSel(mark) {
  const ta = document.getElementById('content');
  const start = ta.selectionStart, end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || 'matn';
  ta.value = ta.value.slice(0, start) + mark + selected + mark + ta.value.slice(end);
  ta.focus();
  ta.selectionStart = start + mark.length;
  ta.selectionEnd = start + mark.length + selected.length;
}
document.getElementById('imgInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  const btn = e.target.previousElementSibling;
  const original = btn.textContent;
  btn.textContent = 'Yuklanmoqda...';
  try {
    const res = await fetch('/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) {
      const ta = document.getElementById('content');
      const pos = ta.selectionStart;
      const insert = '\\n![](' + data.url + ')\\n';
      ta.value = ta.value.slice(0, pos) + insert + ta.value.slice(pos);
    } else {
      alert(data.error || 'Yuklashda xatolik');
    }
  } catch (err) {
    alert('Yuklashda xatolik yuz berdi');
  }
  btn.textContent = original;
  e.target.value = '';
});
`;

function renderArticlePage(slug, article, isOwner) {
  const date = new Date(article.updatedAt).toLocaleDateString('uz-UZ');
  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(article.title)}</title>
${baseStyle}
</head>
<body>
  <div class="wrap">
    <a class="brand" href="/">← yangi maqola</a>
    ${isOwner ? '<div class="stamp">nashr qilindi</div>' : ''}
    <h1>${escapeHtml(article.title)}</h1>
    <div class="meta">${date}</div>
    <div class="article">${contentToHtml(article.content)}</div>
    ${isOwner ? `
      <div class="share-box">
        <b>Ulashish uchun havola (o'qish uchun, token shart emas):</b>
        sizning-domeningiz.uz/${slug}
      </div>
      <a class="btn" href="/${slug}/edit/${article.editToken}">Tahrirlash</a>
    ` : ''}
  </div>
</body>
</html>`;
}

function renderEditPage(slug, token, article) {
  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Tahrirlash — ${escapeHtml(article.title)}</title>
${baseStyle}
</head>
<body>
  <div class="wrap">
    <a class="brand" href="/${slug}?edit_token=${token}">← maqolaga qaytish</a>
    <form method="POST" action="/${slug}/edit/${token}" id="editForm">
      <input type="text" name="title" value="${escapeHtml(article.title)}" required>
      <div class="toolbar">
        <button type="button" onclick="wrapSel('**')"><b>B</b></button>
        <button type="button" onclick="wrapSel('*')"><i>I</i></button>
        <button type="button" onclick="document.getElementById('imgInput').click()">Rasm</button>
        <input type="file" id="imgInput" accept="image/*">
      </div>
      <textarea name="content" id="content" required>${escapeHtml(article.content)}</textarea>
      <button type="submit">Saqlash</button>
    </form>
  </div>
  <script>
    ${formattingScript}
  </script>
</body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});
