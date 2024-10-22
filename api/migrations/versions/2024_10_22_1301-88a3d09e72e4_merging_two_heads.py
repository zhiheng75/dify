"""merging two heads

Revision ID: 88a3d09e72e4
Revises: 0c22470a56de, bbadea11becb
Create Date: 2024-10-22 13:01:14.516855

"""
from alembic import op
import models as models
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '88a3d09e72e4'
down_revision = ('0c22470a56de', 'bbadea11becb')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
