//=========================================================
// ZEBRA API Tutorial
// FABEBOOK BOT SAMPLE CODE(SKELTON)
// All Rights Reserved. ZEROBILLBANK JAPAN INC
//=========================================================

'use strict';

require('dotenv').config();
const axios = require('axios');
const request = require('request');
const botkit = require('botkit');
const _ = require('lodash');

//=========================================================
// Botの初期化
//=========================================================

const controller = botkit.facebookbot({
  debug: true,
  hostname: '0.0.0.0',
  json_file_store: './bot_db/',
  verify_token: process.env.FB_VERIFY_TOKEN,
  access_token: process.env.FB_ACCESS_TOKEN
});

const bot = controller.spawn({});

controller.setupWebserver(process.env.port, function (err, webserver) {
  controller.createWebhookEndpoints(controller.webserver, bot, function () {
    console.log('Your facebook bot is connected.');
  });
});

// Handle events related to the websocket connection to Facebook
controller.on('rtm_open', (bot) => {
  console.log('** The RTM api just connected!');
});

controller.on('rtm_close', (bot) => {
  console.log('** The RTM api just closed');
  // you may want to attempt to re-open
});

controller.hears(['.*'], 'message_received', function(bot, message){
    bot.reply(message, 'You wrote -  '+message.text);
});
