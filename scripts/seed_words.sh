#!/bin/bash

awslocal dynamodb batch-write-item \
  --endpoint-url=http://localhost:4566 \
  --request-items '{
    "bulls-and-cows-words": [
      {
        "PutRequest": {
          "Item": {
            "word_length": {"N": "4"},
            "word_position": {"N": "1"},
            "word": {"S": "mask"}
          }
        }
      },
      {
        "PutRequest": {
          "Item": {
            "word_length": {"N": "4"},
            "word_position": {"N": "2"},
            "word": {"S": "word"}
          }
        }
      },
      {
        "PutRequest": {
          "Item": {
            "word_length": {"N": "4"},
            "word_position": {"N": "3"},
            "word": {"S": "luck"}
          }
        }
      }
    ]
  }'
