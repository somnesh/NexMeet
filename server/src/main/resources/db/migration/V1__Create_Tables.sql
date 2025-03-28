-- USERS TABLE
CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password TEXT, -- NULL for Google Sign-In users
                       oauth_id VARCHAR(255) UNIQUE, -- Google OAuth ID
                       avatar TEXT,
                       role VARCHAR(10) CHECK (role IN ('admin', 'user')) DEFAULT 'user',
                       refresh_token TEXT,
                       is_verified BOOLEAN DEFAULT FALSE,
                       created_at TIMESTAMP DEFAULT NOW()
);

-- MEETINGS TABLE
CREATE TABLE meetings (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          title TEXT NOT NULL,
                          start_time TIMESTAMP NOT NULL,
                          end_time TIMESTAMP,
                          status VARCHAR(20) CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')) DEFAULT 'scheduled',
                          created_at TIMESTAMP DEFAULT NOW()
);

-- PARTICIPANTS TABLE
CREATE TABLE participants (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                              meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                              joined_at TIMESTAMP DEFAULT NOW(),
                              left_at TIMESTAMP
);

-- MESSAGES TABLE
CREATE TABLE messages (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                          sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          message TEXT NOT NULL,
                          sent_at TIMESTAMP DEFAULT NOW()
);

-- RECORDINGS TABLE
CREATE TABLE recordings (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                            url TEXT NOT NULL, -- Cloudinary or another storage URL
                            created_at TIMESTAMP DEFAULT NOW()
);

-- SUMMARIES TABLE
CREATE TABLE summaries (
                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                           summary TEXT NOT NULL,
                           created_at TIMESTAMP DEFAULT NOW()
);

-- TRANSCRIPTIONS TABLE
CREATE TABLE transcriptions (
                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                                text TEXT NOT NULL,
                                created_at TIMESTAMP DEFAULT NOW()
);

-- REPORTS TABLE
CREATE TABLE report (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        reported_content_id UUID NOT NULL, -- Can be a user or meeting
                        content_type VARCHAR(10) CHECK (content_type IN ('meeting', 'user')),
                        report_content TEXT NOT NULL,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        created_at TIMESTAMP DEFAULT NOW()
);
