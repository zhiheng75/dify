#!/usr/bin/bash

CUDA_VISIBLE_DEVICES=4,5 python -m vllm.entrypoints.api_server \
        --model /home/models/Qwen1.5-14B-Chat-GPTQ-Int4 \
        --tensor-parallel-size 2 \
        --quantization gptq \
        --trust-remote-code \
        --dtype float16 \
        --max-model-len=9000 \
        --gpu-memory-utilization 0.9