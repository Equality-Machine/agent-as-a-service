FROM node:22-bookworm-slim

RUN npm install --global @openai/codex @anthropic-ai/claude-code

WORKDIR /app
COPY package.json package-lock.json ./
COPY src ./src

ENV AAAS_DATA_DIR=/data
ENV AAAS_RUNNER_CWD=/workspace

VOLUME ["/data", "/workspace"]

CMD ["node", "src/cloud-runner-cli.mjs"]
