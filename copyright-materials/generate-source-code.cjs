const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const SOFTWARE_NAME = 'Cyan数据中台';
const VERSION = 'V1.0';
const COPYRIGHT_HOLDER = '闫晨阳';

// 前30页文件列表（按功能主次排序）
const frontFiles = [
  'src/main.tsx',
  'src/App.tsx',
  'src/pages/index.tsx',
  'src/router/index.tsx',
  'src/api/Request.ts',
  'src/api/Response.ts',
  'src/pages/layout/index.tsx',
  'src/pages/metadata/index.tsx',
  'src/pages/home/index.tsx',
];

// 后30页文件列表
const backFiles = [
  'src/pages/metadata/business_db/table_schema/index.tsx',
  'src/pages/bi/dashboard/DashboardEditor.tsx',
  { path: 'src/pages/auth/role/index.tsx', limit: 240 },
];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readSourceFile(filePath, limit) {
  const fullPath = path.join('/home/cy/workspace/code/web/cyan-dataman-web', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  if (limit) {
    const lines = content.split('\n');
    content = lines.slice(0, limit).join('\n');
  }
  return content;
}

function buildSourceHtml(files, title) {
  let allCode = '';
  let totalLines = 0;

  for (const item of files) {
    const filePath = typeof item === 'string' ? item : item.path;
    const limit = typeof item === 'string' ? null : item.limit;
    const content = readSourceFile(filePath, limit);
    const lines = content.split('\n');
    totalLines += lines.length;

    allCode += `\n/* ========================================== */\n`;
    allCode += `/* 文件: ${filePath}                            */\n`;
    allCode += `/* 软件名称: ${SOFTWARE_NAME}                  */\n`;
    allCode += `/* 版本号: ${VERSION}                          */\n`;
    allCode += `/* 著作权人: ${COPYRIGHT_HOLDER}               */\n`;
    allCode += `/* ========================================== */\n`;
    allCode += content;
    allCode += '\n';
  }

  const escaped = escapeHtml(allCode);
  const linesWithNumber = escaped.split('\n').map((line, idx) => {
    const num = (idx + 1).toString().padStart(4, ' ');
    return `<span class="line-num">${num}</span>${line}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
@page {
  size: A4;
  margin: 18mm 15mm 18mm 15mm;
  @top-center {
    content: "${SOFTWARE_NAME} ${VERSION}  —  ${COPYRIGHT_HOLDER}";
    font-size: 8pt;
    color: #666;
    border-bottom: 0.5pt solid #ccc;
    padding-bottom: 3mm;
  }
  @bottom-center {
    content: "第 " counter(page) " 页";
    font-size: 8pt;
    color: #666;
    border-top: 0.5pt solid #ccc;
    padding-top: 3mm;
  }
}
body {
  font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
  font-size: 8.5pt;
  line-height: 1.55;
  color: #222;
  margin: 0;
  padding: 0;
}
.cover {
  page-break-after: always;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  text-align: center;
}
.cover h1 { font-size: 24pt; margin: 20px 0; font-family: 'SimSun', serif; }
.cover h2 { font-size: 16pt; margin: 15px 0; color: #444; font-family: 'SimSun', serif; }
.cover p { font-size: 12pt; margin: 10px 0; color: #666; font-family: 'SimSun', serif; }
pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  tab-size: 2;
}
.line-num {
  display: inline-block;
  width: 32px;
  color: #999;
  text-align: right;
  margin-right: 8px;
  user-select: none;
}
</style>
</head>
<body>
<div class="cover">
  <h1>程序鉴别材料</h1>
  <h2>${title}</h2>
  <p>软件名称：${SOFTWARE_NAME}</p>
  <p>版本号：${VERSION}</p>
  <p>著作权人：${COPYRIGHT_HOLDER}</p>
  <p>总代码行数：${totalLines} 行</p>
</div>
<pre>${linesWithNumber}</pre>
</body>
</html>`;
}

async function generatePdf(html, outputPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/home/cy/.cache/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
  });
  await browser.close();
  console.log('Generated:', outputPath);
}

(async () => {
  const frontHtml = buildSourceHtml(frontFiles, '源代码（前30页）');
  fs.writeFileSync(path.join(__dirname, 'source-code-front.html'), frontHtml, 'utf-8');
  await generatePdf(frontHtml, path.join(__dirname, '程序鉴别材料-前30页.pdf'));

  const backHtml = buildSourceHtml(backFiles, '源代码（后30页）');
  fs.writeFileSync(path.join(__dirname, 'source-code-back.html'), backHtml, 'utf-8');
  await generatePdf(backHtml, path.join(__dirname, '程序鉴别材料-后30页.pdf'));

  console.log('All source code materials generated!');
})();
