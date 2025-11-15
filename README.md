# 🎬 Denn Web

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)

A modern, feature-rich frontend for managing and discovering multi-media content. Browse, organize, and track movies, TV shows, music, games, and books all in one beautiful interface.

---

## 🚀 Features

### Current Features
- **🔍 Universal Search:** Search across movies, TV shows, games, music, and books with a unified interface
- **🎯 Content Discovery:** Browse and discover content from multiple sources (TMDB, IGDB, Spotify, OpenLibrary)
- **📋 Custom Lists:** Create, organize, and manage personalized collections of your favorite content
- **⭐ Rating System:** Rate content and track your preferences
- **👤 User Authentication:** Secure login and registration with JWT token management
- **📱 Responsive Design:** Fully responsive interface with custom breakpoints (3xl to 15xl)
- **🌙 Dark Mode:** Beautiful dark mode support with next-themes
- **✨ Smooth Animations:** GSAP and Motion animations for enhanced user experience
- **🔄 State Persistence:** User preferences and auth state persisted across sessions

### Coming Soon
- **💬 Social Features:** Comments and social interactions
- **📊 Statistics & Analytics:** Track your viewing/playing/reading habits
- **🔔 Notifications:** Stay updated with new releases and updates
- **🎮 Advanced Filtering:** More granular content filtering options
- **📤 List Sharing:** Share your collections with friends

---

## 🛠️ Tech Stack

### Core Framework
- **Next.js 16.0.0** with App Router
- **React 19.2.0** with latest features
- **TypeScript 5** with strict mode enabled

### Styling & UI
- **Tailwind CSS v4** with custom configuration
- **Radix UI** primitives for accessible components
- **next-themes** for dark mode support
- **class-variance-authority** for component variants
- **lucide-react** for icons

### State Management
- **Zustand 5** with localStorage persistence
- Five specialized stores:
  - `auth-store` - Authentication and user state
  - `content-store` - Content data (movies, TV, games, music, books)
  - `lists-store` - User lists management
  - `ui-store` - UI state (modals, dropdowns)
  - `settings-store` - User preferences

### Animations
- **GSAP 3** for advanced animations
- **Motion** (framer-motion successor) for smooth transitions
- **@use-gesture/react** for gesture interactions

### Forms & Validation
- **React Hook Form** for form management
- **Zod 4** for schema validation
- **@hookform/resolvers** for seamless integration

### Additional Libraries
- **@dnd-kit** for drag-and-drop functionality
- **react-intersection-observer** for lazy loading
- **js-cookie** for cookie management

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun
- Access to [Denn API](https://github.com/CodeYee/denn-api) (backend)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/CodeYee/denn-web.git
cd denn-web
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. **Set up environment variables**

Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production:
```env
NEXT_PUBLIC_API_URL=https://denn.up.railway.app/api
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

5. **Build for production**
```bash
npm run build
npm run start
```

---

## 📖 Project Structure

```
denn-web/
├── app/
│   ├── _components/           # React components
│   │   ├── cards/            # Card components (ContentCard, ListCard, etc.)
│   │   ├── common/           # Shared components (Modal, Carousel, etc.)
│   │   ├── forms/            # Form components (LoginForm, RegisterForm)
│   │   ├── layout/           # Layout components (Navbar, Footer)
│   │   ├── lib/              # UI library components and animations
│   │   └── pages/            # Page-specific components
│   ├── _hooks/               # Custom React hooks
│   ├── _providers/           # Context providers
│   ├── _stores/              # Zustand stores
│   ├── api/                  # API route handlers
│   └── [routes]/             # Next.js file-based routing
├── lib/
│   ├── api/                  # API client and actions
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── public/                   # Static assets
├── CLAUDE.md                 # Development guidelines
├── GUIDELINES.md             # Code quality standards
└── next.config.ts            # Next.js configuration
```

---

## 🎨 Architecture

### Routing
The application uses Next.js App Router with the following key routes:

- `/` - Landing page
- `/search` - Universal content search
- `/content` - Content detail page (with query params)
- `/lists/[id]` - List detail page
- `/profile` - User profile
- `/login`, `/register` - Authentication pages

Protected routes use the `ProtectedRoute` wrapper component for authentication.

### State Management

Five specialized Zustand stores handle different aspects of the application:

1. **auth-store.ts** - Authentication state
   - User data and JWT tokens
   - Login/register/logout actions
   - Persistent localStorage sync

2. **content-store.ts** - Content data
   - Movies, TV shows, games, music, books
   - Content metadata and external API tracking

3. **lists-store.ts** - User lists
   - List CRUD operations
   - List membership management

4. **ui-store.ts** - UI state
   - Modal and dropdown states
   - Loading indicators

5. **settings-store.ts** - User preferences
   - Theme settings
   - Display preferences

### API Integration

The application communicates with the backend through a centralized API client:

- **apiRequest()** function in `lib/api/api.ts`
- Automatic JWT token refresh on 401 responses
- Singleton pattern for token refresh to prevent race conditions
- Support for authenticated and public endpoints

**useApi Hook** (`app/_hooks/useApi.ts`):
```typescript
const { data, loading, error, get, post, put, delete } = useApi()
```

### Content Types

Supports five content types with source-specific metadata:

- **Movies** - TMDB integration
- **TV Shows** - TMDB integration with episode tracking
- **Games** - IGDB integration
- **Music Albums** - Spotify integration
- **Books** - OpenLibrary integration

---

## 🎯 Code Quality

This project follows strict code quality standards. See [GUIDELINES.md](./GUIDELINES.md) for detailed standards including:

- **Component Size Limits:** <200 lines per component
- **SOLID Principles:** Enforced across all components
- **DRY Enforcement:** Zero tolerance for code duplication
- **TypeScript Strict Mode:** Full type safety
- **File Organization:** Structured component architecture
- **Testing Requirements:** Component and integration tests

### Key Principles

- Components are broken down into focused, single-responsibility units
- Custom hooks extract complex logic from UI components
- Utility functions are pure and reusable
- All components follow the established architecture pattern

See `app/_components/pages/ListDetailPage` for a reference implementation.

---

## 🎨 Styling System

### Tailwind CSS v4

Custom configuration with extended breakpoints:
```typescript
3xl: 112rem   // 1792px
4xl: 128rem   // 2048px
5xl: 144rem   // 2304px
// ... up to 15xl
```

### Theme Variables

CSS variables defined in `globals.css`:
- Background, foreground, card colors
- Primary, secondary, muted, accent colors
- Custom: list-item-background, hero-gradient variants

### Dark Mode

Implemented with `next-themes`:
- Class-based strategy
- Persistent across sessions
- Smooth transitions

---

## 🔐 Authentication Flow

1. User submits login/register form
2. Frontend sends request to `/api/auth/login/` or `/api/auth/register/`
3. Backend returns user data + JWT tokens (access + refresh)
4. Tokens stored in Zustand auth store and persisted to localStorage
5. API client automatically includes Bearer token in authenticated requests
6. On 401 response, automatically refreshes token and retries
7. On logout, calls `/api/auth/logout/` and clears all state

---

## 🖼️ Image Optimization

Next.js Image component configured for remote sources:

- **TMDB:** `https://image.tmdb.org/t/p/**`
- **Spotify:** `https://i.scdn.co/image/**`
- **IGDB:** `https://images.igdb.com/igdb/image/upload/**`
- **OpenLibrary:** `https://covers.openlibrary.org/b/**`

---

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

---

## 🚀 Deployment

### Vercel (Recommended)

This project is optimized for deployment on [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository to Vercel
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
4. Deploy!

Vercel automatically detects Next.js and configures optimal settings.

### Other Platforms

This is a standard Next.js application and can be deployed to:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with Node.js

Make sure to set the `NEXT_PUBLIC_API_URL` environment variable on your deployment platform.

---

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guidelines and project overview
- [GUIDELINES.md](./GUIDELINES.md) - Code quality standards and best practices
- [Denn API Documentation](https://github.com/CodeYee/denn-api) - Backend API reference

---

## 🤝 Contributing

Contributions are welcome! Please ensure your code follows the guidelines in [GUIDELINES.md](./GUIDELINES.md).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👤 Authors

- [Emmanuel López - @emlopezr](https://github.com/emlopezr)
- [Emmanuel Arizabaleta - @imEag](https://github.com/imEag)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Vercel](https://vercel.com/) for the deployment platform
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [GSAP](https://greensock.com/gsap/) for powerful animations
- [Zustand](https://github.com/pmndrs/zustand) for simple state management
- [Denn API](https://github.com/CodeYee/denn-api) - Our backend service

---

## 📄 License

This project is private and not licensed for public use.

---

**Built with ❤️ using Next.js and modern web technologies**
