from __future__ import annotations

import json
from pathlib import Path
from urllib.request import Request, urlopen

DATA_DIR = Path(__file__).resolve().parent / "app" / "data"

UF_LIST = [
    {"sigla": "AC", "nome": "Acre", "codigo_uf": 12},
    {"sigla": "AL", "nome": "Alagoas", "codigo_uf": 27},
    {"sigla": "AP", "nome": "Amapá", "codigo_uf": 16},
    {"sigla": "AM", "nome": "Amazonas", "codigo_uf": 13},
    {"sigla": "BA", "nome": "Bahia", "codigo_uf": 29},
    {"sigla": "CE", "nome": "Ceará", "codigo_uf": 23},
    {"sigla": "DF", "nome": "Distrito Federal", "codigo_uf": 53},
    {"sigla": "ES", "nome": "Espírito Santo", "codigo_uf": 32},
    {"sigla": "GO", "nome": "Goiás", "codigo_uf": 52},
    {"sigla": "MA", "nome": "Maranhão", "codigo_uf": 21},
    {"sigla": "MT", "nome": "Mato Grosso", "codigo_uf": 51},
    {"sigla": "MS", "nome": "Mato Grosso do Sul", "codigo_uf": 50},
    {"sigla": "MG", "nome": "Minas Gerais", "codigo_uf": 31},
    {"sigla": "PA", "nome": "Pará", "codigo_uf": 15},
    {"sigla": "PB", "nome": "Paraíba", "codigo_uf": 25},
    {"sigla": "PR", "nome": "Paraná", "codigo_uf": 41},
    {"sigla": "PE", "nome": "Pernambuco", "codigo_uf": 26},
    {"sigla": "PI", "nome": "Piauí", "codigo_uf": 22},
    {"sigla": "RJ", "nome": "Rio de Janeiro", "codigo_uf": 33},
    {"sigla": "RN", "nome": "Rio Grande do Norte", "codigo_uf": 24},
    {"sigla": "RS", "nome": "Rio Grande do Sul", "codigo_uf": 43},
    {"sigla": "RO", "nome": "Rondônia", "codigo_uf": 11},
    {"sigla": "RR", "nome": "Roraima", "codigo_uf": 14},
    {"sigla": "SC", "nome": "Santa Catarina", "codigo_uf": 42},
    {"sigla": "SP", "nome": "São Paulo", "codigo_uf": 35},
    {"sigla": "SE", "nome": "Sergipe", "codigo_uf": 28},
    {"sigla": "TO", "nome": "Tocantins", "codigo_uf": 17},
]

CODIGO_UF_PARA_SIGLA = {
    item["codigo_uf"]: item["sigla"]
    for item in UF_LIST
}

MUNICIPIOS_URL = "https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json"


def baixar_json(url: str):
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 Portal-Recrutamento/1.0",
            "Accept": "application/json",
        },
    )

    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8-sig"))


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    ufs_path = DATA_DIR / "ufs.json"
    municipios_path = DATA_DIR / "municipios.json"

    print("Gerando ufs.json...")

    ufs_json = [
        {
            "sigla": item["sigla"],
            "nome": item["nome"],
        }
        for item in UF_LIST
    ]

    ufs_path.write_text(
        json.dumps(ufs_json, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("Baixando municípios...")

    municipios_raw = baixar_json(MUNICIPIOS_URL)

    print(f"Total bruto recebido: {len(municipios_raw)}")

    if municipios_raw:
        print("Exemplo do primeiro item recebido:")
        print(municipios_raw[0])

    municipios_por_uf: dict[str, list[str]] = {}

    for item in municipios_raw:
        codigo_uf = item.get("codigo_uf")
        nome = str(item.get("nome", "")).strip()

        try:
            codigo_uf = int(codigo_uf)
        except (TypeError, ValueError):
            continue

        uf = CODIGO_UF_PARA_SIGLA.get(codigo_uf)

        if not uf or not nome:
            continue

        municipios_por_uf.setdefault(uf, []).append(nome)

    for uf in municipios_por_uf:
        municipios_por_uf[uf] = sorted(set(municipios_por_uf[uf]))

    municipios_path.write_text(
        json.dumps(municipios_por_uf, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    total = sum(len(cidades) for cidades in municipios_por_uf.values())

    print("Finalizado.")
    print(f"UFs salvas em: {ufs_path}")
    print(f"Municípios salvos em: {municipios_path}")
    print(f"Total de UFs no municipios.json: {len(municipios_por_uf)}")
    print(f"Total de municípios: {total}")


if __name__ == "__main__":
    main()