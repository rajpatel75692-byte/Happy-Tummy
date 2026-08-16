# Happy Tummy — Food Provider Portal

A responsive MERN food-provider dashboard for managing a kitchen's menu and orders.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

Use the pre-filled demo login:

- Email: `rajpatel75692@gmail.com`
- Password: `raj123`

The app runs immediately with demonstration data. To persist data, copy `.env.example` to `.env` and add a `MONGODB_URI` connection string. With MongoDB configured, menu items and orders are stored in MongoDB.

## Included

- JWT-protected provider login
- Dashboard metrics, incoming order updates, and top dishes
- Menu availability toggling and add-dish form
- Responsive desktop and mobile interface
- Express REST API and optional MongoDB/Mongoose persistence
