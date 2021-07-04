// Suppress deprecated warning
process.env.NTBA_FIX_319 = 1;

const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const axios = require("axios");

const StalkerRepository = require("./data");
const HENTracker = require("./tracker");

const TELEGRAM_WEBHOOK_URI = process.env.TELEGRAM_WEBHOOK_URI;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { onlyFirstMatch: true });
bot.setWebHook(`${TELEGRAM_WEBHOOK_URI}/${TELEGRAM_BOT_TOKEN}`);

const port = 3000;
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post(`/${TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});

const tzktAPI = axios.create({ baseURL: "https://api.tzkt.io/v1" });
const henURI = "https://www.hicetnunc.xyz";

const formatAccount = (alias, address) => {
  if (alias !== "") {
    return `<b><em>${alias}</em></b> (<a href="${henURI}/tz/${address}">${address}</a>)`;
  } else {
    return `<a href="${tzktURI}/${address}">${address}</a>`;
  }
};

const tracker = HENTracker();

tracker.onMinted(async (address, objktId) => {
  const repository = await StalkerRepository();
  const stalkee = await repository.getStalkee(address);
  if (stalkee == null) {
    return;
  }

  stalkee.stalkers.forEach((stalker) => {
    bot.sendMessage(
      stalker,
      "<b>Mint Alert!</b>\n" +
        `${formatAccount(stalkee.alias, address)}\n` +
        `<a href="${henURI}/objkt/${objktId}">OBJKT#${objktId}</a>\n` +
        "Be ready to buy it.",
      { parse_mode: "HTML" }
    );
  });
});

tracker.onSwapped(async (address, objktId) => {
  const repository = await StalkerRepository();
  const stalkee = await repository.getStalkee(address);
  if (stalkee == null) {
    return;
  }

  stalkee.stalkers.forEach((stalker) => {
    bot.sendMessage(
      stalker,
      "<b>Swap Alert!</b>\n" +
        `${formatAccount(stalkee.alias, address)}\n` +
        `<a href="${henURI}/objkt/${objktId}">OBJKT#${objktId}</a>\n` +
        "Clicked the link to buy it now!",
      { parse_mode: "HTML" }
    );
  });
});

bot.onText(/^\/stalk (.+)$/, async (msg, match) => {
  const address = match[1];

  const repository = await StalkerRepository();

  const stalkees = await repository.getStalkees(msg.chat.id);
  const existedStalkee = stalkees.find((stalkee) => stalkee.address == address);
  if (stalkees.length !== 0 && existedStalkee != null) {
    bot.sendMessage(
      msg.chat.id,
      "You already stalked " +
        `${formatAccount(existedStalkee.alias, existedStalkee.address)}`,
      { parse_mode: "HTML" }
    );

    return;
  }

  try {
    // Try query address on Tzkt API.
    const response = await tzktAPI.get(`/accounts/${address}/metadata`);
    let alias = "";
    if (response.data && response.data.alias) {
      alias = response.data.alias;
    }

    await repository.addStalkee(msg.chat.id, address, alias);

    bot.sendMessage(
      msg.chat.id,
      `Start stalking ${formatAccount(alias, address)}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      `Unable to find <b>${address}</b>\n` +
        "Please check the address is a valid Tezos wallet address.",
      { parse_mode: "HTML" }
    );
  }
});

bot.onText(/^\/remove (.+)$/, async (msg, match) => {
  const address = match[1];

  try {
    const repository = await StalkerRepository();
    const stalkee = await repository.removeStalkee(msg.chat.id, address);

    bot.sendMessage(
      msg.chat.id,
      `Stop stalking ${formatAccount(stalkee.alias, stalkee.address)}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      `You are not currently stalking <b>${address}</b>\n` +
        "Please check the address is in your list.",
      { parse_mode: "HTML" }
    );
  }
});

bot.onText(/^\/list$/, async (msg, match) => {
  const repository = await StalkerRepository();
  const stalkees = await repository.getStalkees(msg.chat.id);

  if (stalkees.length === 0) {
    bot.sendMessage(msg.chat.id, "You are not currently stalking anyone.", {
      parse_mode: "HTML",
    });
  } else {
    let reply = "List of address you are stalking:\n\n";
    stalkees.forEach((stalkee) => {
      reply += `- ${formatAccount(stalkee.alias, stalkee.address)}\n`;
    });

    bot.sendMessage(msg.chat.id, reply, { parse_mode: "HTML" });
  }
});

const helpText = () => {
  return (
    "<b>List of commands:</b>\n\n" +
    "/start - start using bot\n" +
    "/help - show help messages\n" +
    "/stalk <em>address</em> - start following\n" +
    "/remove <em>address</em> - stop following\n" +
    "/list - show all the address you current following\n"
  );
};

bot.onText(/^\/start$/, (msg, match) => {
  bot.sendMessage(msg.chat.id, helpText(), { parse_mode: "HTML" });
});

bot.onText(/^\/help$/, (msg, match) => {
  bot.sendMessage(msg.chat.id, helpText(), { parse_mode: "HTML" });
});

bot.onText(/.+/, (msg, match) => {
  bot.sendMessage(
    msg.chat.id,
    "Unrecognized command, use /help to show list of commands.",
    { parse_mode: "HTML" }
  );
});
