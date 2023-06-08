const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const { App } = require('./App');
const { TelegramClient } = require('./TelegramClient');
const { commands } = require('./commands');
const { TELEGRAM_BOT_ID } = require('./config');

const dynamoDBClient = new DynamoDBClient(process.env['NODE_ENV'] === 'local' ? {
  endpoint: 'http://host.docker.internal:4566',
} : {});

const telegramClient = new TelegramClient(TELEGRAM_BOT_ID);

const app = new App(dynamoDBClient, telegramClient, commands);

const handler = async (event) => {
  console.log(event);

  try {
    const body = JSON.parse(event.body);
    if (!body) {
      throw new Error('Validation error: missing required `body` in the event object');
    }

    if (!body.message) {
      throw new Error('Validation error: missing required `message` property in the event body');
    }

    await app.process(body.message);
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify(err)
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify('OK'),
  }; 
};

module.exports = {
    handler,
};
