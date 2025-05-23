# Use an official OpenJDK runtime as a parent image
FROM openjdk:21-jdk-slim

# Set a working directory inside the image
WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x ./mvnw


# Download dependencies (this layer will be cached if pom.xml doesn't change)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build the application
RUN ./mvnw clean package -DskipTests

# Make port 8080 available (or whatever port your app uses)
EXPOSE 8090

# Define the command to run your application when the container starts
ENTRYPOINT ["java", "-jar", "target/nexmeet-service-0.0.1-SNAPSHOT.jar"]