export function getVoterId(): string {
  let id = localStorage.getItem('voterId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('voterId', id)
  }
  return id
}
