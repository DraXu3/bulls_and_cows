const { help } = require('./help');
const { score } = require('./score');
const { start } = require('./start');
const { stop } = require('./stop');

const commands = {
  '/help': help,
  '/score': score,
  '/start': start,
  '/stop': stop,
};

module.exports = {
  commands,  
};
