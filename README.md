# Code Companion AI

"Build a full-stack AI programming assistant that helps users debug code in multiple programming languages (JavaScript, Python, Java, C++, etc.). The chatbot should analyze code, identify syntax, runtime, and logic errors, explain the cause, and suggest fixes with corrected code. Store conversations, code snippets, and user feedback in a database so the system can learn from successful fixes and improve future recommendations. Include user authentication, chat history, search, and a simple dashboard showing common errors and improvement statistics. Design the architecture to support future AI model retraining using collected data, but ensure user consent, privacy controls, and data anonymization are built in. Generate the complete frontend, backend, database schema, API endpoints, and deployment configuration in one project."

## Stack (MERN)

- **MongoDB** + Mongoose: threads, messages, feedback, settings (`server/models.js`)
- **Express**: REST API and Gemini streaming (`server/`)
- **React**: the UI (`src/`, Vite + TanStack Router)
- **Node.js**: runs the server

## Run locally

Requirements: Node.js 20.19+ and either MongoDB Community Server (local) or a free MongoDB Atlas cluster.

```sh
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
```

Edit `.env`:

- `GOOGLE_GENERATIVE_AI_API_KEY`: get one at https://aistudio.google.com/apikey
- `MONGODB_URI`: local `mongodb://127.0.0.1:27017/debugsh`, or your Atlas string

```sh
npm run dev
```

Open http://localhost:8080 (React). The API runs on http://localhost:5000
(`/api/health` shows whether MongoDB is connected). No login is needed.

Production-style run: `npm run build` then `npm start`, then open http://localhost:5000.

The Gemini key stays on the server. Chats are separated per browser with an anonymous id,
which is not a security feature.

## Deploy on Vercel

The React app is built by Vite and the Express API runs as a Vercel function (`api/index.js`, routing in `vercel.json`).

1. Push the project to GitHub and import it in Vercel (framework preset: Vite).
2. In Vercel: Settings -> Environment Variables, add `GOOGLE_GENERATIVE_AI_API_KEY`, `MONGODB_URI` and `MONGODB_DB` (`debugsh`), then redeploy.
3. In MongoDB Atlas: Network Access -> allow `0.0.0.0/0` (Vercel has no fixed IP).
4. Check `https://YOUR-APP.vercel.app/api/health`.
