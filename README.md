# ProfilService
Every User gets his Profile per userid. We have a Global Profil for all Applications and additional App-specific Profiles. use GraphQL to say with information you need.

## MongoDB
This service does not run its own MongoDB instance. It connects to the shared, central MongoDB instance (used by all services, each with its own database) via `MONGODB_URI` — see `.env.example`.
