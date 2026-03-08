# 🎱 Bingo Pro: Mobile-First Gaming Platform

Bingo Pro is a high-performance, mobile-first web application for playing classic Bingo. It features real-time game simulations, a streamlined joining flow, and a premium aesthetic designed to "WOW" users.

## 🚀 Key Features

- **🎯 Unified Lobby**: A single-page experience for browsing games and selecting lucky cards.
- **⏱️ Auto-Join Logic**: Sticky countdown timers that automatically transition you from the lobby to the game when it's time to play.
- **👁️ Spectator Mode**: Missed the countdown? No problem. Watch games live with a premium spectator view until the next round starts.
- **🎰 Live Draw Simulation**: Fully automated Bingo drawing logic with letter-prefixed calls and real-time board updates.
- **🏆 Smart Notifications**: Differentiated win/loss experiences with auto-redirects back to the lobby after matches conclude.
- **📱 Ultra-Responsive**: Designed first for mobile screens, ensuring legibility and interactability on the go.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Components**: Radix UI primitives for modals and transitions.

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
  - `(player)/lobby`: The unified game selection area.
  - `(player)/game/[id]`: The live gaming arena.
- `components/`: Atomic UI components and feature-specific components (`game/`, `player/`).
- `stores/`: Zustand store for unified game state management.
- `mockup/`: Local JSON data simulating a backend API.
- `lib/`: Utility functions and helper scripts.

## ⚖️ License

Distributed under the MIT License. Developed by AntiGravity Game Engine.
