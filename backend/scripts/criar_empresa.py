"""
CLI para criar uma empresa com senha hasheada.

Uso:
    cd backend
    .\\.venv\\Scripts\\Activate.ps1
    python scripts/criar_empresa.py --nome "Acme S.A." --login acme --senha senha1234

Ou interativo (sem flags):
    python scripts/criar_empresa.py
"""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

# Garante que o app/ seja importavel quando rodamos via 'python scripts/...'
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.services.auth_service import hash_password  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description='Cria uma empresa no portal RH.')
    parser.add_argument('--nome', help='Nome de exibicao (ex: "Acme S.A.")')
    parser.add_argument('--login', help='nome_login (ex: "acme") - unico, case-insensitive')
    parser.add_argument('--senha', help='Senha em texto puro (sera hasheada)')
    parser.add_argument('--cnpj', default=None)
    parser.add_argument('--bio', default=None)
    parser.add_argument('--logo-url', dest='logo_url', default=None)
    parser.add_argument('--site', default=None)
    parser.add_argument('--email', dest='email_contato', default=None)
    args = parser.parse_args()

    nome = args.nome or input('Nome de exibicao: ').strip()
    login = args.login or input('nome_login (sem espacos): ').strip()
    senha = args.senha or getpass.getpass('Senha: ')

    if not nome or not login or not senha:
        print('ERRO: nome, login e senha sao obrigatorios.', file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        existing = db.execute(
            text('SELECT id_empresa FROM public.empresa WHERE LOWER(nome_login) = LOWER(:login)'),
            {'login': login},
        ).first()
        if existing:
            print(f'ERRO: ja existe empresa com nome_login "{login}" (id={existing[0]}).', file=sys.stderr)
            return 2

        senha_hash = hash_password(senha)
        result = db.execute(
            text(
                'INSERT INTO public.empresa '
                '(nome, nome_login, senha_hash, cnpj, bio, logo_url, site, email_contato) '
                'VALUES (:nome, :login, :senha_hash, :cnpj, :bio, :logo_url, :site, :email_contato) '
                'RETURNING id_empresa'
            ),
            {
                'nome': nome,
                'login': login,
                'senha_hash': senha_hash,
                'cnpj': args.cnpj,
                'bio': args.bio,
                'logo_url': args.logo_url,
                'site': args.site,
                'email_contato': args.email_contato,
            },
        )
        new_id = result.scalar_one()
        db.commit()
        print(f'OK: empresa criada | id={new_id} | nome_login={login}')
        return 0
    except Exception as exc:
        db.rollback()
        print(f'ERRO ao inserir empresa: {exc}', file=sys.stderr)
        return 3
    finally:
        db.close()


if __name__ == '__main__':
    sys.exit(main())
