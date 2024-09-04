#!/usr/bin/bash

docker run \
        -e XINFERENCE_MODEL_SRC=modelscope \
        -e CUDA_VISIBLE_DEVICES=4,5,6,7 \
        -e XINFERENCE_HOME=/data/cache \
        -v ./cache:/data/cache \
        -v /home/models:/models \
        -p 9318:9997 \
        --gpus all \
        xprobe/xinference:v0.10.3 xinference-local \
        -H 0.0.0.0 \
        --log-level debug