// index.js
const TelegramBot = require('node-telegram-bot-api');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const express = require('express');

const token = "YOUR_BOT_TOKEN"; // ← अपना Telegram bot token
const OWNER_ID = 808562734; // ← आपका Telegram ID
const DOMAIN = "kushmail.xyz";

const bot = new TelegramBot(token, { polling: true });
const app = express();

// Users and mails storage
let users = {}; // user_id -> {credits, mails, allowForward}
let mails = {}; // mail -> owner_id

// Random Mail Generator
function randomEmail() {
    const chars = "abcdefghijklmnopqrstuvwxyz123456789";
    let name = "";
    for (let i = 0; i < 8; i++) {
        name += chars[Math.floor(Math.random() * chars.length)];
    }
    return name + "@" + DOMAIN;
}

// Add mail to user
function addMail(userId, email) {
    if (!users[userId]) users[userId] = { credits: 100, mails: [], allowForward: true };
    users[userId].mails.push(email);
    mails[email] = userId;
}

// Remove mail
function removeMail(email) {
    const ownerId = mails[email];
    if (ownerId && users[ownerId]) {
        users[ownerId].mails = users[ownerId].mails.filter(m => m !== email);
        delete mails[email];
    }
}

// /start command
bot.onText(/\/start/, msg => {
    const id = msg.from.id;
    if (!users[id]) users[id] = { credits: 100, mails: [], allowForward: true };
    bot.sendMessage(id,
`📧 Welcome to Kush Temp Mail

💳 Credits: ${users[id].credits}

Commands:
/gen - Generate random mail
/custom name - Create custom mail
/credits - Check credits
/id - Show mail history
/inbox MAIL - See inbox
/transfer USER_ID MAIL - Transfer mail
/delete MAIL - Delete mail
/help - Show commands
`);
});

// /credits command
bot.onText(/\/credits/, msg => {
    const id = msg.from.id;
    if (!users[id]) users[id] = { credits: 100, mails: [], allowForward: true };
    bot.sendMessage(id, `💳 Your Credits: ${users[id].credits}`);
});

// /gen - random mail
bot.onText(/\/gen/, msg => {
    const id = msg.from.id;
    if (id !== OWNER_ID) {
        if (!users[id] || users[id].credits <= 0) return bot.sendMessage(id, "❌ No credits left");
        users[id].credits -= 1;
    }
    const email = randomEmail();
    addMail(id, email);
    bot.sendMessage(id, `📧 Your Temp Mail\n\n${email}`);
});

// /custom - custom mail
bot.onText(/\/custom (.+)/, (msg, match) => {
    const id = msg.from.id;
    const name = match[1];
    if (!name.match(/^[a-zA-Z0-9]+$/)) return bot.sendMessage(id, "❌ Only letters/numbers allowed for custom name");
    if (id !== OWNER_ID) {
        if (!users[id] || users[id].credits <= 0) return bot.sendMessage(id, "❌ No credits left");
        users[id].credits -= 1;
    }
    const email = name + "@" + DOMAIN;
    addMail(id, email);
    bot.sendMessage(id, `✏️ Custom Mail Created\n\n${email}`);
});

// /id - mail history
bot.onText(/\/id/, msg => {
    const id = msg.from.id;
    if (!users[id] || users[id].mails.length === 0) return bot.sendMessage(id, "📭 No mails yet");
    let text = "📬 Your Mail History:\n\n";
    users[id].mails.forEach((m, i) => text += `${i+1}. ${m}\n`);
    bot.sendMessage(id, text);
});

// /transfer - mail transfer
bot.onText(/\/transfer (\d+) (.+)/, (msg, match) => {
    const id = msg.from.id;
    const targetId = parseInt(match[1]);
    const email = match[2];

    if (mails[email] !== id) return bot.sendMessage(id, "❌ You don't own this mail");
    if (!users[targetId]) users[targetId] = { credits: 100, mails: [], allowForward: true };

    removeMail(email);
    addMail(targetId, email);
    bot.sendMessage(id, `🔁 Mail Transferred Successfully\n\n📧 ${email}\n➡️ New Owner: ${targetId}`);
    bot.sendMessage(targetId, `📩 You received mail: ${email}`);
});

// /delete - delete mail
bot.onText(/\/delete (.+)/, (msg, match) => {
    const id = msg.from.id;
    const email = match[1];
    if (mails[email] !== id && id !== OWNER_ID) return bot.sendMessage(id, "❌ You can't delete this mail");
    removeMail(email);
    bot.sendMessage(id, `🗑 Mail Deleted\n📧 ${email}`);
});

// /inbox - dummy inbox viewer
bot.onText(/\/inbox (.+)/, (msg, match) => {
    const id = msg.from.id;
    const email = match[1];
    if (!users[id] || !users[id].mails.includes(email)) return bot.sendMessage(id, "❌ You don't own this mail");

    // Demo inbox (replace with SMTP server to receive real emails)
    bot.sendMessage(id,
`📩 Inbox for ${email}

📨 From: instagram@mail.instagram.com  
🔑 Code: 493221`);
});

// /help
bot.onText(/\/help/, msg => {
    const id = msg.from.id;
    bot.sendMessage(id,
`🆘 Kush Temp Mail Help

📧 /gen - Generate random mail  
✏️ /custom name - Create custom mail  
💳 /credits - Check credits  
📜 /id - Show mail history  
📥 /inbox MAIL - See inbox  
🔁 /transfer USER_ID MAIL - Transfer mail  
🗑 /delete MAIL - Delete mail  
❓ /help - Show commands`);
});

// Owner commands
bot.onText(/\/addcredit (\d+) (\d+)/, (msg, match) => {
    if (msg.from.id !== OWNER_ID) return;
    const uid = parseInt(match[1]);
    const amount = parseInt(match[2]);
    if (!users[uid]) users[uid] = { credits: 100, mails: [], allowForward: true };
    users[uid].credits += amount;
    bot.sendMessage(OWNER_ID, `👑 Credits Added: ${amount} to ${uid}`);
});

bot.onText(/\/removecredit (\d+) (\d+)/, (msg, match) => {
    if (msg.from.id !== OWNER_ID) return;
    const uid = parseInt(match[1]);
    const amount = parseInt(match[2]);
    if (!users[uid]) users[uid] = { credits: 100, mails: [], allowForward: true };
    users[uid].credits -= amount;
    bot.sendMessage(OWNER_ID, `👑 Credits Removed: ${amount} from ${uid}`);
});

bot.onText(/\/unlimited (\d+)/, (msg, match) => {
    if (msg.from.id !== OWNER_ID) return;
    const uid = parseInt(match[1]);
    if (!users[uid]) users[uid] = { credits: 100, mails: [], allowForward: true };
    users[uid].credits = Infinity;
    bot.sendMessage(OWNER_ID, `👑 User ${uid} now has unlimited credits`);
});

// Express keep alive
app.get("/", (req, res) => {
    res.send("Kush Temp Mail Bot Running 🚀");
});
app.listen(3000);

// SMTP Mail Receiver (dummy)
const server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
        simpleParser(stream).then(parsed => {
            const from = parsed.from.text;
            const to = parsed.to.text;
            const subject = parsed.subject;
            const text = parsed.text;

            const ownerId = mails[to];
            if (ownerId) {
                bot.sendMessage(ownerId,
`📩 New Email

From: ${from}
To: ${to}
Subject: ${subject}

${text}`);
            }
        });
        callback();
    }
});
server.listen(25);