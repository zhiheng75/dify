#!/bin/bash

npm run build
#npm run start --port=3000 2 >&1 >> logs/web.log &
mkdir -p logs
nohup npm run start --port=3000 2 >&1 >> logs/web.log & 
