# Security Specification for TicketMada

## Data Invariants
1. A User profile must always match their Firebase Auth UID.
2. A User cannot elevate their own role to 'admin' (admin is excluded from client-side role updates).
3. A Ticket must belong to the user who purchased it (`userId` check).
4. Tickets are immutable after creation (via client).

## The Dirty Dozen Payloads

1. **Identity Spoofing (User)**: Attempt to create a user profile with a different UID.
   - `setDoc(doc(db, 'users', 'victim-uid'), { uid: 'attacker-uid', ... })` -> DENIED.
2. **Privilege Escalation**: Attempt to set role to 'admin'.
   - `updateDoc(doc(db, 'users', 'my-uid'), { role: 'admin' })` -> DENIED (not in allowed enum in rules).
3. **Ghost Fields (User)**: Attempt to add hidden fields.
   - `updateDoc(doc(db, 'users', 'my-uid'), { name: 'New Name', isVerified: true })` -> DENIED (`hasOnly` gate).
4. **Identity Proofing (Ticket)**: Attempt to create a ticket for another user.
   - `addDoc(collection(db, 'tickets'), { userId: 'victim-uid', ... })` -> DENIED.
5. **Time Spoofing**: Attempt to set `createdAt` in the past.
   - `addDoc(collection(db, 'tickets'), { createdAt: Date.now() - 100000, ... })` -> DENIED.
6. **Ticket Hijack**: Attempt to read a ticket belonging to someone else.
   - `getDoc(doc(db, 'tickets', 'victim-ticket-id'))` -> DENIED.
7. **Cross-User Listing**: Attempt to list all tickets.
   - `getDocs(collection(db, 'tickets'))` -> DENIED (Rules require query filtering by `userId`).
8. **Immutable Field Attack**: Attempt to change `eventId` on a ticket.
   - `updateDoc(doc(db, 'tickets', 'my-ticket-id'), { eventId: 'new-event' })` -> DENIED.
9. **Role hijacking**: User profile update changing `uid` field.
   - `updateDoc(doc(db, 'users', 'my-uid'), { uid: 'someone-else' })` -> DENIED.
10. **State Shortcut**: Attempt to set ticket status to 'used' before validation.
    - `updateDoc(doc(db, 'tickets', 'my-ticket-id'), { status: 'used' })` -> DENIED (update forbidden).
11. **Resource Poisoning (ID)**: Inject 1MB string as userId.
    - `doc(db, 'users', 'long-string...')` -> DENIED (Size check in `isValidId`).
12. **Blanket Read (Users)**: Signed in user trying to list all users.
    - `getDocs(collection(db, 'users'))` -> DENIED.
