# Chrome Tools

Chrome 版本管理和指纹浏览器工具集。

## 安装

```bash
cd chrome-tools
npm install
npx playwright install chromium
```

## 使用

### 下载 Chrome 版本

```bash
npm run download
# 或
node chromium-downloader.js
```

支持输入：
- 序号 (1-20)
- 大版本号 (143)
- 完整版本号 (142.0.7444.176)
- all (下载全部)

### 启动已下载的 Chrome

```bash
npm run launch
```

### 列出已安装版本

```bash
npm run list
```

### 启动随机指纹浏览器

```bash
npm run fingerprint
```

每次启动都会随机生成：
- User-Agent
- 屏幕分辨率
- 语言/时区
- WebGL 渲染器
- Canvas 指纹
- 硬件信息

## 目录结构

```
chrome-tools/
├── chrome/           # 下载的浏览器
├── chrome-profiles/  # 各版本用户数据
├── chromium-downloader.js
├── fingerprint-browser.js
└── package.json
```
