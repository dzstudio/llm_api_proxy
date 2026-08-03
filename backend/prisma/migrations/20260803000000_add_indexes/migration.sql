-- CreateIndex
CREATE INDEX "conversation_session_id_user_id_idx" ON "conversation"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "conversation_user_id_create_time_idx" ON "conversation"("user_id", "create_time");

-- CreateIndex
CREATE INDEX "conversation_model_id_idx" ON "conversation"("model_id");

-- CreateIndex
CREATE INDEX "message_conversation_id_role_idx" ON "message"("conversation_id", "role");

-- CreateIndex
CREATE INDEX "daily_report_user_id_report_date_idx" ON "daily_report"("user_id", "report_date");

-- CreateIndex
CREATE INDEX "prompt_review_conversation_id_idx" ON "prompt_review"("conversation_id");

-- CreateIndex
CREATE INDEX "sys_api_key_user_id_idx" ON "sys_api_key"("user_id");
