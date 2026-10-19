"""initial_schema_baseline

Revision ID: dfd0da3e179f
Revises: 
Create Date: 2026-10-19 17:26:24.322027

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dfd0da3e179f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Create tables if database is fresh
    if 'water_bodies' not in existing_tables:
        op.create_table(
            'water_bodies',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('name', sa.String(length=120), nullable=False),
            sa.Column('type', sa.String(length=50), nullable=False),
            sa.Column('latitude', sa.Float(), nullable=False),
            sa.Column('longitude', sa.Float(), nullable=False),
            sa.Column('current_risk_level', sa.String(length=30), nullable=True, server_default='low'),
            sa.Column('risk_score', sa.Float(), nullable=True, server_default='15.0'),
            sa.Column('water_temp_c', sa.Float(), nullable=True, server_default='19.0'),
            sa.Column('flow_rate_cms', sa.Float(), nullable=True, server_default='1.0'),
            sa.Column('depth_meters', sa.Float(), nullable=True, server_default='4.0'),
            sa.Column('elevation_meters', sa.Float(), nullable=True),
            sa.Column('basin_region', sa.String(length=100), nullable=True),
            sa.Column('data_source', sa.String(length=120), nullable=True, server_default='Synthetic Prototype Node'),
            sa.Column('description', sa.String(length=255), nullable=True),
            sa.Column('last_updated', sa.DateTime(), nullable=True),
            sa.Column('is_demonstration_data', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_water_bodies_id'), 'water_bodies', ['id'], unique=False)
        op.create_index(op.f('ix_water_bodies_name'), 'water_bodies', ['name'], unique=False)

    if 'alerts' not in existing_tables:
        op.create_table(
            'alerts',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('water_body_id', sa.Integer(), nullable=True),
            sa.Column('water_body_name', sa.String(length=120), nullable=False),
            sa.Column('severity', sa.String(length=30), nullable=True, server_default='moderate'),
            sa.Column('message', sa.String(length=255), nullable=False),
            sa.Column('timestamp', sa.DateTime(), nullable=True),
            sa.Column('is_demonstration_data', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.ForeignKeyConstraint(['water_body_id'], ['water_bodies.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_alerts_id'), 'alerts', ['id'], unique=False)

    if 'alert_deliveries' not in existing_tables:
        op.create_table(
            'alert_deliveries',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('alert_id', sa.Integer(), nullable=True),
            sa.Column('water_body_id', sa.Integer(), nullable=True),
            sa.Column('water_body_name', sa.String(length=120), nullable=False),
            sa.Column('severity', sa.String(length=30), nullable=False),
            sa.Column('channel', sa.String(length=30), nullable=False),
            sa.Column('recipient', sa.String(length=255), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False),
            sa.Column('confirmed_by_provider', sa.Boolean(), nullable=True, server_default=sa.text('0')),
            sa.Column('provider_message', sa.Text(), nullable=False),
            sa.Column('is_test_mode', sa.Boolean(), nullable=True, server_default=sa.text('0')),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

    # If tables already existed, align column constraints using batch mode
    if 'alerts' in existing_tables:
        with op.batch_alter_table('alerts', schema=None) as batch_op:
            batch_op.alter_column('is_demonstration_data',
                   existing_type=sa.BOOLEAN(),
                   nullable=False,
                   existing_server_default=sa.text('1'))

    if 'water_bodies' in existing_tables:
        with op.batch_alter_table('water_bodies', schema=None) as batch_op:
            batch_op.alter_column('data_source',
                   existing_type=sa.VARCHAR(length=100),
                   type_=sa.String(length=120),
                   existing_nullable=True)
            batch_op.alter_column('description',
                   existing_type=sa.TEXT(),
                   type_=sa.String(length=255),
                   existing_nullable=True)
            batch_op.alter_column('is_demonstration_data',
                   existing_type=sa.BOOLEAN(),
                   nullable=False,
                   existing_server_default=sa.text('1'))


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('water_bodies', schema=None) as batch_op:
        batch_op.alter_column('is_demonstration_data',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text('1'))
        batch_op.alter_column('description',
               existing_type=sa.String(length=255),
               type_=sa.TEXT(),
               existing_nullable=True)
        batch_op.alter_column('data_source',
               existing_type=sa.String(length=120),
               type_=sa.VARCHAR(length=100),
               existing_nullable=True)

    with op.batch_alter_table('alerts', schema=None) as batch_op:
        batch_op.alter_column('is_demonstration_data',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text('1'))

    # ### end Alembic commands ###
