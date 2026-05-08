from __future__ import annotations

import logging
import mimetypes
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from html import escape
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailSendResult:
    status: str
    message: str | None = None


class EmailService:
    """Servico simples para envio de e-mail via SMTP."""

    def __init__(self) -> None:
        self.enabled = bool(settings.email_enabled)
        self.host = settings.email_host
        self.port = int(settings.email_port)
        self.user = settings.email_user
        self.password = settings.email_password
        self.from_email = settings.email_from or settings.email_user
        self.from_name = settings.email_from_name or "Ponte Talentos"
        self.use_ssl = bool(settings.email_use_ssl)
        self.use_tls = bool(settings.email_use_tls)
        self.timeout = int(settings.email_timeout_seconds or 30)

    def send_candidatura_confirmation(self, *, destinatario: str, nome: str, vaga: str) -> EmailSendResult:
        if not self.enabled:
            return EmailSendResult(status="DESABILITADO", message="EMAIL_ENABLED=false")

        missing = []
        if not self.host:
            missing.append("EMAIL_HOST")
        if not self.port:
            missing.append("EMAIL_PORT")
        if not self.user:
            missing.append("EMAIL_USER")
        if not self.password:
            missing.append("EMAIL_PASSWORD")
        if not self.from_email:
            missing.append("EMAIL_FROM")
        if missing:
            return EmailSendResult(status="ERRO", message="Configuracao ausente: " + ", ".join(missing))

        subject = f"Recebemos sua candidatura para a vaga de {vaga}"
        gif_path = self._get_email_gif_path()
        gif_cid = make_msgid(domain="encontra-talentos.local")[1:-1] if gif_path else None
        text_body = self._build_text_body(nome=nome, vaga=vaga)
        html_body = self._build_html_body(nome=nome, vaga=vaga, gif_cid=gif_cid)

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = formataddr((self.from_name, self.from_email))
        msg["To"] = destinatario
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")

        if gif_path and gif_cid:
            self._attach_inline_gif(msg=msg, gif_path=gif_path, gif_cid=gif_cid)

        try:
            if self.use_ssl:
                with smtplib.SMTP_SSL(self.host, self.port, timeout=self.timeout) as smtp:
                    smtp.login(self.user, self.password)
                    smtp.send_message(msg)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as smtp:
                    if self.use_tls:
                        smtp.starttls()
                    smtp.login(self.user, self.password)
                    smtp.send_message(msg)

            logger.info("E-mail de confirmacao enviado | destinatario=%s | vaga=%s", destinatario, vaga)
            return EmailSendResult(status="ENVIADO")
        except Exception as exc:
            logger.exception("Erro ao enviar e-mail de confirmacao | destinatario=%s", destinatario)
            return EmailSendResult(status="ERRO", message=str(exc))

    def _build_text_body(self, *, nome: str, vaga: str) -> str:
        return f"""Olá, {nome}!

Ficamos felizes em saber que você tem interesse em fazer parte da nossa equipe.

Recebemos sua candidatura para a vaga de {vaga}. Nosso time irá analisar seu currículo com atenção.

Assim que tivermos uma atualização, entraremos em contato por este e-mail.

Atenciosamente,
Equipe Encontra Talentos
"""

    def _build_html_body(self, *, nome: str, vaga: str, gif_cid: str | None = None) -> str:
        nome_safe = escape(nome)
        vaga_safe = escape(vaga)
        gif_html = ""
        if gif_cid:
            gif_html = f"""
            <p style="margin-top: 24px;">
              <img src="cid:{gif_cid}" alt="Encontra Talentos" style="max-width: 100%; width: 420px; height: auto; border: 0; display: block;" />
            </p>
            """

        return f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.5; font-size: 15px;">
            <p>Olá, <strong>{nome_safe}</strong>!</p>
            <p>Ficamos felizes em saber que você tem interesse em fazer parte da nossa equipe.</p>
            <p>Recebemos sua candidatura para a vaga de <strong>{vaga_safe}</strong>. Nosso time irá analisar seu currículo com atenção.</p>
            <p>Assim que tivermos uma atualização, entraremos em contato por este e-mail.</p>
            {gif_html}
            <p>Atenciosamente,<br><strong>Equipe Encontra Talentos</strong></p>
          </body>
        </html>
        """

    def _get_email_gif_path(self) -> Path | None:
        """Retorna o GIF do e-mail, caso ele exista.

        Para usar, salve seu GIF neste caminho:
        backend/app/static/email/email_gif.gif
        """
        path = Path(__file__).resolve().parents[1] / "static" / "email" / "email_gif.gif"
        if path.exists() and path.is_file():
            return path
        return None

    def _attach_inline_gif(self, *, msg: EmailMessage, gif_path: Path, gif_cid: str) -> None:
        maintype, subtype = (mimetypes.guess_type(gif_path.name)[0] or "image/gif").split("/", 1)
        with gif_path.open("rb") as file:
            gif_data = file.read()

        html_part = msg.get_payload()[1]
        html_part.add_related(
            gif_data,
            maintype=maintype,
            subtype=subtype,
            cid=f"<{gif_cid}>",
            filename=gif_path.name,
        )
