# facebook-bot
ZEBRA API Tutorial
FABEBOOK BOT SAMPLE CODE


1) .envファイルの仕様

  ファイル概要：Botが使用する環境変数になります。

  FB_ACCESS_TOKEN=フェイスブックボットのアクセストークン
  FB_VERIFY_TOKEN=フェイスブックボットのベリファイトークン
  FB_ENDPOINT=フェイスブックグラフAPI URL
  endpoint=ZEBRA API URL
  customerId=ZEBRA環境カスタマーID
  coinId=コインID
  coinName=コイン名称
  port=ポット使用ポート

  使用例

  FB_ACCESS_TOKEN=EAAYC0E28xfwBAKscfmAyXmPWhu9toLhVImDs00cZCZAoRCPz0000m0UymBgTgCw6LjZBrJ8dkoex62flWZAwxIQumJLUO6rpwCGcGsmsVVcM7wuZCYnPI2Sjk4pXNejw9JJ8ZCNNmBNTIUdBHqDZBRr9ZBwB2YQf39tZADartApubw7A8ZC7247ZCT
  FB_VERIFY_TOKEN=zerobillbank
  FB_ENDPOINT=https://graph.facebook.com/v2.6
  endpoint=https://api.zbb.io:8082
  customerId=b020b9ff-946a-4bbf-94e0-00029390f566
  coinId=59c64cf3-000e-4892-85a7-0a4ea5e9f0b6
  coinName=ZBB
  port=5000

2) botkitストレージの仕様

  ストレージ概要：チーム内で共有するデータはチームデータに、ユーザ固有のデータはユーザデータとして保存します。

  + bot_db
    + channels
    + terms (チームデータ：ZEBRA環境カスタマーID.json)
      + b020b9ff-946a-4bbf-94e0-00029390f566.json
    + users (ユーザデータ：フェイスブックID.json)
      + 2471671512857825.json

  2-1) チームデータ仕様

    ファイル概要：チーム内で共有するデータを保存します、送金APIにて送金先のZEBRA環境ユーザIDを取得する際に使用します。

    {
      "id": ZEBRA環境カスタマーID,
      フェイスブックID : {
        "userId": ZEBRA環境ユーザID,
        "name": Facebook表示名,
        "loginId": ZEBRA環境ログインID,
      },
      ...
    }

    使用例

    {
      "id": "b020b9ff-946a-4bbf-94e0-00029390f566",
      "2471671512857825": {
        "userId": "0384d9bd-a7bd-4ad5-ba70-217dfbd7f1c4",
        "name": "Akira  Kudo",
        "loginId": "zbb_kudo"
      },
      ...
    }

  2-2) ユーザデータ仕様

    ファイル概要：ログイン時に取得したユーザ固有のデータを保存します。

    {
      "id": フェイスブックID,
      "zbb": {
        "userId": ZEBRA環境ユーザID,
        "jwt": ZEBRA API Token,
        "refreshToken": ZEBRA API Refresh Token,
        "expiresAt": ZEBRA API Token 有効期限
      }
    }

    使用例

    {
      "id": "2471671512857825",
      "zbb": {
        "userId": "0384d9bd-a7bd-4ad5-ba70-217dfbd7f1c4",
        "jwt": "eyJhbGciOiJSUzUxMiIsInR5cCI6I ... ygbdzj5PeYApac0PtIkIhYkxQ",
        "refreshToken": "dbe45eec-b165-45c4-b4e6-e64476b8c74a",
        "expiresAt": "2018-11-19T01:14:09.000Z"
      }
    }


(変数の取得方法は別紙マニュアル「ZEBRA API Tutorial」をご確認ください)