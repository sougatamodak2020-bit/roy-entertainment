-- ROY ENTERTAINMENT - Updated Schema
-- Includes: roles, ratings, creator support

-- Users table with roles
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movies table with admin rating
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    youtube_id TEXT,
    youtube_url TEXT,
    release_year INTEGER,
    duration_minutes INTEGER,
    admin_rating DECIMAL(3,1) DEFAULT 0,
    user_rating_avg DECIMAL(3,1) DEFAULT 0,
    user_rating_count INTEGER DEFAULT 0,
    genre TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'English',
    director TEXT,
    actors TEXT[],
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published')),
    uploaded_by UUID REFERENCES public.users(id),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Ratings
CREATE TABLE IF NOT EXISTS public.user_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

-- Watch History
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
    progress_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    last_watched TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Public read for movies
CREATE POLICY "Public read movies" ON public.movies FOR SELECT USING (status = 'published' OR uploaded_by = auth.uid());

-- Admins can do everything
CREATE POLICY "Admin full access movies" ON public.movies FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Creators can manage their own movies
CREATE POLICY "Creator manage own movies" ON public.movies FOR ALL USING (uploaded_by = auth.uid());

-- Users can rate movies
CREATE POLICY "Users can rate" ON public.user_ratings FOR ALL USING (auth.uid() = user_id);

-- Users can manage favorites
CREATE POLICY "Users manage favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Trigger to update user_rating_avg
CREATE OR REPLACE FUNCTION update_movie_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.movies SET
        user_rating_avg = (SELECT AVG(rating) FROM public.user_ratings WHERE movie_id = NEW.movie_id),
        user_rating_count = (SELECT COUNT(*) FROM public.user_ratings WHERE movie_id = NEW.movie_id)
    WHERE id = NEW.movie_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rating_change
    AFTER INSERT OR UPDATE ON public.user_ratings
    FOR EACH ROW EXECUTE FUNCTION update_movie_rating();