"""
Dashboard de metricas para o portal RH.
Todas as queries sao filtradas por id_empresa - cada empresa so ve dados
das vagas dela.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def _scalar_decimal(db: Session, sql: str, params: dict) -> Optional[Decimal]:
    val = db.execute(text(sql), params).scalar()
    return Decimal(str(val)) if val is not None else None


def get_kpis(db: Session, id_empresa: int) -> dict:
    params = {'id_empresa': id_empresa}

    total_candidaturas = db.execute(
        text(
            'SELECT COUNT(*) FROM public.candidatura cd '
            'JOIN public.vaga v ON v.id_vaga = cd.id_vaga '
            'WHERE v.id_empresa = :id_empresa'
        ),
        params,
    ).scalar() or 0

    total_vagas_abertas = db.execute(
        text(
            "SELECT COUNT(*) FROM public.vaga "
            "WHERE id_empresa = :id_empresa AND status_vaga = 'ABERTA'"
        ),
        params,
    ).scalar() or 0

    score_medio = _scalar_decimal(
        db,
        'SELECT AVG(a.score_aderencia) FROM public.analise_ia_candidatura a '
        'JOIN public.candidatura cd ON cd.id_candidatura = a.id_candidatura '
        'JOIN public.vaga v ON v.id_vaga = cd.id_vaga '
        'WHERE v.id_empresa = :id_empresa',
        params,
    )

    candidatos_alto_score = db.execute(
        text(
            'SELECT COUNT(*) FROM public.analise_ia_candidatura a '
            'JOIN public.candidatura cd ON cd.id_candidatura = a.id_candidatura '
            'JOIN public.vaga v ON v.id_vaga = cd.id_vaga '
            'WHERE v.id_empresa = :id_empresa AND a.score_aderencia >= 80'
        ),
        params,
    ).scalar() or 0

    media_salarial_total = _scalar_decimal(
        db,
        'SELECT AVG(c.pretensao_salarial) FROM public.candidato c '
        'JOIN public.candidatura cd ON cd.id_candidato = c.id_candidato '
        'JOIN public.vaga v ON v.id_vaga = cd.id_vaga '
        'WHERE v.id_empresa = :id_empresa AND c.pretensao_salarial IS NOT NULL',
        params,
    )

    candidatos_abaixo_media = 0
    if media_salarial_total is not None:
        candidatos_abaixo_media = db.execute(
            text(
                'SELECT COUNT(*) FROM public.candidato c '
                'JOIN public.candidatura cd ON cd.id_candidato = c.id_candidato '
                'JOIN public.vaga v ON v.id_vaga = cd.id_vaga '
                'WHERE v.id_empresa = :id_empresa '
                '  AND c.pretensao_salarial IS NOT NULL '
                '  AND c.pretensao_salarial < :media'
            ),
            {**params, 'media': media_salarial_total},
        ).scalar() or 0

    return {
        'total_candidaturas': int(total_candidaturas),
        'total_vagas_abertas': int(total_vagas_abertas),
        'score_medio': score_medio,
        'candidatos_alto_score': int(candidatos_alto_score),
        'media_salarial_total': media_salarial_total,
        'candidatos_abaixo_media_salarial': int(candidatos_abaixo_media),
    }


def get_funil_aderencia(db: Session, id_empresa: int) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT "
            "  CASE "
            "    WHEN a.score_aderencia >= 80 THEN 'Entre 80 e 100' "
            "    WHEN a.score_aderencia >= 60 THEN 'Entre 60 e 79' "
            "    ELSE 'Abaixo de 60' "
            "  END AS faixa, "
            "  COUNT(*) AS total "
            "FROM public.analise_ia_candidatura a "
            "JOIN public.candidatura cd ON cd.id_candidatura = a.id_candidatura "
            "JOIN public.vaga v ON v.id_vaga = cd.id_vaga "
            "WHERE v.id_empresa = :id_empresa "
            "  AND a.score_aderencia IS NOT NULL "
            "GROUP BY 1"
        ),
        {'id_empresa': id_empresa},
    ).mappings().all()

    # Garante ordem fixa, mesmo que alguma faixa nao tenha dados
    by_faixa = {r['faixa']: int(r['total']) for r in rows}
    ordem = ['Entre 80 e 100', 'Entre 60 e 79', 'Abaixo de 60']
    return [{'faixa': f, 'total': by_faixa.get(f, 0)} for f in ordem]


def get_media_salarial_por_vaga(db: Session, id_empresa: int) -> list[dict]:
    rows = db.execute(
        text(
            'SELECT v.id_vaga, v.titulo_vaga, '
            '       AVG(c.pretensao_salarial) AS media_salarial, '
            '       COUNT(cd.id_candidatura) AS total_candidaturas '
            '  FROM public.vaga v '
            '  LEFT JOIN public.candidatura cd ON cd.id_vaga = v.id_vaga '
            '  LEFT JOIN public.candidato c ON c.id_candidato = cd.id_candidato '
            ' WHERE v.id_empresa = :id_empresa '
            ' GROUP BY v.id_vaga, v.titulo_vaga '
            ' ORDER BY media_salarial DESC NULLS LAST'
        ),
        {'id_empresa': id_empresa},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_top_candidatos(db: Session, id_empresa: int, limit: int = 15) -> list[dict]:
    rows = db.execute(
        text(
            'SELECT cd.id_candidatura, c.nome_completo, v.titulo_vaga, '
            '       a.score_aderencia '
            '  FROM public.candidatura cd '
            '  JOIN public.candidato c ON c.id_candidato = cd.id_candidato '
            '  JOIN public.vaga v ON v.id_vaga = cd.id_vaga '
            '  LEFT JOIN public.analise_ia_candidatura a ON a.id_candidatura = cd.id_candidatura '
            ' WHERE v.id_empresa = :id_empresa '
            ' ORDER BY a.score_aderencia DESC NULLS LAST, cd.data_candidatura DESC '
            ' LIMIT :limit'
        ),
        {'id_empresa': id_empresa, 'limit': limit},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_score_vs_pretensao(db: Session, id_empresa: int) -> list[dict]:
    rows = db.execute(
        text(
            'SELECT v.titulo_vaga, c.pretensao_salarial, a.score_aderencia '
            '  FROM public.candidatura cd '
            '  JOIN public.candidato c ON c.id_candidato = cd.id_candidato '
            '  JOIN public.vaga v ON v.id_vaga = cd.id_vaga '
            '  LEFT JOIN public.analise_ia_candidatura a ON a.id_candidatura = cd.id_candidatura '
            ' WHERE v.id_empresa = :id_empresa '
            '   AND c.pretensao_salarial IS NOT NULL '
            '   AND a.score_aderencia IS NOT NULL'
        ),
        {'id_empresa': id_empresa},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_full_dashboard(db: Session, id_empresa: int) -> dict:
    return {
        'kpis': get_kpis(db, id_empresa),
        'funil_aderencia': get_funil_aderencia(db, id_empresa),
        'media_salarial_por_vaga': get_media_salarial_por_vaga(db, id_empresa),
        'top_candidatos': get_top_candidatos(db, id_empresa),
        'score_vs_pretensao': get_score_vs_pretensao(db, id_empresa),
    }
