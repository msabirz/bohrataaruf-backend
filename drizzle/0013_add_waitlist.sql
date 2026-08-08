CREATE TABLE IF NOT EXISTS waitlist (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	email text NOT NULL UNIQUE,
	city text,
	created_at timestamptz DEFAULT now()
);
