const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const FINGERPRINTS_FILE = path.join(__dirname, 'fingerprints.json');
const PROFILES_DIR = path.join(__dirname, 'browser-profiles');

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const data = {
  chromeVersions: ['120', '121', '122', '123', '124', '125', '130', '135', '140', '143'],
  platforms: [
    { os: 'Windows NT 10.0; Win64; x64', platform: 'Win32' },
    { os: 'Windows NT 11.0; Win64; x64', platform: 'Win32' },
    { os: 'Macintosh; Intel Mac OS X 10_15_7', platform: 'MacIntel' },
    { os: 'Macintosh; Intel Mac OS X 11_6_0', platform: 'MacIntel' },
    { os: 'X11; Linux x86_64', platform: 'Linux x86_64' },
  ],
  resolutions: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 2560, height: 1440 },
  ],
  locales: ['zh-CN', 'en-US', 'en-GB', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR'],
  timezones: ['Asia/Shanghai', 'Asia/Tokyo', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris'],
  webglVendors: [
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3060 Ti)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1660)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 6700 XT)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel UHD Graphics 630)' },
    { vendor: 'Apple Inc.', renderer: 'Apple M1' },
    { vendor: 'Apple Inc.', renderer: 'Apple M2' },
  ],
  cpuCores: [4, 6, 8, 10, 12, 16],
  memory: [4, 8, 16, 32],
};

function generateRandomFingerprint() {
  const platform = pick(data.platforms);
  const resolution = pick(data.resolutions);
  const webgl = pick(data.webglVendors);
  const chromeVersion = pick(data.chromeVersions);
  return {
    userAgent: `Mozilla/5.0 (${platform.os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`,
    viewport: resolution,
    screen: resolution,
    locale: pick(data.locales),
    timezone: pick(data.timezones),
    platform: platform.platform,
    webgl,
    hardwareConcurrency: pick(data.cpuCores),
    deviceMemory: pick(data.memory),
    colorDepth: pick([24, 32]),
    canvasNoise: rand(1, 10),
  };
}

// 保存指纹
function saveFingerprint(fp, name) {
  let fingerprints = {};
  if (fs.existsSync(FINGERPRINTS_FILE)) {
    fingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS_FILE, 'utf-8'));
  }
  fingerprints[name] = { ...fp, createdAt: new Date().toISOString() };
  fs.writeFileSync(FINGERPRINTS_FILE, JSON.stringify(fingerprints, null, 2));
  console.log(`✅ 指纹已保存为: ${name}`);
}

// 加载指纹
function loadFingerprint(name) {
  if (!fs.existsSync(FINGERPRINTS_FILE)) return null;
  const fingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS_FILE, 'utf-8'));
  return fingerprints[name] || null;
}

// 列出所有保存的指纹
function listFingerprints() {
  if (!fs.existsSync(FINGERPRINTS_FILE)) {
    console.log('没有保存的指纹。');
    return [];
  }
  const fingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS_FILE, 'utf-8'));
  const names = Object.keys(fingerprints);
  if (names.length === 0) {
    console.log('没有保存的指纹。');
    return [];
  }
  console.log('已保存的指纹：\n');
  names.forEach((name, i) => {
    const fp = fingerprints[name];
    console.log(`  ${i + 1}. ${name}`);
    console.log(`     平台: ${fp.platform} | 语言: ${fp.locale} | 创建: ${fp.createdAt?.split('T')[0] || '未知'}`);
  });
  return names;
}

// 删除指纹
function deleteFingerprint(name) {
  if (!fs.existsSync(FINGERPRINTS_FILE)) return;
  const fingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS_FILE, 'utf-8'));
  if (fingerprints[name]) {
    delete fingerprints[name];
    fs.writeFileSync(FINGERPRINTS_FILE, JSON.stringify(fingerprints, null, 2));
    console.log(`✅ 已删除指纹: ${name}`);
  }
}

function createFingerprintScript(fp) {
  return `
    Object.defineProperty(navigator, 'platform', { get: () => '${fp.platform}' });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fp.hardwareConcurrency} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fp.deviceMemory} });
    Object.defineProperty(screen, 'width', { get: () => ${fp.screen.width} });
    Object.defineProperty(screen, 'height', { get: () => ${fp.screen.height} });
    Object.defineProperty(screen, 'availWidth', { get: () => ${fp.screen.width} });
    Object.defineProperty(screen, 'availHeight', { get: () => ${fp.screen.height} });
    Object.defineProperty(screen, 'colorDepth', { get: () => ${fp.colorDepth} });
    Object.defineProperty(screen, 'pixelDepth', { get: () => ${fp.colorDepth} });

    const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return '${fp.webgl.vendor}';
      if (param === 37446) return '${fp.webgl.renderer}';
      return getParameterOrig.call(this, param);
    };
    const getParameter2Orig = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return '${fp.webgl.vendor}';
      if (param === 37446) return '${fp.webgl.renderer}';
      return getParameter2Orig.call(this, param);
    };

    const noise = ${fp.canvasNoise};
    const toDataURLOrig = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      const ctx = this.getContext('2d');
      if (ctx && this.width > 0 && this.height > 0) {
        try {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] ^= (Math.random() * noise) | 0;
          }
          ctx.putImageData(imageData, 0, 0);
        } catch(e) {}
      }
      return toDataURLOrig.apply(this, arguments);
    };

    const audioContextProto = window.AudioContext || window.webkitAudioContext;
    if (audioContextProto) {
      const createAnalyserOrig = audioContextProto.prototype.createAnalyser;
      audioContextProto.prototype.createAnalyser = function() {
        const analyser = createAnalyserOrig.call(this);
        const getFloatFrequencyDataOrig = analyser.getFloatFrequencyData.bind(analyser);
        analyser.getFloatFrequencyData = function(array) {
          getFloatFrequencyDataOrig(array);
          for (let i = 0; i < array.length; i++) array[i] += Math.random() * 0.0001;
        };
        return analyser;
      };
    }

    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
      ]
    });

    const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (RTCPeerConnection) {
      const origCreateOffer = RTCPeerConnection.prototype.createOffer;
      RTCPeerConnection.prototype.createOffer = function(options) {
        if (options && options.offerToReceiveAudio) options.offerToReceiveAudio = false;
        return origCreateOffer.apply(this, arguments);
      };
    }
  `;
}

async function launchBrowser(fp, saveName) {
  console.log('使用指纹:');
  console.log(`  UA: ${fp.userAgent}`);
  console.log(`  分辨率: ${fp.screen.width}x${fp.screen.height}`);
  console.log(`  语言: ${fp.locale}`);
  console.log(`  时区: ${fp.timezone}`);
  console.log(`  平台: ${fp.platform}`);
  console.log(`  WebGL: ${fp.webgl.renderer}`);
  console.log(`  CPU核心: ${fp.hardwareConcurrency}`);
  console.log(`  内存: ${fp.deviceMemory}GB`);

  // 为每个指纹创建独立的数据目录
  const profileName = saveName || fp.profileId || `temp-${Date.now()}`;
  const userDataDir = path.join(PROFILES_DIR, profileName);
  
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  
  console.log(`  数据目录: ${userDataDir}`);

  // 使用 launchPersistentContext 保持数据持久化
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
      `--lang=${fp.locale}`,
      `--accept-lang=${fp.locale}`,
    ],
    userAgent: fp.userAgent,
    viewport: fp.viewport,
    locale: fp.locale,
    timezoneId: fp.timezone,
  });

  await context.addInitScript(createFingerprintScript(fp));
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://browserleaks.com/canvas');

  // 保存指纹（包含 profileId）
  if (saveName) {
    fp.profileId = saveName;
    saveFingerprint(fp, saveName);
  }

  console.log('\n浏览器已启动，数据将保存到独立目录');
  return { context, page, fingerprint: fp };
}

function showHelp() {
  console.log(`
指纹浏览器工具

用法:
  node fingerprint-browser.js [命令] [参数]

命令:
  (无)              生成随机指纹并启动浏览器
  --save <名称>     生成随机指纹，保存并启动
  --use <名称>      使用已保存的指纹启动
  --list            列出所有保存的指纹
  --delete <名称>   删除指定指纹
  --help            显示帮助

示例:
  node fingerprint-browser.js                    # 随机指纹
  node fingerprint-browser.js --save test1       # 保存为 test1
  node fingerprint-browser.js --use test1        # 使用 test1
  node fingerprint-browser.js --list             # 列出所有
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  if (args[0] === '--list') {
    listFingerprints();
    return;
  }

  if (args[0] === '--delete') {
    if (args[1]) {
      deleteFingerprint(args[1]);
    } else {
      console.log('请指定要删除的指纹名称');
    }
    return;
  }

  if (args[0] === '--use') {
    if (!args[1]) {
      // 交互式选择
      const names = listFingerprints();
      if (names.length === 0) return;
      
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('\n请输入序号或名称: ', async (answer) => {
        rl.close();
        const idx = parseInt(answer) - 1;
        const name = idx >= 0 && idx < names.length ? names[idx] : answer.trim();
        const fp = loadFingerprint(name);
        if (fp) {
          await launchBrowser(fp);
        } else {
          console.log(`未找到指纹: ${name}`);
        }
      });
      return;
    }
    const fp = loadFingerprint(args[1]);
    if (fp) {
      await launchBrowser(fp);
    } else {
      console.log(`未找到指纹: ${args[1]}`);
    }
    return;
  }

  // 生成随机指纹
  const fp = generateRandomFingerprint();
  const saveName = args[0] === '--save' ? args[1] : null;
  await launchBrowser(fp, saveName);
}

main();
