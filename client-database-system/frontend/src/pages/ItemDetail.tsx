import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Grid, Card, CardContent, Typography, Button, Box, Chip, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material'
import { ArrowBack as ArrowBackIcon, PhotoLibrary as PhotoLibraryIcon, Download as DownloadIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { clientAPI, photoAPI } from '../services/api'

interface Photo {
  id: number
  filename: string
  original_filename: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
}

interface Item {
  id: number
  client_id: number
  sku: string
  title: string
  barcode?: string
  asin?: string
  fnsku?: string
  price?: number
  quantity?: number
  hs_code?: string
  created_at: string
  photos: Photo[]
}

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [item, setItem] = useState<Item | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([])

  useEffect(() => {
    fetchItem()
  }, [id])

  const fetchItem = async () => {
    try {
      setIsLoading(true)
      const response = await clientAPI.getItem(parseInt(id!))
      setItem(response.data.item)
    } catch (err: any) {
      setError('Failed to load item details')
      console.error('Error fetching item:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!item) return

    try {
      setIsDownloading(true)
      const response = await clientAPI.downloadItemPhotos(item.id)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `item-${item.sku}-photos.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError('Download failed')
      console.error('Error downloading photos:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadSelected = async () => {
    if (!item || selectedPhotos.length === 0) return

    try {
      setIsDownloading(true)
      const response = await clientAPI.downloadSelectedPhotos(selectedPhotos)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `item-${item.sku}-selected-photos.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError('Download failed')
      console.error('Error downloading selected photos:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="info">Loading item details...</Alert>
        </Box>
      </Container>
    )
  }

  if (!item) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Item not found</Alert>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/dashboard')}
            sx={{ mt: 2 }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Item Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PhotoLibraryIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
              <Typography variant="h4" component="h1">
                {item.title}
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" color="text.secondary">
                  <strong>SKU:</strong> {item.sku}
                </Typography>
                {item.barcode && (
                  <Typography variant="body1" color="text.secondary">
                    <strong>Barcode:</strong> {item.barcode}
                  </Typography>
                )}
                {item.asin && (
                  <Typography variant="body1" color="text.secondary">
                    <strong>ASIN:</strong> {item.asin}
                  </Typography>
                )}
                {item.fnsku && (
                  <Typography variant="body1" color="text.secondary">
                    <strong>FNSKU:</strong> {item.fnsku}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                {item.price && (
                  <Typography variant="body1" color="text.secondary">
                    <strong>Price:</strong> ${item.price}
                  </Typography>
                )}
                {item.quantity && (
                  <Typography variant="body1" color="text.secondary">
                    <strong>Quantity:</strong> {item.quantity}
                  </Typography>
                )}
                {item.hs_code && (
                  <Typography variant="body1" color="text.secondary">
                    <strong>HS Code:</strong> {item.hs_code}
                  </Typography>
                )}
                <Typography variant="body1" color="text.secondary">
                  <strong>Added:</strong> {formatDate(item.created_at)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Photos ({item.photos.length}/10)
              </Typography>
              <Box>
                {selectedPhotos.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadSelected}
                    disabled={isDownloading}
                    sx={{ mr: 1 }}
                  >
                    Download Selected ({selectedPhotos.length})
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadAll}
                  disabled={isDownloading || item.photos.length === 0}
                >
                  {isDownloading ? 'Downloading...' : 'Download All'}
                </Button>
              </Box>
            </Box>

            {item.photos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PhotoLibraryIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No photos available for this item
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Photos will be added by the administrator
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2} className="photo-grid">
                {item.photos.map((photo) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                    <Card className="photo-card">
                      <img
                        src={photo.file_path}
                        alt={photo.original_filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onClick={() => togglePhotoSelection(photo.id)}
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                          }}
                        >
                          ✓
                        </Box>
                      )}
                    </Card>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {photo.original_filename} ({formatFileSize(photo.file_size)})
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}

export default ItemDetail