# Use the official Node.js 20 Alpine image as base
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Create the uploads directory inside the container if it doesn't exist
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Command to start the application
CMD [ "npm", "start" ]
