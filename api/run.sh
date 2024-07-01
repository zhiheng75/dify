conda activate turbo310
export FLASK_APP=app.py
export CHECK_UPDATE_URL=
export GEVENT_SUPPORT=True


ps -ef |grep    19691 | grep -v grep |awk '{print $2}' | xargs -i kill  -9 {}
nohup gunicorn --bind "0.0.0.0:19691" --workers 1 --worker-class gevent --timeout 10000 --preload app:app > api.log &


ps -ef | grep celery | grep turbo310 |grep -v grep |awk '{print $2}'  | xargs -i kill -9 {}
nohup celery -A app.celery worker -P gevent -c 1 -Q dataset,generation,mail --loglevel INFO 2>&1 >> celery.log &
