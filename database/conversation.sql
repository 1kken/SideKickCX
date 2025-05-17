-- Table: conversation
CREATE TABLE
    conversation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        created_at TIMESTAMPTZ DEFAULT now (),
        updated_at TIMESTAMPTZ DEFAULT now ()
    );

-- Table: summary
CREATE TABLE
    summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        conversation_id UUID REFERENCES conversation (id) ON DELETE CASCADE,
        summary TEXT,
        created_at TIMESTAMPTZ DEFAULT now (),
        updated_at TIMESTAMPTZ DEFAULT now ()
    );

-- Table: messages
CREATE TABLE
    messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        conversation_id UUID REFERENCES conversation (id) ON DELETE CASCADE,
        is_agent BOOLEAN NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now (),
        updated_at TIMESTAMPTZ DEFAULT now ()
    );