const { GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const { stop: stopGame } = require('./commands/stop');
const { DEFAULT_MAX_ATTEMPTS } = require('./config');

const attemptsTable = process.env['ATTEMPTS_TABLE'];
const sessionsTable = process.env['SESSIONS_TABLE'];
const settingsTable = process.env['SETTINGS_TABLE'];
const scoreTable = process.env['SCORE_TABLE'];

class Game {
  constructor(dynamoDBClient, telegramClient, commands) {
    this.dynamoDBClient = dynamoDBClient;
    this.telegramClient = telegramClient;
    this.commands = commands;
  }

  async isActive(message) {
    const command = new GetItemCommand({
      TableName: sessionsTable,
      Key: {
        chat_id: { S: `${message.chat.id}` },
      },
      AttributesToGet: ['word'],
    });

    const data = await this.dynamoDBClient.send(command);
    
    return !!data.Item?.word;
  }

  async playerHasAttempts(message) {
    const chatId = `${message.chat.id}`;
    const playerId = `${message.from.id}`;

    let command = new GetItemCommand({
      TableName: settingsTable,
      Key: {
        chat_id: { S: chatId },
      },
      AttributesToGet: ['max_attempts'],
    });

    let data = await this.dynamoDBClient.send(command);
    const maxAttempts = parseInt(data.Item?.max_attempts?.N ?? DEFAULT_MAX_ATTEMPTS, 10);
    
    command = new GetItemCommand({
      TableName: attemptsTable,
      Key: {
        chat_id: { S: chatId },
        player_id: { S: playerId },
      },
      AttributesToGet: ['attempt'],
    });

    data = await this.dynamoDBClient.send(command);
    const userAttempt = parseInt(data.Item?.attempt?.N ?? 0, 10);

    return userAttempt < maxAttempts;
  }

  async updatePlayerAttempts(message) {
    const chatId = `${message.chat.id}`;
    const playerId = `${message.from.id}`;

    let command = new GetItemCommand({
      TableName: attemptsTable,
      Key: {
        chat_id: { S: chatId },
        player_id: { S: playerId },
      },
      AttributesToGet: ['attempt'],
    });

    const data = await this.dynamoDBClient.send(command);
    const userAttempt = parseInt(data.Item?.attempt?.N ?? 0, 10) + 1;

    command = new PutItemCommand({
      TableName: attemptsTable,
      Item: {
        chat_id: { S: chatId },
        player_id: { S: playerId },
        attempt: { N: userAttempt },
      },
    });

    await this.dynamoDBClient.send(command);

    return DEFAULT_MAX_ATTEMPTS - userAttempt;
  }

  async updatePlayerScore(message) {
    const chatId = `${message.chat.id}`;
    const playerId = `${message.from.id}`;

    let command = new GetItemCommand({
      TableName: scoreTable,
      Key: {
        chat_id: { S: chatId },
        player_id: { S: playerId },
      },
      AttributesToGet: ['score'],
    });

    const data = await this.dynamoDBClient.send(command);
    const userScore = parseInt(data.Item?.score?.N ?? 0, 10) + 1;

    command = new PutItemCommand({
      TableName: scoreTable,
      Item: {
        chat_id: { S: chatId },
        player_id: { S: playerId },
        score: { N: userScore },
      },
    });

    await this.dynamoDBClient.send(command);
  }

  async process(message) {
    const messageEntities = message.entities ?? [];
    const commandEntity = messageEntities.find(({ type }) => type === 'bot_command');
    if (commandEntity) {
      const { offset, length } = commandEntity;
      const command = message.text.substr(offset, length);
      await this.processCommand(message, command);
      return;
    } 
    
    const gameIsActive = await this.isActive(message);
    if (gameIsActive) {
      await this.processAttempt(message);
      return;
    }

    console.log(`No active games found for chat_id = ${message.chat.id}`);
    await this.telegramClient.reply(message, 'Send /help for supported commands');
  }

  async processCommand(message, command) {
    const commandHandler = this.commands[command];
    if (typeof commandHandler === 'function') {
      await commandHandler(message, this);
      return;
    }

    console.log(`Unsuppored command: ${command}`);
    await this.telegramClient.reply(message, 'Unsupported command. Send /help for supported commands');
  }

  async processAttempt(message) {
    const userWord = message.text.split(' ')[0].toLowerCase();
    
    let command = new GetItemCommand({
      TableName: sessionsTable,
      Key: {
        chat_id: { S: `${message.chat.id}` },
      },
      AttributesToGet: ['word'],
    });

    const { Item: { word: { S: sessionWord } } } = await this.dynamoDBClient.send(command);

    if (userWord.length !== sessionWord.length) {
      await this.telegramClient.reply(message, `The word must be exactly ${sessionWord.length} letters length`);
      return;
    }

    const playerHasAttempts = await this.playerHasAttempts(message);
    if (!playerHasAttempts) {
      await this.telegramClient.reply(message, `Sorry, no more attempts available`);
      return;
    }

    const sessionWordLetters = sessionWord.split('').reduce((letters, letter) => {
      if (!letters[letter]) {
        letters[letter] = 0;
      }
      letters[letter]++;
      return letters;
    }, {});

    const score = userWord.split('').reduce((score, letter, index) => {
      const sessionWordLetter = sessionWord[index];
      if (letter === sessionWordLetter) {
        score.bulls++;
      } else if (sessionWordLetters[letter] > 0) {
        score.cows++;
        sessionWordLetters[letter]--;
      }
      return score;
    }, { bulls: 0, cows: 0 });

    if (score.bulls === sessionWord.length) {
      await this.telegramClient.reply(message, `Congratulations, you won!`);
      await this.updatePlayerScore(message);
      await stopGame(message, this, { noOutput: true });
      return;
    }

    const attemptsLeft = await this.updatePlayerAttempts(message);
    const attemptsLeftText = attemptsLeft > 0 ? `Attempts left: ${attemptsLeft}` : `No more attempts left, sorry`;
    await this.telegramClient.reply(message, `Bulls = ${score.bulls}, Cows = ${score.cows}. ${attemptsLeftText}`);
  }
}

module.exports = {
  Game,
};
