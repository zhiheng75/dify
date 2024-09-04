#!/usr/bin/bash

source venv/bin/activate

# CUDA_VISIBLE_DEVICES=7 nohup python src/train_web.py > web_ui.nohup 2>&1 &
CUDA_VISIBLE_DEVICES=6 nohup llamafactory-cli webui > web_ui.nohup 2>&1 &