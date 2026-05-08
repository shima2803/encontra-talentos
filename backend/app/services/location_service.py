from __future__ import annotations

import json
import logging
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import HTTPException

logger = logging.getLogger(__name__)

IBGE_BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"


class LocationService:
    @staticmethod
    @lru_cache(maxsize=1)
    def list_ufs() -> list[dict[str, str]]:
        try:
            data = LocationService._fetch_json(f"{IBGE_BASE_URL}/estados?orderBy=nome")
            return [
                {
                    "sigla": str(item.get("sigla", "")).upper(),
                    "nome": str(item.get("nome", "")).strip(),
                }
                for item in data
                if item.get("sigla") and item.get("nome")
            ]
        except Exception as exc:
            logger.warning("Localidades | falha ao consultar UFs no IBGE, usando JSON local | erro=%s", exc)
            return LocationService._load_local_ufs()

    @staticmethod
    @lru_cache(maxsize=27)
    def list_municipios_by_uf(uf: str) -> list[dict[str, str]]:
        normalized_uf = uf.strip().upper()

        if not normalized_uf or len(normalized_uf) != 2:
            raise HTTPException(status_code=422, detail="Informe uma UF valida para buscar municipios.")

        try:
            data = LocationService._fetch_json(
                f"{IBGE_BASE_URL}/estados/{quote(normalized_uf)}/municipios?orderBy=nome"
            )
            return [
                {
                    "nome": str(item.get("nome", "")).strip(),
                    "uf": normalized_uf,
                }
                for item in data
                if item.get("nome")
            ]
        except Exception as exc:
            logger.warning(
                "Localidades | falha ao consultar municipios no IBGE, usando JSON local | uf=%s | erro=%s",
                normalized_uf,
                exc,
            )

            municipios_por_uf = LocationService._load_local_municipios()
            cidades = municipios_por_uf.get(normalized_uf, [])
            return [{"nome": nome, "uf": normalized_uf} for nome in cidades]

    @staticmethod
    def search_municipios(uf: str, query: str, *, limit: int = 20) -> list[dict[str, str]]:
        normalized_query = LocationService._normalize_search(query)

        if len(normalized_query) < 1:
            return []

        municipios = LocationService.list_municipios_by_uf(uf)

        return [
            municipio
            for municipio in municipios
            if LocationService._normalize_search(municipio["nome"]).startswith(normalized_query)
        ][:limit]

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_local_ufs() -> list[dict[str, str]]:
        path = DATA_DIR / "ufs.json"

        if not path.exists():
            logger.error("Arquivo local de UFs nao encontrado: %s", path)
            return []

        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_local_municipios() -> dict[str, list[str]]:
        path = DATA_DIR / "municipios.json"

        if not path.exists():
            logger.error("Arquivo local de municipios nao encontrado: %s", path)
            return {}

        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _normalize_search(value: str) -> str:
        return "".join(
            ch
            for ch in unicodedata.normalize("NFD", value.strip().lower())
            if unicodedata.category(ch) != "Mn"
        )

    @staticmethod
    def _fetch_json(url: str) -> Any:
        request = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 Portal-Recrutamento/1.0",
                "Accept": "application/json",
            },
        )

        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))