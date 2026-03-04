# Leave Management Backend

This backend is developed for the **Leave Management System** using **Node.js, Express.js, and MongoDB**.  
It provides APIs for managing employees, leaves, attendance, salary, tasks, and documents.

---

## Tech Stack

- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Multer (File Upload)
- CORS

---

## Installation

Clone the repository

git clone https://github.com/your-repo/leave_backend.git

Install dependencies

npm install

Run the server

npm run dev

---

## Environment Variables

Create a `.env` file in the root folder and add:

PORT=5000  
MONGO_URI=your_mongodb_connection_string  
JWT_SECRET=your_secret_key

---

## API Base URL

http://localhost:5000/api

Example APIs:

POST /api/auth/login  
POST /api/auth/register  
GET /api/leave  
POST /api/leave

---

## Features

- Authentication (Admin / Employee)
- Leave Management
- Attendance Management
- Salary Management
- Task Management
- Document Upload
- Company Expense Tracking

---

## Folder Structure

leave_backend
│
├── config
├── controllers
├── middleware
├── models
├── routes
├── uploads
├── server.js
└── package.json
