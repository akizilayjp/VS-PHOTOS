import React, { useState, useEffect } from 'react'
import { Container, Grid, Card, CardContent, Typography, Button, Box, TextField, InputAdornment, Chip, Alert } from '@mui/material'
import { Search as SearchIcon, PhotoLibrary as PhotoLibraryIcon, Download as DownloadIcon } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { clientAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface Item {
  id: number
  sku: string
  title: string
  barcode?: string
  asin?: string
  fnsku?: string
  price?: number
  quantity?: number
  hs_code?: string
  photo_count: number
  created_at: string
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      handleSearch()
    } else {
      setFilteredItems(items)
    }
  }, [searchQuery, searchField, items])

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const response = await clientAPI.getItems()
      setItems(response.data.items)
      setFilteredItems(response.data.items)
    } catch (err: any) {
      setError('Failed to load items')
      console.error('Error fetching items:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    try {
      const response = await clientAPI.searchItems(searchQuery, searchField)
      setFilteredItems(response.data.items)
    } catch (err: any) {
      setError('Search failed')
      console.error('Error searching items:', err)
    }
  }

  const handleDownloadSelected = (selectedItems: Item[]) => {
    const itemIds = selectedItems.map(item => item.id)
    downloadSelectedPhotos(itemIds)
  }

  const downloadSelectedPhotos = async (itemIds: number[]) => {
    try {
      const response = await clientAPI.downloadSelectedPhotos(itemIds)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `selected-items-photos-${Date.now()}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError('Download failed')
      console.error('Error downloading photos:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to Shipnavi3PL Database
          </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          View and manage your items and photos
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Search Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search items by SKU, title, barcode, or ASIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Search Field"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="all">All Fields</option>
                <option value="sku">SKU</option>
                <option value="title">Title</option>
                <option value="barcode">Barcode</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={fetchItems}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <Grid container spacing={3}>
        {isLoading ? (
          Array.from(new Array(6)).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card sx={{ height: 200, animation: 'pulse 1.5s infinite' }}>
                <CardContent>
                  <Box sx={{ mb: 2, height: 20, backgroundColor: 'grey.300', borderRadius: 1 }} />
                  <Box sx={{ mb: 1, height: 16, backgroundColor: 'grey.200', borderRadius: 1, width: '60%' }} />
                  <Box sx={{ height: 14, backgroundColor: 'grey.200', borderRadius: 1, width: '40%' }} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.3s ease',
                }}
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhotoLibraryIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      {item.title}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      SKU: {item.sku}
                    </Typography>
                    {item.barcode && (
                      <Typography variant="body2" color="text.secondary">
                        Barcode: {item.barcode}
                      </Typography>
                    )}
                    {item.asin && (
                      <Typography variant="body2" color="text.secondary">
                        ASIN: {item.asin}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`${item.photo_count} photos`} 
                      color={item.photo_count > 0 ? "success" : "default"}
                      size="small"
                    />
                    {item.price && (
                      <Chip 
                        label={`$${item.price}`} 
                        color="primary"
                        size="small"
                      />
                    )}
                    {item.quantity && (
                      <Chip 
                        label={`${item.quantity} in stock`} 
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Added: {formatDate(item.created_at)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <PhotoLibraryIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  {searchQuery ? 'No items found matching your search' : 'No items found'}
                </Typography>
                {searchQuery && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Try adjusting your search terms or search field
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  )
}

export default Dashboard