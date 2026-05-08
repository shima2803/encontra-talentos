"""Operacoes de banco para o portal RH (vagas, skills da vaga, candidatos)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session


VALID_STATUS = {'ABERTA', 'INATIVA', 'PAUSADA', 'FECHADA'}
VALID_PERIODICIDADE = {'MENSAL', 'HORA', 'ANUAL'}
VALID_TIPO_CONTRATO = {'CLT', 'PJ', 'ESTAGIO', 'JOVEM_APRENDIZ', 'CORPORATE'}
VALID_MODELO_TRABALHO = {'PRESENCIAL', 'HIBRIDO', 'ONLINE'}


def _validate_status(status_vaga: Optional[str]) -> None:
    if status_vaga is not None and status_vaga not in VALID_STATUS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'status_vaga invalido. Valores permitidos: {sorted(VALID_STATUS)}',
        )


def _validate_periodicidade(p: Optional[str]) -> None:
    if p is not None and p not in VALID_PERIODICIDADE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'salario_periodicidade invalido. Valores permitidos: {sorted(VALID_PERIODICIDADE)}',
        )


def _ensure_owner(db: Session, id_vaga: int, id_empresa: int) -> dict:
    row = db.execute(
        text(
            'SELECT id_vaga, id_empresa, status_vaga FROM public.vaga '
            'WHERE id_vaga = :id_vaga LIMIT 1'
        ),
        {'id_vaga': id_vaga},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Vaga nao encontrada')
    if row['id_empresa'] != id_empresa:
        # Mensagem propositalmente generica - nao revela existencia da vaga de outra empresa
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Vaga nao encontrada')
    return dict(row)


def _fetch_skills_for_vaga(db: Session, id_vaga: int) -> list[dict]:
    rows = db.execute(
        text(
            'SELECT s.id_skill, s.nome_skill '
            'FROM public.vaga_skill vs '
            'JOIN public.skill s ON s.id_skill = vs.id_skill '
            'WHERE vs.id_vaga = :id_vaga '
            'ORDER BY s.nome_skill'
        ),
        {'id_vaga': id_vaga},
    ).mappings().all()
    return [dict(r) for r in rows]


def _validate_skill_ids(db: Session, skill_ids: list[int]) -> None:
    if not skill_ids:
        return
    unique_ids = list({int(s) for s in skill_ids})
    stmt = text('SELECT id_skill FROM public.skill WHERE id_skill IN :ids').bindparams(
        bindparam('ids', expanding=True)
    )
    rows = db.execute(stmt, {'ids': unique_ids}).all()
    found = {int(r[0]) for r in rows}
    missing = set(unique_ids) - found
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Skills inexistentes: {sorted(missing)}',
        )


def _replace_vaga_skills(db: Session, id_vaga: int, skill_ids: list[int]) -> None:
    db.execute(text('DELETE FROM public.vaga_skill WHERE id_vaga = :id_vaga'), {'id_vaga': id_vaga})
    if not skill_ids:
        return
    unique_ids = list({int(s) for s in skill_ids})
    stmt = text('INSERT INTO public.vaga_skill (id_vaga, id_skill) VALUES (:id_vaga, :id_skill)')
    for sid in unique_ids:
        db.execute(stmt, {'id_vaga': id_vaga, 'id_skill': sid})


def list_vagas_by_empresa(db: Session, id_empresa: int) -> list[dict]:
    rows = db.execute(
        text(
            'SELECT v.id_vaga, v.titulo_vaga, v.area, v.nivel, v.descricao, v.status_vaga, '
            '       v.data_publicacao, v.salario_min AS salario, '
            '       v.salario_periodicidade, v.moeda, '
            '       v.tipo_contrato, v.modelo_trabalho, '
            '       v.localidade_cidade, v.localidade_estado, '
            '       (SELECT COUNT(*) FROM public.candidatura c WHERE c.id_vaga = v.id_vaga) '
            '         AS total_candidaturas '
            '  FROM public.vaga v '
            ' WHERE v.id_empresa = :id_empresa '
            ' ORDER BY v.data_publicacao DESC NULLS LAST, v.id_vaga DESC'
        ),
        {'id_empresa': id_empresa},
    ).mappings().all()

    out = []
    for r in rows:
        d = dict(r)
        d['skills'] = _fetch_skills_for_vaga(db, int(d['id_vaga']))
        out.append(d)
    return out


def get_vaga_full(db: Session, id_vaga: int, id_empresa: int) -> dict:
    _ensure_owner(db, id_vaga, id_empresa)
    row = db.execute(
        text(
            'SELECT v.id_vaga, v.titulo_vaga, v.area, v.nivel, v.descricao, v.status_vaga, '
            '       v.data_publicacao, v.salario_min AS salario, '
            '       v.salario_periodicidade, v.moeda, '
            '       v.tipo_contrato, v.modelo_trabalho, '
            '       v.localidade_cidade, v.localidade_estado, '
            '       (SELECT COUNT(*) FROM public.candidatura c WHERE c.id_vaga = v.id_vaga) '
            '         AS total_candidaturas '
            '  FROM public.vaga v WHERE v.id_vaga = :id_vaga'
        ),
        {'id_vaga': id_vaga},
    ).mappings().first()
    d = dict(row)
    d['skills'] = _fetch_skills_for_vaga(db, id_vaga)
    return d


def create_vaga(db: Session, id_empresa: int, payload: dict[str, Any]) -> dict:
    _validate_periodicidade(payload.get('salario_periodicidade'))
    skill_ids: list[int] = payload.get('skill_ids') or []
    _validate_skill_ids(db, skill_ids)

    now = datetime.now(timezone.utc)
    inserted = db.execute(
        text(
            'INSERT INTO public.vaga '
            '(id_empresa, titulo_vaga, area, nivel, descricao, status_vaga, '
            ' data_publicacao, salario_min, salario_max, salario_periodicidade, moeda, '
            ' tipo_contrato, modelo_trabalho, localidade_cidade, localidade_estado) '
            'VALUES (:id_empresa, :titulo, :area, :nivel, :descricao, :status, '
            '        :data_pub, :salario, NULL, :sper, :moeda, '
            '        :tipo_contrato, :modelo_trabalho, :loc_cidade, :loc_estado) '
            'RETURNING id_vaga'
        ),
        {
            'id_empresa': id_empresa,
            'titulo': payload['titulo_vaga'],
            'area': payload.get('area'),
            'nivel': payload.get('nivel'),
            'descricao': payload.get('descricao'),
            'status': 'ABERTA',
            'data_pub': now,
            'salario': payload.get('salario'),
            'sper': payload.get('salario_periodicidade') or 'MENSAL',
            'moeda': payload.get('moeda') or 'BRL',
            'tipo_contrato': payload.get('tipo_contrato'),
            'modelo_trabalho': payload.get('modelo_trabalho'),
            'loc_cidade': payload.get('localidade_cidade'),
            'loc_estado': (payload.get('localidade_estado') or '').upper() or None,
        },
    ).scalar_one()

    _replace_vaga_skills(db, int(inserted), skill_ids)
    db.commit()
    return get_vaga_full(db, int(inserted), id_empresa)


def update_vaga(db: Session, id_vaga: int, id_empresa: int, payload: dict[str, Any]) -> dict:
    _ensure_owner(db, id_vaga, id_empresa)
    _validate_status(payload.get('status_vaga'))
    _validate_periodicidade(payload.get('salario_periodicidade'))

    if 'skill_ids' in payload and payload['skill_ids'] is not None:
        _validate_skill_ids(db, payload['skill_ids'])

    # `salario` (campo unico exposto pela API) -> persiste em `salario_min`.
    # Sempre que o cliente toca em salario, zeramos salario_max para nao
    # carregar lixo de vagas legadas que usavam range.
    if 'salario' in payload:
        payload = {**payload, 'salario_min': payload.get('salario'), 'salario_max': None}
        payload.pop('salario', None)

    settable = {
        'titulo_vaga', 'area', 'nivel', 'descricao', 'status_vaga',
        'salario_min', 'salario_max', 'salario_periodicidade', 'moeda',
        'tipo_contrato', 'modelo_trabalho', 'localidade_cidade', 'localidade_estado',
    }
    sets = []
    params: dict[str, Any] = {'id_vaga': id_vaga}
    # `salario_max` precisa permitir NULL explicito (limpar range legado)
    nullable_keys = {'salario_max'}
    for key, value in payload.items():
        if key not in settable:
            continue
        if value is None and key not in nullable_keys:
            continue
        sets.append(f'{key} = :{key}')
        params[key] = value

    if sets:
        db.execute(
            text(f'UPDATE public.vaga SET {", ".join(sets)} WHERE id_vaga = :id_vaga'),
            params,
        )

    if 'skill_ids' in payload and payload['skill_ids'] is not None:
        _replace_vaga_skills(db, id_vaga, payload['skill_ids'])

    db.commit()
    return get_vaga_full(db, id_vaga, id_empresa)


def soft_delete_vaga(db: Session, id_vaga: int, id_empresa: int) -> None:
    _ensure_owner(db, id_vaga, id_empresa)
    db.execute(
        text("UPDATE public.vaga SET status_vaga = 'INATIVA' WHERE id_vaga = :id_vaga"),
        {'id_vaga': id_vaga},
    )
    db.commit()


def list_candidatos_da_vaga(db: Session, id_vaga: int, id_empresa: int) -> list[dict]:
    _ensure_owner(db, id_vaga, id_empresa)

    # NOTA LGPD: dados pessoais (nome, email, telefone) sao retornados aqui
    # apenas para a empresa dona da vaga. Filtro por id_empresa via _ensure_owner.
    rows = db.execute(
        text(
            'SELECT cd.id_candidatura, c.id_candidato, c.nome_completo, '
            '       c.data_nascimento, c.cidade, c.estado, c.pretensao_salarial, '
            '       cd.status_candidatura, cd.data_candidatura, '
            '       a.score_aderencia, a.resumo_ia, a.parecer_ia, '
            '       (SELECT email FROM public.candidato_email '
            '          WHERE id_candidato = c.id_candidato '
            '          ORDER BY is_principal DESC NULLS LAST, data_cadastro ASC LIMIT 1) AS email, '
            '       (SELECT ddd FROM public.candidato_telefone '
            '          WHERE id_candidato = c.id_candidato '
            '          ORDER BY is_principal DESC NULLS LAST, data_cadastro ASC LIMIT 1) AS ddd, '
            '       (SELECT numero FROM public.candidato_telefone '
            '          WHERE id_candidato = c.id_candidato '
            '          ORDER BY is_principal DESC NULLS LAST, data_cadastro ASC LIMIT 1) AS telefone '
            '  FROM public.candidatura cd '
            '  JOIN public.candidato c ON c.id_candidato = cd.id_candidato '
            '  LEFT JOIN public.analise_ia_candidatura a ON a.id_candidatura = cd.id_candidatura '
            ' WHERE cd.id_vaga = :id_vaga '
            ' ORDER BY a.score_aderencia DESC NULLS LAST, cd.data_candidatura DESC'
        ),
        {'id_vaga': id_vaga},
    ).mappings().all()
    return [dict(r) for r in rows]
