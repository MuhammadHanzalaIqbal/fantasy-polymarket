# Fantasy Polymarket Architecture (High-Level)

This file explains the full system in simple language, with focus on:

- customer journey,
- token movement,
- sportsman (player) journey.

---

## 1) Whole Architecture (Simple View)

```text
                         +---------------------------+
                         | Real-world sports results |
                         +-------------+-------------+
                                       |
                                       v
                         +---------------------------+
                         | Scoring and data service  |
                         | (off-chain backend)       |
                         +-------------+-------------+
                                       |
                                       v
 +--------------+          +---------------------------+          +------------------+
 |    Users     |<-------->|   App API + Cache         |<-------->| Analytics DB     |
 | (web/mobile) |          | (fast read experience)    |          | (indexed history)|
 +------+-------+          +-------------+-------------+          +--------+---------+
        |                                ^                                 ^
        |                                |                                 |
        v                                |                                 |
 +------+------------------------------------------------------------------+------+
 |                           Blockchain Protocol Layer                            |
 |  - Token economy                                                                |
 |  - Player share trading                                                         |
 |  - Contest entry and settlement                                                 |
 |  - Oracle score verification                                                    |
 |  - Treasury and withdrawal logic                                                |
 +------+------------------------------------------------------------------+------+
        ^                                |
        |                                |
        +--------------------------------+
          Automation workers (submit scores, trigger settlement, monitor health)
```

How to read this:

- blockchain is the source of truth for value and final outcomes,
- backend makes the experience fast, understandable, and operationally reliable,
- sports data is processed off-chain and then anchored on-chain for settlement.

---

## 2) Customer Journey (User Perspective)

```text
1. Join
User connects wallet and opens the app.

2. Fund
User converts a backing asset into platform token (FTK).

3. Build strategy
User buys player exposure (player shares).

4. Play
User enters a contest with a lineup.

5. Matchday updates
Real-world player performance is scored by the backend.

6. Settlement
Scores are published to blockchain, contests are resolved, winners are paid.

7. Exit
User can convert FTK back to backing asset.
```

---

## 3) Token Flow Journey (Money Movement)

```text
IN:
User asset --> Platform entry flow --> FTK to user
                            |
                            +--> no user fee in target model

IN-GAME:
FTK <--> player share market (buy/sell)
             |
             +--> no trading fee in target model

CONTESTS:
FTK entry fees --> contest pool
contest pool --> winners
no contest rake in target model

OUT:
User returns FTK --> FTK is removed from circulation
                  --> backing asset sent back to user
```

Key idea: FTK is the in-game economic rail. Treasury is a reserve/strategy center,
not a user-fee sink in the target model.

---

## 4) Sportsman Journey (Player Perspective)

```text
1. Player appears in the system
A football player becomes a tradable player asset in the app.

2. Market forms around the player
Users buy/sell exposure, so the player's market value changes over time.

3. Real-world performance happens
Match events (goals, assists, cards, minutes, etc.) are collected.

4. Performance is converted into fantasy score
Backend applies deterministic scoring rules.

5. Score is published to blockchain
Blockchain accepts only trusted, fresh, non-replayed score updates.

6. Score impacts contest results
Lineups containing that player gain/lose points.

7. Market reacts
After results, user demand shifts and player prices/liquidity update.
```

---

## 5) One-Line End-to-End Summary

```text
Users fund -> trade player exposure -> enter contests -> real matches produce scores -> blockchain settles -> users withdraw.
```

---

## 6) Blockchain Layer Diagram (Abstract)

```text
Users
U1: USDT -> FTK ----\
U2: USDT -> FTK -----+--> Player exposure (player tokens) --> Team entry --> Oracle-based settlement
U3: USDT -> FTK ----/                                           |                    |
                                                            Contest state        score updates
                                                                  \                /
                                                                   \              /
                                                                    +---- Oracle --+
                                                                           ^
                                                                           |
                                                            Backend computations
                                                         (real sports data -> scores)

After settlement:
U1: FTK -> USDT
U2: FTK -> USDT
U3: FTK -> USDT

Main value paths:
- funding: external asset -> platform token,
- trading: platform token <-> player exposure,
- contest: team entries -> score-based settlement (no platform fee in target model),
- exit: platform token -> external asset.
```
