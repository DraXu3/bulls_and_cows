const help = async (message, game) => {
  const text = `The following commands are supported:
  * /help - shows current help
  * /score @player - shows the score of the mentioned player
  * /start - starts new game (the current game will be discarded)
  * /stop - stops the current game`;

  await game.telegramClient.reply(message, text);
};

module.exports = {
  help,
};
