#!/usr/bin/bash

source venv/bin/activate

# 3.0
EPOCH=10
# 8
RANK=8

# LOCAL_RANK=4,6 CUDA_VISIBLE_DEVICES=4,6 llamafactory-cli train \
# CUDA_VISIBLE_DEVICES=4,6 torchrun --nproc_per_node 2 src/train.py \
CUDA_VISIBLE_DEVICES=4,6 llamafactory-cli train \
    --deepspeed cache/ds_z3_config.json \
    --stage pt \
    --do_train True \
    --model_name_or_path /home/models/qwen2-7b-instruct \
    --preprocessing_num_workers 16 \
    --finetuning_type lora \
    --template default \
    --flash_attn auto \
    --dataset_dir data \
    --dataset c4_demo \
    --cutoff_len 4096 \
    --learning_rate 5e-06 \
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
    --packing True \
    --report_to none \
    --output_dir saves/Custom/lora/qwen_pt \
    --bf16 True \
    --plot_loss True \
    --ddp_timeout 180000000 \
    --include_num_input_tokens_seen True \
    --lora_rank $RANK \
    --lora_alpha 16 \
    --lora_dropout 0 \
    --lora_target all
