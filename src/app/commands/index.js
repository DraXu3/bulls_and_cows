const { start } = require('./start');
const { stop } = require('./stop');

const commands = {
  '/start': start,
  '/stop': stop,
};

module.exports = {
  commands,  
};
