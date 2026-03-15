import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function SubmitPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please enter a title.')
      return
    }
    if (!imageFile) {
      setError('Please select an image of your order.')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('image', imageFile)

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Submission failed')
      }

      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-container">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="header-logo">
            <span className="logo-icon">🌯</span>
            <span className="logo-text">ChipotleRank</span>
          </Link>
        </div>
      </header>

      <main className="main-content">
        <div className="submit-container">
          <div className="submit-card">
            <h1 className="submit-title">Submit Your Order</h1>
            <p className="submit-subtitle">Show off your Chipotle creation and let the community judge.</p>

            {error && (
              <div className="form-error">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="submit-form">
              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  Order Title <span className="required">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Double chicken bowl with extra queso"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
                <span className="char-count">{title.length}/120</span>
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  className="form-textarea"
                  placeholder="Tell us about your order: what's in it, how you customized it, why it's elite..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <span className="char-count">{description.length}/500</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Photo <span className="required">*</span>
                </label>
                <div
                  className={`image-upload-area${imagePreview ? ' has-image' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">📷</span>
                      <span className="upload-text">Click to upload a photo of your order</span>
                      <span className="upload-hint">JPG, PNG, GIF, WEBP up to 10MB</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                {imagePreview && (
                  <button
                    type="button"
                    className="btn-change-image"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change photo
                  </button>
                )}
              </div>

              <div className="form-actions">
                <Link to="/" className="btn-cancel">Cancel</Link>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
