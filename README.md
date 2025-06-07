# NexMeet

NexMeet is a next-gen video conferencing platform with AI-powered transcription and meeting summaries. It leverages modern technologies for seamless, secure, and efficient video meetings, including real-time communication, WebRTC, and advanced AI features.

## Project Structure

```
NexMeet/
├── client/              # Frontend (React.js, Vite, Tailwind CSS, ShadCN)
├── mediasoup-server/    # MediaSoup Node.js server for WebRTC
├── server/              # Backend (Spring Boot, Java 21)
├── README.md
└── ...
```

## Tech Stack

### Backend

- **Spring Boot 3.4.3** (Java 21, Maven)
- Spring Security, OAuth2 Client, JWT (JSON Web Tokens)
- Spring Data JPA, Actuator, Lombok, DevTools
- **Flyway** for database migrations
- WebSocket (Spring) for real-time signaling

### Frontend

- **React.js (Vite)**
- Tailwind CSS, ShadCN UI
- **Socket.IO** for real-time communication
- **Mediasoup** for WebRTC-based video conferencing

### Database

- **PostgreSQL** (Supabase compatible)

## Prerequisites

- **IDE:** IntelliJ IDEA (recommended) or any preferred IDE
- **Java 21**
- **Node.js (LTS)**
- **Maven**
- **PostgreSQL** (or Supabase account)
- **Git**

## Project Setup

### Backend Setup (Spring Boot)

1. Clone the repository:

   ```sh
   git clone https://github.com/somnesh/NexMeet.git
   cd NexMeet/server
   ```

2. Open the project in your IDE.

3. Configure PostgreSQL in `application.properties` or `application.yml`:

   ```properties
   spring.datasource.url=jdbc:postgresql://your-supabase-url:5432/your-database
   spring.datasource.username=your-db-username
   spring.datasource.password=your-db-password
   spring.jpa.hibernate.ddl-auto=validate
   ```

4. Run database migrations:

   ```sh
   mvn flyway:migrate
   ```

5. Start the backend service:
   ```sh
   mvn spring-boot:run
   ```

### Frontend Setup (React.js with Vite)

1. Navigate to the frontend directory:

   ```sh
   cd ../client
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

### Mediasoup Server Setup

1. Navigate to the mediasoup-server directory:

   ```sh
   cd ../mediasoup-server
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the mediasoup server:
   ```sh
   node server.js
   ```

### Running the Application

- Ensure backend (`server/`), frontend (`client/`), and mediasoup-server (`mediasoup-server/`) are all running.
- Open the frontend at [http://localhost:5173](http://localhost:5173).
- Backend runs at [http://localhost:8090](http://localhost:8090) (configurable).
- Mediasoup server runs at [http://localhost:3001](http://localhost:3001) (default, configurable).

## Key Features

- **Authentication:** OAuth2 with Google and JWT-based authentication.
- **Real-time Communication:** WebSocket and Socket.IO for messaging and signaling.
- **Video Conferencing:** WebRTC-based video conferencing using Mediasoup.
- **AI Transcription & Summaries:** Automated meeting transcription and AI-generated summaries.
- **Meeting Management:** Create, join, leave, and manage participants in meetings.
- **Database Migrations:** Managed using Flyway.
- **Role-based Access Control:** Admin and user roles with Spring Security.
- **Recording & Download:** Record meetings and download recordings/transcriptions.
- **Modern UI:** Responsive, accessible frontend with Tailwind CSS and ShadCN.

## Contribution

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-branch`
3. Commit your changes: `git commit -m "Added new feature"`
4. Push to the branch: `git push origin feature-branch`
5. Open a pull request.

---

For more details, see the code in [client/](client/), [server/](server/), and [mediasoup-server/](mediasoup-server/).
