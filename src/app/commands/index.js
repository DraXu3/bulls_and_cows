const { help } = require('./help');
const { start } = require('./start');
const { stop } = require('./stop');

const commands = {
  '/help': help,
  '/start': start,
  '/stop': stop,
};

module.exports = {
  commands,  
};
