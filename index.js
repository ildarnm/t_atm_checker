import fetch from "node-fetch";
import {Telegraf} from "telegraf"
import express from 'express';

let intervalId;
let isCheckingStarted = false;

const post = async function (url, data = {}) {
    // Default options are marked with *
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *client
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    return await response.json(); // parses JSON response into native JavaScript objects
}

const getAtmPointWithMoney = async function () {
    const filter = {
        "bounds": {
            "bottomLeft": {"lat": 55.819941492122894, "lng": 49.08970508896938},
            "topRight": {"lat": 55.83269636296099, "lng": 49.15828380906215}
        }, "filters": {"showUnavailable": true, "currencies": ["USD"]}, "zoom": 15
    };
    const data = await post('https://api.tinkoff.ru/geo/withdraw/clusters', filter);

    const clusters = data?.payload?.clusters ?? [];

    return clusters.reduce((result, cluster) => {
        return [...result, ...cluster.points];
    }, []);
}

const checkAtm = async function (ctx) {
    const points = await getAtmPointWithMoney();
    if (points.length > 0) {
        points.forEach((point) => {
            ctx.reply(`${point.address} $${point.limits[0].amount}`);
        })
    } else {
        console.log("Nothing");
    }
}

const startChecking = async function (ctx) {
    if (isCheckingStarted) {
        ctx.reply('Checking already started.');
        return;
    }
    isCheckingStarted = true;
    checkAtm(ctx);
    intervalId = setInterval(() => {
        checkAtm(ctx);
    }, 180000);
    ctx.reply('Bot start checking...');
}

const endChecking = async function () {
    if (intervalId) {
        clearInterval(intervalId);
    }
    isCheckingStarted = false;
}

const initBot = function () {
    const bot = new Telegraf(process.env.BOT_TOKEN);
    bot.start((ctx) => {
        ctx.reply('Welcome');
    });
    bot.command('start_checking', (ctx) => {
        startChecking(ctx);
    });
    bot.command('end_checking', (ctx) => {
        endChecking();
        ctx.reply('Bot end checking...');
    })
    bot.startPolling();

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

const initExpress = function () {
    const expressApp = express()
    const port = process.env.PORT || 5000
    expressApp.get('/', (req, res) => {
        res.send('Hello World!')
    })
    expressApp.listen(port, () => {
        console.log(`Listening on port ${port}`)
    })
}

const main = async function () {
    if (process.env.INIT_EXPRESS) {
        initExpress();
    }
    initBot();
    console.log('Init');
}

main();
