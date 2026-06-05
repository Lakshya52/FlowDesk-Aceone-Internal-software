# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production Stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (these should ideally be provided by AWS ECS)
ENV NODE_ENV=production
ENV PORT=5000

# Command to run the application
CMD ["npm", "start"]
