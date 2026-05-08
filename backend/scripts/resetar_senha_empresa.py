"""
CLI para resetar a senha de uma empresa existente.

Uso:
    cd backend
    .\\.venv\\Scripts\\Activate.ps1
    python scripts/resetar_senha_empresa.py --login teste --senha nova_senha123

Ou interativo (sem flags):
    python scripts/resetar_senha_empresa.py
"""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.services.auth_service import hash_password  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description='Reseta a senha de uma empresa do portal RH.')
    parser.add_argument('--login', help='nome_login da empresa (ex: "teste")')
    parser.add_argument('--senha', help='Nova senha em texto puro (sera hasheada)')
    args = parser.parse_args()

    login = args.login or input('nome_login da empresa: ').strip()
    senha = args.senha or getpass.getpass('Nova senha: ')

    if not login or not senha:
        print('ERRO: login e senha sao obrigatorios.', file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        existing = db.execute(
            text('SELECT id_empresa, nome FROM public.empresa WHERE LOWER(nome_login) = LOWER(:login)'),
            {'login': login},
        ).first()
        if not existing:
            print(f'ERRO: nao existe empresa com nome_login "{login}".', file=sys.stderr)
            return 2

        id_empresa, nome_empresa = existing[0], existing[1]
        senha_hash = hash_password(senha)
        db.execute(
            text('UPDATE public.empresa SET senha_hash = :senha_hash WHERE id_empresa = :id'),
            {'senha_hash': senha_hash, 'id': id_empresa},
        )
        db.commit()
        print(f'OK: senha atualizada | id={id_empresa} | nome={nome_empresa} | login={login}')
        return 0
    except Exception as exc:
        db.rollback()
        print(f'ERRO ao atualizar senha: {exc}', file=sys.stderr)
        return 3
    finally:
        db.close()


if __name__ == '__main__':
    sys.exit(main())
