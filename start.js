const { spawn } = require('child_process');
const readline = require('readline')

let appProcess = undefined;

console.log('[INFO] 正在開始執行由 Jimmy 開發的 [廢土賭花機率測量機器人]');

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout   
});

rl.on('line', async function (line) {
    if (appProcess != undefined) appProcess.stdin.write(line + '\n');
});

function startApp() {
    appProcess = spawn('node', ['main.js']);

    appProcess.stdout.on('data', (data) => {
        console.log(`${String(data).replaceAll('\n', '')}`);
    });

    appProcess.stderr.on('data', (data) => {
        console.error(`[ERROR] 發現以下錯誤 ${data} ，正在重新開啟中...`);
    });

    appProcess.on('close', (code) => {
        console.log(`[ERROR] 程式回傳錯誤碼 ${code} ，正在重新啟動中...`);
        appProcess = undefined
        startApp();
    });
}

startApp();