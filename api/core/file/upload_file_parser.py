import base64
import hashlib
import hmac
import logging
import os
import time
from typing import Optional

from flask import current_app

from core.rag.extractor.extract_processor import ExtractProcessor
from extensions.ext_storage import storage
from models.model import UploadFile

IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
IMAGE_EXTENSIONS.extend([ext.upper() for ext in IMAGE_EXTENSIONS])

TEXT_EXTENSIONS = ['txt', 'md', 'html', 'htm', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
TEXT_EXTENSIONS.extend([ext.upper() for ext in TEXT_EXTENSIONS])


class UploadFileParser:
    @classmethod
    def get_image_data(cls, upload_file, force_url: bool = False) -> Optional[str]:
        if not upload_file:
            return None

        if upload_file.extension not in IMAGE_EXTENSIONS:
            return None

        if current_app.config['MULTIMODAL_SEND_IMAGE_FORMAT'] == 'url' or force_url:
            return cls.get_signed_temp_image_url(upload_file.id)
        else:
            # get image file base64
            try:
                data = storage.load(upload_file.key)
            except FileNotFoundError:
                logging.error(f'File not found: {upload_file.key}')
                return None

            encoded_string = base64.b64encode(data).decode('utf-8')
            return f'data:{upload_file.mime_type};base64,{encoded_string}'

    @classmethod
    def get_text_data(cls, upload_file: UploadFile, force_url: bool = False) -> Optional[str]:
        if not upload_file:
            return None

        if upload_file.extension not in TEXT_EXTENSIONS:
            return None

        try:
            # data = storage.load(upload_file.key)
            data = ExtractProcessor.load_from_upload_file(upload_file)
        except FileNotFoundError:
            logging.error(f'File not found: {upload_file.key}')
            return None
        except Exception as e:
            logging.error(f'Failed to load file: {upload_file.key}, {e}')
            return None

        return data

    @classmethod
    def get_signed_temp_image_url(cls, upload_file_id) -> str:
        """
        get signed url from upload file

        :param upload_file: UploadFile object
        :return:
        """
        base_url = current_app.config.get('FILES_URL')
        image_preview_url = f'{base_url}/files/{upload_file_id}/image-preview'

        timestamp = str(int(time.time()))
        nonce = os.urandom(16).hex()
        data_to_sign = f"image-preview|{upload_file_id}|{timestamp}|{nonce}"
        secret_key = current_app.config['SECRET_KEY'].encode()
        sign = hmac.new(secret_key, data_to_sign.encode(), hashlib.sha256).digest()
        encoded_sign = base64.urlsafe_b64encode(sign).decode()

        return f"{image_preview_url}?timestamp={timestamp}&nonce={nonce}&sign={encoded_sign}"

    @classmethod
    def verify_image_file_signature(cls, upload_file_id: str, timestamp: str, nonce: str, sign: str) -> bool:
        """
        verify signature

        :param upload_file_id: file id
        :param timestamp: timestamp
        :param nonce: nonce
        :param sign: signature
        :return:
        """
        data_to_sign = f"image-preview|{upload_file_id}|{timestamp}|{nonce}"
        secret_key = current_app.config['SECRET_KEY'].encode()
        recalculated_sign = hmac.new(secret_key, data_to_sign.encode(), hashlib.sha256).digest()
        recalculated_encoded_sign = base64.urlsafe_b64encode(recalculated_sign).decode()

        # verify signature
        if sign != recalculated_encoded_sign:
            return False

        current_time = int(time.time())
        return current_time - int(timestamp) <= current_app.config.get('FILES_ACCESS_TIMEOUT')
