#!/bin/bash

source ../venv/bin/activate
pip install -r requirements.txt
flask db upgrade

ps -ef | grep celery |grep -v grep |awk '{print $2}' | xargs kill
nohup celery -A app.celery worker -P gevent -c 1 -Q dataset,generation,mail --loglevel INFO 2>&1 >> logs/celery.log &

ps -ef |grep 5001 | grep -v grep |awk '{print $2}' | xargs kill
nohup flask run --host 0.0.0.0 --port=5001 --debug 2>&1 >> logs/api.log &
#flask run --host 0.0.0.0 --port=5001 --debug


