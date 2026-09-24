# Architecture

## Application flow

```text
Browser
  -> React frontend
  -> Axios REST API client
  -> Express backend
  -> Controllers
  -> Mongoose models
  -> MongoDB Atlas
```

## Planned AI flow

```text
React frontend
  -> Express AI route
  -> AI controller/service
  -> Google Gemini
  -> structured response
  -> MongoDB AIInsight where applicable
  -> frontend
```

The models, API routes, controllers, and AI system will be introduced in later phases.
