from pydantic import BaseModel


class SkillResponse(BaseModel):
    id: int
    nome: str
