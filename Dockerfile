# Use a lightweight Node.js base image
FROM node:16-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install a simple static server, such as http-server, to serve the website files
RUN npm install -g http-server

# Copy all files into the container
COPY . .

# Expose port 8080 to access the site
EXPOSE 8080

# Run http-server on port 8080
CMD ["http-server", ".", "-p", "8080"]