### **Product Requirements Document: Agile Planning Poker App**

#### **1\. Introduction**

The Agile Planning Poker App is a web-based tool designed to facilitate team-based estimation of user stories and epics. The app will support various estimation methods, including numeric scales for complexity and time, and "t-shirt" sizing for rough estimations. The goal is to provide a simple, accessible, and collaborative platform for agile teams to reach a consensus on story points and other estimates.

#### **2\. Goals & Objectives**

> * Enable teams to collaboratively estimate user stories and epics.  
> * Support multiple estimation methods:  
  * Fibonacci-like scale for complexity.  
  * Time-based estimation in days or weeks.  
  * "T-shirt" sizing.  
> * Allow for easy session creation and member joining via a shareable link.  
> * Display all votes after a round is complete.  
> * Keep the platform entirely free to use by leveraging free-tier services like GitHub and Vercel.

#### **3\. User Stories**

> * **As a Team Lead**, I want to create a new planning poker session so that my team can start estimating.  
> * **As a Team Lead**, I want to choose the estimation type for the round (e.g., numeric, time, t-shirt) so that the team knows what to vote with.  
> * **As a Team Member**, I want to join a planning poker session using a unique link so that I can participate in the estimation.  
> * **As a Team Member**, I want to enter my name when I join a session so that my team members know who I am.  
> * **As a Team Member**, if I don't enter a name, I want a fun, random name to be assigned to me so that I can still participate easily.  
> * **As a Team Member**, I want to cast my vote for a user story's complexity using a numeric scale: 0, 1, 2, 3, 5, 8, 13, 21, 40, 100, coffee break ☕, and a question mark ?.  
> * **As a Team Member**, I want to cast my vote for a user story's time estimate in days (default) or weeks. The options should include half a day.  
> * **As a Team Member**, I want to cast my vote for an epic using "t-shirt" sizes: XS, S, M, L, XL, XXL.  
> * **As a Team Member**, I want to see the votes of all participants once the round is complete.  
> * **As a Team Lead**, I want to be able to manually end a voting round so that we can reveal the estimates.  
> * **As a Team Lead**, I want to start a new round of voting at any time.

#### **4\. Features & Functionality**

> * **Session Management:**  
  * Ability to create a new session.  
  * A unique, shareable URL for each session.  
  * Real-time updates for connected clients.  
> * **User Management:**  
  * Users can join a session without creating an account.  
  * Users can provide a name upon joining.  
  * Automatic generation of a fun, random "Adjective Animal" name if one is not provided.  
  * Display of connected users within the session.  
> * **Voting Mechanism:**  
  * **Estimation Type Selection:** The team lead can select the estimation type for the current round.  
  * **Numeric Voting Deck:** A deck of cards with the sequence: 0, 1, 2, 3, 5, 8, 13, 21, 40, 100, a coffee break ☕️ card, and a question mark ? card.  
  * **Time-based Voting:** A selection of time units with the option to switch between "Days" (0.5, 1, 2, 3, 5, 8, etc.) and "Weeks" (0.5, 1, 2, 3, 5, etc.). "Days" is the default.  
  * **T-shirt Sizing:** A selection of sizes: XS, S, M, L, XL, XXL.  
  * Ability for users to select a card/option to cast their vote.  
> * **Round Management:**  
  * Real-time indication of who has voted.  
  * A "reveal" button to manually end the round and show all votes.  
  * Automatic reveal when all participants have voted.  
  * Display of all votes after a round is complete.  
  * Ability to start a new round, clearing previous votes.

#### **5\. Technical Requirements & Constraints**

> * **Front-end:** Next.js (React) with Pages Router.  
> * **Back-end & Real-time:** Firebase Cloud Firestore (real-time `onSnapshot` listeners) & Firebase Anonymous Auth. *(See [`Architecture.md`](./Architecture.md) for architectural decisions, rationale, and data schemas).*  
> * **Hosting:** Vercel (free tier).  
> * **Source Control:** GitHub.  
> * **Database & Persistence:** Google Cloud Firestore (ephemeral room documents under `/poker-rooms/{roomId}`).  
> * **Styling:** Tailwind CSS with a clean, professional aesthetic inspired by the Slalom.com website.

#### **6\. Implementation Plan**

> 1. **Server Setup:** Create the core server to handle real-time communication and session management.  
> 2. **Front-End Structure:** Build the basic page layouts for creating a session and the main poker room.  
> 3. **Real-Time Integration:** Connect the front-end to the server to handle joining/leaving rooms and user updates.  
> 4. **Voting Logic:** Implement the different voting mechanisms (numeric, time, t-shirt) and the reveal functionality.  
> 5. **Styling:** Apply the Slalom-inspired styling to the entire application.  
> 6. **Deployment:** Deploy the app to Vercel.

#### **7\. Backlog & Future Enhancements**

> * **Room Data Retention & Auto-Cleanup (Firestore TTL):**
>   * Set an automatic Time-To-Live (TTL) expiration on rooms (e.g., 7–14 days) to clear inactive rooms and prevent room-name collision/stale data.
> * **Facilitator Session Controls:**
>   * Allow session hosts to explicitly close or delete a room at the end of a planning session.
> * **Presence Pruning:**
>   * Automatically clean up disconnected participants after inactivity or upon leaving the room.