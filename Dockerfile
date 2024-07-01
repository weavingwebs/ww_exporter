FROM golang as builder

ENV GO111MODULE=on

WORKDIR /app

# Cache dependencies.
COPY go.mod .
COPY go.sum .
RUN go mod download

# Build main.
COPY . .
RUN ./scripts/build.sh

# Runner image.
FROM hayd/centos-deno:1.2.3

# Update ca-certificates.
RUN yum -y update && yum -y install ca-certificates && yum clean all

WORKDIR /app
COPY . .
COPY --from=builder /app/dist /app/dist
EXPOSE 80
ENTRYPOINT ["/app/dist/main"]
