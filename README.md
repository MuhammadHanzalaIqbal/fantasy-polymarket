Existing deployed contracts:

FTK: https://sepolia.etherscan.io/address/0x82021ccfed084fd8578cb38d8d4323345c363079#writeContract

Treasury: https://sepolia.etherscan.io/address/0xb78e5bdcdf4628d66ce92f731b8a6bc4eac4b63a#readContract

Router: https://sepolia.etherscan.io/address/0xf2134d1c5b1f0be5f724a7dc8b7fc360f3cad04e#writeContract

Market: https://sepolia.etherscan.io/address/0x290dd7f51a0100941d1ec14c40d625821f2bb723#writeContract

Shares: https://sepolia.etherscan.io/address/0xcbfc9c21658d214e61a17afc23928aef1453bda8#readContract

faucet: https://console.optimism.io/faucet

edit: WithdrawalRouter → burn() must be on via FTC





WIthdrawalRouter for withdrawal must be on via treasury

Other consents must be maintained during re-deployment (which ones? - list needed)

edit2: test files must be written before the live-deployment

edit3: treasury layer will be removed (no fees!)

1. Fantasy token:
FTK is the internal utility token. Users spend it to build teams, trade player shares, and enter contests.
* Key properties:
    * Mintable and burnable (controlled by smart contracts)
    * Pausable for emergencies
    * Permit-enabled for gasless approvals
* What happens on-chain:
    * FTK starts with zero supply after deployment.
    * Only contracts with MINTER_ROLE (DepositRouter, eventually other routers if needed) can mint FTK.
    * Only contracts with BURNER_ROLE (WithdrawalRouter, or contest resolution logic) can burn FTK.

2. Deposit Router:
Purpose: This is the on-ramp for real money into your system. Users deposit external tokens (USDC, ETH, etc.) and receive FTK.
How it works in detail:
   * User approves DepositRouter to spend a supported token.
   * User calls deposit(asset, amount, minFTKOut).
   * DepositRouter:
        * Transfers the asset from the user.
        * Computes the deposit fee.
        * Sends the fee portion to the Treasury (3).
        * Mints net FTK to the user (amount - fee).
* Role in the ecosystem: Serves as gateway + revenue choke point. All FTK originates here.
3. Treasury
Purpose: Central storage for all fees collected by the protocol. Must be rewritten for other strategy (I forgot what it was tho)
Role: Holds the funds safely and allows admin-controlled withdrawals for operations, liquidity, or buybacks.
How it connects:
  * DepositRouter sends the deposit fee directly to Treasury during the deposit call.
  * Treasury keeps track of balances of multiple ERC20 tokens (e.g., USDC, FTK).
  * Admin (or multisig) can withdraw funds to fund operations, provide liquidity for player markets, or buy back FTK.
4. Player Market
* Allows users to acquire exposure to players’ performance (like prediction markets).
* Maintains liquidity pools for each player (or a pooled AMM).
* Computes share prices dynamically based on supply and demand.
* Collects small trading fees in FTK, which can go to the treasury.
* Provides the underlying internal economy that powers fantasy contests.
Pipeline
I. Add Players
* Admin adds each player with addPlayer(playerId).
* Creates an empty pool: 0 shares, 0 FTK liquidity.
II. Buy Shares
* User calls buyShares(playerId, ftkAmount, minShares)
* Contract:
    * Pulls FTK from user
    * Deducts trading fee → sends fee to Treasury
    * Mints shares proportional to the AMM formula
    * Updates pool and user balances
III. Sell Shares
* User calls sellShares(playerId, shares, minFTK)
* Contract:
    * Checks user balance
    * Calculates FTK returned (constant product AMM)
    * Deducts fee → sends fee to Treasury
    * Updates pool and user balances
    * Sends net FTK to user
IV. Pricing
* First buyer sets initial 1:1 share price.
* Subsequent trades follow x * y = k AMM formula:
    * x = FTK liquidity
    * y = total shares
V. Revenue Capture - Every buy or sell collects trading fee in FTK → automatically sent to Treasury.
5. Player Share
Users must be able to:
* Buy exposure to a football player
* Sell that exposure later
* Hold balances in their wallet
* Use those balances in fantasy teams
* Price players dynamically
To do that on-chain, each player needs a tokenized share representation:
That the Share Token Represents
Each ShareToken is an ERC-20 token tied to one specific player that represents exposure to that player’s performance
Example:
* Player ID: 42 (Mbappé)
* Token: MBAPPE-SHARE
* User holds: 150 shares
Meaning: the user owns 150 units of exposure to that player’s outcome in your markets.
Req. to:
* Track ownership cleanly
* Enable trading
* Plug into AMMs
* Compose teams on-chain
6 Contest Manager
Purpose: This is the gameplay engine. At a high level it:
* defines contests
* accepts teams
* escrows FTK entry fees
* ranks participants after results arrive
* pays winners
* takes protocol rake
It sits above PlayerMarket and ShareTokens.

Lifecycle of a Contest
Phase 1 — Contest creation (admin-driven)
The system defines:
* entry fee (in FTK)
* max participants
* roster requirements
* start time / lock time
* prize structure
* rake percentage

Phase 2 — Team entry (user-driven)
When a user enters:
1. Team structure is validated
    * correct number of players
    * position rules satisfied
    * user actually owns required PlayerShareTokens (or has staked them)
2. FTK entry fee is transferred into the ContestManager (escrow)
3. Entry is recorded immutably
4. Team NFT is minted
    * represents the lineup
    * enables secondary markets
    * simplifies UX ContestManager becomes the temporary bank for entry fees.

Phase 3 — Contest lock
Once the contest starts:
* no more entries
* teams become immutable
* withdrawals disabled
This prevents late-information abuse.

Phase 4 — Resolution (oracle-triggered)
After real-world matches finish:
ContestManager must:
1. read player scores from OracleAdapter
2. compute each team’s total score
3. rank participants
4. compute payouts
5. distribute FTK
6. send rake to Treasury
This is the most gas-sensitive and attack-sensitive part of the system.

Implementation of prize distribution model is also here: either fixed payloads or percentile (ties exist, so as large scale contests - adapt)



7 Oracle Adapter
Purpose: This is the bridge between real-world sports data and the on-chain game. 

Architecture: Signed Data Oracle
Off-chain responsibilities
The oracle service:
* ingests match data
* computes fantasy scores
* aggregates per player
* signs the result payload
Important: the scoring logic must be deterministic and versioned.

On-chain responsibilities
OracleAdapter must:
* verify signature
* verify authorized signer
* verify timestamp freshness
* prevent replay
* update player scores
It should not compute heavy logic on-chain.

Required Security Protections
Signer whitelist
Only approved oracle keys can submit data.
If compromised → attacker can rewrite history.
Mitigation:
* multisig-controlled signer set
* emergency rotation

Replay protection
Each matchweek submission must be unique.
Otherwise attacker could:
* resubmit old favorable data
* manipulate contest resolution

Timestamp bounds
Reject data that is:
* too old
* too far in the future

OracleAdapter does not directly connect to the backend. Instead, the backend acts as a trusted data producer that signs data off-chain and submits it on-chain via a relayer.
Think of it as a cryptographic handshake rather than a network connection.
Below is the exact production flow.
Model: There are four actors:
Sports data providers → raw real-world data
Oracle backend service → computes and signs scores
Relayer → sends transactions to Sepolia
OracleAdapter (on-chain) → verifies and stores scores
The smart contract never “calls” the backend - it must prove authenticity via signatures.


8 Withdrawal Router
Purpose: Completes the economic loop by letting users exit back to real assets.
Current flow ends at FTK. This step enables:


USDC → FTK → gameplay → FTK → USDC


Responsibilities
WithdrawalRouter must:
* accept FTK from user
* burn FTK
* release backing assets
* apply withdrawal fee
* enforce safety checks

Where funds come from
The Treasury (or liquidity pool) must hold enough reserves.
Req: Total redeemable FTK ≤ reserve backing

Mandatory Safety Controls
Reserve sufficiency check
Before releasing funds need to verify enough USDC/ETH exists

Rate limiting
Prevents bank-run style drains.
Common patterns:
* per-block cap
* per-user cooldown
* global daily limit




BACKEND APPROXIMATELY: (GPT TEXT I DID NOT EDIT IT, IT'S HERE FOR GENERAL COMPREHENSION ONLY)
High-Level Role of the Backend
In your system:
* Blockchain = money, ownership, final state
* Backend = data aggregation, orchestration, caching, and UX acceleration
* Indexer = historical and real-time query layer
* Oracle service = trusted sports data pipeline
Your backend is primarily:
* stateless API + workers
* oracle computation engine
* contest orchestration helper
* risk and monitoring layer
It must never be able to steal funds or rewrite balances.

Core Backend Components
1) API Gateway (User-Facing Backend)
This is your standard web backend.
Responsibilities
* user session helpers (optional)
* contest browsing
* leaderboard queries
* portfolio aggregation
* player stats display
* team validation pre-checks
* rate limiting / anti-abuse
Important rule
It does not custody funds and does not modify on-chain state directly.
All writes that matter must still go through smart contracts.

2) Indexer Service (The Graph or custom)
This is technically separate but tightly coupled to backend.
Why you need it
Blockchain RPC is too slow and expensive for:
* leaderboards
* contest history
* player charts
* user portfolios
What it consumes
Events from:
* DepositRouter
* PlayerMarket
* ContestManager
* OracleAdapter
* WithdrawalRouter
What it produces
Queryable entities like:
* User
* Player
* PlayerPool
* Trade
* Contest
* TeamEntry
* ScoreUpdate
Your backend API will mostly read from this.

3) Oracle Engine (Most Critical Backend Service)
This is the brain off-chain.
Remember: smart contracts do NOT compute fantasy scores.

Oracle Pipeline
Step A — Data ingestion
Backend pulls raw sports data from providers like:
* Opta
* Sportradar
* StatsBomb
* official league feeds
It must handle:
* retries
* deduplication
* late corrections

Step B — Score computation
Your backend computes fantasy points using deterministic rules.
Example inputs:
* goals
* assists
* minutes played
* cards
* clean sheets
CRITICAL: this logic must be:
* versioned
* deterministic
* reproducible
Because disputes will happen.

Step C — Payload construction
For each matchweek:
Backend builds a payload:
* playerId → score
* matchweek id
* timestamp
* nonce

Step D — Cryptographic signing
Your oracle service signs the payload with a private key.
This key must be stored in:
* HSM or secure enclave
* never in plain environment variables in production

Step E — Submission to chain
A backend relayer sends the signed payload to OracleAdapter.
Important:
Relayer ≠ oracle signer.
Separate keys reduce risk.

4) Contest Resolution Worker
Even though resolution happens on-chain, you will want backend workers that:
* monitor when contests are ready
* trigger resolveContest transactions
* batch operations when needed
* retry failed executions
Without this, contests may sit unresolved.

5) Risk & Monitoring System (Often overlooked)
Production protocols must monitor:
* abnormal withdrawals
* oracle delays
* liquidity imbalance
* trading spikes
* failed resolutions
Typical stack
* Prometheus / Grafana
* alerting (PagerDuty, etc.)
* custom anomaly detection
This becomes critical once real money flows.

6) Caching Layer
You will need aggressive caching for:
* player lists
* leaderboards
* contest lobbies
* price charts
Typical tools:
* Redis
* edge caching (Cloudflare)
Without this, your API costs will explode.

7) Optional but Powerful Backend Features
Not required for MVP but very valuable.

Pre-trade simulation service
Backend simulates:
* buyShares output
* sellShares output
* slippage preview
This avoids users needing expensive on-chain calls.

Team validation helper
Before user submits on-chain:
Backend checks:
* roster validity
* salary caps (if you add them)
* ownership requirements
This reduces failed transactions.

Social / gamification layer
Off-chain but valuable:
* user profiles
* badges
* achievements
* referral tracking

What Your Backend Must NEVER Do
To stay trust-minimized:
Backend must NOT:
* hold user funds
* compute final contest winners (only helper)
* control mint/burn permissions
* be required for withdrawals
* gate normal protocol usage
If your backend goes offline, the protocol should still be usable (even if UX degrades).

Suggested Production Architecture
A realistic stack looks like:
Frontend (React/Wagmi) ↓ API Gateway (Node/TS or Go) ↓ Indexer (The Graph / custom) ↓ Database (Postgres) ↓ Cache (Redis) ↓
Oracle Engine (separate service) Relayer Service Contest Worker Monitoring stack


    ↓

Blockchain (your contracts)

MVP vs Production Reality
For MVP you can start with:
* simple Node backend
* one oracle signer
* one relayer
* The Graph
* Redis cache
For production you will eventually need:
* signer rotation
* multi-oracle quorum
* horizontal workers
* advanced monitoring
* failover RPCs
