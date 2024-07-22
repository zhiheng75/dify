#!/bin/bash

npm run build

ps -ef | grep "npm run start" |grep -v grep |awk '{print $2}' |xargs kill
ps -ef | grep 3000 |grep -v grep |awk '{print $2}' |xargs kill

#npm run start --port=3000 2 >&1 >> logs/web.log & 
mkdir -p logs
nohup npm run start --port=3000 2 >&1 >> logs/web.log & 
