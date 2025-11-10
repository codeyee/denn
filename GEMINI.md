# Project Overview

This is a Next.js web application that serves as a media aggregator. It allows users to discover and track movies, TV shows, games, music, and books. The application features user authentication, personalized content feeds, and the ability to create and manage custom lists of media.

**Key Technologies:**

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **State Management:** Zustand
*   **Authentication:** JWT-based authentication with a backend API
*   **API Interaction:** The application fetches data from a backend API, which in turn aggregates data from external sources like TMDB, Spotify, IGDB, and Open Library.

**Architecture:**

The application follows a component-based architecture, with a clear separation of concerns between UI components, state management, and API interactions.

*   **`app/`:** Contains the main application logic, including pages, components, hooks, and stores.
*   **`lib/`:** Contains utility functions and the API client.
*   **`public/`:** Contains static assets like fonts and images.

# Building and Running

**1. Install Dependencies:**

```bash
npm install
```

**2. Run the Development Server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**3. Build for Production:**

```bash
npm run build
```

**4. Run in Production Mode:**

```bash
npm run start
```

**5. Linting:**

```bash
npm run lint
```

# Development Conventions

*   **Coding Style:** The project uses ESLint to enforce a consistent coding style.
*   **State Management:** Zustand is used for global state management. Stores are organized by feature (e.g., `auth-store`, `content-store`).
*   **API Interaction:** All API requests are handled by the `lib/api/api.ts` client, which provides a consistent interface for making authenticated and unauthenticated requests.
*   **Components:** Components are organized by feature and type (e.g., `cards`, `common`, `forms`, `layout`, `pages`).
*   **Authentication:** The `useAuth` hook provides a simple interface for accessing authentication state and performing authentication-related actions.
