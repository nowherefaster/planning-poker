# Architecture & Technical Design: Agile Planning Poker

## 1. System Overview

Planning Poker is a real-time estimation application designed for agile teams to synchronously estimate effort and story points. 

This document defines the technical architecture, data model, and engineering decisions implementing the requirements outlined in [`PRD - Agile Planning Poker App.md`](./PRD%20-%20Agile%20Planning%20Poker%20App.md).

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser (Next.js Pages Router)"]
        LandingPage["Landing Page (/pages/index.js)"]
        RoomPage["Poker Room Page (/pages/room/[roomid].js)"]
    end

    subgraph FirebaseServices["Google Cloud / Firebase Backend"]
        Auth["Firebase Auth (Anonymous Auth)"]
        Firestore["Cloud Firestore (Real-time NoSQL DB)"]
    end

    LandingPage -->|1. Anonymous Sign-In| Auth
    LandingPage -->|2. Initialize poker-rooms/{roomId}| Firestore
    LandingPage -->|3. Route /room/[id]?user=name| RoomPage
    RoomPage -->|4. Real-time onSnapshot listener| Firestore
    RoomPage -->|5. updateDoc (Presence & Votes)| Firestore
```

### 2.1 Technology Stack
- **Framework**: [Next.js 14](https://nextjs.org/) (Pages Router)
- **UI & Styling**: [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Real-Time Sync**: [Google Cloud Firestore](https://firebase.google.com/docs/firestore) (`onSnapshot` listeners)
- **Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth) (Anonymous Auth)
- **Hosting**: [Vercel](https://vercel.com/) (Serverless)
- **Package Manager**: `pnpm`

### 2.2 Architectural Pivot: Firestore vs. WebSockets
The initial PRD suggested Socket.IO / WebSockets with an in-memory server. Because the application is hosted on **Vercel's serverless platform**, persistent WebSockets via custom Node.js servers are not natively supported without external infrastructure. 

**Decision**: Using **Firebase Cloud Firestore** with client-side real-time listeners (`onSnapshot`) provides zero-maintenance, serverless real-time data synchronization directly between clients while remaining completely free-tier compatible.

---

## 3. Data Model & Firestore Architecture

### 3.1 Collection Hierarchy
Rooms are stored in a top-level shared collection:
```text
/poker-rooms/{roomId}
```

### 3.2 Document Schema
```typescript
interface PokerRoomDocument {
  initialized: boolean;
  createdAt: string; // ISO 8601 timestamp
  estimationType?: 'fibonacci' | 'time-days' | 'time-weeks' | 't-shirt';
  revealed?: boolean;
  users?: {
    [uid: string]: {
      name: string;
      uid: string;
      vote: string | number | null;
      joinedAt?: string;
    };
  };
}
```

---

## 4. Security & Authentication Strategy

1. **Anonymous Sign-In**:
   - Each visitor is assigned a temporary Firebase anonymous `UID` via `signInAnonymously(auth)`.
   - No password, email, or third-party OAuth account required.
2. **Session Identification**:
   - The user's UID indexes their presence in the `users` map: `users.${userId}`.
   - Prevents collisions between members who have identical display names.

---

## 5. Implementation Roadmap & PRD Gap Tracking

Mapped against requirements from [`PRD - Agile Planning Poker App.md`](./PRD%20-%20Agile%20Planning%20Poker%20App.md):

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Anonymous Auth** | ✅ Completed | Implemented via `firebase/auth`. |
| **Shared Room Sync** | ✅ Completed | Scoped to shared `/poker-rooms/{roomId}` collection. |
| **Presence List** | ✅ Completed | Real-time member display using Firestore document snapshot. |
| **Fibonacci Deck Voting** | ✅ Completed | Standard values (0, 1, 2, 3, 5, 8, 13, 21, 40, 100, ☕, ?). |
| **Multi-Deck Support** | ✅ Completed | Fibonacci, Time (Days), and T-Shirt sizing decks with real-time switching. |
| **Reveal Votes Logic** | ✅ Completed | Manual button toggles `revealed: true`, renders actual cards & summary stats. |
| **Auto-Reveal** | ✅ Completed | Automatically reveals votes when 100% of participants have voted. |
| **New Round / Reset** | ✅ Completed | Resets `revealed: false` and clears participant votes across the room. |
| **Fallback Name Generator** | ✅ Completed | Auto-generates random "Adjective Animal" (e.g. Swift Otter) or via 🎲 Randomize button. |
| **Slalom Aesthetic Styling** | 🟡 Partial | Tailwind utility styling present; theme tokens to be refined. |

---

## 6. Backlog & Future Enhancements

### 6.1 Database Hygiene & Room Retention
- [ ] **Firestore Built-in TTL Policy (Auto-Expiration)**:
  - Add an `expiresAt` timestamp field (e.g., 7–14 days from creation or last active timestamp) to `/poker-rooms/{roomId}` documents.
  - Enable a Firestore TTL policy on `expiresAt` (`gcloud firestore fields ttls update --collection-group=poker-rooms --field-path=expiresAt --enable-ttl`) to purge stale rooms automatically without operational overhead.
- [ ] **Room Cleanup UI ("Close Room")**:
  - Add a "Close Room" / "Delete Room" facilitator action to allow meeting hosts to immediately clean up the room document when a session finishes.
- [ ] **Heartbeat / Stale Member Presence Cleanup**:
  - Detect disconnected or idle participants and remove inactive UIDs from the `users` map.

