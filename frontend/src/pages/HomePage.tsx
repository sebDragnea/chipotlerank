import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { Post, SortMode } from '../types'
import { getVoterId } from '../voterId'

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [sort, setSort] = useState<SortMode>('top')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const voterId = getVoterId()
      const res = await fetch(`/api/posts?sort=${sort}`, {
        headers: { 'X-Voter-Id': voterId },
      })
      if (!res.ok) throw new Error('Failed to fetch posts')
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      setError('Could not load posts. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [sort])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleVoteChange = (postId: string, upvotes: number, downvotes: number, userVote: 'up' | 'down' | null) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, upvotes, downvotes, user_vote: userVote } : p
      )
    )
  }

  return (
    <div className="app-container">
      <header className="site-header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="logo-icon">🌯</span>
            <span className="logo-text">ChipotleRank</span>
          </div>
          <Link to="/submit" className="btn-submit">
            + Submit Order
          </Link>
        </div>
      </header>

      <main className="main-content">
        <div className="sort-bar">
          <span className="sort-label">Sort by:</span>
          <div className="sort-tabs">
            <button
              className={`sort-tab${sort === 'top' ? ' active' : ''}`}
              onClick={() => setSort('top')}
            >
              Top
            </button>
            <button
              className={`sort-tab${sort === 'best' ? ' active' : ''}`}
              onClick={() => setSort('best')}
            >
              Best
            </button>
            <button
              className={`sort-tab${sort === 'new' ? ' active' : ''}`}
              onClick={() => setSort('new')}
            >
              New
            </button>
          </div>
        </div>

        {loading && (
          <div className="state-message">
            <div className="spinner" />
            <p>Loading orders...</p>
          </div>
        )}

        {error && (
          <div className="state-message error">
            <p>{error}</p>
            <button className="btn-retry" onClick={fetchPosts}>Retry</button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="state-message empty">
            <p className="empty-icon">🌯</p>
            <p>No orders yet. Be the first to submit yours!</p>
            <Link to="/submit" className="btn-submit">Submit Order</Link>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="posts-grid">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
