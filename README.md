# Intelligensi.ai Video Lab Filmmaker

Intelligensi.ai Video Lab Filmmaker is a browser-based filmmaking workspace for developing a short film from story brief through scripted scenes, shot planning, take management, timeline playback, sound effects, and export. The app opens with a sample project and stores projects locally in the browser.

## Key Features

- Project management for creating, renaming, duplicating, selecting, deleting, and auto-saving film projects.
- Story brief workflow with an Assistant Director proposal flow. When `GEMINI_API_KEY` is configured, the server calls Gemini for structured proposals; otherwise the client falls back to a deterministic local adapter.
- Script editor for scenes, action, dialogue, pauses, shot lists, shot durations, camera movement, lighting notes, and scene summaries.
- Character and location panels for managing project cast and places.
- Clip library and media bins for uploaded video, image, and audio assets, with assignment to shots or timeline append.
- Take management for uploaded takes and locally generated demo takes.
- Local demo video runtime that creates deterministic storyboard/animatic still takes in the browser without a paid video generation backend.
- Generation queue drawer for tracking take generation status.
- Timeline and preview playback with selected-shot syncing, loop controls, playback speed, in/out points, and frame stepping.
- Table read mode using the browser Speech Synthesis API for script playback.
- Procedural cinematic sound effect presets and shot-level SFX placement.
- Export modal backed by browser canvas, Web Audio, and MediaRecorder for movie cuts and still screenshots, with social/cinema presets and optional dialogue or timecode burn-ins.
- Runtime capabilities view showing the local demo runtime, a Deploy Studio stub, and unavailable preview runtime declarations.

## Architecture

The application is a React single-page app served by an Express development server with Vite middleware.

- `server.ts` starts the Express server on port `3000`, loads `.env`, exposes `/api/health`, exposes `/api/assistant-director/propose`, and mounts Vite in middleware mode.
- `src/App.tsx` coordinates project state, persistence, project editing workflows, Assistant Director proposals, media library actions, take generation, playback state, and modal/drawer state.
- `src/components/` contains the major UI areas: script, characters, locations, media library, player, timeline, export, queue, runtime capabilities, table read, and project header.
- `src/services/storage/projectStorage.ts` persists projects and media blobs in IndexedDB, with localStorage fallbacks and active-project tracking.
- `src/services/assistantDirector/` contains the Gemini-backed adapter and deterministic local fallback.
- `src/services/runtimes/` registers video generation runtimes. The verified available runtime is `local_demo_engine`.
- `src/services/media/` handles video metadata extraction and movie/still export.
- `src/services/audio/` and `src/services/speech/` provide generated SFX, waveform helpers, and table read playback.
- `src/types/film.ts` defines the shared project, scene, shot, take, media, runtime, and export types.

## Technology Stack

- React 19 and React DOM
- TypeScript
- Vite 8 with `@vitejs/plugin-react`
- Express 4 server wrapper
- Tailwind CSS 4 via `@tailwindcss/vite`
- Google GenAI SDK (`@google/genai`) for optional Assistant Director proposals
- Lucide React icons
- Motion
- Browser APIs: IndexedDB, localStorage, Canvas, MediaRecorder, Web Audio, Speech Synthesis, and object URLs

## Local Development

Install dependencies:

```bash
npm install
```

Optional: create a local environment file if you want Gemini-backed Assistant Director proposals.

```bash
cp .env.example .env
```

Then replace the placeholder `GEMINI_API_KEY` value in `.env`. Without a real key, the app still runs and uses the deterministic local Assistant Director fallback.

Run the development server:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

## Available Scripts

The repository defines these npm scripts:

- `npm run dev` - starts `tsx server.ts`.
- `npm run start` - starts `tsx server.ts`.
- `npm run build` - runs `vite build`.
- `npm run preview` - runs `vite preview`.
- `npm run lint` - runs `tsc --noEmit`.
- `npm run clean` - removes `dist` and `server.js`.

## Notes

- Project data is local to the browser by default.
- The local demo runtime generates stylized animatic still takes, not production video model output.
- The server listens on port `3000`.
