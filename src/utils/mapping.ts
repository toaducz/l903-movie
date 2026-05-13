import { Pagination } from '@/api/pagination'
import { Movie } from '@/api/kkphim/get-update-movie'
import { MovieItems, Paginate } from '@/api/nguonc/get-update-movie'
import { DetailMovie } from '@/api/kkphim/get-detail-movie'
import { MovieNguonc, EpisodeNguonc } from '@/api/nguonc/get-detail-movie'
import { OphimUpdateItem, OphimUpdateResponse } from '@/api/ophim/get-update-movie'
import { OphimMovie, OphimEpisodeServer } from '@/api/ophim/get-detail-movie'
import { getOphimImageMovie } from './common'

export function mapPaginate(apiPaginate: Paginate): Pagination {
  return {
    currentPage: apiPaginate.current_page,
    totalPages: apiPaginate.total_page,
    totalItems: apiPaginate.total_items,
    totalItemsPerPage: apiPaginate.items_per_page
  }
}

export function mapMovieItemToMovie(item: MovieItems): Movie {
  return {
    _id: item.id,
    name: item.name,
    slug: item.slug,
    origin_name: item.original_name,
    type: '', // API không có => set default hoặc map từ field khác nếu có
    poster_url: item.poster_url,
    thumb_url: item.thumb_url,
    sub_docquyen: false, // default
    time: item.time,
    episode_current: item.current_episode,
    quality: item.quality,
    lang: item.language,
    year: new Date(item.created).getFullYear(), // hoặc lấy từ API nếu có
    modified: { time: item.modified },
    category: [], // nếu API có thì map vào
    country: [] // nếu API có thì map vào
  }
}

export function mapToDetailMovie(movie: MovieNguonc, episodes?: EpisodeNguonc[]): DetailMovie {
  return {
    status: true,
    msg: 'success',
    movie: {
      tmdb: {
        type: 'movie',
        id: movie.id,
        season: 1,
        vote_average: 0,
        vote_count: 0
      },
      imdb: { id: null },
      created: { time: movie.created },
      modified: { time: movie.modified },
      _id: movie.id,
      name: movie.name,
      slug: movie.slug,
      origin_name: movie.original_name,
      content: movie.description ?? '',
      type: 'movie',
      status: 'Hoàn tất',
      poster_url: movie.poster_url ?? '',
      thumb_url: movie.thumb_url ?? '',
      is_copyright: false,
      sub_docquyen: false,
      chieurap: false,
      trailer_url: '',
      time: movie.time ?? '',
      episode_current: movie.current_episode ?? '',
      episode_total: String(movie.total_episodes ?? 0),
      quality: movie.quality ?? '',
      lang: movie.language ?? '',
      notify: '',
      showtimes: '',
      year: Number(movie.category['3']?.list?.[0]?.name ?? 0),
      view: 0,
      actor: movie.casts ? movie.casts.split(',').map(s => s.trim()) : [],
      director: movie.director ? movie.director.split(',').map(s => s.trim()) : [],
      category: Object.values(movie.category ?? {}).flatMap(c =>
        (c.list ?? []).map(item => ({
          id: item.id,
          name: item.name,
          slug: item.id
        }))
      ),
      country: (movie.category['4']?.list ?? []).map(item => ({
        id: item.id,
        name: item.name,
        slug: item.id
      }))
    },
    episodes: (episodes ?? []).map(ep => ({
      server_name: ep.server_name ?? '',
      server_data: (ep.items ?? []).map(item => ({
        name: item.name ?? '',
        slug: item.slug ?? '',
        filename: '',
        link_embed: item.embed ?? '',
        link_m3u8: item.m3u8 ?? ''
      }))
    }))
  }
}

export function mapOphimUpdateItemToMovie(item: OphimUpdateItem, cdnImageDomain?: string): Movie {
  const getImageUrl = (url: string) => {
    if (!url || !cdnImageDomain) return url
    if (url.startsWith('http')) return url
    return getOphimImageMovie(cdnImageDomain, url) ?? url
  }

  return {
    _id: item._id,
    name: item.name,
    slug: item.slug,
    origin_name: item.origin_name,
    type: item.type,
    poster_url: getImageUrl(item.poster_url),
    thumb_url: getImageUrl(item.thumb_url),
    sub_docquyen: false, // Ophim API doesn't provide this, default to false
    time: item.time,
    episode_current: item.episode_current,
    quality: item.quality,
    lang: item.lang,
    year: item.year,
    modified: { time: '' }, // Ophim API doesn't provide modified time in list
    category: item.category,
    country: item.country
  }
}

export function mapOphimUpdatePagination(apiPaginate: OphimUpdateResponse['data']['params']['pagination']): Pagination {
  const totalPages = Math.ceil(apiPaginate.totalItems / apiPaginate.totalItemsPerPage) ?? 1

  return {
    currentPage: apiPaginate.currentPage,
    totalPages: totalPages,
    totalItems: apiPaginate.totalItems,
    totalItemsPerPage: apiPaginate.totalItemsPerPage
  }
}

export function mapOphimToDetailMovie(
  movie: OphimMovie,
  episodes?: OphimEpisodeServer[],
  cdnImageDomain?: string
): DetailMovie {
  const getImageUrl = (url: string) => {
    if (!url || !cdnImageDomain) return url
    if (url.startsWith('http')) return url
    return getOphimImageMovie(cdnImageDomain, url) ?? url
  }

  return {
    status: true, // true đại đại đi bắt lỗi sau
    msg: '',
    movie: {
      tmdb: {
        type: 'movie',
        id: movie._id,
        season: 1,
        vote_average: 0,
        vote_count: 0
      },
      imdb: { id: null },
      created: { time: '' }, // Ophim doesn't provide creation time in detail
      modified: { time: '' }, // Ophim doesn't provide modification time in detail
      _id: movie._id,
      name: movie.name,
      slug: movie.slug,
      origin_name: movie.origin_name,
      content: movie.content,
      type: movie.type,
      status: movie.status === 'ongoing' ? 'Đang chiếu' : movie.status === 'completed' ? 'Hoàn tất' : 'Sắp chiếu',
      poster_url: getImageUrl(movie.poster_url),
      thumb_url: getImageUrl(movie.thumb_url),
      is_copyright: false, // Default value
      sub_docquyen: false, // Default value
      chieurap: false, // Default value
      trailer_url: movie.trailer_url,
      time: movie.time,
      episode_current: movie.episode_current,
      episode_total: movie.episode_total,
      quality: movie.quality,
      lang: movie.lang,
      notify: '',
      showtimes: '',
      year: movie.year,
      view: movie.view,
      actor: movie.actor,
      director: movie.director,
      category: movie.category.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug
      })),
      country: movie.country.map(country => ({
        id: country.id,
        name: country.name,
        slug: country.slug
      }))
    },
    episodes: (episodes ?? []).map(ep => ({
      server_name: ep.server_name,
      server_data: ep.server_data.map(item => ({
        name: item.name,
        slug: item.slug,
        filename: item.filename,
        link_embed: item.link_embed,
        link_m3u8: item.link_m3u8
      }))
    }))
  }
}
