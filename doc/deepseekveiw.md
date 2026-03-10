# 🎱 Bingo Pro: Backend Architecture Review & Assumptions

This document reviews the provided backend architecture for the Bingo Pro platform. It highlights strengths, identifies potential gaps, and offers recommendations to ensure scalability, security, and operational efficiency.

---

## ✅ Strengths

- **Serverless Stack**: Next.js + Supabase + Vercel is a cost‑effective, scalable foundation for a startup with ~1000 users.
- **Clear Data Model**: The tables (`profiles`, `wallets`, `transactions`, `games`, `game_players`, `cards`) cover the core domain well.
- **Separation of Concerns**: Using Supabase Auth for user management and RLS for security reduces boilerplate.
- **Real‑time Game Flow**: The mermaid diagrams correctly illustrate the interaction between users, bot, API, and database.
- **Monetization Strategy**: The rake and operator leasing model is simple and proven.
- **Anti‑Cheat Mindset**: “Server‑side truth” is the right principle.

---

## ⚠️ Assumptions & Potential Issues

### 1. Database Schema Details

| Table           | Missing Elements / Assumptions                                                                                                                                                                                                                                                                                                                                                                                                                     |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `profiles`      | - No `created_at` or `updated_at` timestamps.<br>- `telegram_id` should be unique and indexed.<br>- Consider a `role` column (player, operator, admin) for authorization.                                                                                                                                                                                                                                                                            |
| `wallets`       | - `balance` as a numeric type – use `bigint` or `decimal` to avoid floating‑point errors.<br>- Should we allow negative balance? Probably not – enforce via check constraint.<br>- Add a `version` column for optimistic locking to prevent concurrent updates.                                                                                                                             |
| `transactions`  | - `type` as enum (`deposit`, `withdrawal`, `bet`, `win`, `refund`).<br>- `status` as enum (`pending`, `completed`, `failed`, `cancelled`).<br>- Need a unique `idempotency_key` to prevent duplicate processing.<br>- Index on `(user_id, created_at)` for history queries.                                                                                                                  |
| `games`         | - `numbers_drawn` as an array – works for small games (max 75 numbers). For larger games or many concurrent games, consider a separate `game_calls` table to avoid bloating the row.<br>- `winner_id` should be nullable and have a foreign key to `users`.<br>- Add `started_at`, `ended_at` timestamps.<br>- `bet_amount` could be moved to a `game_config` table if different game types have different bet amounts.                             |
| `game_players`  | - Composite unique key on `(game_id, user_id)` to prevent double‑joining.<br>- Index on `game_id` for fast lookup.<br>- `card_id` references `cards` table – ensure the card belongs to the user.                                                                                                                                                                                        |
| `cards`         | - `grid` as JSONB is fine, but consider storing a hash of the card for quick winner checking.<br>- Add `game_id` or mark as used – a card should be used in only one game.<br>- Index on `user_id` for quick retrieval.                                                                                                                                                                  |

### 2. Transactional Integrity

- **Atomic Balance Updates**: The sequence diagram shows wallet update and transaction status change as separate steps. Use a **database transaction** (or Supabase’s function with `BEGIN/COMMIT`) to ensure both succeed or fail together.
- **Idempotency**: Every financial operation should be protected by an idempotency key (e.g., a unique request ID from the client) to prevent double‑charging on retries.

### 3. Real‑time Game Engine

- **Number Drawing Interval**: 3‑5 seconds is acceptable, but the game engine must handle concurrent games efficiently. Consider a **background worker** (e.g., Supabase Edge Function or a Vercel cron job) that processes all active games in batches rather than individual timers.
- **Winner Detection**: The diagram shows evaluation happening after each draw. For 1000 users, evaluating all active cards (each 5x5) is cheap, but if you have many games, ensure the logic is optimised (e.g., pre‑compute win patterns).
- **Realtime Subscriptions**: Supabase Realtime can broadcast the drawn number to all players. However, if many players join, consider using **channel presence** to limit broadcasts to only those in the game.
- **Game Start Condition**: The diagram assumes the game starts immediately after the last player joins. In practice, you need a countdown timer or a minimum player threshold. Use a **scheduled function** (pg_cron or Edge Function) to start games after a delay.

### 4. Security & Anti‑Cheat

- **Row Level Security (RLS)**: Enable on all tables with strict policies. For example:
  - Players can only see their own profile, wallet, and cards.
  - Players can read games they are part of.
  - Only the game engine (via service role) can update `numbers_drawn` and `winner_id`.
- **Audit Trail**: The `game_actions` table (mentioned but not detailed) should log every join, bet, draw, and win with timestamps. This is crucial for dispute resolution.
- **Client‑Side Optimistic UI**: While Zustand can update the UI immediately, the server must validate every marking. A player could mark a number that wasn’t called – the server should ignore or flag it.
- **BINGO Claim**: When a player taps “BINGO”, the client sends a request. The server must re‑validate the win (check the card against drawn numbers) **and** ensure no other player already won. Use a **database lock** on the game row to prevent race conditions.

### 5. Cost & Performance Optimisations

- **Supabase Free Tier Limits**: 500 MB database, 2 GB bandwidth, 50 MB storage. For 1000 users, you’ll likely exceed bandwidth if you push real‑time updates too frequently. Optimise by:
  - Sending only the called number, not the full card.
  - Using **polling** for non‑critical data (e.g., lobby game list) to reduce real‑time connections.
- **Edge Functions**: Cold starts can delay number draws. Keep the game logic in a **warm function** by calling it periodically, or use a dedicated Node.js service if latency becomes an issue.
- **Indexes**: Add indexes on foreign keys and frequently queried columns (e.g., `game_players.user_id`, `games.status`). Without them, queries will slow down as data grows.

### 6. Telegram Bot Integration

- **User Mapping**: The diagram correctly links `chat_id` to `user_id`. Ensure the bot verifies the user’s identity (e.g., via a one‑time code) before linking to a wallet.
- **Webhook Security**: Use a secret token to verify that incoming requests are from Telegram.
- **Deposit Verification**: The manual screenshot step is error‑prone. Consider integrating a payment gateway (e.g., Telebirr API) for automated verification.

### 7. Monetization Details

- **Rake Calculation**: The diagram doesn’t show where the rake is deducted. Best practice: when the game ends, compute `winner_prize = totalPot * (1 - rake%)` and update the winner’s wallet. The remaining amount goes to the platform (store in a separate `platform_revenue` table).
- **Operator Leasing**: This requires a subscription system. Add a `rooms` table with `operator_id`, `monthly_fee`, `next_billing_date`. Use a cron job to suspend rooms if payment fails.

### 8. Scalability for 1000+ Users

- **Concurrent Games**: If you have 40‑player games and 1000 active users, you might have 25 concurrent games. The current design (one row per game, array of drawn numbers) will handle this easily.
- **Database Connections**: Supabase’s default pool size is limited. Use connection pooling and keep transactions short.
- **Caching**: For frequently accessed data (e.g., lobby game list), use **Redis** via Upstash to reduce database load.

---

## 🔧 Recommendations Summary

1. **Add missing columns and indexes** as noted in the schema review.
2. **Implement idempotency keys** for all financial transactions.
3. **Use database transactions** for atomic balance updates.
4. **Move number draws to a background worker** to ensure consistent timing.
5. **Strengthen RLS policies** and use service role for trusted operations.
6. **Add an audit log** (`game_actions`) for all game events.
7. **Optimise real‑time usage**: use presence channels and limit broadcasts.
8. **Integrate a payment gateway** to automate deposits.
9. **Plan for the rake** with clear accounting.
10. **Set up monitoring** (Vercel Analytics, Supabase Logs) to catch issues early.

---

## 📌 Conclusion

The provided backend architecture is a solid starting point. With the adjustments above, it will support the target 1000 users reliably, maintain security, and scale cost‑effectively. The focus on server‑side truth and real‑time engagement aligns perfectly with the requirements of a modern bingo platform.

If you’d like, I can elaborate on any of these points or help design the missing components (e.g., the game engine loop, RLS policies, or the audit trail schema).