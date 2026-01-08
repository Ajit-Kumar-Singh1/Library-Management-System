FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the backend + frontend code
COPY . .

# Clean old build artifacts (IMPORTANT)
RUN rm -rf dist build

# Build frontend + backend (assuming a monorepo build script)
RUN npm run build

# Expose backend port
EXPOSE 5001

# Run compiled server (NOT dev mode)
CMD ["npm","run","start"]
