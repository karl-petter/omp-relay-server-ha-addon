# syntax=docker/dockerfile:1
FROM oven/bun:alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373 AS vendor
ARG OMP_REF=v18.9.0
WORKDIR /omp
RUN apk add --no-cache git \
    && git clone --branch "${OMP_REF}" --depth 1 https://github.com/can1357/oh-my-pi.git . \
    && rm -rf .git
RUN bun install --production --filter '!./' --filter '@oh-my-pi/collab-web...'

FROM oven/bun:alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373
WORKDIR /omp
COPY --from=vendor /omp/package.json ./package.json
COPY --from=vendor /omp/node_modules ./node_modules
COPY --from=vendor /omp/packages/wire ./packages/wire
COPY --from=vendor /omp/packages/collab-web ./packages/collab-web
RUN addgroup -S relay && adduser -S relay -G relay
USER relay
EXPOSE 7466
ENTRYPOINT ["bun", "packages/collab-web/scripts/local-relay.ts"]
