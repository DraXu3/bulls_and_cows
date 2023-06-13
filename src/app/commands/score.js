const { GetItemCommand } = require("@aws-sdk/client-dynamodb");

const scoreTable = process.env['SCORE_TABLE'];

const score = async (message, game) => {
  const playerId = message.entities[1]?.user?.id;
  if (!playerId) {
    await game.telegramClient.reply(message, 'The command requires a player mention to show the score');
    return;
  }

  const command = new GetItemCommand({
    TableName: scoreTable,
    Key: {
      chat_id: { S: `${message.chat.id}` },
      player_id: { S: `${playerId}` },
    },
    AttributeToGet: ['score'],
  });

  const data = await game.dynamoDBClient.send(command);
  const score = data.Item?.score.N ?? '0';

  await game.telegramClient.reply(message, `The player has the score = ${score}`);
};

module.exports = {
  score,
};
