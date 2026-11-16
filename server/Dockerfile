# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Build tools in case native modules need compilation
RUN apk add --no-cache python3 make g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install dependencies (node_modules are built here, inside the image)
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads

# Expose port
EXPOSE 5000

# Start the application (plain node in production, not nodemon)
CMD ["node", "server.js"]
