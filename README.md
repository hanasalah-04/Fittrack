> FITTRACK GYM SYSTEM

A full-stack gym management web application designed for Members, Trainers, and 
Administrators. It features a modern Single-Page Application (SPA) frontend 
backed by a Node.js REST API and an SQLite database for persistent, cross-device 
data synchronization.

--------------------------------------------------------------------------------
 1. FEATURES & ROLE ACCOUNTS
--------------------------------------------------------------------------------
The application enforces strict role-based access. All data updates in real-time
across devices connected to the server.

► ADMINISTRATOR
  Default Account: admin@fittrack.com  |  Password: admin123
  - Add, edit, and delete Members and Trainers.
  - Manage the global Exercise library (name, target muscle, equipment).
  - Assign Members to specific Trainers.

► TRAINER
  (Create via Admin panel)
  - View list of assigned Members and their progress.
  - Create, edit, and delete Workout Plans.
  - Add specific exercises from the global library to Workout Plans.

► MEMBER
  (Create via public registration or Admin panel)
  - View and log daily weight and body fat percentage tracking.
  - View and follow Workout Plans assigned by their Trainer or global plans.
  - Log and view billing/payment history.
  - View interactive charts for weight and body fat trends.


--------------------------------------------------------------------------------
 2. TECH STACK
--------------------------------------------------------------------------------
► Frontend: HTML5, Vanilla JavaScript (ES6+ async/await), raw CSS3.
  - Highlights: Modern UI/UX, CSS Variables, Chart.js for data visualization.
► Backend: Node.js, Express.js RESTful API.
► Database: SQLite (via better-sqlite3 driver).


--------------------------------------------------------------------------------
 3. HOW TO RUN LOCALLY (DEVELOPMENT)
--------------------------------------------------------------------------------
Prerequisites: Node.js (v18+) must be installed on your computer.

1. Open your terminal/command prompt.
2. Navigate to the project folder.
3. Install the required Node dependencies:
   > npm install
4. Start the local server:
   > npm start
5. Open your web browser and navigate to:
   > http://localhost:3000


--------------------------------------------------------------------------------
 4. DEPLOYMENT INSTRUCTIONS (RAILWAY.APP)
--------------------------------------------------------------------------------
To host this application permanently online (so it works when your PC is off):

Step 1: Push to GitHub
1. Create a free account at GitHub.com
2. Create a New Repository (name it "fittrack-gym-system")
3. Extract the project files and drag-and-drop them into the GitHub repository 
   page to upload them. Commit the changes.

Step 2: Deploy to Railway
1. Create a free account at Railway.app (Sign up with your GitHub account).
2. Click "Deploy from GitHub repo" and select your new "fittrack-gym-system" repo.
3. Railway will automatically build and start the Node.js server.

Step 3: Setup Persistent Database Storage
Because this project uses SQLite, you MUST add a volume so your data isn't wiped 
every time Railway updates the app:
1. In the Railway project dashboard, click on your deployed application box.
2. Go to the "Settings" tab.
3. Scroll down to the "Volumes" section.
4. Click "New Volume" and set the Mount Path exactly to: "/app/data"
5. Railway will redeploy. Your database is now persistent and safe!

--------------------------------------------------------------------------------
 5. PROJECT STRUCTURE
--------------------------------------------------------------------------------
/gym-tracker
├── package.json          # Node dependencies and scripts
├── server.js             # Express API router & Server configuration
├── database.js           # SQLite Schema & connection setup
├── /data                 # Directory where the SQLite fittrack.db file is stored
└── /public               # Static Frontend Files
    ├── index.html        # Main SPA shell
    ├── styles.css        # Global CSS theme & layout
    ├── app.js            # Main UI router and controller
    └── db.js             # DataService wrapper for asynchronous API fetch calls
================================================================================
