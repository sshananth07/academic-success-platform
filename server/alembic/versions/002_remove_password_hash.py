"""Remove password_hash, use Supabase Auth

Revision ID: 002
Revises: 001
Create Date: 2026-06-06 00:00:00.000000
"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("users", "password_hash")


def downgrade() -> None:
    import sqlalchemy as sa
    op.add_column("users", sa.Column("password_hash", sa.String(), nullable=False, server_default=""))
