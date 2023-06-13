# Bulls and Cows

This is a Telegram bot which plays [Bulls and Cows](https://en.wikipedia.org/wiki/Bulls_and_Cows) game.

The following list of commands is currently supported:
* `/help` - shows the list of supported commands;
* `/score @player` - shows the score of the mentioned player;
* `/start` - starts a new game (the current game will be discarded);
* `/stop` - stops the current game.

By default, players have 5 attempts to guess a 4-letter word.

## Local development 

1. Install dependencies:

```
pip3 install awscli-local
brew install ngrok/ngrok/ngrok jq
npm i
```

2. Create `.env.local` file in the project root directory and set `TELEGRAM_BOT_ID` variable there.

3. Run Localstack:

```
npm run localstack
```

4. Deploy the bot to Localstack:

```
npm run local:deploy
```

Now you can send messages to the bot using the link which Serverless outputs on the stage 4. The link should look like this: `http://localhost:4566/restapis/<rest_api_id>/local/_user_request_/webhook`.

For example, the following command will start a new game:

```
curl --location 'http://localhost:4566/restapis/0wg7i75y7j/local/_user_request_/webhook' \
     --header 'Content-Type: text/plain' \
     --data '{
       "update_id": 111111111,
       "message": {
         "message_id": 111,
         "from": {
           "id": 111111111, 
           "is_bot": false, 
           "first_name": "First name", 
           "last_name": "Last name", 
           "username": "player", 
           "language_code": "en"
         }, 
         "chat": {
           "id": 361410469, 
           "first_name": "First name", 
           "last_name": "Last name", 
           "username": "player", 
           "type": "private"
         }, 
         "date": 1686353712, 
         "text": "/start", 
         "entities": [{"offset": 0, "length": 6, "type": "bot_command"}]
       }
     }'
```

After sending the command, the bot should be able to respond to the user mentioned in the request data.

By default, the words dictionary is empty. To seed it with test words use the following command (`awslocal` should be installed):

```
npm run local:seed
```

To set a webhook and connect the local bot with Telegram use the following command (`ngrok` should be installed):

```
npm run local:connect
```
