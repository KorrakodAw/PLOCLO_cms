📦 Ploclo CMS

Ploclo CMS is a web application using Next.js frontend, Node.js backend, PostgreSQL database, and Prisma ORM.
This guide explains how to set up and run the project using Docker.

🚀 Prerequisites

Docker Desktop

Node.js
(optional for local development)

Git

🔽 Clone the Repository
git clone <your-repo-url>
cd ploclo-cms

⚙️ Backend .env

Create a .env file in the backend/ folder:

DATABASE_URL="postgresql://postgres:admin123@postgres:5432/myapp"
JWT_SECRET="your_jwt_secret_here"
PORT=3001

Note: The DATABASE_URL host must be postgres to match the Docker service name.

🐳 Docker Setup

docker-compose.yml:

version: "3.9"

services:
postgres:
image: postgres:15
container_name: postgres
environment:
POSTGRES_USER: postgres
POSTGRES_PASSWORD: admin123
POSTGRES_DB: myapp
ports: - "5432:5432"

backend:
build: ./backend
container_name: backend
depends_on: - postgres
env_file: - ./backend/.env
ports: - "3001:3001"
command: sh -c "sleep 5 && npx prisma db push && node dist/index.js"

frontend:
build: ./frontend
container_name: frontend
ports: - "3000:3000"

Explanation:

sleep 5 → Waits for Postgres to start.

npx prisma db push → Syncs Prisma schema to the database.

node dist/index.js → Starts the backend server.

▶️ Running the Project

Build and start all services:

docker-compose up -d --build

Check running containers:

docker ps

Access the services:

Frontend: http://localhost:3000

Backend: http://localhost:3001

PostgreSQL: localhost:5432

🛠 Prisma Commands

Sync Prisma schema to the database:

docker exec -it backend npx prisma db push

Reset database (WARNING: deletes all data):

docker exec -it backend npx prisma migrate reset

🌍 Pulling on Another Machine

Clone the repo:

git clone <your-repo-url>
cd ploclo-cms

Add .env in backend/.

Start Docker:

docker-compose up -d --build

The backend automatically pushes the Prisma schema to the database.

⚠️ Notes

The backend container uses postgres as the database host. Ensure .env matches this.

For development, prisma db push is simpler than migrations.

After adding new tables or fields, update the Prisma schema and rerun:

docker exec -it backend npx prisma db push

If you want, I can also add a "Quick Setup One-Liner" so a new developer can start everything in one command—super handy for onboarding.

Do you want me to do that too?

คุณพูดว่า:
make it easy to read when i was in readme.md
ChatGPT พูดว่า:

Absolutely! We can make it super clean and easy to read for a README.md, using short sections, clear headings, and code blocks. Here’s a simplified, developer-friendly version:

📦 Ploclo CMS

Ploclo CMS is a web application with:

Next.js frontend

Node.js backend

PostgreSQL database

Prisma ORM

This guide shows how to set up and run the project using Docker.

🚀 Prerequisites

Docker Desktop

Git

Node.js (optional for local development)

🔽 Clone the Project
git clone <your-repo-url>
cd ploclo-cms

⚙️ Backend .env

Create a .env file in backend/:

DATABASE_URL="postgresql://postgres:admin123@postgres:5432/myapp"
JWT_SECRET="your_jwt_secret_here"
PORT=3001

Make sure the DATABASE_URL host is postgres (matches Docker service name).

🐳 Docker Setup

docker-compose.yml:

version: "3.9"

services:
postgres:
image: postgres:15
container_name: postgres
environment:
POSTGRES_USER: postgres
POSTGRES_PASSWORD: admin123
POSTGRES_DB: myapp
ports: - "5432:5432"

backend:
build: ./backend
container_name: backend
depends_on: - postgres
env_file: - ./backend/.env
ports: - "3001:3001"
command: sh -c "sleep 5 && npx prisma db push && node dist/index.js"

frontend:
build: ./frontend
container_name: frontend
ports: - "3000:3000"

Explanation:

sleep 5 → Waits for Postgres to start

npx prisma db push → Syncs Prisma schema to the database

node dist/index.js → Starts backend server

▶️ Run the Project

Start all services:

docker-compose up -d --build

Check running containers:

docker ps

Access:

Frontend: http://localhost:3000

Backend: http://localhost:3001

PostgreSQL: localhost:5432

🛠 Prisma Commands

Sync Prisma schema:

docker exec -it backend npx prisma db push

Reset database (WARNING: deletes all data):

docker exec -it backend npx prisma migrate reset

🌍 Setup on Another Machine

Clone repo:

git clone <your-repo-url>
cd ploclo-cms

Add .env in backend/.

Start Docker:

docker-compose up -d --build

Backend automatically pushes Prisma schema.

⚠️ Notes

Backend uses postgres as DB host; .env must match.

For development, prisma db push is simpler than migrations.

After changing schema, run:

docker exec -it backend npx prisma db push
