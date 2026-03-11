import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Add Shipnavi3PL branding to requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Client-App': 'Shipnavi3PL-Database'
})

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear auth state
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API endpoints
export const authAPI = {
  login: async (email: string, password: string) => {
    return api.post('/auth/login', { email, password })
  },
  
  register: async (name: string, email: string, password: string) => {
    return api.post('/auth/register', { name, email, password })
  },
  
  verifyToken: async (token: string) => {
    return api.get('/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }
}

// Admin API endpoints
export const adminAPI = {
  // CSV Import
  importCSV: async (file: File, clientId?: number) => {
    const formData = new FormData()
    formData.append('csvFile', file)
    if (clientId) {
      formData.append('clientId', clientId.toString())
    }
    
    return api.post('/admin/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Item Management
  createItem: async (itemData: {
    client_id: number
    sku: string
    title: string
    barcode?: string
    asin?: string
    fnsku?: string
    price?: number
    quantity?: number
    hs_code?: string
  }) => {
    return api.post('/admin/items', itemData)
  },

  // Client Management
  getClients: async () => {
    return api.get('/admin/clients')
  },

  getClientItems: async (clientId: number) => {
    return api.get(`/admin/clients/${clientId}/items`)
  }
}

// Photo API endpoints
export const photoAPI = {
  // Upload single photo
  uploadPhoto: async (itemId: number, file: File) => {
    const formData = new FormData()
    formData.append('item_id', itemId.toString())
    formData.append('photo', file)
    
    return api.post('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Upload multiple photos
  uploadPhotos: async (itemId: number, files: File[]) => {
    const formData = new FormData()
    formData.append('item_id', itemId.toString())
    files.forEach(file => {
      formData.append('photos', file)
    })
    
    return api.post('/photos/upload-batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Get photos for item
  getPhotos: async (itemId: number) => {
    return api.get(`/photos/item/${itemId}`)
  },

  // Delete photo
  deletePhoto: async (photoId: number) => {
    return api.delete(`/photos/${photoId}`)
  }
}

// Client API endpoints
export const clientAPI = {
  // Get client items
  getItems: async () => {
    return api.get('/client/items')
  },

  // Get specific item with photos
  getItem: async (itemId: number) => {
    return api.get(`/client/items/${itemId}`)
  },

  // Download item photos
  downloadItemPhotos: async (itemId: number) => {
    return api.get(`/client/items/${itemId}/download`, {
      responseType: 'blob',
    })
  },

  // Download selected items photos
  downloadSelectedPhotos: async (itemIds: number[]) => {
    return api.post('/client/download-selected', { itemIds }, {
      responseType: 'blob',
    })
  },

  // Get client profile
  getProfile: async () => {
    return api.get('/client/profile')
  },

  // Search items
  searchItems: async (query: string, field?: string) => {
    const params = field ? { q: query, field } : { q: query }
    return api.get('/client/search', { params })
  }
}

export default api