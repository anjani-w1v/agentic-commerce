# AgentCart — AI-Powered Agentic Commerce

Razorpay Track 01 — AI Growth & Agentic Commerce

AgentCart is an AI-powered conversational shopping platform that allows customers to discover products, get recommendations, manage their cart and orders, and complete secure Razorpay payments using text, voice, and Hinglish.

## 🚀 Live Demo

Frontend: https://agentic-commerce-three.vercel.app/

Backend API: https://agentic-commerce-backend1.onrender.com/

API Docs: https://agentic-commerce-backend1.onrender.com/docs

## ✨ Key Features

- AI-powered conversational shopping
- Text, voice and Hinglish interaction
- AI product search and recommendations
- Multi-product cart management
- Checkout with Razorpay Test Mode
- Order history and management
- Merchant revenue-growth campaigns
- Revenue recovery workflows
- Bounded and explainable money actions
- Audit trail for agent actions
- Merchant dashboard

## 🛠 Tech Stack

**Frontend:** Next.js, React, TypeScript, Tailwind CSS  
**Backend:** FastAPI, Python, SQLAlchemy  
**Database:** PostgreSQL  
**AI:** Google Gemini API  
**Payments:** Razorpay Test Mode  
**Deployment:** Vercel + Render

## 🏗 Architecture

Customer → Next.js Frontend → FastAPI Backend → Gemini AI → PostgreSQL → Razorpay

Merchant → Merchant Dashboard → Growth / Recovery / Audit workflows



Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
💻 Run Locally

Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

Frontend
cd frontend
npm install
npm run dev

Open:
http://localhost:3000

💳 Demo Flow
Ask AgentCart for a product.
Get AI recommendations.
Add products to cart.
Add/select an address.
Checkout using Razorpay Test Mode.
Complete the test payment.
View the order in the Merchant Dashboard.
Review the agent action in the Audit Trail.

🔐 Safety
Money-related actions are designed to be bounded, explainable and gated. Payment operations use Razorpay Test Mode, and important agent actions are recorded in an audit trail.

📌 Build Challenges
The main challenges were AI-commerce integration, conversational context, payment safety, and production deployment. These were addressed using structured AI intents, session-based memory, bounded payment actions, PostgreSQL, and deployment through Vercel and Render.



