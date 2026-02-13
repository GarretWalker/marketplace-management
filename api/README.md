# Shop Local Marketplace - API

Node.js/Express API for the Shop Local Marketplace platform.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
```

## Development

```bash
npm run dev    # Start with hot reload
npm run build  # Build for production
npm start      # Run production build
npm test       # Run tests
npm run lint   # Lint code
```

## Health Check

```
GET /api/health
```

Returns:
```json
{
  "data": {
    "status": "OK",
    "timestamp": "2026-02-13T20:00:00.000Z",
    "environment": "development"
  },
  "error": null
}
```

## Architecture

- **Routes** → Define URL paths and apply middleware
- **Controllers** → Extract request data, call services, format responses  
- **Services** → Business logic and data access
- **Middleware** → Auth, validation, logging, error handling

See `/src` for full structure.
