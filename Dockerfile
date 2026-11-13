# ---------- Build stage ----------
FROM rust:1.96-slim-bookworm AS builder
WORKDIR /app

# Build dependencies first so they are cached between code changes.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release --locked \
    && rm -rf src

# Build the real binary.
COPY src ./src
RUN touch src/main.rs && cargo build --release --locked

# ---------- Runtime stage ----------
FROM debian:bookworm-slim
WORKDIR /app

# Run as a non-root user; tables are stored in /app/dbfiles.
RUN useradd --system --no-create-home drast \
    && mkdir -p /app/dbfiles \
    && chown drast:drast /app/dbfiles

COPY --from=builder /app/target/release/drast /usr/local/bin/drast

USER drast
ENV DRAST_ADDR=0.0.0.0:3495
EXPOSE 3495
VOLUME ["/app/dbfiles"]

CMD ["drast"]
