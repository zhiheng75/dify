#!/bin/bash

source ../venv/bin/activate
pip install -r requirements.txt
flask db upgrade
flask run --host 0.0.0.0 --port=5001 --debug
