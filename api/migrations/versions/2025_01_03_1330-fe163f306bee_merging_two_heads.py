"""merging two heads

Revision ID: fe163f306bee
Revises: 88a3d09e72e4, cf8f4fc45278
Create Date: 2025-01-03 13:30:23.160827

"""
from alembic import op
import models as models
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fe163f306bee'
down_revision = ('88a3d09e72e4', 'cf8f4fc45278')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
