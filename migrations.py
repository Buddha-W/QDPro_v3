
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

def upgrade():
    # Create version table
    op.create_table(
        'version_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(50), nullable=False),
        sa.Column('applied_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Track initial schema version
    op.execute(
        "INSERT INTO version_history (version, applied_at) VALUES ('1.0.0', CURRENT_TIMESTAMP)"
    )

def downgrade():
    op.drop_table('version_history')
