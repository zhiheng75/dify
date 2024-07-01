#npm install
#npm run build
port=24188
ps -ef | grep $port |grep -v grep |awk '{print $2}'  | xargs -i kill  -9 {}
nohup npm run start --port=$port --host=0.0.0.0    > web.log 2>&1 &
