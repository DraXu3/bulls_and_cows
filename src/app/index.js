const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const { commands } = require('./commands');
const { Game } = require('./Game');
const { TelegramClient } = require('./TelegramClient');

const dynamoDBClient = new DynamoDBClient(process.env['NODE_ENV'] === 'local' ? {
  endpoint: 'http://host.docker.internal:4566',
} : {});

const telegramClient = new TelegramClient(process.env['TELEGRAM_BOT_ID']);

const game = new Game(dynamoDBClient, telegramClient, commands);

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

    await game.process(body.message);
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
