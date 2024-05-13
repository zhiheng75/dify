#npm install
#npm run build
ps -ef | grep 29688     |grep -v grep |awk '{print $2}'  | xargs -i kill {}
nohup npm run start --port=29688 --host=0.0.0.0    > web.log 2>&1 &
