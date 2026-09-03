<!-- frontend  what the customer sees
backend  business logic + APIs + agent
docs  architecture/documentation
docker-compose.yml services we'll eventually run together

We're telling Docker:

"Give me a PostgreSQL 16 database called agentcart."

These are our database credentials for local development only
Database: agentcart
Username: agentcart
Password: agentcart_dev_password
Host: localhost
Port: 5432

⚠️ Later, production credentials will be completely different and stored securely.
Understand Docker here

This is important.

You are not installing PostgreSQL directly on your computer.
Your Computer
      │
      ▼
    Docker
      │
      ▼
┌─────────────────┐
│ PostgreSQL      │
│ Container       │
│                 │
│ agentcart DB    │
└─────────────────┘
Later:

Docker
├── PostgreSQL
├── Redis
├── Backend
└── maybe other services

That's why Docker is useful for a product-level application.


models   → database structure
schemas  → API input/output
services → business logic
api      → HTTP endpoints
core     → configuration
db       → database connection

 -->