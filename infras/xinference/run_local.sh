#!/usr/bin/bash

source venv/bin/activate

#CUDA_VISIBLE_DEVICES=4,5,6 XINFERENCE_MODEL_SRC=modelscope XINFERENCE_HOME=./xinference_home xinference-local \
CUDA_VISIBLE_DEVICES=4,5,6 XINFERENCE_MODEL_SRC=modelscope XINFERENCE_HOME=./cache xinference-local \
        --host 0.0.0.0 \
        --port 9318