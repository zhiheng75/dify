from flask import current_app, request
from flask_login import current_user
from flask_restful import Resource, marshal_with
import pytz
import random

from flask import current_app
import services
from services.account_service import AccountService
from services.dataset_service import  TMP_DATASET_PREFIX,TMP_DATASET_REDIS_QUEUE
from controllers.console import api
from controllers.console.datasets.error import (
    FileTooLargeError,
    NoFileUploadedError,
    TooManyFilesError,
    UnsupportedFileTypeError,
)
from extensions.ext_redis import redis_client
from controllers.console.setup import setup_required
from controllers.console.wraps import account_initialization_required, cloud_edition_billing_resource_check
from fields.file_fields import file_fields, upload_config_fields
from libs.login import login_required
from services.file_service import ALLOWED_EXTENSIONS, UNSTRUSTURED_ALLOWED_EXTENSIONS, FileService
from services.dataset_service import DatasetService, DocumentService
from controllers.console.datasets.error import DatasetNameDuplicateError
from flask_restful import Resource, marshal, reqparse
from datetime import datetime
from werkzeug.exceptions import Forbidden, NotFound
from core.errors.error import (
    LLMBadRequestError,
    ModelCurrentlyNotSupportError,
    ProviderTokenNotInitError,
    QuotaExceededError,
)
from controllers.console.app.error import (
    ProviderModelCurrentlyNotSupportError,
    ProviderNotInitializeError,
    ProviderQuotaExceededError,
)
from extensions.ext_database import db
from models.conversation_tmp_dataset import ConversationTmpDataset

PREVIEW_WORDS_LIMIT = 3000
TMP_DATA_SET_REDIS_QUEUE = "tmp_dataset_ids"

class FileAppApi(Resource):

    @setup_required
    @login_required
    @account_initialization_required
    @cloud_edition_billing_resource_check(resource='documents')
    def post(self):

        # get file from request
        file = request.files['file']



        # check file
        if 'file' not in request.files:
            raise NoFileUploadedError()

        if len(request.files) > 1:
            raise TooManyFilesError()

        upload_file_id = None
        try:
            upload_file = FileService.upload_file(file, current_user)
            upload_file_id = upload_file.id
        except services.errors.file.FileTooLargeError as file_too_large_error:
            raise FileTooLargeError(file_too_large_error.description)
        except services.errors.file.UnsupportedFileTypeError:
            raise UnsupportedFileTypeError()

        conversation_id = request.form.get("conversation_id")
        conversationTmpDatasetByConv = None
        conversation_id_db = ""
        if conversation_id is not None and len(conversation_id.strip()) > 0:
            conversation_id_db = conversation_id.strip()
            # 有conversation_id,则以conversation_id为条件更新:
            conversationTmpDatasetByConv = ConversationTmpDataset.query.filter_by(
                conversation_id=conversation_id_db
            ).first()

        # create dataset
        tmp_dataset_id = request.form.get("tmp_dataset_id")
        ref_finish = False
        if conversationTmpDatasetByConv is not None and len(conversationTmpDatasetByConv.tmp_dataset_id) > 0:
            #如果数据库中有关联的,则直接使用数据库中的dataset
            tmp_dataset_id = conversationTmpDatasetByConv.tmp_dataset_id;
            ref_finish = True

        name = "default"
        new_tmp_dataset_id = False
        if tmp_dataset_id is None or len(tmp_dataset_id.strip()) == 0:
            try:
                random_number = str(random.randint(0, 999999))
                random_number = random_number.zfill(6)
                now_str = datetime.now(pytz.timezone('Asia/Shanghai')).strftime("%Y%m%d%H%M%S")
                name = now_str + "-" + str(random_number)
                dataset = DatasetService.create_empty_dataset(
                    tenant_id=current_user.current_tenant_id,
                    name = TMP_DATASET_PREFIX + name,
                    indexing_technique = 'high_quality',
                    account=current_user
                )
                tmp_dataset_id = dataset.id
                new_tmp_dataset_id = True
                # 不再删除临时对话dataset
                # redis_client.lpush(TMP_DATASET_REDIS_QUEUE,tmp_dataset_id+"#"+now_str)
            except services.errors.dataset.DatasetNameDuplicateError:
                raise DatasetNameDuplicateError()
        else:
            dataset_id = str(tmp_dataset_id)
            dataset = DatasetService.get_dataset(dataset_id)
            if not dataset:
                raise NotFound('Dataset not found.')

        # 没有关联信息,试图关联
        if not ref_finish:
            conversationTmpDatasetByData = None

            if not new_tmp_dataset_id:
                conversationTmpDatasetByData = ConversationTmpDataset.query.filter_by(
                    tmp_dataset_id=tmp_dataset_id
                ).first()

            if conversationTmpDatasetByData is not None and len(conversation_id_db.strip()) > 0:
                ConversationTmpDataset.query.filter_by(tmp_dataset_id=tmp_dataset_id).update(
                    {ConversationTmpDataset.conversation_id:conversation_id_db.strip()})
                db.session.commit()

            if conversationTmpDatasetByConv is not None  and len(tmp_dataset_id.strip()) > 0:
                ConversationTmpDataset.query.filter_by(conversation_id=conversation_id_db).update(
                    {ConversationTmpDataset.tmp_dataset_id: tmp_dataset_id.strip()})
                db.session.commit()

            if conversationTmpDatasetByConv is None and conversationTmpDatasetByData is None and ( len(conversation_id_db.strip()) > 0 or len(tmp_dataset_id.strip()) > 0 ):
                record = ConversationTmpDataset(
                        conversation_id = conversation_id_db.strip(),
                        tmp_dataset_id = tmp_dataset_id.strip()
                    )
                db.session.add(record)
                db.session.commit()

        # create document
        try:
            args = {
                "data_source": {
                    "type": "upload_file",
                    "info_list": {
                        "data_source_type": "upload_file",
                        "file_info_list": {
                            "file_ids": [
                                upload_file_id
                            ]
                        }
                    }
                },
                "indexing_technique": "high_quality",
                "process_rule": {
                    "rules": {
                        "pre_processing_rules": [
                            {
                                "id": "remove_extra_spaces",
                                "enabled": True
                            },
                            {
                                "id": "remove_urls_emails",
                                "enabled": True
                            }
                        ],
                        "segmentation": {
                            "separator": "\n\n",
                            "max_tokens": 800,
                            "chunk_overlap": 80
                        }
                    },
                    "mode": "custom"
                },
                "doc_form": "text_model",
                "doc_language": "Chinese"
            }

            documents, batch = DocumentService.save_document_with_dataset_id(dataset, args, current_user)
        except ProviderTokenNotInitError as ex:
            raise ProviderNotInitializeError(ex.description)
        except QuotaExceededError:
            raise ProviderQuotaExceededError()
        except ModelCurrentlyNotSupportError:
            raise ProviderModelCurrentlyNotSupportError()

        # "http://llm.genemodel.com:18082/console/api/datasets/ee6127ec-ee2d-4739-9146-29c21220f573/batch/20240613022930258792/indexing-status"

        return {"tmp_dataset_id":tmp_dataset_id,"progress_url":f"/console/api/datasets/{tmp_dataset_id}/batch/{batch}/indexing-status"}


class ConvTmpDataSetIDApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, conversation_id):
        conversation_id = str(conversation_id)
        tmp_dataset_id = ""
        conversationTmpDatasetByConv = None
        if conversation_id is not None and len(conversation_id.strip()) > 0:
            conversation_id_db = conversation_id.strip()
            # 有conversation_id,则以conversation_id为条件更新:
            conversationTmpDatasetByConv = ConversationTmpDataset.query.filter_by(
                conversation_id=conversation_id_db
            ).first()
        if conversationTmpDatasetByConv is not None and len(conversationTmpDatasetByConv.tmp_dataset_id) > 0:
            # 如果数据库中有关联的,则直接使用数据库中的dataset
            tmp_dataset_id = conversationTmpDatasetByConv.tmp_dataset_id;
        return {'tmp_dataset_id': tmp_dataset_id}



api.add_resource(FileAppApi, '/files/upload_in_app')
api.add_resource(ConvTmpDataSetIDApi, '/get_conv_tmp_dataset_id/<uuid:conversation_id>')
