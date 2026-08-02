# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

# Render injects every service env var as a Docker build arg automatically
# (confirmed against Render's docs, not assumed) — this ARG picks up
# VITE_API_URL from whatever's set in the Render dashboard for this
# service, at build time. Vite inlines it directly into the built JS
# bundle; unlike the backend's env vars, this can't be changed at container
# runtime — only by rebuilding with a different value.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Using nginx's official templating mechanism (files in
# /etc/nginx/templates/*.template get envsubst'd into /etc/nginx/conf.d/
# automatically by the base image's entrypoint — no custom script needed)
# specifically because Render assigns $PORT at container runtime, and
# plain nginx.conf files can't read environment variables at all.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Fallback for local docker-compose runs, where nothing sets PORT the way
# Render does. Render will override this with its own assigned port.
ENV PORT=8080
EXPOSE 8080
