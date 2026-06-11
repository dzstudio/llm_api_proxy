-- Add prompt_tokens column to message table (stores API-reported prompt_tokens per assistant message)
ALTER TABLE message ADD COLUMN prompt_tokens INTEGER;
