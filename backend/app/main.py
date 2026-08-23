from fastapi import FastAPI

app = FastAPI(title="Agentic Commerce API")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "agentic-commerce-api"
    }