import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Grid, Card, CardContent, Typography, Button, Box, Alert, Chip, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material'
import { ArrowBack as ArrowBackIcon, PhotoCamera as PhotoCameraIcon, PhotoLibrary as PhotoLibraryIcon, Delete as DeleteIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { photoAPI } from '../services/api'

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
  sku: string
  title: string
  photo_count: number
}

const PhotoUpload: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    fetchItemAndPhotos()
  }, [itemId])

  const fetchItemAndPhotos = async () => {
    try {
      setIsLoading(true)
      const itemResponse = await photoAPI.getPhotos(parseInt(itemId!))
      setItem(itemResponse.data.item)
      setPhotos(itemResponse.data.photos)
    } catch (err: any) {
      setError('Failed to load item and photos')
      console.error('Error fetching item and photos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const onDrop = async (acceptedFiles: File[]) => {
    if (!item) return

    // Check if adding these files would exceed the limit
    if (photos.length + acceptedFiles.length > 10) {
      setError('Cannot upload more than 10 photos per item')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      // Upload files one by one to show progress
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i]
        setUploadProgress(Math.round((i / acceptedFiles.length) * 100))
        
        await photoAPI.uploadPhoto(item.id, file)
      }

      // Refresh photos list
      fetchItemAndPhotos()
      
    } catch (err: any) {
      setError('Photo upload failed. Please try again.')
      console.error('Error uploading photos:', err)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading || photos.length >= 10
  })

  const handleDeletePhoto = async (photoId: number) => {
    try {
      await photoAPI.deletePhoto(photoId)
      setPhotos(prev => prev.filter(photo => photo.id !== photoId))
    } catch (err: any) {
      setError('Failed to delete photo')
      console.error('Error deleting photo:', err)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="info">Loading item and photos...</Alert>
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
            onClick={() => navigate('/admin')}
            sx={{ mt: 2 }}
          >
            Back to Admin Panel
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
          onClick={() => navigate('/admin')}
          sx={{ mb: 2 }}
        >
          Back to Admin Panel
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
              <Box>
                <Typography variant="h4" component="h1">
                  {item.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  SKU: {item.sku}
                </Typography>
              </Box>
            </Box>
            
            <Chip 
              label={`${item.photo_count}/10 photos`} 
              color={item.photo_count >= 10 ? "error" : item.photo_count > 0 ? "success" : "default"}
              size="small"
            />
          </CardContent>
        </Card>

        {/* Photo Upload Area */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Shipnavi3PL Photo Upload
          </Typography>
            
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.400',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                mb: 2,
                opacity: isUploading || photos.length >= 10 ? 0.5 : 1,
                pointerEvents: isUploading || photos.length >= 10 ? 'none' : 'auto',
              }}
            >
              <input {...getInputProps()} />
              <PhotoCameraIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {isDragActive ? 'Drop the files here ...' : 'Drag & drop photos here, or click to select files'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports: JPEG, PNG, GIF, WebP (Max 10MB each)
              </Typography>
              {photos.length >= 10 && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Maximum 10 photos allowed for this item
                </Typography>
              )}
            </Box>

            {isUploading && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Uploading... {uploadProgress}%
                </Typography>
                <Box sx={{ width: '100%', height: 4, backgroundColor: 'grey.300', borderRadius: 2, mt: 1 }}>
                  <Box 
                    sx={{ 
                      height: '100%', 
                      width: `${uploadProgress}%`, 
                      backgroundColor: 'primary.main',
                      borderRadius: 2
                    }} 
                  />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Existing Photos */}
        <Card>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Existing Photos ({photos.length})
            </Typography>
            
            {photos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PhotoLibraryIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No photos uploaded yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Upload photos using the area above
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {photos.map((photo) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                    <Card sx={{ position: 'relative' }}>
                      <img
                        src={photo.file_path}
                        alt={photo.original_filename}
                        style={{ width: '100%', height: 150, objectFit: 'cover' }}
                      />
                      <Box sx={{ p: 1 }}>
                        <Typography variant="caption" display="block" noWrap>
                          {photo.original_filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatFileSize(photo.file_size)} • {formatDate(photo.created_at)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                          }
                        }}
                        onClick={() => handleDeletePhoto(photo.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Card>
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

export default PhotoUpload