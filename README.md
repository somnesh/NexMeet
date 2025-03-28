# NexMeet

NexMeet is a next-gen video conferencing platform with AI-powered transcription and meeting summaries. This project is built using modern technologies to provide a seamless and efficient video conferencing experience.

## Tech Stack

### Backend
- **Spring Boot 3.4.3** (Maven, Java 21)
- Spring Security
- OAuth2 Client
- Spring Data JPA
- Actuator
- Lombok
- DevTools

Spring Initializr link: [Spring Boot Project Setup](https://start.spring.io/#!type=maven-project&language=java&platformVersion=3.4.3&packaging=jar&jvmVersion=21&groupId=com.nexmeet&artifactId=nexmeet-service&name=NexMeetApplication&description=A%20next-gen%20video%20conferencing%20platform%20with%20AI-powered%20transcription%20and%20meeting%20summaries.&packageName=com.nexmeet.nexmeet-service&dependencies=web,security,data-jpa,oauth2-client,actuator,lombok,devtools)

### Frontend
- **React.js (Vite)**
- Tailwind CSS
- ShadCN

### Database
- **PostgreSQL (Supabase)**

## Prerequisites

- **IDE:** IntelliJ IDEA (recommended) or any other preferred IDE
- **Java 21**
- **Node.js (LTS version)**
- **Maven**
- **PostgreSQL (or Supabase account)**
- **Git**

## Project Setup

### Backend Setup (Spring Boot)

1. Clone the repository:
   ```sh
   git clone https://github.com/somnesh/NexMeet.git
   cd nexmeet/backend
   ```

2. Open the project in IntelliJ IDEA (or any preferred IDE).

3. Configure the PostgreSQL database in `application.properties` or `application.yml`:
   ```properties
   spring.datasource.url=jdbc:postgresql://your-supabase-url:5432/your-database
   spring.datasource.username=your-db-username
   spring.datasource.password=your-db-password
   spring.jpa.hibernate.ddl-auto=update
   ```

4. Run the backend service:
   ```sh
   mvn spring-boot:run
   ```

### Frontend Setup (React.js with Vite)

1. Navigate to the frontend directory:
   ```sh
   cd ../frontend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

### Running the Application

- Ensure both the backend and frontend services are running.
- Open the frontend in your browser at `http://localhost:5173` (default Vite port).
- The backend should be running at `http://localhost:8090` (you can change Spring Boot port in the `application.properties` file).

## Deployment

- The backend can be deployed to any cloud provider supporting Java applications.
- The frontend can be deployed using platforms like Vercel, Netlify, or traditional hosting services.

## Contribution

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-branch`
3. Commit your changes: `git commit -m "Added new feature"`
4. Push to the branch: `git push origin feature-branch`
5. Open a pull request.

