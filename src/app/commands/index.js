const { startNewGame } = require('./startNewGame');

const commands = {
  '/new': startNewGame,
};

module.exports = {
  commands,  
};
