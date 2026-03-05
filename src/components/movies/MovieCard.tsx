// src/components/movies/MovieCard.tsx

import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'

interface MovieCardProps {
  movie: any
  priority?: boolean
}

export default function MovieCard({ movie, priority = false }: MovieCardProps) {
  if (!movie?.slug) {
    return <div className="bg-gray-800 rounded-lg h-64 flex items-center justify-center text-gray-400">No movie</div>
  }

  return (
    <Link href={`/watch/${movie.slug}`} className="block group">
      <div className="relative overflow-hidden rounded-xl bg-black/40 shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-purple-900/30">
        <div className="relative aspect-[2/3] md:aspect-[3/4]">
          <Image
            src={movie.poster_url || movie.backdrop_url || '/placeholder-wide.jpg'}
            alt={movie.title || 'Movie poster'}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={85}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-white z-10 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
          <h3 className="font-bold text-lg md:text-xl line-clamp-2 mb-1.5 group-hover:text-purple-300 transition-colors">
            {movie.title}
          </h3>

          <div className="flex items-center gap-3 text-sm md:text-base">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400" />
              <span className="font-medium">
                {movie.admin_rating || movie.rating || 'N/A'}
              </span>
            </div>
            <span className="opacity-70">•</span>
            <span>{movie.release_year || 'N/A'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}