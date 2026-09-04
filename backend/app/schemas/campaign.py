from pydantic import BaseModel, Field


class CampaignExecuteRequest(BaseModel):
    session_id: str
    target: str
    campaign_type: str
    discount_percent: float = Field(
        default=10,
        ge=0,
    )
    confirmed: bool = False


class CampaignExecuteResponse(BaseModel):
    status: str
    campaign_id: str
    target: str
    campaign_type: str
    discount_percent: float
    message: str
