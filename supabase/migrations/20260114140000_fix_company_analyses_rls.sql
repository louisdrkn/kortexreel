-- Enable insert for users based on user_id
CREATE POLICY "Enable insert for users based on user_id" ON "public"."company_analyses"
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable update for users based on user_id (needed for upsert)
CREATE POLICY "Enable update for users based on user_id" ON "public"."company_analyses"
AS PERMISSIVE FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
