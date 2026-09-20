# Module 1 — URL Shortener

## Overview

The goal of this module was to build a URL Shortener from a simple working implementation and gradually evolve it toward a more production-ready system.

Instead of designing the final architecture upfront, the system was improved incrementally as scalability, reliability, and performance problems were identified.

---

## Tech Stack

- **Frontend:** React + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **Cache:** Redis
- **Containerization:** Docker

---

## V1 — Basic URL Shortener

The first version focused only on the core functionality:

```text
Long URL
   ↓
POST /shorten
   ↓
Generate Short Code
   ↓
Store Mapping in PostgreSQL
   ↓
Return Short URL
```

Example:

```text
https://example.com/some/very/long/url
                 ↓
          http://localhost:3000/aZ91Kd
```

The redirect flow:

```text
GET /aZ91Kd
    ↓
PostgreSQL Lookup
    ↓
Find Original URL
    ↓
HTTP Redirect
```

### Short Code Generation

The initial design explored sequential database IDs with **Base62 encoding**.

Base62 uses:

```text
0-9
a-z
A-Z
```

This creates compact URL-safe identifiers.

We then identified an important weakness with sequential IDs:

> Sequential IDs encoded with Base62 are still predictable.

Someone could modify characters in the short URL and potentially enumerate URLs stored in the system.

The design was therefore evolved to generate **random short codes** in the application.

### Collision Handling

Random generation introduces another problem:

```text
Request A → x7Ka92
Request B → x7Ka92
```

To protect against this, PostgreSQL maintains a **UNIQUE constraint** on the short-code column.

The application retries short-code generation when a collision occurs.

This gives us two layers:

```text
Application
    ↓
Generate random code
    ↓
Attempt INSERT
    ↓
PostgreSQL UNIQUE constraint
    ↓
Collision?
   ↙     ↘
 Yes     No
  ↓       ↓
Retry    Done
```

Repeated collisions can also indicate a problem with the random-code generator or insufficient key space.

---

## URL Validation

Before storing a URL, the backend validates and normalizes it.

A scheme check was introduced:

```ts
const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input);
```

This determines whether the input already contains a URI scheme before normalization and validation.

---

## V2 — Redis Caching

Redirects are expected to happen much more frequently than URL creation.

Without caching:

```text
User
 ↓
Express
 ↓
PostgreSQL
 ↓
Express
 ↓
Redirect
```

Every redirect therefore creates database work.

Redis was introduced as a cache for:

```text
shortCode → longURL
```

The redirect path became:

```text
GET /:shortCode
       ↓
     Redis
    ↙     ↘
  HIT     MISS
   ↓        ↓
Redirect PostgreSQL
             ↓
         Store Redis
             ↓
          Redirect
```

A cache hit avoids the PostgreSQL lookup entirely.

---

## Cache-Aside Pattern

The implementation follows the **cache-aside pattern**.

Conceptually:

```ts
const cachedUrl = await getCachedUrl(shortCode);

if (cachedUrl?.status === "HIT") {
  return res.redirect(cachedUrl.url);
}

const result = await pool.query(
  "SELECT long_url FROM urls WHERE short_code = $1",
  [shortCode]
);
```

On a cache miss:

```text
Redis MISS
    ↓
PostgreSQL
    ↓
Retrieve URL
    ↓
Populate Redis
    ↓
Redirect
```

Redis is therefore an optimization rather than the source of truth.

PostgreSQL remains the authoritative datastore.

---

## Redis Failure Handling

An important distinction was made between:

```text
Redis MISS
```

and:

```text
Redis unavailable
```

These are different situations.

The cache helper can represent states such as:

```text
HIT
MISS
Redis failure → null
```

A Redis failure should **not prevent redirects from working**.

Instead:

```text
Redis unavailable
       ↓
 PostgreSQL lookup
       ↓
    Redirect
```

This introduces an important system-design principle:

> Failure of an optimization should not necessarily cause failure of the core system.

---

## Cache TTL

Cached URL mappings are stored with a **TTL (Time To Live)**.

Conceptually:

```text
SET shortCode longURL EX <ttl>
```

After the TTL expires, Redis removes the cached value.

A future request then reloads the mapping from PostgreSQL.

This prevents cache entries from remaining indefinitely and provides a mechanism for eventual refresh.

---

## Horizontal Scaling

The original application could run as:

```text
Client
  ↓
Express
  ↓
PostgreSQL
```

For increased traffic, multiple Express instances can run behind a load balancer:

```text
                 ┌── Express 1 ──┐
Client → LB ─────┼── Express 2 ──┼── PostgreSQL
                 └── Express 3 ──┘
```

Redis can also be shared between application instances:

```text
                 ┌── Express 1 ──┐
                 │               │
Client → LB ─────┼── Express 2 ──┼── PostgreSQL
                 │       ↓       │
                 └── Express 3 ──┘
                         ↓
                       Redis
```

Because persistent URL state is not stored inside an individual Express process, requests can be handled by different application instances.

This keeps the backend largely **stateless**.

---

## Vertical vs Horizontal Scaling

Two scaling approaches were discussed.

### Vertical Scaling

Increase resources of one machine:

```text
4 CPU / 8 GB RAM
        ↓
8 CPU / 32 GB RAM
```

This is simpler and can be reasonable when the system operates within a single environment and the workload still fits comfortably on one machine.

### Horizontal Scaling

Add more application instances:

```text
        Load Balancer
       /      |      \
    App 1   App 2   App 3
```

Horizontal scaling becomes valuable when we need:

- Higher request capacity
- Better availability
- Multiple application instances
- Reduced dependency on one machine
- Potential multi-region deployment

---

## Cache Stampede Problem

Caching introduces another scaling problem.

Suppose a popular short URL expires from Redis.

At the same moment:

```text
10,000 requests
       ↓
    Redis MISS
       ↓
10,000 PostgreSQL queries
```

Even though caching normally protects PostgreSQL, expiration of a very popular key can suddenly create a large database spike.

This is known as a **cache stampede**.

One mitigation discussed was a distributed lock.

Conceptually:

```text
Redis MISS
    ↓
Try acquiring lock
    ↓
┌───────────────┐
│ Lock acquired │
└───────┬───────┘
        ↓
 Query PostgreSQL
        ↓
 Populate Redis
        ↓
 Release lock
```

Other application instances briefly wait/retry and then read the newly populated cached value.

Because Redis is shared between Express instances, the lock can coordinate work across those instances.

The lock must also have a TTL so that a crashed application instance cannot leave the key permanently locked.

---

## Redirect Performance

For a URL shortener, one of the most important user-facing metrics is **redirect latency**.

Conceptually:

```text
Request received
      ↓
Cache / DB lookup
      ↓
Redirect response
```

We want to measure how long the redirect path takes, especially differences between:

```text
Cache HIT
Cache MISS
Database lookup
Redis failure
```

This becomes part of the system's observability strategy as it evolves toward production.

---

## Architecture Reached

After evolving the initial implementation, the system looks approximately like:

```text
                    ┌─────────────┐
                    │   React UI  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │Load Balancer│
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
             Express    Express    Express
                │          │          │
                └──────────┼──────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                  Redis       PostgreSQL
                 Cache       Source of Truth
```

---

## Key System Design Lessons

This module introduced several important concepts through actual implementation:

- Start with the simplest working system.
- Keep application servers stateless when possible.
- Use the database as the source of truth.
- Database constraints provide the final protection against short-code collisions.
- Random identifiers reduce predictability compared with sequential IDs.
- Caching reduces database load on read-heavy workloads.
- Cache failure should not necessarily break core functionality.
- Cache misses and cache failures should be treated differently.
- TTLs prevent cached data and distributed locks from living forever.
- Shared infrastructure such as Redis allows coordination between horizontally scaled application instances.
- Caching creates new problems such as cache stampedes.
- Vertical scaling is simpler, while horizontal scaling improves capacity and resilience.
- Performance should be measured rather than assumed.

Most importantly, the architecture was **not designed all at once**.

It evolved from:

```text
Express + PostgreSQL
```

to:

```text
Express + PostgreSQL
        ↓
Random Short Codes
        ↓
Redis Cache
        ↓
Failure Handling
        ↓
Horizontal Scaling
        ↓
Cache Stampede Protection
        ↓
Observability
```

Each architectural component was introduced to solve a concrete problem rather than because it is commonly found in system-design diagrams.

---

## Next Module

**Module 2 — Notification System**

The next module applies the same approach:

```text
Build the simplest version
        ↓
Find its limitations
        ↓
Introduce load
        ↓
Observe failures
        ↓
Evolve the architecture
```

The goal is to introduce concepts such as asynchronous processing, queues, retries, delivery guarantees, idempotency, workers, and failure handling naturally as the system grows.
