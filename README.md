# PulseTick
- Self-Destructing Chat Application
A full-stack real-time chat application with self-destructing group chats that expire automatically.

## Features

- **Self-Destructing Groups**: Chat groups automatically expire and delete after a set time
- **Real-time Messaging**: Instant messaging with Socket.io
- **Media Support**: Upload and share images and files via Cloudinary
- **Message Reactions**: React to messages with emojis
- **Message Threading**: Reply to specific messages
- **Typing Indicators**: See when others are typing
- **JWT Authentication**: Secure user authentication with refresh tokens
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: Theme toggle support

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- MongoDB with Mongoose (TTL indexes for auto-deletion)
- Socket.io for real-time communication
- JWT authentication with refresh tokens
- Cloudinary for media uploads
- Background cleanup jobs
- Rate limiting and security middleware

### Frontend
- React + Vite + TypeScript
- Tailwind CSS for styling
- Zustand for state management
- React Hook Form + Zod for form validation
- Radix UI components
- Socket.io client
- Axios for API calls

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for media uploads)
- Redis (optional, for session storage)

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd PulseTick
```

### 2. Install backend dependencies
```bash
cd apps/server
npm install
```

### 3. Install frontend dependencies
```bash
cd ../web
npm install
```

### 4. Set up environment variables

#### Backend (.env in apps/server/)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pulsetick

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT Secrets (change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env in apps/web/)
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 5. Set up Cloudinary
1. Create a free account at [Cloudinary](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Update the environment variables in the backend .env file

### 6. Set up MongoDB
- **Local MongoDB**: Install MongoDB locally and ensure it's running on port 27017
- **MongoDB Atlas**: Create a free cluster and update the MONGODB_URI in your .env file

## Running the Application

### Development Mode

1. **Start the backend server:**
```bash
cd apps/server
npm run dev
```
The server will start on http://localhost:5000

2. **Start the frontend development server:**
```bash
cd apps/web
npm run dev
```
The frontend will start on http://localhost:3000

### Production Build

1. **Build the frontend:**
```bash
cd apps/web
npm run build
```

2. **Start the backend in production mode:**
```bash
cd apps/server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create a new group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/join` - Join group with invite code
- `POST /api/groups/:id/leave` - Leave group
- `GET /api/groups/:id/members` - Get group members
- `PUT /api/groups/:id/members/:userId/role` - Update member role
- `POST /api/groups/:id/members/:userId/ban` - Ban member
- `POST /api/groups/:id/regenerate-code` - Regenerate invite code

### Messages
- `GET /api/messages/:groupId` - Get messages for a group
- `POST /api/messages` - Send a message
- `PUT /api/messages/:id` - Edit a message
- `DELETE /api/messages/:id` - Delete a message
- `POST /api/messages/:id/reactions` - Add reaction to message
- `DELETE /api/messages/:id/reactions` - Remove reaction from message
- `GET /api/messages/:groupId/search` - Search messages

### Uploads
- `POST /api/upload/signed-url` - Get signed upload URL
- `DELETE /api/upload/media/:publicId` - Delete media
- `GET /api/upload/media/:publicId` - Get media info

## Socket.io Events

### Client to Server
- `join_group` - Join a group room
- `leave_group` - Leave a group room
- `send_message` - Send a message
- `start_typing` - Start typing indicator
- `stop_typing` - Stop typing indicator
- `message_reaction` - Add/remove message reaction

### Server to Client
- `message_received` - New message received
- `message_updated` - Message was edited
- `message_deleted` - Message was deleted
- `user_typing` - User started typing
- `user_stopped_typing` - User stopped typing
- `reaction_added` - Reaction added to message
- `reaction_removed` - Reaction removed from message

## Group Expiry System

Groups automatically expire based on the duration set during creation:
- **1 hour** (minimum)
- **6 hours**
- **1 day**
- **3 days**
- **1 week**
- **1 month**

When a group expires:
1. The group and all its messages are deleted from the database
2. Associated media files are removed from Cloudinary
3. Users are notified that the group has expired
4. Background cleanup service ensures complete removal

## Security Features

- JWT authentication with access and refresh tokens
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- CORS protection
- Helmet.js security headers
- Input validation with Zod
- File upload validation
- Signed Cloudinary URLs for secure uploads

## Development

### Project Structure
```
PulseTick/
├── apps/
│   ├── server/          # Backend application
│   │   ├── src/
│   │   │   ├── config/  # Database, logger, Cloudinary config
│   │   │   ├── controllers/  # Route handlers
│   │   │   ├── middlewares/  # Auth, validation, error handling
│   │   │   ├── models/  # Mongoose schemas
│   │   │   ├── routes/  # Express routes
│   │   │   ├── services/  # Background services
│   │   │   ├── sockets/  # Socket.io handlers
│   │   │   ├── utils/   # Utility functions
│   │   │   ├── validators/  # Zod schemas
│   │   │   ├── app.ts   # Express app setup
│   │   │   └── index.ts # Server entry point
│   │   └── package.json
│   └── web/             # Frontend application
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── lib/     # Utilities and API client
│       │   ├── pages/   # Page components
│       │   ├── store/   # Zustand stores
│       │   ├── App.tsx  # Main app component
│       │   └── main.tsx # React entry point
│       └── package.json
└── README.md
```

### Available Scripts

#### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
