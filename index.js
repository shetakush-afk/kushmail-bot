const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = "8729085266:AAExsyW9LPGB66ldDcVLEhGmnVXztdQyWqk";
const OWNER_ID = 808562734;
const DOMAIN = "kushmail.xyz";

const bot = new TelegramBot(token, { polling: true });

let users = {};

function randomEmail() {
    const chars = "abcdefghijklmnopqrstuvwxyz123456789";
    let name = "";
    for (let i = 0; i < 8; i++) {
        name += chars[Math.floor(Math.random() * chars.length)];
    }
    return name + "@" + DOMAIN;
}

bot.onText(/\/start/, (msg) => {
    const id = msg.from.id;

    if (!users[id]) {
        users[id] = { credits: 100 };
    }

    bot.sendMessage(id,
`📧 Welcome to Kush Temp Mail

Credits: ${users[id].credits}

Commands:
/gen - generate random mail
/custom name - custom email
/credits - check credits`
);
});

bot.onText(/\/credits/, (msg) => {
    const id = msg.from.id;
    if (!users[id]) users[id] = { credits: 100 };

    bot.sendMessage(id, `💳 Credits: ${users[id].credits}`);
});

bot.onText(/\/gen/, (msg) => {
    const id = msg.from.id;

    if (id !== OWNER_ID) {
        if (!users[id] || users[id].credits <= 0) {
            bot.sendMessage(id, "❌ No credits left");
            return;
        }
        users[id].credits -= 1;
    }

    const email = randomEmail();
    bot.sendMessage(id, `📧 Your Email:\n${email}`);
});

bot.onText(/\/custom (.+)/, (msg, match) => {
    const id = msg.from.id;
    const name = match[1];

    if (id !== OWNER_ID) {
        if (!users[id] || users[id].credits <= 0) {
            bot.sendMessage(id, "❌ No credits left");
            return;
        }
        users[id].credits -= 1;
    }

    const email = name + "@" + DOMAIN;
    bot.sendMessage(id, `📧 Custom Email:\n${email}`);
});

const app = express();
app.get("/", (req, res) => {
    res.send("Kush Mail Bot Running");
});

app.listen(3000);