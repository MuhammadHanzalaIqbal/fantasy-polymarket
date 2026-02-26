Existing deployed contracts:
FTK: https://sepolia.etherscan.io/address/0x82021ccfed084fd8578cb38d8d4323345c363079#writeContract

Treasury: https://sepolia.etherscan.io/address/0xb78e5bdcdf4628d66ce92f731b8a6bc4eac4b63a#readContract

Router: https://sepolia.etherscan.io/address/0xf2134d1c5b1f0be5f724a7dc8b7fc360f3cad04e#writeContract

Market: https://sepolia.etherscan.io/address/0x290dd7f51a0100941d1ec14c40d625821f2bb723#writeContract

Shares: https://sepolia.etherscan.io/address/0xcbfc9c21658d214e61a17afc23928aef1453bda8#readContract

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
