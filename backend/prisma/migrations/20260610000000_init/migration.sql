-- CreateTable
CREATE TABLE IF NOT EXISTS "sys_user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "real_name" TEXT,
    "email" TEXT,
    "department" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" INTEGER NOT NULL DEFAULT 1,
    "last_login_time" DATETIME,
    "create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sys_api_key" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "api_key" TEXT NOT NULL,
    "default_model_id" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 1,
    "create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" DATETIME NOT NULL,
    CONSTRAINT "sys_api_key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sys_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sys_model" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "base_url" TEXT,
    "api_key" TEXT,
    "enabled" INTEGER NOT NULL DEFAULT 0,
    "max_tokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "timeout_seconds" INTEGER NOT NULL DEFAULT 60,
    "is_review_model" INTEGER NOT NULL DEFAULT 0,
    "create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sys_setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "setting_key" TEXT NOT NULL,
    "setting_value" TEXT,
    "description" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "conversation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "model_id" INTEGER,
    "session_id" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0.0,
    "create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" DATETIME NOT NULL,
    CONSTRAINT "conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sys_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversation_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "sys_model" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversation_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "report_date" DATETIME NOT NULL,
    "summary" TEXT,
    "prompt_count" INTEGER NOT NULL DEFAULT 0,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "review_content" TEXT,
    "create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sys_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "prompt_review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversation_id" INTEGER NOT NULL,
    "review_model_id" INTEGER,
    "score" INTEGER,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "suggestions" TEXT,
    "create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prompt_review_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "prompt_review_review_model_id_fkey" FOREIGN KEY ("review_model_id") REFERENCES "sys_model" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sys_user_username_key" ON "sys_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sys_api_key_api_key_key" ON "sys_api_key"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sys_setting_setting_key_key" ON "sys_setting"("setting_key");
