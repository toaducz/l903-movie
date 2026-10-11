export type MovieSource = 'kkphim' | 'ophim' | 'nguonc'

export interface CategoryItem {
  id: string
  name: string
  slug: string
}

export interface CountryItem {
  id: string
  name: string
  slug: string
}

export interface MovieItem {
  _id?: string
  name: string
  slug: string
  origin_name: string
  type: string
  poster_url: string
  thumb_url: string
  sub_docquyen: boolean
  time: string
  episode_current: string
  quality: string
  lang: string
  year: number
  modified?: { time: string }
  category?: CategoryItem[]
  country?: CountryItem[]
  source?: MovieSource
  cdnImageDomain?: string
  tmdb?: { vote_average: number; vote_count: number }
}

export interface EpisodeItem {
  name: string
  slug: string
  filename: string
  link_embed: string
  link_m3u8: string
}

export interface EpisodeServer {
  server_name: string
  server_data: EpisodeItem[]
}

export interface MovieDetail {
  movie: {
    tmdb: {
      type: string
      id: string
      season: number
      vote_average: number
      vote_count: number
    }
    imdb: { id: string | null }
    created: { time: string }
    modified: { time: string }
    _id: string
    name: string
    slug: string
    origin_name: string
    content: string
    type: string
    status: string
    poster_url: string
    thumb_url: string
    is_copyright: boolean
    sub_docquyen: boolean
    chieurap: boolean
    trailer_url: string
    time: string
    episode_current: string
    episode_total: string
    quality: string
    lang: string
    notify: string
    showtimes: string
    year: number
    view: number
    actor: string[]
    director: string[]
    category: CategoryItem[]
    country: CountryItem[]
  }
  episodes: EpisodeServer[]
  status: boolean
  msg: string
}

export interface Pagination {
  currentPage: number
  totalPages: number
  totalItems: number
  totalItemsPerPage: number
}

export interface MovieListResult {
  items: MovieItem[]
  pagination: Pagination
  cdnImageDomain?: string
  titlePage?: string
  seoOnPage?: { descriptionHead?: string }
  APP_DOMAIN_CDN_IMAGE?: string
  source: MovieSource
}

export interface SearchMovieParams {
  keyword: string
  page?: number
  limit?: number
  category?: string
  country?: string
  year?: string
  sort_field?: string
  sort_type?: string
  source?: MovieSource
}

export interface ListMovieParams {
  typelist: string
  page?: number
  limit?: number
  category?: string
  country?: string
  year?: string
  sort_field?: string
  sort_type?: string
  sort_lang?: string
  source?: MovieSource
}

export interface ListMovieByCategoryParams {
  category: string
  page?: number
  limit?: number
  country?: string
  year?: string
  sort_field?: string
  sort_type?: string
  sort_lang?: string
  source?: MovieSource
}

export interface ListMovieByCountryParams {
  country: string
  page?: number
  limit?: number
  category?: string
  year?: string
  sort_field?: string
  sort_type?: string
  sort_lang?: string
  source?: MovieSource
}

export interface ListMovieByYearParams {
  year: string
  page?: number
  limit?: number
  category?: string
  country?: string
  sort_field?: string
  sort_type?: string
  sort_lang?: string
  source?: MovieSource
}

export interface CombinedSearchResult {
  items: MovieItem[]
  allItems: MovieItem[]
  hasDuplicates: boolean
  titlePage: string
  pagination: Pagination
  APP_DOMAIN_CDN_IMAGE?: string
}
