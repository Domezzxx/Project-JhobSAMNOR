# SE-4 Design & Implementation Diagrams

## 1. System Architecture Diagram

ภาพรวมสถาปัตยกรรมของระบบ AI Finance Coach "พี่เงิน" แสดงการสื่อสารระหว่าง Layer ทั้งหมด

```mermaid
graph TB
    subgraph Client["📱 Client Layer"]
        Flutter["Flutter App\n(Dart + Riverpod + Hive)"]
    end

    subgraph API["⚙️ API Layer"]
        Express["Node.js + Express\n(TypeScript)"]
        Auth["Auth Middleware\n(JWT)"]
        Cache["Cache Layer\n(Redis / In-memory)"]
    end

    subgraph AI["🤖 AI/ML Layer"]
        LangChain["LangChain Router"]
        Typhoon["Typhoon LLM\n(ภาษาไทยดีสุด)"]
        Groq["Groq LLM\n(เร็ว + ฟรี)"]
        OpenAI["OpenAI GPT\n(Fallback)"]
        RuleEngine["Rule-based Fallback"]
    end

    subgraph DB["🗃️ Data Layer"]
        Prisma["Prisma ORM"]
        SQLite["SQLite (Dev)"]
        Postgres["PostgreSQL (Prod)"]
    end

    subgraph External["🌐 External Services"]
        FCM["Firebase FCM\n(Push Notifications)"]
        OCR["ML Kit / Typhoon Vision\n(OCR สลิป)"]
    end

    Flutter <-->|"REST API / JWT"| Express
    Express --> Auth
    Express --> Cache
    Express <-->|"Context Injection"| LangChain
    Express <-->|"Prisma Client"| Prisma
    Prisma --> SQLite
    Prisma --> Postgres
    LangChain --> Typhoon
    LangChain --> Groq
    LangChain --> OpenAI
    LangChain --> RuleEngine
    Express <-->|"Push Trigger"| FCM
    Flutter <-->|"วิเคราะห์รูปสลิป"| OCR
```

---

## 2. Component Diagram

แสดง Component ทั้งหมดของ Mobile App ฝั่ง Flutter

```mermaid
graph LR
    subgraph Mobile["📱 Flutter App"]
        subgraph Presentation["Presentation Layer (Features)"]
            Auth["auth/\n(login, register)"]
            Dashboard["dashboard/\n(pie chart, summary)"]
            Transactions["transactions/\n(add, list, OCR scan)"]
            Chat["chat/\n(AI Coach UI)"]
            Goals["goals/\n(progress, create)"]
            Profile["profile/\n(settings, logout)"]
        end

        subgraph Core["Core Layer"]
            Router["app/router.dart\n(go_router)"]
            Theme["app/theme.dart\n(Dark + Green)"]
            ApiClient["core/api_client.dart\n(dio + interceptor)"]
            HiveStorage["core/hive_storage.dart\n(offline cache)"]
        end

        subgraph State["State Management (Riverpod)"]
            AuthProvider["authProvider"]
            TxnProvider["transactionProvider"]
            DashProvider["dashboardProvider"]
            ChatProvider["chatProvider"]
        end
    end

    Presentation --> State
    State --> ApiClient
    State --> HiveStorage
    ApiClient <-->|"REST"| Backend[("Backend API\n:4000")]
```

---

## 3. ER Diagram (จาก Prisma Schema จริง)

```mermaid
erDiagram
    User {
        String id PK
        String email UK
        String phone
        String passwordHash
        String displayName
        Int monthlyIncome
        Int level
        Int streak
        DateTime createdAt
        DateTime updatedAt
    }

    Category {
        String id PK
        String name UK
        String nameTh
        String icon
        String color
        String type
        Boolean isDefault
        DateTime createdAt
    }

    Transaction {
        String id PK
        String userId FK
        String type
        Int amount
        String note
        String source
        String categoryId FK
        DateTime occurredAt
        DateTime createdAt
    }

    Budget {
        String id PK
        String userId FK
        String categoryId FK
        Int amount
        String period
        DateTime createdAt
    }

    Goal {
        String id PK
        String userId FK
        String name
        Int target
        Int current
        DateTime deadline
        DateTime createdAt
    }

    ChatMessage {
        String id PK
        String userId FK
        String role
        String content
        String context
        DateTime createdAt
    }

    Achievement {
        String id PK
        String userId FK
        String type
        DateTime unlockedAt
    }

    User ||--o{ Transaction : "มี"
    User ||--o{ Budget : "ตั้ง"
    User ||--o{ Goal : "วางแผน"
    User ||--o{ ChatMessage : "คุย"
    User ||--o{ Achievement : "ได้รับ"
    Category ||--o{ Transaction : "จัดหมวด"
    Category ||--o{ Budget : "กำกับ"
```

---

## 4. UML Class Diagram (Core Domain)

```mermaid
classDiagram
    class User {
        +String id
        +String email
        +String displayName
        +int monthlyIncome
        +int level
        +int streak
        +register() AuthToken
        +login() AuthToken
    }

    class Transaction {
        +String id
        +String userId
        +String type
        +int amount
        +String source
        +String categoryId
        +DateTime occurredAt
        +create() Transaction
        +delete() void
    }

    class Budget {
        +String id
        +String userId
        +int amount
        +String period
        +getStatus() BudgetStatus
    }

    class BudgetStatus {
        +int spent
        +int remaining
        +double percent
        +bool isOverBudget
    }

    class Goal {
        +String id
        +String name
        +int target
        +int current
        +DateTime deadline
        +getProgress() double
    }

    class AICoach {
        +buildContext(userId) CoachContext
        +chat(message, context) String
        +provider: Typhoon | Groq | OpenAI | Fallback
    }

    class CoachContext {
        +int totalIncome
        +int totalExpense
        +List topExpenses
        +List goals
        +List budgetStatus
    }

    User "1" --> "many" Transaction
    User "1" --> "many" Budget
    User "1" --> "many" Goal
    Budget --> BudgetStatus
    Goal --> User
    AICoach --> CoachContext
    CoachContext --> User
```

---

## 5. Sequence Diagrams

### 5.1 แชทกับ AI Coach "พี่เงิน" (Context-Aware Chat)

```mermaid
sequenceDiagram
    actor User as ผู้ใช้
    participant Flutter as Flutter App
    participant API as Backend API
    participant DB as Database
    participant AI as LangChain + LLM

    User->>Flutter: พิมพ์ข้อความ "เดือนนี้ใช้เงินมากไปไหม?"
    Flutter->>API: POST /chat/message { message, userId }
    API->>DB: ดึง Context (income, expenses, budgets, goals)
    DB-->>API: ข้อมูลการเงินย้อนหลัง 30 วัน
    API->>AI: ส่ง Prompt + Context Injection (ตัด PII ก่อน)
    AI-->>API: คำตอบ (≤150 คำ + Disclaimer)
    API->>DB: บันทึก ChatMessage (role=assistant)
    API-->>Flutter: { reply: "เดือนนี้คุณใช้ไป 12,500 บาท..." }
    Flutter-->>User: แสดงฟอง Chat + Markdown Rendering
```

### 5.2 สแกนสลิป OCR → บันทึก Transaction

```mermaid
sequenceDiagram
    actor User as ผู้ใช้
    participant Flutter as Flutter App
    participant OCR as ML Kit / Typhoon Vision
    participant API as Backend API
    participant DB as Database

    User->>Flutter: เปิดกล้องและถ่ายภาพสลิป
    Flutter->>OCR: ส่งรูปภาพ
    OCR-->>Flutter: Raw Text (จำนวนเงิน, วันที่, ร้านค้า)
    Flutter->>Flutter: Post-process: parse ตัวเลข + วันที่
    Flutter-->>User: แสดงฟอร์ม Review พร้อม Category แนะนำ
    User->>Flutter: ตรวจสอบและกด "ยืนยัน"
    Flutter->>API: POST /transactions { amount, date, category, source: "ocr" }
    API->>DB: INSERT Transaction
    DB-->>API: Transaction Object
    API-->>Flutter: { success: true, transaction }
    Flutter-->>User: แสดงหน้ายืนยัน + อัปเดต Dashboard
```

### 5.3 ตรวจสอบงบประมาณและแจ้งเตือน

```mermaid
sequenceDiagram
    participant Cron as Cron Job (ทุกชั่วโมง)
    participant API as Backend API
    participant DB as Database
    participant FCM as Firebase FCM
    actor User as ผู้ใช้ (มือถือ)

    Cron->>API: Trigger ตรวจสอบงบประมาณ
    API->>DB: GET /budgets/status (all users)
    DB-->>API: รายการ Budget ที่ใกล้หรือเกินงบ
    loop สำหรับแต่ละ Budget ที่เกิน 80%
        API->>FCM: ส่ง Push Notification payload
        FCM-->>User: 🔔 "คุณใช้งบอาหารไปแล้ว 85% เดือนนี้!"
    end
```

---

## 6. Wireframe — หน้าจอสำคัญ (Sprint 5–6 ที่ยังไม่ได้ทำ)

### 6.1 หน้า Goals (เป้าหมายการออม) — Sprint 5

```
┌─────────────────────────────┐
│ 🎯 เป้าหมายของฉัน           │
├─────────────────────────────┤
│  ✈️ เที่ยวญี่ปุ่น          │
│  [██████████░░░░] 45%       │
│  22,500 / 50,000 บาท        │
│  ครบกำหนด: ธ.ค. 2569        │
├─────────────────────────────┤
│  🏠 ดาวน์คอนโด             │
│  [████░░░░░░░░░░] 25%       │
│  75,000 / 300,000 บาท       │
│  ครบกำหนด: มิ.ย. 2570       │
├─────────────────────────────┤
│     [+ สร้างเป้าหมายใหม่]  │
└─────────────────────────────┘
```

### 6.2 หน้า Gamification (Streak & Badge) — Sprint 6

```
┌─────────────────────────────┐
│ 🔥 สตรีคปัจจุบัน: 12 วัน  │
│                             │
│  🥉 นักออมหน้าใหม่    ✅   │
│  🥈 บันทึกสม่ำเสมอ    ✅   │
│  🥇 นักวางแผน         🔒   │
│  💎 ปรมาจารย์การเงิน   🔒   │
│                             │
│ 📅 ชาเลนจ์สัปดาห์นี้       │
│  "บันทึกรายจ่าย 7 วันติด" │
│  [████████░░] 4/7 วัน      │
└─────────────────────────────┘
```
