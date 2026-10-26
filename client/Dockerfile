# ---- Build stage ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* vars at build time — pass them as build args.
ARG VITE_API_URL=http://localhost:8080/api/v1
ARG VITE_GOOGLE_OAUTH_CLIENT_ID
ARG VITE_STRIPE_PUBLISHABLE_KEY
# Public address of the site (canonical links, sitemap.xml, structured data)
ARG SITE_URL
# Where the build reads tours, destinations and articles to prerender (defaults to VITE_API_URL)
ARG PRERENDER_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV SITE_URL=$SITE_URL
ENV PRERENDER_API_URL=$PRERENDER_API_URL
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
