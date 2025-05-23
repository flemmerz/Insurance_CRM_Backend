# Insurance CRM Backend API

A comprehensive Node.js/Express.js backend API for the Insurance CRM system with PostgreSQL database.

## 🚀 Features

- **RESTful API** with Express.js
- **PostgreSQL Database** with comprehensive schema
- **JWT Authentication** with role-based access control
- **Input Validation** with express-validator
- **Request Rate Limiting** for security
- **File Upload Support** with Multer
- **Comprehensive Logging** with Winston
- **Error Handling** with custom error classes
- **Database Migrations** and seeding
- **API Documentation** with built-in endpoints
- **Docker Support** for easy deployment

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/flemmerz/Insurance_CRM_Backend.git
   cd Insurance_CRM_Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb insurance_crm
   
   # Run setup script
   npm run db:setup
   
   # Seed with sample data
   npm run db:seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🐳 Quick Start with Docker

1. **Clone and configure**
   ```bash
   git clone https://github.com/flemmerz/Insurance_CRM_Backend.git
   cd Insurance_CRM_Backend
   cp .env.example .env
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Initialize database**
   ```bash
   docker-compose exec api npm run db:seed
   ```

The API will be available at `http://localhost:3001`

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Default Login Credentials
- **Username**: `demo_agent`
- **Password**: `password123`

### Main Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - Register new user (admin only)
- `GET /auth/profile` - Get user profile
- `POST /auth/refresh` - Refresh token

#### Companies
- `GET /companies` - List companies
- `POST /companies` - Create company
- `GET /companies/:id` - Get company details
- `PUT /companies/:id` - Update company
- `DELETE /companies/:id` - Delete company

#### Dashboard
- `GET /dashboard/metrics` - Dashboard metrics
- `GET /dashboard/recent-activities` - Recent activities
- `GET /dashboard/upcoming-tasks` - Upcoming tasks

#### Reports
- `GET /reports/companies` - Company reports
- `GET /reports/policies` - Policy reports
- `GET /reports/revenue` - Revenue reports

## 🗄️ Database Schema

The database includes the following main entities:
- **Companies** - Business clients
- **Contacts** - Individual contacts within companies  
- **Policies** - Insurance policies and accounts
- **Tasks** - Work items and follow-ups
- **Staff Users** - System users with roles
- **Business Profiles** - Company business information
- **Risk Factors** - Risk assessment data

## 🔐 User Roles

- **Admin** - Full system access
- **Manager** - Management level access  
- **Agent** - Sales and client management
- **Underwriter** - Policy and risk assessment
- **Claims Adjuster** - Claims processing

## 🔧 Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DB_HOST` | Database host | `localhost` |
| `DB_NAME` | Database name | `insurance_crm` |
| `JWT_SECRET` | JWT secret key | Required |

## 🧪 Testing the API

1. **Login to get token**
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "demo_agent", "password": "password123"}'
   ```

2. **Use token for authenticated requests**
   ```bash
   curl -X GET http://localhost:3001/api/v1/companies \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## 📊 Database Management

```bash
# Set up database schema
npm run db:setup

# Seed database with sample data
npm run db:seed

# Run database migrations
npm run db:migrate

# Reset database (setup + seed)
npm run db:reset
```

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure proper CORS origins
4. Set up SSL/TLS
5. Configure reverse proxy
6. Set up database backups
7. Configure monitoring

### Health Check

The API includes a health check endpoint:
```
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support:
- Create an issue on GitHub
- Check the API documentation at `/api/v1`
- Review logs for debugging

---

**API Documentation**: http://localhost:3001/api/v1  
**Health Check**: http://localhost:3001/health
