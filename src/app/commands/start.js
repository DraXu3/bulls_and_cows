const { PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");

const { DEFAULT_MAX_ATTEMPTS, DEFAULT_WORD_LENGTH } = require('../config');
const { stop: stopActiveGame } = require('./stop');

const sessionsTable = process.env['SESSIONS_TABLE'];
const wordsTable = process.env['WORDS_TABLE'];

const start = async (message, game) => {
  const gameIsActive = await game.isActive(message);
  if (gameIsActive) {
    await stopActiveGame(message, game, { noOutput: true });
  }

  let command = new ScanCommand({
    TableName: wordsTable,
    Select: 'COUNT',
    FilterExpression: 'word_length = :word_length',
    ExpressionAttributeValues: {
      ':word_length': { N: `${DEFAULT_WORD_LENGTH}` },
    },
  });

  const { Count: wordsCount } = await game.dynamoDBClient.send(command);

  if (wordsCount === 0) {
    game.telegramClient.reply(message, 'Cannot start the game: no words to play');
    return;
  }

  const randomOffset = Math.floor(Math.random() * wordsCount);

  command = new ScanCommand({
    TableName: wordsTable,
    FilterExpression: 'word_length = :word_length',
    ExpressionAttributeValues: {
      ':word_length': { N: `${DEFAULT_WORD_LENGTH}` },
    },
    Limit: 1,
    ScanIndexForward: true,
    ExclusiveStartKey: {
      'word_length': { N: `${DEFAULT_WORD_LENGTH}` },
      'word_position': { N: `${randomOffset}` },
    },
  });

  data = await game.dynamoDBClient.send(command);
  const randomWord = data.Items[0].word.S;

  command = new PutItemCommand({
    TableName: sessionsTable,
    Item: {
      chat_id: { S: `${message.chat.id}` },
      word: { S: randomWord },
    },
  });

  await game.dynamoDBClient.send(command);

  game.telegramClient.reply(message, `The game started. You have ${DEFAULT_MAX_ATTEMPTS} attempts`);
};

module.exports = {
  start,
};
