# Intelligent & Personalized Library Management System

A production-grade, full-stack DBMS application designed for single-operator administrative control with an **Intelligent & Personalized Book Recommendation Engine**.

Built specifically for a College DBMS Project & Viva demonstration, this application eliminates separate member logins and puts the librarian at the center of all operations: searching patrons, inspecting reading histories, managing inventory, issuing/returning books with automatic fine calculations, and delivering deterministic, explainable recommendations.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│            React.js + Vite Frontend (SPA)              │
│               [Librarian / Admin Only]                 │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON) + JWT
┌───────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                     │
│  - JWT Bearer Authentication & Password Hashing        │
│  - Deterministic Recommendation Service                │
│  - Business Policy & Fine Calculation Logic            │
└───────────────────────────┬────────────────────────────┘
                            │ SQLAlchemy 2.0 ORM
┌───────────────────────────▼────────────────────────────┐
│                   MySQL 8.0 Database                   │
│  - 3NF Normalized Relational Schema                    │
│  - Constraints, Foreign Keys & Cascades                │
│  - Stored Procedures, Views & Triggers                 │
│  - (Automatic SQLite fallback for zero-setup preview)  │
└────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **Single-User Interface Architecture:** Members are represented as records in the database. When a member approaches the desk, the librarian searches their account, accesses their complete reading history, and provides personalized recommendations directly from the unified admin portal.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router v6, Chart.js, React-Chartjs-2, Lucide Icons, Modern Responsive CSS |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyJWT, Bcrypt, Uvicorn |
| **Database** | MySQL 8.0 (Primary) / SQLite (Seamless Dev Fallback) |
| **Security** | Bcrypt (12 rounds), JWT Bearer Tokens, Protected API Middleware |

---

## 🗄️ Relational Database Design (3NF Normalized)

The database schema adheres strictly to **Third Normal Form (3NF)**:
1. **1NF**: All table columns hold atomic values; primary keys are enforced on all entities.
2. **2NF**: No partial dependencies; non-key attributes fully depend on candidate keys.
3. **3NF**: No transitive dependencies; non-prime attributes depend only on the primary key.

### Table Specifications:

1. **`members`**: `member_id` (PK), `name`, `email` (UQ), `phone`, `join_date`, `status` (ACTIVE/SUSPENDED/EXPIRED).
2. **`librarians`**: `librarian_id` (PK), `name`, `email` (UQ), `phone`, `username` (UQ), `password_hash`.
3. **`publishers`**: `publisher_id` (PK), `publisher_name` (UQ), `city`.
4. **`authors`**: `author_id` (PK), `author_name` (UQ).
5. **`genres`**: `genre_id` (PK), `genre_name` (UQ).
6. **`books`**: `book_id` (PK), `title`, `isbn` (UQ), `publisher_id` (FK), `publication_year`, `genre_id` (FK).
7. **`book_authors`**: `(book_id, author_id)` (Composite PK / FKs) — Many-to-Many relationship between books and authors.
8. **`book_copies`**: `copy_id` (PK), `book_id` (FK), `status` (AVAILABLE/ISSUED/MAINTENANCE/LOST), `barcode` (UQ), `added_date`.
9. **`borrow_transactions`**: `transaction_id` (PK), `copy_id` (FK), `member_id` (FK), `librarian_id` (FK), `issue_date`, `due_date`, `return_date`, `fine_amount`.
10. **`reservations`**: `reservation_id` (PK), `book_id` (FK), `member_id` (FK), `reservation_date`, `status` (PENDING/FULFILLED/CANCELLED).
11. **`ratings`**: `rating_id` (PK), `member_id` (FK), `book_id` (FK), `rating` (CHECK 1..5), `rating_date`, UNIQUE (`member_id`, `book_id`).
12. **`member_preferences`**: `(member_id, genre_id)` (Composite PK / FKs) — Stores patron favorite genres for algorithmic scoring.

### Advanced DBMS Concepts Implemented:
* **Composite Primary Keys**: `book_authors(book_id, author_id)` and `member_preferences(member_id, genre_id)`.
* **Triggers** (`database/triggers.sql`):
  * `trg_before_borrow_check_availability`: Rejects checkout if copy is not `AVAILABLE` or member is not `ACTIVE`.
  * `trg_after_borrow_issue`: Automatically updates `book_copies.status = 'ISSUED'` upon loan creation.
  * `trg_after_borrow_return`: Automatically restores `book_copies.status = 'AVAILABLE'` when `return_date` is stamped.
* **Stored Procedures** (`database/procedures.sql`):
  * `sp_issue_book`: Validates stock, checks patron standing, and generates borrow records.
  * `sp_return_book`: Calculates overdue days, assesses fine dynamically, and marks copies available.
  * `sp_get_member_profile_stats`: Aggregates patron loans, ratings, and fines in a single call.
* **SQL Views** (`database/views.sql`):
  * `view_book_details`: Multi-table join aggregating copy counts and average ratings.
  * `view_member_borrow_summary`: Aggregated patron loan summaries.
  * `view_overdue_loans`: Active overdue transactions with real-time fine projections.

---

## 🧠 Intelligent Personalized Recommendation Engine

The recommendation engine is **deterministic and database-driven** (no external AI API dependencies):

$$\text{Recommendation Score} = S_{\text{genre}} + S_{\text{borrow\_freq}} + S_{\text{author}} + S_{\text{rating}} + S_{\text{reservation}} + S_{\text{popularity}} + S_{\text{availability}}$$

### Ranking Factors:
1. **Explicit Preferred Genres (+35 pts)**: Books matching categories in `member_preferences`.
2. **Genre Borrow History (+15 pts/loan, max 30 pts)**: Affinity based on past checkout history.
3. **Author Affinity (+25 pts/author)**: Books written by authors the patron has borrowed before.
4. **Author High Rating Affinity (+20 pts)**: Authors whose books the member previously rated $\ge 4$ stars.
5. **High Rating in Favorite Category (+15 pts)**: Catalog books rated $\ge 4.0$ within patron's preferred genres.
6. **Reservation History (+20 pts)**: Previously reserved titles or expressions of interest.
7. **System Popularity (+up to 15 pts)**: Total checkouts across the library + average star rating.
8. **Real-time Shelf Availability (+25 pts)**: Books with `AVAILABLE` copies rank at the top for immediate checkout.

### Explainability:
Every recommended title generates a transparent, human-readable justification:
* *"Matches preferred genre 'Science Fiction'."*
* *"Written by familiar author: Abraham Silberschatz (2 previous loans)."*
* *"Highly rated (4.9/5) in preferred 'Database Systems' category."*
* *"Currently available on shelf (2 of 3 available)."*

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
* **Python 3.10+**
* **Node.js 18+** & npm
* **MySQL 8.0** (Optional for local dev — SQLite fallback is enabled by default)

---

### 2. Backend Setup

```bash
cd backend

# Create & activate a virtual environment (optional)
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the database initialization script (auto-seeds 12 members, 25 books, copies, etc.)
python -m app.database.init_db

# Start FastAPI backend server
uvicorn app.main:app --reload --port 8000
```

FastAPI server runs at `http://localhost:8000`  
Interactive Swagger API Documentation: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite React development server
npm run dev
```

Frontend runs at `http://localhost:5173`

---

### 4. MySQL 8.0 Configuration (For MySQL Execution)

1. Open `backend/.env` and update `DATABASE_URL` with your MySQL root password:
   ```env
   DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/library_db
   FALLBACK_TO_SQLITE=True
   ```
2. You can either:
   * Run the Python seeder: `python -m app.database.init_db` (creates tables and seeds all sample data automatically in MySQL).
   * **OR** Execute the SQL scripts directly in MySQL Workbench:
     1. `database/schema.sql`
     2. `database/views.sql`
     3. `database/procedures.sql`
     4. `database/triggers.sql`
     5. `database/sample_data.sql`

---

## 🔐 Default Credentials for Demonstration

* **Username:** `admin`
* **Password:** `admin123`
*(A quick one-click "Use Demo Admin Credentials" autofill button is provided on the Login page).*

---

## 🎯 Core Project Demonstration Workflow (For Viva)

1. **Librarian Login**: Log in as `admin` / `admin123`.
2. **Dashboard Overview**: Inspect live database statistics (Total Books: 25, Members: 12, Available Copies, Total Fines, Charts).
3. **Search Member**:
   * Click **Members** on the sidebar or use the top search bar.
   * Search for **"Pragati"** (Member #1).
4. **Open Member Profile**:
   * Click **Profile & Recoms**.
   * Review Pragati's details, active loans, completed borrowing history, preferred genres (*Database Systems, AI, Science Fiction*), and past author loans (*Silberschatz, Asimov*).
5. **Examine Personalized Recommendations**:
   * Note the top recommendations (e.g. *Foundation*, *Operating System Concepts*).
   * Review the explainability cards showing why each title was ranked (preferred genre match, familiar author).
6. **Direct Issue Book**:
   * Click **Issue to Member** directly from the recommendation card.
   * Select an available physical copy, set lending days, and click **Complete Book Issue**.
   * Observe the inventory update from `AVAILABLE` to `ISSUED` in real-time.
7. **Process Return**:
   * Navigate to **Return Book**.
   * Locate an active or overdue loan.
   * Return the book — observe automatic overdue fine calculation (₹5/day) and copy status restoration to `AVAILABLE`.
8. **Inspect Reports**:
   * Go to **Reports & Analytics** to show the examiner complex SQL queries: *Most Borrowed Titles*, *Overdue Loans*, *Fine Collections*, and *Books Never Borrowed* (demonstrating subqueries).

---

## 📁 Project Directory Structure

```
library-management-system/
├── frontend/
│   ├── src/
│   │   ├── api/             # API client with JWT bearer handling
│   │   ├── components/      # Layout, StatCard, Modal, Badge, Toast
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # 14 Full UI Pages (Dashboard, Profile, Catalog, etc.)
│   │   ├── App.jsx          # Protected routing
│   │   ├── index.css        # Modern design system
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── auth/            # JWT creation, Bcrypt hashing, dependency guards
│   │   ├── database/        # Connection manager with MySQL + SQLite fallback & Seeder
│   │   ├── models/          # 3NF SQLAlchemy models & associations
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Recommendation engine & SQL Report aggregations
│   │   ├── routers/         # REST API routers (Members, Books, Issues, Returns, Reports)
│   │   └── main.py          # FastAPI application entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
│
├── database/
│   ├── schema.sql           # MySQL 8.0 DDL (Tables, Keys, Checks, Constraints)
│   ├── sample_data.sql      # Realistic dataset (12 members, 25 books, copies, txs, ratings)
│   ├── views.sql            # Aggregated database views
│   ├── procedures.sql       # Stored procedures (issue, return, patron stats)
│   └── triggers.sql         # Inventory lifecycle triggers
│
└── README.md
```

