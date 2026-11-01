# syntax=docker/dockerfile:1
FROM oven/bun:alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS vendor
ARG OMP_REF=v18.9.1
ARG OMP_SHA=a4d6f0adc63dda4ccdf4d25c26422219820f865b
WORKDIR /omp
RUN apk add --no-cache git \
    && git init -q . \
    && git remote add origin https://github.com/can1357/oh-my-pi.git \
    && git fetch --depth 1 origin "${OMP_SHA}" \
    && git checkout -q FETCH_HEAD \
    && rm -rf .git
RUN bun install --production --filter '!./' --filter '@oh-my-pi/collab-web...'

FROM oven/bun:alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a
WORKDIR /omp
COPY --from=vendor /omp/package.json ./package.json
COPY --from=vendor /omp/node_modules ./node_modules
COPY --from=vendor /omp/packages/wire ./packages/wire
COPY --from=vendor /omp/packages/collab-web ./packages/collab-web
RUN addgroup -S relay && adduser -S relay -G relay
USER relay
EXPOSE 7466
ENTRYPOINT ["bun", "packages/collab-web/scripts/local-relay.ts"]
