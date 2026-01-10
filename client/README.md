# Web3 Blackjack Client (Vue 3 + Vite)

This is the frontend client for the Web3 Blackjack game, built with Vue 3, Pinia, and Tailwind CSS 4.

## Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher

## Getting Started

1. **Navigate to the client directory**:
   ```bash
   cd client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   The local server will start at `http://localhost:3000`.

## Features
- **Vue 3 (Composition API)**: Modern, reactive UI components.
- **Pinia**: Centralized state management for game logic (hands, scores, bets).
- **Tailwind CSS 4**: Optimized utility-first styling with high performance.
- **Vite**: Ultra-fast development server and build tool.

## Build for Production
To generate optimized static files for deployment (e.g., to Nginx):
```bash
npm run build
```
The output will be in the `/dist` folder.

## Project Structure
- `src/components/`: Reusable Vue components (Card, Board, Controls, Hand).
- `src/store/`: Pinia store containing core game logic and state.
- `src/style.css`: Global styles and Tailwind directives.
- `public/`: Static assets like character avatars.
