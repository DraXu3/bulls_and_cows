const { 
  BatchWriteItemCommand, 
  ScanCommand, 
  DeleteItemCommand, 
} = require("@aws-sdk/client-dynamodb");

const attemptsTable = process.env['ATTEMPTS_TABLE'];
const sessionsTable = process.env['SESSIONS_TABLE'];

const stop = async (message, game, config = {}) => {
  const chatId = `${message.chat.id}`;

  const gameIsActive = await game.isActive(message);
  if (!gameIsActive) {
    if (!config.noOutput) {
      game.telegramClient.reply(message, 'No active games to stop');
    }
    return;
  }

  let command = new DeleteItemCommand({
    TableName: sessionsTable,
    Key: {
      chat_id: { S: chatId },
    },
  });

  await game.dynamoDBClient.send(command);

  command = new ScanCommand({
    TableName: attemptsTable,
    FilterExpression: 'chat_id = :chat_id',
    ExpressionAttributeValues: {
      ':chat_id': { 'S': chatId },
    },
  });

  const data = await game.dynamoDBClient.send(command);
  const deleteRequests = (data.Items ?? []).map(({ player_id }) => ({
    DeleteRequest: {
      Key: {
        chat_id: { 'S': chatId },
        player_id: { 'S': player_id.S },
      },
    },
  }));

  if (deleteRequests.length > 0) {
    command = new BatchWriteItemCommand({
      RequestItems: {
        [attemptsTable]: deleteRequests,
      },
    });

    await game.dynamoDBClient.send(command);
  }

  if (!config.noOutput) {
    game.telegramClient.reply(message, 'The game was stopped');
  }

};

module.exports = {
  stop,
};
