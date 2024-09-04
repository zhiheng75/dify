#!/usr/bin/bash

source venv/bin/activate

# 3
EPOCH=300
# 8
RANK=8

CUDA_VISIBLE_DEVICES=4,6 llamafactory-cli train \
    --stage sft \
    --do_train True \
    --model_name_or_path /home/models/qwen2-7b-instruct \
    --preprocessing_num_workers 16 \
    --finetuning_type lora \
    --template default \
    --flash_attn auto \
    --dataset_dir /home/dev/staging/LLaMA-Factory/data \
    --dataset identity \
    --cutoff_len 4096 \
    --learning_rate 5e-5 \
    --num_train_epochs $EPOCH \
    --max_samples 100000 \
    --per_device_train_batch_size 1 \
    --gradient_accumulation_steps 8 \
    --lr_scheduler_type cosine \
    --max_grad_norm 1.0 \
    --logging_steps 5 \
    --save_steps 100 \
    --warmup_steps 0 \
    --optim adamw_torch \
    --packing False \
    --report_to none \
    --output_dir saves/Custom/lora/qwen_sft \
    --bf16 True \
    --plot_loss True \
    --ddp_timeout 180000000 \
    --include_num_input_tokens_seen True \
    --lora_rank $RANK \
    --lora_alpha 16 \
    --lora_dropout 0 \
    --lora_target all \
    --val_size 0.1 \
    --eval_strategy steps \
    --overwrite_cache \
    --eval_steps 100
