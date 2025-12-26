#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://googlechromelabs.github.io/chrome-for-testing/known-good-versions.json';
const CHROME_DIR = path.join(process.cwd(), 'chrome');
const PROFILE_DIR = path.join(process.cwd(), 'chrome-profiles');

function fetchVersions() {
  return new Promise((resolve, reject) => {
    https.get(API_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.versions);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function getLatestMajorVersions(versions, count = 20) {
  const majorMap = new Map();
  for (let i = versions.length - 1; i >= 0; i--) {
    const v = versions[i];
    const major = v.version.split('.')[0];
    if (!majorMap.has(major)) {
      majorMap.set(major, v.version);
    }
  }
  return Array.from(majorMap.entries())
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .slice(0, count)
    .map(([major, version]) => ({ major, version }));
}

function downloadChrome(version) {
  console.log(`\n正在下载 Chrome ${version}...`);
  try {
    execSync(`npx -y @puppeteer/browsers install chrome@${version}`, { stdio: 'inherit' });
    console.log(`\n✅ Chrome ${version} 下载完成！`);
    return true;
  } catch (e) {
    console.error(`\n❌ 下载失败: ${e.message}`);
    return false;
  }
}

function getInstalledVersions() {
  if (!fs.existsSync(CHROME_DIR)) return [];
  return fs.readdirSync(CHROME_DIR)
    .filter(d => d.startsWith('win64-'))
    .map(d => {
      const version = d.replace('win64-', '');
      const exePath = path.join(CHROME_DIR, d, 'chrome-win64', 'chrome.exe');
      return { version, exePath, exists: fs.existsSync(exePath) };
    })
    .filter(v => v.exists);
}

function launchChrome(version, exePath) {
  const profileDir = path.join(PROFILE_DIR, `v${version.split('.')[0]}`);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  console.log(`\n启动 Chrome ${version}`);
  console.log(`数据目录: ${profileDir}`);
  spawn(exePath, [`--user-data-dir=${profileDir}`], { detached: true, stdio: 'ignore' }).unref();
}

function showHelp() {
  console.log(`
Chrome 版本管理工具

用法:
  node chromium-downloader.js [命令]

命令:
  (无)        下载模式 - 显示最新20个版本供选择下载
  launch      启动模式 - 列出已安装版本并启动
  list        列出已安装的 Chrome 版本
  help        显示此帮助信息

下载示例:
  输入 1              按序号下载第1个版本
  输入 143            下载 Chrome 143 最新版
  输入 142.0.7444.176 下载指定完整版本号
  输入 1,3,143        混合下载多个版本
  输入 all            下载全部20个版本

目录说明:
  chrome/           下载的浏览器存放目录
  chrome-profiles/  各版本独立的用户数据目录
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'help' || args[0] === '-h' || args[0] === '--help') {
    showHelp();
    return;
  }

  if (args[0] === 'list') {
    const installed = getInstalledVersions();
    if (installed.length === 0) {
      console.log('没有已安装的 Chrome 版本。');
    } else {
      console.log('已安装的 Chrome 版本：\n');
      installed.forEach((v, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. Chrome ${v.version}`);
        console.log(`      路径: ${v.exePath}`);
      });
    }
    return;
  }

  if (args[0] === 'launch' || args[0] === 'run') {
    const installed = getInstalledVersions();
    if (installed.length === 0) {
      console.log('没有已安装的 Chrome 版本，请先下载。');
      return;
    }
    console.log('已安装的 Chrome 版本：\n');
    installed.forEach((v, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. Chrome ${v.version}`);
    });
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\n请输入要启动的序号: ', (answer) => {
      rl.close();
      const idx = parseInt(answer.trim()) - 1;
      if (idx >= 0 && idx < installed.length) {
        launchChrome(installed[idx].version, installed[idx].exePath);
      }
    });
    return;
  }

  console.log('正在获取可用版本列表...\n');
  const versions = await fetchVersions();
  const latestVersions = getLatestMajorVersions(versions, 20);

  console.log('最新的 20 个大版本：\n');
  latestVersions.forEach((v, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. Chrome ${v.major} (${v.version})`);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\n请输入序号(1-20)、版本号(如143或142.0.7444.176)、或 all 下载全部: ', (answer) => {
    rl.close();
    const input = answer.trim().toLowerCase();

    if (input === 'all') {
      latestVersions.forEach(v => downloadChrome(v.version));
      return;
    }

    answer.split(',').map(s => s.trim()).forEach(item => {
      if (item.includes('.')) {
        downloadChrome(item);
        return;
      }
      const num = parseInt(item);
      if (num >= 1 && num <= 20) {
        downloadChrome(latestVersions[num - 1].version);
      } else if (num > 20) {
        const found = latestVersions.find(v => v.major === item);
        downloadChrome(found ? found.version : item);
      }
    });
  });
}

main().catch(console.error);
