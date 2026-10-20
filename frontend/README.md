# Reel And Reflect Journal

Frontend for Replay, a personal movie journal. The product requirements are documented in [docs/spec.md](./docs/spec.md).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/62713365-49aa-4b71-8ada-616a804ec1c3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The frontend uses the FastAPI backend for authentication and movie data. Start
the backend from the repository root with `make run`, then open a second
terminal at the repository root and run `make frontend`. The frontend dev
server proxies `/api` requests to `http://127.0.0.1:8000`. If the backend uses a
different port, pass it to both commands (for example, `make run PORT=8001` and
`make frontend PORT=8001`). Set `VITE_API_URL` to a different API base URL
(including `/api`) when deploying or using a remote backend.
