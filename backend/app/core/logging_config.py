from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging() -> Path:
    log_dir = Path(__file__).resolve().parents[2] / 'logs'
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / 'app.log'

    formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(name)s | %(message)s')
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    if not any(isinstance(h, RotatingFileHandler) and getattr(h, 'baseFilename', '') == str(log_file) for h in root_logger.handlers):
        fh = RotatingFileHandler(log_file, maxBytes=2_000_000, backupCount=3, encoding='utf-8')
        fh.setFormatter(formatter)
        root_logger.addHandler(fh)

    if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
        sh = logging.StreamHandler()
        sh.setFormatter(formatter)
        root_logger.addHandler(sh)

    return log_file
