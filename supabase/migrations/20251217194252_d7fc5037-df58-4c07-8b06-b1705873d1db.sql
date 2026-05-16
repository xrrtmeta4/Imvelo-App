-- Allow users to delete messages they sent
CREATE POLICY "Users can delete own sent messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Allow users to delete their own pest reports
CREATE POLICY "Users can delete own pest reports" 
ON public.pest_reports 
FOR DELETE 
USING (auth.uid() = user_id);