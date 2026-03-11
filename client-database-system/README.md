# Shipnavi3PL Database

A comprehensive web application for managing client data and photo collections. This system allows administrators to import item data via CSV files and upload photos, while clients can view their items and download photos.

## Features

### Admin Features
- **CSV Import**: Bulk import item data with 8 fields (SKU, Title, Barcode, ASIN, FNSKU, Price, Quantity, HS Code)
- **Photo Upload**: Mobile-friendly photo upload with camera integration (up to 10 photos per item)
- **Client Management**: View and manage client accounts
- **Item Management**: Create and manage items for clients

### Client Features
- **Secure Login**: Role-based authentication system
- **Item Dashboard**: View all items with photo counts and details
- **Photo Gallery**: Browse photos for each item
- **Bulk Downloads**: Download all photos for an item or selected items as ZIP files
- **Search Functionality**: Search items by SKU, title, barcode, or ASIN

### Technical Features
- **Mobile-First Design**: Responsive interface that works on desktop, tablet, and mobile
- **Real-time Photo Capture**: Admins can use iPad/phone camera for instant photo upload
- **Image Optimization**: Automatic image compression and optimization
- **Secure File Storage**: Organized file storage with access control
- **Database**: PostgreSQL with optimized schema for 20,000+ items and 200,000+ photos

## Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **Multer** for file uploads
- **Sharp** for image processing
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React** with TypeScript
- **Material-UI** for UI components
- **React Router** for navigation
- **React Dropzone** for drag-and-drop uploads
- **Axios** for API calls

## Project Structure

```
client-database-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # Database configuration
│   │   ├── middleware/
│   │   │   └── auth.js          # Authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js          # Authentication routes
│   │   │   ├── admin.js         # Admin panel routes
│   │   │   ├── client.js        # Client portal routes
│   │   │   └── photos.js        # Photo management routes
│   │   ├── database/
│   │   │   └── schema.sql       # Database schema
│   │   └── index.js             # Main server file
│   ├── package.json
│   └── uploads/                 # Photo storage directory
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── pages/               # Page components
│   │   ├── contexts/            # React contexts
│   │   ├── services/            # API service functions
│   │   ├── App.tsx              # Main app component
│   │   ├── main.tsx             # App entry point
│   │   └── index.css            # Global styles
│   ├── package.json
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig.json            # TypeScript configuration
│   └── index.html               # HTML template
└── README.md
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd client-database-system/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the backend directory with the following variables:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   DB_NAME=client_database
   JWT_SECRET=your_jwt_secret_key
   ADMIN_EMAIL=admin@yourdomain.com
   CLIENT_URL=http://localhost:3000
   ```

4. Set up the database:
   - Create a PostgreSQL database named `client_database`
   - The application will automatically run the schema.sql file on startup

5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd client-database-system/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### For Administrators

1. **Access Admin Panel**: Navigate to `/admin` after logging in
2. **Import CSV Data**: Use the CSV import feature to bulk upload item data
3. **Upload Photos**: Go to `/upload/{itemId}` to upload photos for specific items
4. **Manage Clients**: View and manage client accounts and their items

### For Clients

1. **Registration**: New clients can register at `/register`
2. **Login**: Existing clients can login at `/login`
3. **View Items**: Dashboard shows all items with photo counts
4. **View Photos**: Click on any item to see its photos
5. **Download Photos**: Download individual item photos or select multiple items for bulk download

### CSV Import Format

The CSV file should have the following columns:

**Required:**
- `SKU` - Stock Keeping Unit
- `Title` - Item title/description

**Optional:**
- `Barcode` - Item barcode
- `ASIN` - Amazon Standard Identification Number
- `FNSKU` - Fulfillment Network Stock Keeping Unit
- `Price` - Item price
- `Quantity` - Item quantity
- `HS_Code` - Harmonized System code
- `Client_Email` - Client email (for automatic client creation)
- `Client_Name` - Client name

**Example CSV:**
```csv
SKU,Title,Barcode,ASIN,Price,Quantity,Client_Email
ITEM001,"Wireless Headphones","123456789","B08N5WRWNW",99.99,50,client@example.com
ITEM002,"Bluetooth Speaker","987654321","B0863FXWMY",49.99,100,client@example.com
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

### Admin
- `POST /api/admin/import-csv` - CSV import
- `POST /api/admin/items` - Create item
- `GET /api/admin/clients` - Get all clients
- `GET /api/admin/clients/{id}/items` - Get client items

### Photos
- `POST /api/photos/upload` - Upload single photo
- `POST /api/photos/upload-batch` - Upload multiple photos
- `GET /api/photos/item/{id}` - Get photos for item
- `DELETE /api/photos/{id}` - Delete photo

### Client
- `GET /api/client/items` - Get client items
- `GET /api/client/items/{id}` - Get specific item
- `GET /api/client/items/{id}/download` - Download item photos
- `POST /api/client/download-selected` - Download selected photos
- `GET /api/client/profile` - Get client profile
- `GET /api/client/search` - Search items

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Proper CORS setup for frontend-backend communication
- **File Type Validation**: Only allows image files for photo uploads
- **File Size Limits**: 10MB limit per photo upload

## Performance Optimizations

- **Image Compression**: Automatic image optimization (1200x800, 80% quality)
- **Database Indexing**: Optimized database queries with proper indexing
- **Pagination**: Efficient data loading for large datasets
- **Caching**: Strategic caching for frequently accessed data
- **Lazy Loading**: Image lazy loading for better page performance

## Deployment

### Backend Deployment
The backend can be deployed to any Node.js hosting service (Heroku, DigitalOcean, AWS, etc.). Make sure to:
- Set up environment variables
- Configure PostgreSQL database
- Set up proper CORS settings for your frontend domain

### Frontend Deployment
The frontend can be built and deployed to any static hosting service:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Check your PostgreSQL connection settings in `.env`
2. **CORS Errors**: Ensure `CLIENT_URL` in backend `.env` matches your frontend URL
3. **File Upload Errors**: Check that the `uploads` directory exists and has write permissions
4. **JWT Errors**: Verify `JWT_SECRET` is set and consistent across restarts

### Development Tips

- Use browser developer tools to monitor API calls
- Check server logs for backend errors
- Use React Developer Tools for frontend debugging
- Monitor network requests for file upload issues

## Support

For support and questions:
- Check the console for error messages
- Review the API documentation in the route files
- Ensure all dependencies are properly installed

## License

This project is open source and available under the [MIT License](LICENSE).

## Branding

This application is branded as **Shipnavi3PL Database** and includes:
- Custom application name throughout frontend and backend
- Branded API responses and headers
- Consistent naming in package.json and configuration files
- Professional 3PL (Third-Party Logistics) focused interface
