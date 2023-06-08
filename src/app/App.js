const { GetItemCommand, PutItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");

const { SESSIONS_TABLE, SETTINGS_TABLE, ATTEMPTS_TABLE, SCORE_TABLE } = require('./config');

class App {
  constructor(dynamoDBClient, telegramClient, commands) {
    this.dynamoDBClient = dynamoDBClient;
    this.telegramClient = telegramClient;
    this.commands = commands;
  }

  async hasActiveGame(message) {
    const command = new GetItemCommand({
      TableName: SESSIONS_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
      },
      AttributesToGet: ['word'],
    });

    const { Item } = await client.send(command);
    return !!Item?.word;
  }

  async hasAttempts(message) {
    let command = new GetItemCommand({
      TableName: SETTINGS_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
      },
      AttributesToGet: ['max_attempts'],
    });

    const { Item: { max_attempts: { N: maxAttempts } } } = await client.send(command);
    
    command = new GetItemCommand({
      TableName: ATTEMPTS_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
        user_id: { S: `${message.from.id}` },
      },
      AttributesToGet: ['attempt'],
    });

    const { Item } = await client.send(command);
    const userAttempt = Item?.attempt?.N ?? 0;

    return userAttempt < maxAttempts;
  }

  async updateAttempts(message) {
    let command = new GetItemCommand({
      TableName: ATTEMPTS_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
        user_id: { S: `${message.from.id}` },
      },
      AttributesToGet: ['attempt'],
    });

    const { Item } = await client.send(command);
    const userAttempt = Item?.attempt?.N ?? 0;

    command = new PutItemCommand({
      TableName: ATTEMPTS_TABLE,
      Item: {
        chat_id: { S: `${message.chat.id}` },
        user_id: { S: `${message.from.id}` },
        attempt: { N: userAttempt + 1 },
      },
    });

    await client.send(command);
  }

  async finishGame(message) {
    const deleteSessionCommand = new DeleteItemCommand({
      TableName: SESSION_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
      },
    });

    const deleteAttemptsCommand = new DeleteItemCommand({
      TableName: ATTEMPTS_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
      },
    });

    await Promise.all([client.send(deleteSessionCommand), client.send(deleteAttemptsCommand)]);

    let command = new GetItemCommand({
      TableName: SCORE_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
        user_id: { S: `${message.from.id}` },
      },
      AttributesToGet: ['score'],
    });

    const { Item } = await client.send(command);
    const userScore = Item?.score?.N ?? 0;

    command = new PutItemCommand({
      TableName: SCORE_TABLE,
      Item: {
        chat_id: { S: `${message.chat.id}` },
        user_id: { S: `${message.from.id}` },
        score: { N: userScore + 1 },
      },
    });

    await client.send(command);
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
    
    if (this.hasActiveGame(message)) {
      await this.processAttempt(message);
      return;
    }

    console.log(`No active games found for chat_id = ${message.chat.id}`);
    await this.telegramClient.replyToMessage(message, 'Send /help for supported commands');
  }

  async processCommand(message, command) {
    const commandHandler = this.commands[command];
    if (typeof commandHandler === 'function') {
      await commandHandler(message, this);
      return;
    }

    console.log(`Unsuppored command: ${command}`);
    await this.telegramClient.replyToMessage(message, 'Unsupported command. Send /help for supported commands');
  }

  async processAttempt(message) {
    const userWord = message.text.split(' ')[0].toLowerCase();
    
    let command = new GetItemCommand({
      TableName: SESSIONS_TABLE,
      Key: {
        chat_id: { S: `${message.chat.id}` },
      },
      AttributesToGet: ['word'],
    });

    const { Item: { word: { S: sessionWord } } } = await client.send(command);

    if (userWord.length !== sessionWord.length) {
      await this.telegramClient.replyToMessage(message, `The word must be exactly ${sessionWord.length} letters length`);
      return;
    }

    if (!this.hasAttempts(message)) {
      await this.telegramClient.replyToMessage(message, `No more attempts available`);
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
    }, { bulls: 0, cows: 0 });

    // Player wins the game
    if (score.bulls === sessionWord.length) {
      await this.telegramClient.replyToMessage(message, `Congratulations, you won!`);
      await this.finishGame(message);
      return;
    }

    const attemptsLeft = await this.updateAttempts(message);
    const attemptsLeftText = attemptsLeft > 0 ? `Attempts left: ${attemptsLeft}` : `No attempts left`;
    await this.telegramClient.replyToMessage(message, `Bulls = ${score.bulls}, Cows = ${score.cows}. ${attemptsLeftText}`);
  }
}

module.exports = {
  App,
};
