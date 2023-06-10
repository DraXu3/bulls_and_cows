const axios = require('axios');

class TelegramClient {
  constructor(botId) {
    this.botId = botId;
  }

  async reply(message, text) {
    await axios.post(`https://api.telegram.org/bot${this.botId}/sendMessage`, {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text,
    });
  }
}

module.exports = {
  TelegramClient,
};
