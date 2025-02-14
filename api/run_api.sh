#!/bin/bash

# source ../venv/bin/activate
# poetry shell is deprecated in poetry 2.0+
eval $(poetry env activate)
poetry install
#flask db migrate
flask db upgrade

mkdir -p logs
ps -ef | grep celery |grep -v grep |awk '{print $2}' | xargs kill
nohup celery -A app.celery worker -P gevent -c 1 -Q dataset,generation,mail,ops_trace --loglevel INFO 2>&1 >> logs/celery.log &

ps -ef |grep port=5001 | grep -v grep |awk '{print $2}' | xargs kill
# nohup flask run --host 0.0.0.0 --port=5001 --debug 2>&1 >> logs/api.log &
flask run --host 0.0.0.0 --port=5001 --debug
