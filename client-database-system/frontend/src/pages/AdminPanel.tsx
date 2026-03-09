import React, { useState, useEffect } from 'react'
import { Container, Grid, Card, CardContent, Typography, Button, Box, Alert, TextField, Chip } from '@mui/material'
import { CloudUpload as CloudUploadIcon, Person as PersonIcon, Storage as StorageIcon, Download as DownloadIcon } from '@mui/icons-material'
import { adminAPI } from '../services/api'

interface Client {
  id: number
  name: string
  email: string
  created_at: string
}

interface ClientItem {
  id: number
  sku: string
  title: string
  photo_count: number
  created_at: string
}

const AdminPanel: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await adminAPI.getClients()
      setClients(response.data.clients)
    } catch (err: any) {
      setError('Failed to load clients')
      console.error('Error fetching clients:', err)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please select a valid CSV file')
        return
      }
      setSelectedFile(file)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file to upload')
      return
    }

    setIsLoading(true)
    setUploadProgress(0)
    setError('')
    setSuccess('')

    try {
      const response = await adminAPI.importCSV(selectedFile)
      
      setSuccess(`CSV import completed successfully!`)
      setUploadProgress(100)
      
      // Refresh clients list
      fetchClients()
      
      // Reset file input
      setSelectedFile(null)
      
    } catch (err: any) {
      setError('CSV import failed. Please check the file format and try again.')
      console.error('Error uploading CSV:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Manage clients and import item data
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* CSV Import Section */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudUploadIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Typography variant="h6" component="h2">
                  CSV Import
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload a CSV file to import item data. The CSV should contain the following columns:
              </Typography>
              
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" component="div">
                  <strong>Required:</strong> SKU, Title
                </Typography>
                <Typography variant="caption" component="div">
                  <strong>Optional:</strong> Barcode, ASIN, FNSKU, Price, Quantity, HS Code, Client_Email, Client_Name
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={isLoading}
                >
                  Select CSV File
                  <input
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleFileSelect}
                  />
                </Button>
                
                {selectedFile && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Selected: {selectedFile.name}
                    </Typography>
                    <Chip 
                      label={`${selectedFile.size} bytes`} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                )}
              </Box>

              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudUploadIcon />}
                onClick={handleUpload}
                disabled={!selectedFile || isLoading}
                fullWidth
              >
                {isLoading ? `Uploading... ${uploadProgress}%` : 'Import CSV'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Clients Management Section */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Typography variant="h6" component="h2">
                  Clients ({clients.length})
                </Typography>
              </Box>

              {clients.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <StorageIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No clients found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Clients will be created when importing CSV files or when they register
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {clients.map((client) => (
                    <Grid item xs={12} key={client.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="h6">{client.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {client.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Registered: {formatDate(client.created_at)}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={async () => {
                                  try {
                                    const response = await adminAPI.getClientItems(client.id)
                                    // Handle client items download or display
                                    console.log('Client items:', response.data.items)
                                  } catch (err) {
                                    console.error('Error fetching client items:', err)
                                  }
                                }}
                              >
                                View Items
                              </Button>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}

export default AdminPanel