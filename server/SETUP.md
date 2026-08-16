# MongoDB Setup Instructions

## Option 1: Using MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster
4. Get the connection string
5. Update `MONGODB_URI` in `server/.env` with your connection string

## Option 2: Using MongoDB Community (Local)

### Windows:
1. Download from https://www.mongodb.com/try/download/community
2. Run the installer and follow the steps
3. MongoDB will run on `mongodb://localhost:27017` by default

### Using Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Running the Backend

```bash
cd server
npm install
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

- `POST /api/honeypot-engage` - Engage with scammer message
- `GET /api/honeypot-stats` - Get statistics
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id/messages` - Get messages for a conversation
- `GET /api/health` - Health check

## Environment Variables

Create a `.env` file in the `server/` directory:

```
MONGODB_URI=mongodb://localhost:27017/scam-sentinel
PORT=3001
NODE_ENV=development
```
