const startNewGame = async (message, app) => {
  app.telegramClient.replyToMessage(message, 'The command is not implemented yet');
};

module.exports = {
  startNewGame,
};
