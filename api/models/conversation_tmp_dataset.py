from sqlalchemy.dialects.postgresql import UUID

from extensions.ext_database import db


class ConversationTmpDataset(db.Model):
    __tablename__ = 'conversation_tmp_dataset'
    __table_args__ = (
        db.PrimaryKeyConstraint('id', name='conv_tmp_dataset_binding_pkey'),
        db.Index('conversation_tmp_dataset_conversation_id_idx', 'conversation_id'),
        db.Index('conversation_tmp_dataset_tmp_dataset_id_idx', 'tmp_dataset_id')
    )
    id = db.Column(UUID, server_default=db.text('uuid_generate_v4()'))
    conversation_id = db.Column(db.String(255), nullable=False)
    tmp_dataset_id = db.Column(db.String(255), nullable=False)

