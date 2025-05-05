FROM node:23.11.0-alpine AS base
WORKDIR /app
ENTRYPOINT [ "yarn" ]

####################### Builder stage #######################
FROM base AS builder
# Copy only the files needed to install dependencies and build the app
COPY package.json yarn.lock* tsconfig* nest-cli.json ./
# Install dependencies
RUN yarn --frozen-lockfile
# Copy the rest of the files
COPY src ./src
# Build the application
RUN yarn build
#############################################################

##################### Development build #####################
FROM base AS dev
# Copy all files from the builder stage
COPY --from=builder . .
# Run development
CMD ["start:dev"]
############################################################

##################### Production build #####################
FROM base AS production
# Copy only the files needed to run the app and install production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
# Install production dependencies
RUN yarn install --production --frozen-lockfile
# Run production
CMD ["start"]
############################################################

######################## Test build ########################
FROM base AS test
# Copy all files from the builder stage
COPY --from=builder . .
# Run tests
CMD ["test:watch"]
############################################################