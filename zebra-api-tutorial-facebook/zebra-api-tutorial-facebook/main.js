//=========================================================
// ZEBRA API Tutorial
// FABEBOOK BOT SAMPLE CODE
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

//=========================================================
// ログイン
// 概要：FacebookIdとZEBRA IDをリンクし、ユーザデータとして保存する。
//=========================================================

controller.hears(['ログイン', 'login'], "message_received", (bot, message) => {
  let loginId = '';
  let password = '';
  const customerId = process.env.customerId;
  const facebookUserId = message.user;

  const getUserName = (facebookUserId) => { // facebookの表示名を取得
    return new Promise((resolve, reject) => {
      const usersPublicProfile = `${process.env.FB_ENDPOINT}/${facebookUserId}?fields=name&access_token=${process.env.FB_ACCESS_TOKEN}`;
      request({
        url: usersPublicProfile,
        json: true // parse
      }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          resolve(body.name);
        } else {
          reject(error.message);
        }
      });
    });
  };
  const askLoginId = (response, convo) => { // LoginIdを取得
    convo.ask('LoginIdは?', (response, convo) => {
      loginId = response.text;
      askPassword(response, convo);
      convo.next();
    });
  };
  const askPassword = (response, convo) => { // Passwordを取得
    convo.ask('Passwordは?', (response, convo) => {
      password = response.text;
      loginExec(response, convo);
      convo.next();
    });
  };
  const loginExec = (response, convo) => { // コイン送金等に必要となるデータを取得
    Promise.resolve()
      .then(async () => { // facebookの表示名を取得
        return await getUserName(facebookUserId);
      })
      .then(async (name) => { // ZEBRA API Tokenを取得
        const body = {
          'customerId': customerId,
          'loginId': loginId,
          'password': password
        };
        const header = {
          headers: {
            'Content-Type': 'application/json',
            'X-REST-REQUEST-METHOD': 'POST',
            'X-REST-REQUEST-PATH': 'v2/authn/login'
          }
        };
        const result = await axios.post(`${process.env.endpoint}/app/v1/bridges/core`, body, header);
        return [result, name];
      })
      .then(([result, name]) => { // ユーザデータを保存
        return new Promise((resolve, reject) => {
          const user_info = {
            id: facebookUserId,
            zbb: result.data
          };
          controller.storage.users.save(user_info, (err, id) => {
            if (err) {
              reject(err);
            }
            resolve([user_info, name]);
          });
        });
      })
      .then(([user_info, name]) => { // チームデータを取得しユーザデータを設定
        return new Promise((resolve, reject) => {
          controller.storage.teams.get(customerId, (err, team_data) => {
            let tmp = team_data ? team_data : { id: customerId };
            tmp[facebookUserId] = { userId: user_info.zbb.userId, name: name, loginId: loginId };
            resolve(tmp);
          });
        });
      })
      .then((team_data) => { // チームデータを保存
        return new Promise((resolve, reject) => {
          controller.storage.teams.save(team_data, (err, id) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
      })
      .then(() => {
        bot.reply(message, 'ログインしました');
      })
      .catch((error) => {
        bot.reply(message, `${JSON.stringify(error)}`);
      });
  };
  bot.startConversation(message, askLoginId);
});

//=========================================================
// ログアウト
// 概要：ログイン時に保存したユーザデータを削除する。
//=========================================================

controller.hears(['ログアウト', 'logout'], "message_received", (bot, message) => {
  const customerId = process.env.customerId;
  const facebookUserId = message.user;
  Promise.resolve()
    .then(() => { // ユーザデータを削除
      return new Promise((resolve, reject) => {
        controller.storage.users.delete(facebookUserId, (err) => {
          resolve();
        });
      });
    })
    .then(() => { // チームデータからユーザデータを削除
      return new Promise((resolve, reject) => {
        controller.storage.teams.get(customerId, (err, team_data) => {
          let tmp = team_data ? team_data : { id: customerId };
          delete tmp[facebookUserId];
          resolve(tmp);
        });
      });
    })
    .then((team_data) => { // チームデータを保存
      return new Promise((resolve, reject) => {
        controller.storage.teams.save(team_data, (err, id) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
    })
    .then(() => {
      bot.reply(message, 'ログアウトしました');
    })
    .catch((error) => {
      bot.reply(message, `${JSON.stringify(error)}`);
    });
});

//=========================================================
// ログインメンバー数確認
// 概要：チームデータとして保存されたユーザデータ数を取得する。
//=========================================================

controller.hears(['メンバー', 'member'], "message_received", (bot, message) => {
  const customerId = process.env.customerId;
  controller.storage.teams.get(customerId, (err, team_data) => { // チームデータを取得
    let tmp = team_data ? team_data : {};
    ['id', 'createdBy', 'name', 'state', 'bot', 'token', 'url'].map((prop) => { delete tmp[prop]; });
    bot.reply(message, `ログイン済みメンバーは${Object.keys(tmp).length}人です`);
  });
});

//=========================================================
// セッション確認
// 概要：ログイン時に取得API Tokenが期限切れか確認する。
//=========================================================

controller.hears(['セッション', 'session'], "message_received", (bot, message) => {
  const facebookUserId = message.user;
  controller.storage.users.get(facebookUserId, (err, user_info) => { // ユーザデータを取得
    if (err || !user_info || !user_info.hasOwnProperty('zbb')) {
      bot.reply(message, 'ログインしてください');
      return;
    }
    const zbb = user_info.zbb;
    const expiresAt = new Date(zbb.expiresAt);
    if (expiresAt.getTime() < Date.now()) {
      bot.reply(message, '再度ログインしてください');
      return;
    }
    bot.reply(message, 'セッションは有効です');
  });
});

//=========================================================
// 残高確認
// 概要：ユーザデータよりAPI Tokenを取得し残高確認APIを使用
//=========================================================

controller.hears(['残高', 'balance'], "message_received", (bot, message) => {
  const coinId = process.env.coinId;
  const coinName = process.env.coinName;
  const facebookUserId = message.user;
  Promise.resolve()
    .then(() => { // ログイン済みか確認
      return new Promise((resolve, reject) => { // ユーザデータを取得
        controller.storage.users.get(facebookUserId, (err, user_info) => {
          if (err || !user_info) {
            reject(`ログインしてください`);
          }
          resolve(user_info);
        });
      });
    })
    .then(async (user_info) => { // 残高確認APIを使用
      const zbb = user_info.zbb;
      const body = {};
      const header = {
        headers: {
          'Content-Type': 'application/json',
          'X-REST-REQUEST-METHOD': 'GET',
          'X-REST-API-TOKEN': zbb.jwt,
          'X-REST-REQUEST-PATH': `v2/users/${zbb.userId}/balances`
        }
      };
      const balances = await axios.post(`${process.env.endpoint}/app/v1/bridges/core`, body, header);
      const balance = balances.data.find((balance) => { return balance.id == coinId }); // 該当コインの残高を取得
      return balance ? balance.balance : 0;
    })
    .then((amount) => {
      bot.reply(message, `残高は${amount} ${coinName}です`);
    })
    .catch((error) => {
      bot.reply(message, `${error}`);
    });
});

//=========================================================
// 送金
// 概要：facebookIdからuserIdを取得し送金する。
//=========================================================
controller.hears(['送金', 'send'], 'message_received', (bot, message) => {
  const customerId = process.env.customerId;
  const facebookUserId = message.user;

  Promise.resolve()
    .then(() => { // ログイン済みか確認
      return new Promise((resolve, reject) => { // ユーザデータを取得
        controller.storage.users.get(facebookUserId, (err, user_info) => {
          if (err || !user_info || !user_info.hasOwnProperty('zbb')) {
            reject('ログインしてください');
          }
          const zbb = user_info.zbb;
          const expiresAt = new Date(zbb.expiresAt);
          if (expiresAt.getTime() < Date.now()) {
            reject('再度ログインしてください');
          }
          resolve(user_info);
        });
      });
    })
    .then((user_info) => { // チームデータを取得
      return new Promise((resolve, reject) => {
        controller.storage.teams.get(customerId, (err, team_data) => {
          if (err) {
            reject(err);
          }
          resolve([user_info, team_data]);
        });
      });
    })
    .then(([user_info, team_data]) => { // 送金先のユーザデータとコイン枚数を取得し送金
      let members = team_data ? team_data : {};
      ['id', 'createdBy', 'name', 'state', 'bot', 'token', 'url'].map((prop) => { delete members[prop]; });
      const sender = members[facebookUserId];

      const askReciever = (response, convo) => { // 送金先のユーザデータを取得
        convo.ask('誰に送金しますか?', (response, convo) => {
          const reciever = members[response.mentions[0].id]; // facebookIdを使用
          if (reciever) {
            convo.say(`${response.text}さんですね、承知しました`);
            askAmount(response, convo, reciever);
            convo.next();
          } else {
            convo.say(`${response.text}さんはログインされていません`);
            convo.next();
          }
        });
      };
      const askAmount = (response, convo, reciever) => { // 送金額を取得
        convo.ask('いくら送金しますか?', (response, convo) => {
          const amount = response.text;
          convo.say(`${reciever.name}さんに${amount}ですね、承知しました`);
          askApprove(response, convo, reciever, amount);
          convo.next();
        });
      };
      const askApprove = (response, convo, reciever, amount) => { // 送金確認
        convo.ask('送金しますか? YES or NO',
          [
            {
              pattern: bot.utterances.yes,
              callback: (response, convo) => {
                sendExec(bot, message, sender, reciever, amount);
                convo.next();
              }
            },
            {
              pattern: bot.utterances.no,
              callback: (response, convo) => {
                convo.next();
              }
            },
            {
              default: true,
              callback: (response, convo) => {
                convo.say('YES 又は NO でお願いします');
                convo.repeat();
                convo.next();
              }
            }
          ]);
      };
      const sendExec = (bot, message, sender, reciever, amount) => { // 送金APIを使用
        const body = {
          'coinId': process.env.coinId,
          'recipientUserId': reciever.userId,
          'amount': Number(amount),
          "extraData": {},
          "coinName": process.env.coinName,
          "senderName": sender.name
        };
        const header = {
          headers: {
            'Content-Type': 'application/json',
            'X-REST-REQUEST-METHOD': 'POST',
            'X-REST-API-TOKEN': user_info.zbb.jwt
          }
        };
        axios.post(`${process.env.endpoint}/app/v1/users/${sender.userId}/transactions`, body, header)
          .then((result) => {
            bot.reply(message, `[APISample] ${process.env.coinName}取引履歴:\n 受け手: ${reciever.name}\n 枚数: ${amount}\n`);

            request({ // グループのFEEDへ投稿
              url: `https://graph.facebook.com/${process.env.FB_GROUPID}/feed`,
              qs: { access_token: process.env.FB_ACCESS_TOKEN },
              method: 'POST',
              json: {
                message: `#thanks\n [APISample] ${process.env.coinName}取引履歴:\n 受け手: ${reciever.name}\n 送り手: ${sender.name}\n 枚数: ${amount}\n`
              }
            });

          })
          .catch((err) => {
            bot.reply(message, '送金出来ません' + err.message);
          });
      };

      bot.startConversation(message, askReciever);
    })
    .catch((error) => {
      bot.reply(message, `${error}`);
    });
});
