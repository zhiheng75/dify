#!/usr/bin/bash

export LD_LIBRARY_PATH=/home/dev/staging/FastChat/venv/lib/python3.10/site-packages/nvidia/cuda_runtime/lib:$LD_LIBRARY_PATH
LOG_DIR="logs"
mkdir -p ${LOG_DIR}

# If vLLM is enable, use fastchat.serve.vllm_worker instead of fastchat.serve.model_worker
# If you want to use vLLM, you need to install the vLLM package first.
# pip install vllm
vllm=True
model_worker="fastchat.serve.model_worker"
if [ "$vllm" ]; then
  echo "vLLM enabled."
  model_worker="fastchat.serve.vllm_worker"
fi

# Read input parameters.
# mode = [dev|staging],
# command=[start|stop|restart]
if [ $# -le 1 ]; then
    echo "No enough arguments provided. Usage: $0 [dev|staging] [start|stop|restart]"
    exit 1
fi

mode=$1
if [ "$mode" != "dev" ] && [ "$mode" != "staging" ]; then
    echo "Invalid mode. Usage: $0 [dev|staging] [start|stop|restart]"
    exit 1
fi

command=$2
if [ "$command" != "start" ] && [ "$command" != "stop" ] && [ "$command" != "restart" ]; then
    echo "Invalid command. Usage: $0 [dev|staging] [start|stop|restart]"
    exit 1
fi

# As we are running on the same machine, we need to specify 
# different ports for different modes.
case "$mode" in
    "dev")
        echo "Running in dev mode..."
        GPU0=5
        GPU1=6
        GPU2=7
        controller_port=22001
        worker_port0=22002
        worker_port1=22003
        worker_port2=22004
        worker_port3=22005
        worker_port4=22006
        openai_api_server_port=9318
        ;;
    "staging")
        echo "Running in staging mode..."
        GPU0=0
        GPU1=1
        GPU2=2
        GPU3=3
        GPU4=4
        controller_port=21001
        worker_port0=21002
        worker_port1=21003
        worker_port2=21004
        worker_port3=21005
        worker_port4=21006
        openai_api_server_port=9308
        ;;
esac


function stop_server {
  # Read PIDs from all the .pid files in the logging directory and kill the processes
  for pid_file in ${LOG_DIR}/*.pid; do
    if [ -f "$pid_file" ]; then
      pid=$(cat "$pid_file")
      echo "Killing process $pid (from $pid_file)..."
      kill -9 "$pid"
      rm "$pid_file"
    fi
  done
}

# define a function to start all processes
function start_server {
  local_ip_address="10.0.0.63"

  controller_address="http://localhost:${controller_port}"
  # Start the controller
  echo "Starting controller..."
  nohup python3 -m fastchat.serve.controller --port ${controller_port} >${LOG_DIR}/controller.nohup 2>&1 &
  echo "$!" > ${LOG_DIR}/controller.pid
  sleep 5

  # Llama2 13B Chat
  worker_name0="llama2"
  echo "Starting worker ${worker_name0}..."
  CUDA_VISIBLE_DEVICES=$GPU0,$GPU1 nohup python3 -m ${model_worker} \
    --num-gpus 2 \
	  --model-name "${worker_name0}" \
	  --model-path /home/models/Llama2-Chinese-13b-Chat \
	  --port ${worker_port0} \
	  --controller-address ${controller_address} \
	  --worker-address http://localhost:${worker_port0} >${LOG_DIR}/${worker_name0}.nohup 2>&1 &
  echo "$!" > ${LOG_DIR}/${worker_name0}.pid
  sleep 5

  # Baichuan2 13B
  worker_name1="baichuan2"
  echo "Starting worker ${worker_name1}..."
  CUDA_VISIBLE_DEVICES=$GPU2,$GPU3 nohup python3 -m ${model_worker} \
    --num-gpus 2 \
	  --model-name "${worker_name1}" \
	  --model-path /home/models/Baichuan2-13B-Chat \
	  --port $worker_port1 \
	  --trust-remote-code \
	  --controller-address ${controller_address} \
	  --worker-address http://localhost:${worker_port1} >${LOG_DIR}/${worker_name1}.nohup 2>&1 &
  echo "$!" > ${LOG_DIR}/${worker_name1}.pid
  sleep 5

  # QWen 14B
  worker_name2="qwen-14b"
  echo "Starting worker ${worker_name2}..."
	#  --model-path /home/models/Qwen-14B-Chat-Int8 \
	#  --model-path /home/models/Qwen1.5-14B-Chat-GPTQ-Int8 \
	#  --model-path /home/models/Qwen1.5-7B-Chat-AWQ \
  #CUDA_VISIBLE_DEVICES=$GPU0,$GPU1,$GPU2,$GPU3 nohup python3 -m fastchat.serve.model_worker \
  # 14B can only be run with 1 GPU
  CUDA_VISIBLE_DEVICES=$GPU4 nohup python3 -m ${model_worker} \
    --num-gpus 1 \
	  --model-name "${worker_name2}" \
	  --model-path /home/models/Qwen1.5-14B-Chat-GPTQ-Int4 \
	  --port $worker_port2 \
	  --max-model-len 8192 \
	  --controller-address ${controller_address} \
	  --worker-address http://localhost:${worker_port2} >${LOG_DIR}/${worker_name2}.nohup 2>&1 &
  echo "$!" > ${LOG_DIR}/${worker_name2}.pid

  # BGE v1.5
  worker_name3="bge-zh-v1.5"
#	  --model-path /home/models/bge-m3 \
  echo "Starting worker ${worker_name3}..."
  CUDA_VISIBLE_DEVICES=$GPU0 nohup python3 -m fastchat.serve.model_worker \
	  --model-name "${worker_name3}" \
	  --model-path /home/models/bge-large-zh-v1.5 \
	  --port $worker_port3 \
	  --controller-address ${controller_address} \
	  --worker-address http://localhost:${worker_port3} >${LOG_DIR}/${worker_name3}.nohup 2>&1 &
  echo "$!" > ${LOG_DIR}/${worker_name3}.pid

  # API server
  echo "Starting OpenAI API server..."
  nohup python3 -m fastchat.serve.openai_api_server --host ${local_ip_address} \
        	                                    --controller-address ${controller_address} \
                                                    --port ${openai_api_server_port} >${LOG_DIR}/openai_api_server.nohup 2>&1 &
  echo "$!" > ${LOG_DIR}/openai_api.pid
  sleep 1

}


case "$command" in
    "start")
        echo "Starting all processes..."
        start_server
        ;;
    "stop")
        echo "Stopping all processes..."
        stop_server
        ;;
    "restart")
        echo "Restarting all processes..."
        stop_server
        sleep 5
        start_server
        ;;
esac
