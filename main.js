const mineflayer = require('mineflayer');
const fs = require('fs');
const moment = require('moment-timezone');
const readline = require('readline');
const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf-8'));

const botArgs = {
    host: config.bot_args.host,
    port: config.bot_args.port,
    username: config.bot_args.username,
    auth: config.bot_args.auth,
    version: config.bot_args.version
};

let bot;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', async function (line) {
    if (bot != undefined) bot.chat(line);
});

const init_bot = async () => {
    console.log('[INFO] 正在讓 Minecraft 機器人上線...')
    bot = mineflayer.createBot(botArgs);

    bot.on('message', async function (jsonMsg) {
        const textMessage = jsonMsg.toString()
        const shouldSkipMessage = (textMessage) => {
            if (/^\[公共\]/.test(textMessage) || /^\[\!\]/.test(textMessage)) return true;
            if (/^\[交易\]/.test(textMessage) || /^\[\$\]/.test(textMessage)) return true;
            if (/^\[閒聊\]/.test(textMessage) || /^\[\@\]/.test(textMessage)) return true;
            if (/^\[抽獎\]/.test(textMessage) || /^\[\%\]/.test(textMessage)) return true;
            if (/^\[區域\]/.test(textMessage)) return true;
            if (/^\[設施\]/.test(textMessage) || /^\[\!\]/.test(textMessage) || /^\[\*\]/.test(textMessage)) return true;
            return false;
        };

        if (shouldSkipMessage(textMessage)) return
        
        console.log(jsonMsg.toAnsi())
    });

    bot.once('spawn', async () => {
        console.log('[INFO] Minecraft 機器人已上線!');
        await new Promise(resolve => setTimeout(resolve, 2000));
        let record = JSON.parse(fs.readFileSync(`${process.cwd()}/record.json`, 'utf-8'));
        let current_count = 0
        for (const item of Object.keys(record)) {
            current_count += record[item];
        };
        console.log(`目前還剩下 ${config.test_count - current_count} 次`)
        let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf-8'));
        for (let i = 0; i < config.test_count - current_count; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf-8'));
            bot.chat(`/pay ${config.bot_name} 1`);
            const success_msg = bot.awaitMessage(/\d+\s花/);
            const timeout_Promise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve('timeout');
                }, 5000);
            });

            await Promise.race([success_msg, timeout_Promise]).then((value) => {
                if (value === 'timeout') {
                    console.log('[WARN] Minecraft 機器人在等待時出現了錯誤');
                    i -= 1
                } else {
                    const regex = /\d+\s花/;
                    const match = value.match(regex);
                    const flowerCount = match[0].split(' ')[0];
                    record = JSON.parse(fs.readFileSync(`${process.cwd()}/record.json`, 'utf-8'));
                    record[String(flowerCount)] += 1;
                    fs.writeFileSync(`${process.cwd()}/record.json`, JSON.stringify(record, null, 4), 'utf-8');
                    console.log(`目前統計: 0 花: ${record['0']} 次 | 1 花: ${record['1']} 次 | 2 花: ${record['2']} 次 | 3 花: ${record['3']} 次 | 4 花: ${record['4']} 次\n`);
                }

                for (listener of bot.listeners('messagestr')) {
                    bot.removeListener('messagestr', listener);
                }
            });
        }
    });

    bot.once('login', async () => {
        console.log('[INFO] Minecraft 機器人已成功登入伺服器');
    });

    bot.once('error', async (err) => {
        console.log(err.message)
        if (err.message == 'read ECONNRESET') {
            bot.end()
        } else {
            console.log(`[ERROR] Minecraft 機器人發生錯誤，原因如下: ${err.message}`)
            process.exit(1000)
        }
    })

    bot.once('kicked', async (reason) => {
        console.log('[WARN] Minecraft 機器人被伺服器踢出了!');
        await new Promise(r => setTimeout(r, 2000))
        bot.end();
    });

    bot.once('end', async () => {
        console.log('[WARN] Minecraft 機器人下線了!');
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        const string = `【下線時間】${time}`
        const embed = await bot_off(string)
        const channel = await client.channels.fetch(config.discord_channels.status);
        await channel.send({ embeds: [embed] });
        await new Promise(r => setTimeout(r, 10000))
        init_bot()
    });
}

init_bot()