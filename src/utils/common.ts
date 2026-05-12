export const getOphimImageMovie = (appDomain: string, thumb_url: string) => {
  if (!appDomain || !thumb_url) return null
  return `${appDomain}/uploads/movies/${thumb_url}`
}
