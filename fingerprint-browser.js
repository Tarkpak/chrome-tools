const { chromium } = require('playwright');

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

async function launchBrowser() {
  const fp = generateRandomFingerprint();

  console.log('生成随机指纹:');
  console.log(`  UA: ${fp.userAgent}`);
  console.log(`  分辨率: ${fp.screen.width}x${fp.screen.height}`);
  console.log(`  语言: ${fp.locale}`);
  console.log(`  时区: ${fp.timezone}`);
  console.log(`  平台: ${fp.platform}`);
  console.log(`  WebGL: ${fp.webgl.renderer}`);
  console.log(`  CPU核心: ${fp.hardwareConcurrency}`);
  console.log(`  内存: ${fp.deviceMemory}GB`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
      `--lang=${fp.locale}`,
      `--accept-lang=${fp.locale}`,
    ]
  });

  const context = await browser.newContext({
    userAgent: fp.userAgent,
    viewport: fp.viewport,
    locale: fp.locale,
    timezoneId: fp.timezone,
  });

  await context.addInitScript(createFingerprintScript(fp));
  const page = await context.newPage();
  await page.goto('https://browserleaks.com/canvas');

  console.log('\n浏览器已启动，每次运行指纹都不同');
  console.log('测试网站:');
  console.log('  - https://browserleaks.com/canvas');
  console.log('  - https://fingerprintjs.github.io/fingerprintjs/');

  return { browser, context, page, fingerprint: fp };
}

launchBrowser();
