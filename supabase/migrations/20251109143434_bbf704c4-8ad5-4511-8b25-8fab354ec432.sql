-- Add analytics columns to marketplace_listings
ALTER TABLE marketplace_listings 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_received INTEGER DEFAULT 0;

-- Create function to increment views
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketplace_listings
  SET views = views + 1
  WHERE id = listing_id;
END;
$$;

-- Create function to increment messages count
CREATE OR REPLACE FUNCTION increment_listing_messages(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketplace_listings
  SET messages_received = messages_received + 1
  WHERE id = listing_id;
END;
$$;