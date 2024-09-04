#!/usr/bin/bash

source venv/bin/activate

END_POINT=http://gpu.shenmo-ai.com:9308

xinference launch -e ${END_POINT} --model-engine vllm -u qwen-v1.5-14B -n qwen1.5-chat -t LLM -s 14 -f gptq -q Int4 --max_model_len 10000

xinference launch -e ${END_POINT} -u jina-embeddings-v2-base-zh -n jina-embeddings-v2-base-zh -t embedding

xinference launch -e ${END_POINT} -u bge-reranker-large -n bge-reranker-large -t rerank

xinference launch -e ${END_POINT} --model-engine vllm -u qwen2-instruct -n qwen2-instruct -t LLM -s 7 -f gptq -q Int4 --max_model_len 10000 --gpu-idx 3

# xinference launch -e ${END_POINT} --model-engine vllm -u qwen-v1.5-7B -n qwen1.5-chat -t LLM -s 7 -f gptq -q Int4 --max_model_len 10000

