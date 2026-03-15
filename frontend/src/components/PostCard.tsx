import { useState } from 'react'
import { Post } from '../types'
import { getVoterId } from '../voterId'

interface PostCardProps {
  post: Post
  onVoteChange: (postId: string, upvotes: number, downvotes: number, userVote: 'up' | 'down' | null) => void
}

export default function PostCard({ post, onVoteChange }: PostCardProps) {
  const [voting, setVoting] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const netScore = post.upvotes - post.downvotes
  const totalVotes = post.upvotes + post.downvotes
  const percentLiked = totalVotes > 0 ? Math.round((post.upvotes / totalVotes) * 100) : null

  const handleVote = async (voteType: 'up' | 'down') => {
    if (voting) return
    setVoting(true)
    try {
      const voterId = getVoterId()
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Voter-Id': voterId,
        },
        body: JSON.stringify({ vote: voteType }),
      })
      if (!res.ok) throw new Error('Vote failed')
      const data = await res.json()
      onVoteChange(post.id, data.upvotes, data.downvotes, data.user_vote)
    } catch (err) {
      console.error('Vote error:', err)
    } finally {
      setVoting(false)
    }
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      <div className="post-card">
        <div
          className="post-image-wrapper"
          onClick={() => setLightboxOpen(true)}
          title="Click to enlarge"
        >
          <img
            src={`/uploads/${post.image_filename}`}
            alt={post.title}
            className="post-image"
            loading="lazy"
          />
          <div className="image-overlay">
            <span className="zoom-icon">🔍</span>
          </div>
        </div>

        <div className="post-body">
          <div className="post-score-row">
            <span className={`net-score${netScore > 0 ? ' positive' : netScore < 0 ? ' negative' : ''}`}>
              {netScore > 0 ? '+' : ''}{netScore}
            </span>
            {percentLiked !== null && (
              <span className="percent-liked">{percentLiked}% liked</span>
            )}
          </div>

          <h2 className="post-title">{post.title}</h2>

          {post.description && (
            <p className="post-description">{post.description}</p>
          )}

          <div className="post-footer">
            <span className="post-date">{formatDate(post.created_at)}</span>

            <div className="vote-buttons">
              <button
                className={`vote-btn upvote${post.user_vote === 'up' ? ' active' : ''}`}
                onClick={() => handleVote('up')}
                disabled={voting}
                title="Upvote"
              >
                <span className="vote-arrow">▲</span>
                <span className="vote-count">{post.upvotes}</span>
              </button>
              <button
                className={`vote-btn downvote${post.user_vote === 'down' ? ' active' : ''}`}
                onClick={() => handleVote('down')}
                disabled={voting}
                title="Downvote"
              >
                <span className="vote-arrow">▼</span>
                <span className="vote-count">{post.downvotes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            <img
              src={`/uploads/${post.image_filename}`}
              alt={post.title}
              className="lightbox-image"
            />
            <div className="lightbox-caption">
              <strong>{post.title}</strong>
              {post.description && <p>{post.description}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
