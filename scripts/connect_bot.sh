#!/bin/bash

LOCAL_DOTENV_FILE_NAME=".env.local"
TELEGRAM_BOT_ID_ENV_VAR="TELEGRAM_BOT_ID"

current_dir=$(dirname $(readlink -f "$0"))
local_dotenv_file="$current_dir/../$LOCAL_DOTENV_FILE_NAME"

if [ ! -f "$local_dotenv_file" ]; then
    echo "Erorr: .env.local file not found"
    exit 1
fi

echo -n "Parsing .env.local file ..."
telegram_bot_id=$(grep "$TELEGRAM_BOT_ID_ENV_VAR" "$local_dotenv_file" | awk -F "=" '{print $2}' | tr -d '[:space:]')

if [ -z "$telegram_bot_id" ]; then
    echo -e "\nError: $TELEGRAM_BOT_ID_ENV_VAR variable not found"
    exit 1
fi

echo -e "\tOK"
echo "Found telegram bot id $telegram_bot_id"

echo -n "Deploying serverless resources ..."
sls deploy --stage local >/dev/null 2>&1
echo -e "\tOK"

echo -n "Running ngrok..."
ngrok http 4566 >/dev/null 2>&1 &

ngrok_pid=$!
cleanup() {
    echo -n "Killing ngrok ..."
    kill $ngrok_pid
    echo -e "\tOK"


    echo -n "Deleting webhook ..."
    response=$(
        curl -s \
            --request POST \
            --url https://api.telegram.org/bot${telegram_bot_id}/deleteWebhook
    )

    response_status=$(echo "$response" | jq .ok)
    if [ "$response_status" == "false" ]; then
        response_error=$(echo "$response" | jq .description)
        echo -e "\nError deleting webhook: $response_error"
        exit 1
    fi

    echo -e "\tOK"
}
trap cleanup EXIT

sleep 2
echo -e "\tOK"

ngrok_url=$(curl -s http://localhost:4040/api/tunnels/ | jq .tunnels[0].public_url | sed "s/\"//g")
api_gateway_id=$(awslocal apigateway get-rest-apis | jq .items[0].id | sed "s/\"//g")
webhook_url="$ngrok_url/restapis/$api_gateway_id/local/_user_request_/webhook"

echo -n "Setting webhook $webhook_url ..."

response=$(
    curl -s \
        --request POST \
        --url https://api.telegram.org/bot${telegram_bot_id}/setWebhook \
        --header "content-type: application/json" \
        --data "{\"url\": \"$webhook_url\"}"
)

response_status=$(echo "$response" | jq .ok)
if [ "$response_status" == "false" ]; then
    response_error=$(echo "$response" | jq .description)
    echo -e "\nError setting webhook: $response_error"
    exit 1
fi

echo -e "\tOK"

echo "Press Ctrl+D to terminate ..."
read -r -d '' _ </dev/tty
