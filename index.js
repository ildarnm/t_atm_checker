import fetch from "node-fetch";
import {Telegraf} from "telegraf"

let intervalId;

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

const checkAtm = async function () {
    const points = await getAtmPointWithMoney();
    if (points.length > 0) {
        points.forEach((point) => {
            console.log(point.address, point.limits[0].amount);
        })
    } else {
        console.log("Nothing");
    }
}

const startChecking = async function () {
    checkAtm();
    intervalId = setInterval(() => {
        checkAtm();
    }, 180000);

}

const endChecking = async function () {
    if (intervalId) {
        clearInterval(intervalId);
    }
}

const initBot = function () {
    const bot = new Telegraf(process.env.BOT_TOKEN);
    bot.start((ctx) => {
        ctx.reply('Welcome');
    });
    bot.command('start_checking', (ctx) => {
        startChecking();
        ctx.reply('Bot start checking...');
    });
    bot.command('end_checking', (ctx) => {
        endChecking();
        ctx.reply('Bot end checking...');
    })
    bot.launch();

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

const main = async function () {
    initBot();
}

main();
