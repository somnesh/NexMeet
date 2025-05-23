# Use an official OpenJDK runtime as a parent image
# Choose a Java version that matches your project (e.g., 17, 21)
FROM openjdk:21-jdk-slim

# Set a working directory inside the image
WORKDIR /app

# Copy the executable JAR file from your build output to the image
# Adjust the path if your JAR is in a different location or has a different name
# For Maven, it's often target/*.jar
# For Gradle, it's often build/libs/*.jar
# This example assumes you've renamed your final JAR to app.jar and placed it in target/
COPY target/nexmeet-service-0.0.1-SNAPSHOT.jar app.jar

# Make port 8080 available to the world outside this container
# This is the default port for Spring Boot applications
EXPOSE 8090

# Define the command to run your application when the container starts
ENTRYPOINT ["java", "-jar", "app.jar"]