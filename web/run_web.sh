#!/bin/bash

npm run build
#npm run start --port=3000 2 >&1 >> logs/web.log & 
nohup npm run start --port=3000 2 >&1 >> logs/web.log & 
