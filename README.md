# Smart Legal Advisor — Egyptian Labor Law (المستشار القانوني الذكي)

An Arabic web assistant that answers questions about Egyptian Labor Law 14/2025 and its ministerial decisions, by text or by live voice call. Answers are grounded by a hybrid retrieval engine that runs entirely in the browser, then phrased by Gemini.

> Prototype. It is not an official service and its answers are not legal advice.

## Features

- **Arabic chat** with structured legal answers: the rule, the article it comes from, and the practical next step
- **Voice call mode** — speak a question, hear the answer (speech recognition + Arabic text-to-speech)
- **Hybrid RAG, client-side** — no vector database or backend needed for retrieval
- **RAG inspector and lab** — see which chunks were retrieved, their scores, and tune the weights live
- **Model fallback chain** with retry and backoff when a Gemini model is overloaded

## Retrieval pipeline

```
question
   │
   ├─► Arabic normalization + tokenization        services/rag/arabicNormalizer.ts
   ├─► BM25 (k1 = 1.25, b = 0.75)                 services/rag/bm25.ts
   ├─► local semantic embeddings + cosine         services/rag/embeddings.ts
   │
   ├─► weighted fusion (0.45 BM25 / 0.55 semantic)
   ├─► metadata boosting (article numbers, topics) services/rag/metadataBooster.ts
   └─► reranking + confidence threshold            services/rag/reranker.ts
                    │
            top chunks → Gemini → cited answer
```

The corpus lives in `services/rag/dataset.ts`; `services/rag/hybridEngine.ts` ties the steps together.

## Run locally

Requires Node.js 20+.

```bash
npm install
echo "GEMINI_API_KEY=your_key" > .env.local
npm run dev
```

Open <http://localhost:3000>. Voice mode needs microphone permission.

## Project layout

```
App.tsx, index.tsx          app shell
components/
  ChatView.tsx              chat UI
  VoiceCallModal.tsx        live voice call
  HybridRagInspector.tsx    retrieved chunks and scores
  HybridRagLabModal.tsx     tune retrieval weights
  LegalMessageRenderer.tsx  formatted legal answers
services/
  geminiService.ts          Gemini calls, model fallback, prompts
  speechService.ts          speech recognition and Arabic TTS
  rag/                      hybrid retrieval engine
```

## Stack

React 19 · TypeScript · Vite · Google Gemini (`@google/genai`) · Web Speech API

## Related

[labor-law-chatbot](https://github.com/MahmoudElnahal/labor-law-chatbot) — the Python version: FastAPI RAG service over the full law text, with a retrieval evaluation set.

## Author

[Mahmoud El Nahal](https://github.com/MahmoudElnahal)
