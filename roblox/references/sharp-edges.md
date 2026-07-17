# Roblox Sharp Edges (Gotchas)

Every entry below is a production footgun that has caused data loss, exploits, crashes, or hours of debugging. Each has a **Problem**, a **Fix**, and a **code example**. Severity levels: **Critical** (data loss, security, or revenue — fix before shipping), **High** (server instability or exploit surface — fix this sprint), **Medium** (correctness/perf — fix before scale), **Low** (code quality/timing — fix when convenient).

| ID    | Severity | Problem → Fix                                                              |
|-------|----------|---------------------------------------------------------------------------|
| SE-1  | Critical | DataStore race on server-hop → session locking (ProfileService)           |
| SE-2  | Critical | Client-side currency is attacker-editable → server-authoritative only     |
| SE-3  | Critical | ProcessReceipt double/lost grants → grant + save THEN `PurchaseGranted`   |
| SE-4  | High     | Undisconnected events leak memory → Trove/Maid cleanup pattern            |
| SE-5  | High     | RemoteEvent flooding → per-player rate limiter                            |
| SE-6  | High     | BindToClose 30s cap loses saves → parallel `task.spawn` saves            |
| SE-7  | Medium   | Part count tanks mobile FPS → StreamingEnabled + <10K visible parts       |
| SE-8  | Medium   | Yielding in module body blocks all requirers → Init/Start lifecycle       |
| SE-9  | Medium   | `#` on tables with nil gaps is undefined → `table.remove` / explicit len  |
| SE-10 | Low      | Deprecated `wait`/`spawn`/`delay` → `task.*` equivalents                  |
| SE-11 | Medium   | `WaitForChild` with no timeout yields forever → always pass a timeout     |
| SE-12 | Low      | Luau patterns are not regex → `%d` not `\d`, `%` not `\`                  |

---

## SE-1 | Critical | DataStore Data Loss from Session Handling

**Problem.** When a player server-hops or rapidly reconnects, the old server may still be saving while the new server loads. Race condition: new server reads stale data, old server overwrites, or both write conflicting data. Result is permanent data loss.

**Fix.** Use **ProfileService** (or **ProfileStore**), which implements session locking — only one server owns a player's data at a time; the new server waits for the old to release, and an expired lock (crashed server) can be stolen. Never roll your own raw `DataStoreService` save/load for player data without session locking.

```luau
-- ServerScriptService/PlayerDataService.luau
-- Using ProfileService for session-locked player data

local Players = game:GetService("Players")
local ServerScriptService = game:GetService("ServerScriptService")
local ProfileService = require(ServerScriptService.Libs.ProfileService)

local PROFILE_TEMPLATE = {
    Coins = 0,
    Gems = 0,
    Inventory = {},
    Level = 1,
    Experience = 0,
}

local DATASTORE_NAME = "PlayerData_v1"

local ProfileStore = ProfileService.GetProfileStore(DATASTORE_NAME, PROFILE_TEMPLATE)
local Profiles: { [Player]: typeof(ProfileStore:LoadProfileAsync("")) } = {}

local PlayerDataService = {}

function PlayerDataService.getProfile(player: Player)
    return Profiles[player]
end

function PlayerDataService.start()
    local function onPlayerAdded(player: Player)
        -- Session locking happens automatically inside LoadProfileAsync.
        -- If another server holds the lock, this yields until it releases.
        local profile = ProfileStore:LoadProfileAsync(
            "Player_" .. player.UserId,
            "ForceLoad" -- Steal the lock if the other server is unresponsive
        )

        if profile == nil then
            -- Profile could not be loaded (DataStore outage, etc.)
            player:Kick("Unable to load your data. Please rejoin.")
            return
        end

        -- Guard: player may have left while we were loading
        if not player:IsDescendantOf(Players) then
            profile:Release()
            return
        end

        -- If the profile is released (session stolen by another server), kick
        profile:ListenToRelease(function()
            Profiles[player] = nil
            player:Kick("Your data was loaded on another server. Please rejoin.")
        end)

        Profiles[player] = profile
    end

    local function onPlayerRemoving(player: Player)
        local profile = Profiles[player]
        if profile then
            profile:Release() -- Releases session lock AND saves
            Profiles[player] = nil
        end
    end

    Players.PlayerAdded:Connect(onPlayerAdded)
    Players.PlayerRemoving:Connect(onPlayerRemoving)

    -- Handle players already in game (studio edge case)
    for _, player in Players:GetPlayers() do
        task.spawn(onPlayerAdded, player)
    end
end

return PlayerDataService
```

---

## SE-2 | Critical | Client-Side Currency Manipulation

**Problem.** Any value stored on or sent to the client is attacker-readable and attacker-writable. Currency in a `NumberValue`, a `leaderstats` IntValue, or a balance the client "holds" can be set to anything, and the server then trusts it. This is the most common exploit in Roblox games.

**Fix.** Currency and all authoritative state live **exclusively on the server**. The client receives read-only display values only. Never accept a currency amount from the client. The server computes every transaction internally and pushes the result to the client for display.

```luau
-- ServerScriptService/CurrencyService.luau
-- All currency logic is server-authoritative. The client NEVER sends a balance.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local PlayerDataService = require(script.Parent.PlayerDataService)

-- Remote used ONLY to push display updates to the client
local CurrencyChanged = ReplicatedStorage.Remotes.CurrencyChanged :: RemoteEvent

local CurrencyService = {}

-- Server-only: Add currency. Called by server systems (quests, shops, etc.)
function CurrencyService.addCoins(player: Player, amount: number): boolean
    assert(typeof(amount) == "number", "Amount must be a number")
    assert(amount > 0, "Amount must be positive")
    assert(amount == math.floor(amount), "Amount must be an integer")
    assert(amount <= 1_000_000, "Amount exceeds single-transaction limit")

    local profile = PlayerDataService.getProfile(player)
    if not profile then
        return false
    end

    profile.Data.Coins += amount

    -- Push display update to client (client cannot modify this)
    CurrencyChanged:FireClient(player, "Coins", profile.Data.Coins)
    return true
end

-- Server-only: Spend currency. Returns true if successful, false if insufficient.
function CurrencyService.spendCoins(player: Player, amount: number): boolean
    assert(typeof(amount) == "number", "Amount must be a number")
    assert(amount > 0, "Amount must be positive")
    assert(amount == math.floor(amount), "Amount must be an integer")

    local profile = PlayerDataService.getProfile(player)
    if not profile then
        return false
    end

    if profile.Data.Coins < amount then
        return false -- Insufficient funds
    end

    profile.Data.Coins -= amount
    CurrencyChanged:FireClient(player, "Coins", profile.Data.Coins)
    return true
end

function CurrencyService.getCoins(player: Player): number
    local profile = PlayerDataService.getProfile(player)
    return if profile then profile.Data.Coins else 0
end

return CurrencyService
```

```luau
-- StarterPlayerScripts/CurrencyDisplay.client.luau
-- Client ONLY listens for display updates. It never sends currency data.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local CurrencyChanged = ReplicatedStorage.Remotes.CurrencyChanged :: RemoteEvent

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

CurrencyChanged.OnClientEvent:Connect(function(currencyName: string, newValue: number)
    -- Update UI display only
    local label = playerGui:FindFirstChild(currencyName .. "Label", true)
    if label and label:IsA("TextLabel") then
        label.Text = tostring(newValue)
    end
end)
```

---

## SE-3 | Critical | ProcessReceipt Mishandling

**Problem.** `MarketplaceService.ProcessReceipt` fires when a player completes a developer-product purchase. If you do not return `Enum.ProductPurchaseDecision.PurchaseGranted`, Roblox **retries the callback** on every server the player joins — potentially granting the item multiple times. If you return `PurchaseGranted` *before* the grant actually succeeds and it fails, the player loses their Robux with nothing to show for it. Real-money revenue is at stake.

**Fix.** (1) Check idempotency — was this `PurchaseId` already granted? (2) Grant the item/currency first. (3) Save the grant. (4) Only THEN return `PurchaseGranted`. (5) On any failure, return `NotProcessedYet` so Roblox retries.

```luau
-- ServerScriptService/GamepassAndProductHandler.luau

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local PlayerDataService = require(script.Parent.PlayerDataService)
local CurrencyService = require(script.Parent.CurrencyService)

local PRODUCTS = {
    [123456789] = {
        name = "100 Coins",
        grant = function(player: Player): boolean
            return CurrencyService.addCoins(player, 100)
        end,
    },
    [987654321] = {
        name = "500 Coins",
        grant = function(player: Player): boolean
            return CurrencyService.addCoins(player, 500)
        end,
    },
}

local function processReceipt(
    receiptInfo: {
        PlayerId: number,
        ProductId: number,
        PurchaseId: string,
        CurrencySpent: number,
        PlaceIdWherePurchased: number,
    }
): Enum.ProductPurchaseDecision

    -- 1. Find the player in the server
    local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
    if not player then
        -- Player left; return NotProcessedYet so Roblox retries when they rejoin
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    -- 2. Wait for their profile to load
    local profile = PlayerDataService.getProfile(player)
    if not profile then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    -- 3. Check idempotency — was this PurchaseId already granted?
    if table.find(profile.Data.ProcessedReceipts, receiptInfo.PurchaseId) then
        -- Already granted; tell Roblox to stop retrying
        return Enum.ProductPurchaseDecision.PurchaseGranted
    end

    -- 4. Look up and execute the grant
    local productConfig = PRODUCTS[receiptInfo.ProductId]
    if not productConfig then
        warn("[ProcessReceipt] Unknown ProductId:", receiptInfo.ProductId)
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    local grantSuccess = productConfig.grant(player)
    if not grantSuccess then
        -- Grant failed (maybe profile released mid-grant); retry later
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    -- 5. Record the PurchaseId so we never double-grant
    table.insert(profile.Data.ProcessedReceipts, receiptInfo.PurchaseId)

    -- Keep the receipts list from growing forever (keep last 100)
    if #profile.Data.ProcessedReceipts > 100 then
        table.remove(profile.Data.ProcessedReceipts, 1)
    end

    -- 6. ONLY NOW tell Roblox the purchase is complete
    return Enum.ProductPurchaseDecision.PurchaseGranted
end

MarketplaceService.ProcessReceipt = processReceipt
```

---

## SE-4 | High | Memory Leaks from Undisconnected Events

**Problem.** Every `:Connect()` returns an `RBXScriptConnection`. If you never `:Disconnect()` it, it persists for the script's lifetime — even after the object is destroyed. In per-player systems, connecting on join without disconnecting on leave makes memory grow linearly with every player who has ever been in the server, degrading FPS and eventually crashing.

**Fix.** Store every connection and disconnect it during cleanup. Use a **Maid/Trove (Janitor)** to group connections and clean them at once. For per-player systems, one Trove per player, cleaned on `PlayerRemoving`.

```luau
-- Shared/Trove.luau (simplified cleanup utility)

local Trove = {}
Trove.__index = Trove

function Trove.new()
    return setmetatable({
        _objects = {},
    }, Trove)
end

-- Add a connection, instance, or cleanup function
function Trove:Add(object: any): any
    table.insert(self._objects, object)
    return object
end

-- Shorthand: connect an event and track the connection
function Trove:Connect(signal: RBXScriptSignal, callback: (...any) -> ()): RBXScriptConnection
    local connection = signal:Connect(callback)
    table.insert(self._objects, connection)
    return connection
end

-- Destroy everything tracked by this Trove
function Trove:Clean()
    for _, object in self._objects do
        if typeof(object) == "RBXScriptConnection" then
            object:Disconnect()
        elseif typeof(object) == "Instance" then
            object:Destroy()
        elseif typeof(object) == "function" then
            object()
        end
    end
    table.clear(self._objects)
end

return Trove
```

```luau
-- ServerScriptService/PlayerSetup.luau
-- Demonstrates per-player cleanup to prevent memory leaks

local Players = game:GetService("Players")
local Trove = require(game.ReplicatedStorage.Shared.Trove)

local playerTroves: { [Player]: typeof(Trove.new()) } = {}

local function onPlayerAdded(player: Player)
    local trove = Trove.new()
    playerTroves[player] = trove

    -- All connections go through the trove
    trove:Connect(player.CharacterAdded, function(character)
        local humanoid = character:WaitForChild("Humanoid")

        -- This connection is ALSO tracked — cleaned when the trove cleans
        trove:Connect(humanoid.Died, function()
            print(player.Name, "died — respawning in 3 seconds")
            task.wait(3)
            player:LoadCharacter()
        end)
    end)

    -- Track created instances too
    local billboard = trove:Add(Instance.new("BillboardGui"))
    billboard.Name = "PlayerLabel"
    billboard.Parent = player.Character and player.Character:FindFirstChild("Head")
end

local function onPlayerRemoving(player: Player)
    local trove = playerTroves[player]
    if trove then
        trove:Clean() -- Disconnects ALL connections, destroys ALL instances
        playerTroves[player] = nil
    end
end

Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)
```

---

## SE-5 | High | RemoteEvent Flooding

**Problem.** RemoteEvents/RemoteFunctions have no built-in rate limiting. An exploiter can fire one thousands of times per second. If the handler does nontrivial work (DataStore calls, instance creation, raycasting), this floods and lags the server for everyone, and can crash it.

**Fix.** Enforce a per-player, per-remote rate limit on the server. Drop requests over the limit; optionally kick repeat offenders.

```luau
-- ServerScriptService/RateLimiter.luau

local RateLimiter = {}
RateLimiter.__index = RateLimiter

export type Config = {
    maxRequests: number,  -- Max requests allowed in the window
    windowSeconds: number, -- Time window in seconds
    kickAfter: number?,    -- Kick player after this many violations (nil = never)
}

function RateLimiter.new(config: Config)
    return setmetatable({
        _config = config,
        _playerData = {} :: { [Player]: { count: number, windowStart: number, violations: number } },
    }, RateLimiter)
end

function RateLimiter:check(player: Player): boolean
    local now = os.clock()
    local data = self._playerData[player]

    if not data then
        data = { count = 0, windowStart = now, violations = 0 }
        self._playerData[player] = data
    end

    -- Reset window if expired
    if now - data.windowStart >= self._config.windowSeconds then
        data.count = 0
        data.windowStart = now
    end

    data.count += 1

    if data.count > self._config.maxRequests then
        data.violations += 1

        if self._config.kickAfter and data.violations >= self._config.kickAfter then
            player:Kick("Rate limit exceeded.")
        end

        return false -- Request denied
    end

    return true -- Request allowed
end

function RateLimiter:removePlayer(player: Player)
    self._playerData[player] = nil
end

return RateLimiter
```

```luau
-- ServerScriptService/CombatRemotes.luau

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local RateLimiter = require(script.Parent.RateLimiter)

local AttackRemote = ReplicatedStorage.Remotes.Attack :: RemoteEvent

-- Allow 10 attack requests per second; kick after 5 violations
local attackLimiter = RateLimiter.new({
    maxRequests = 10,
    windowSeconds = 1,
    kickAfter = 5,
})

AttackRemote.OnServerEvent:Connect(function(player: Player, targetId: number)
    if not attackLimiter:check(player) then
        return -- Silently drop the request
    end

    -- Validate and process the attack (server-authoritative)
    -- ...
end)

Players.PlayerRemoving:Connect(function(player)
    attackLimiter:removePlayer(player)
end)
```

---

## SE-6 | High | BindToClose Timeout

**Problem.** `game:BindToClose()` gives you **at most 30 seconds** before Roblox forcibly shuts the server down. Saving player data sequentially at 1–2s per DataStore call means only ~15–30 players save before the deadline; the rest lose data in a full server. It shows up only on shutdowns (updates, maintenance), never in normal play, and Studio testing (1 player) hides it.

**Fix.** Save all players **in parallel** with `task.spawn`, never yielding between saves. Collect the threads and wait until they complete or the 30s deadline approaches.

```luau
-- ServerScriptService/ShutdownHandler.luau

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local PlayerDataService = require(script.Parent.PlayerDataService)

local IS_STUDIO = RunService:IsStudio()

game:BindToClose(function()
    -- In Studio, BindToClose fires on stop — skip if no real players
    if IS_STUDIO then
        task.wait(1)
        return
    end

    local savingPlayers = Players:GetPlayers()
    if #savingPlayers == 0 then
        return
    end

    -- Save ALL players in parallel
    local completed = 0
    local total = #savingPlayers

    for _, player in savingPlayers do
        task.spawn(function()
            -- ProfileService:Release() handles save + session unlock
            local profile = PlayerDataService.getProfile(player)
            if profile then
                profile:Release()
            end
            completed += 1
        end)
    end

    -- Wait until all saves complete OR we approach the 30s deadline
    local deadline = os.clock() + 27 -- Leave 3s buffer
    while completed < total and os.clock() < deadline do
        task.wait(0.1)
    end

    if completed < total then
        warn(
            string.format(
                "[Shutdown] Saved %d/%d players before timeout!",
                completed,
                total
            )
        )
    else
        print(string.format("[Shutdown] All %d players saved successfully.", total))
    end
end)
```

---

## SE-7 | Medium | Part Count on Mobile

**Problem.** Mobile devices have far less GPU/CPU headroom than desktop. A map that runs 60 FPS on desktop can drop to 10 FPS on a phone. The renderer processes every part for shadows, lighting, and physics; exceeding roughly 10,000 visible parts on mobile causes frame drops, overheating, and crashes.

**Fix.** Keep visible part count under **10,000** for mobile. Enable **StreamingEnabled** to load only nearby geometry. Use MeshParts/unions to cut draw calls, and configure LOD (`RenderFidelity`) for distant objects.

```luau
-- Workspace configuration (set via Properties or a setup script)

-- Enable StreamingEnabled on Workspace
local Workspace = game:GetService("Workspace")

-- StreamingEnabled must be set before the game starts (in Studio properties)
-- These properties control streaming behavior at runtime:
Workspace.StreamingMinRadius = 128   -- Always load parts within 128 studs
Workspace.StreamingTargetRadius = 256 -- Try to load parts within 256 studs
Workspace.StreamingPauseMode = Enum.StreamingPauseMode.ClientPhysicsPause

-- ModelStreamingMode on individual models controls their streaming behavior:
-- Example: Mark a distant mountain as "Opportunistic" so it unloads aggressively
local distantMountain = Workspace:FindFirstChild("DistantMountain")
if distantMountain and distantMountain:IsA("Model") then
    distantMountain.ModelStreamingMode = Enum.ModelStreamingMode.Opportunistic
end

-- Mark important gameplay models as "Persistent" so they never unload
local spawnArea = Workspace:FindFirstChild("SpawnArea")
if spawnArea and spawnArea:IsA("Model") then
    spawnArea.ModelStreamingMode = Enum.ModelStreamingMode.Persistent
end

-- LOD via RenderFidelity on MeshParts
-- Automatic: Roblox picks LOD based on distance (recommended)
-- Performance: Always use lowest LOD
-- Precise: Always use highest LOD
for _, meshPart in Workspace:GetDescendants() do
    if meshPart:IsA("MeshPart") then
        meshPart.RenderFidelity = Enum.RenderFidelity.Automatic
    end
end
```

---

## SE-8 | Medium | Yielding in Module Require

**Problem.** `require()` executes a ModuleScript body **synchronously** on the requiring thread. A yielding call in the body (`WaitForChild`, `task.wait`, HTTP) blocks **every script that requires it**. Two modules that require each other and both yield can deadlock; a yield that never resolves (`WaitForChild` on a missing child) means the game never loads.

**Fix.** **Never yield in a module body** — only define functions and return a table. Use an explicit `:Init()` / `:Start()` lifecycle. A bootstrap calls `Init()` on all modules first (setup), then `Start()` on all (runtime logic that depends on others being initialized).

```luau
-- WRONG: Yielding in module body
-- local MyModule = {}
-- local someInstance = workspace:WaitForChild("ImportantThing") -- BLOCKS ALL REQUIRERS
-- function MyModule.doSomething()
--     return someInstance.Name
-- end
-- return MyModule

-- CORRECT: No yields in module body; use Init/Start pattern
-- ReplicatedStorage/Shared/CombatSystem.luau

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CombatSystem = {}

local weaponConfig: Folder? = nil
local remotes: Folder? = nil

-- Init: called first, safe to reference other modules but DO NOT start gameplay logic
function CombatSystem:Init()
    -- WaitForChild is fine here because Init is called by the bootstrap,
    -- not during require()
    weaponConfig = ReplicatedStorage:WaitForChild("WeaponConfig", 10)
    remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

    if not weaponConfig then
        error("[CombatSystem] WeaponConfig folder not found!")
    end
end

-- Start: called after ALL modules have Init'd. Safe to connect events and run logic.
function CombatSystem:Start()
    if remotes then
        local attackRemote = remotes:FindFirstChild("Attack")
        if attackRemote and attackRemote:IsA("RemoteEvent") then
            attackRemote.OnServerEvent:Connect(function(player, ...)
                CombatSystem:_handleAttack(player, ...)
            end)
        end
    end
end

function CombatSystem:_handleAttack(player: Player, targetId: number)
    -- Combat logic here
end

return CombatSystem
```

```luau
-- ServerScriptService/Bootstrap.server.luau
-- Orchestrates module initialization in the correct order

local modules = {
    require(script.Parent.Services.PlayerDataService),
    require(script.Parent.Services.CurrencyService),
    require(script.Parent.Services.CombatSystem),
    require(script.Parent.Services.ShopService),
}

-- Phase 1: Init all modules (order-independent setup)
for _, mod in modules do
    if mod.Init then
        mod:Init()
    end
end

-- Phase 2: Start all modules (gameplay logic, event connections)
for _, mod in modules do
    if mod.Start then
        mod:Start()
    end
end

print("[Bootstrap] All systems initialized and started.")
```

---

## SE-9 | Medium | Table Length with Nil Gaps

**Problem.** The `#` operator is only reliable for **sequence tables** — consecutive integer keys from 1 with no `nil` gaps. Removing an element with `myTable[3] = nil` creates a hole, and `#` may then return any valid boundary (2, 5, anything where `t[n] ~= nil` and `t[n+1] == nil`). This is defined behavior, not a bug, and it causes elements to be skipped.

**Fix.** Never set array elements to `nil` — use `table.remove()` to shift down. Use `ipairs()` for ordered iteration (stops at first `nil`). For sparse data use a dictionary with `pairs()`, or track length explicitly.

```luau
-- DANGEROUS: Using # on a table with nil gaps
local inventory = { "Sword", "Shield", nil, "Potion", "Bow" }
print(#inventory) -- Could print 2 or 5 — UNRELIABLE

-- SAFE PATTERN 1: Use table.remove instead of setting nil
local items = { "Sword", "Shield", "Helmet", "Potion" }
-- Remove "Helmet" (index 3) — shifts "Potion" down to index 3
table.remove(items, 3)
print(#items) -- Reliably prints 3: { "Sword", "Shield", "Potion" }

-- SAFE PATTERN 2: Use ipairs for iteration (stops at first nil)
local data = { 10, 20, nil, 40 }
local sum = 0
for _, value in ipairs(data) do
    sum += value -- Only adds 10 + 20 = 30; stops before nil
end

-- SAFE PATTERN 3: Use a dictionary for sparse data
local equippedSlots: { [string]: string } = {
    Head = "Crown",
    -- Chest is intentionally empty (key absent, not nil)
    Legs = "Iron Greaves",
    Feet = "Boots",
}

for slot, item in equippedSlots do
    print(slot, item) -- Iterates all entries; no nil confusion
end

-- SAFE PATTERN 4: Track length explicitly for sparse arrays
local SparseArray = {}
SparseArray.__index = SparseArray

function SparseArray.new()
    return setmetatable({ _data = {}, _length = 0 }, SparseArray)
end

function SparseArray:push(value: any)
    self._length += 1
    self._data[self._length] = value
end

function SparseArray:removeAt(index: number)
    -- Swap with last element to avoid shifting
    self._data[index] = self._data[self._length]
    self._data[self._length] = nil
    self._length -= 1
end

function SparseArray:length(): number
    return self._length -- Always accurate
end
```

---

## SE-10 | Low | Deprecated wait()/spawn()/delay()

**Problem.** The legacy globals `wait()`, `spawn()`, and `delay()` are deprecated. `wait()` has a minimum yield of ~0.03s regardless of argument (`wait(0)` waits 1–2 frames). `spawn()` defers to a later resumption cycle with unpredictable timing and silently swallows errors. `delay()` inherits `wait()`'s imprecision.

**Fix.** Replace with the `task` library — faster, predictable, and with proper error tracebacks.

| Legacy       | Replacement        | Behavior                                       |
|--------------|--------------------|-------------------------------------------------|
| `wait(n)`    | `task.wait(n)`     | Resumes after `n` seconds (min 1 frame)         |
| `spawn(fn)`  | `task.spawn(fn)`   | Runs immediately on a new thread                |
| `delay(n,fn)`| `task.delay(n,fn)` | Runs `fn` after `n` seconds on a new thread     |
| —            | `task.defer(fn)`   | Runs next resumption cycle (replaces `spawn`)    |
| —            | `task.cancel(th)`  | Cancels a thread created by task.delay/defer     |

```luau
-- DEPRECATED (do not use)
-- wait(1)
-- spawn(function() doWork() end)
-- delay(5, function() cleanup() end)

-- CORRECT: task library equivalents
task.wait(1) -- Yields for exactly 1 second (or the closest frame boundary)

task.spawn(function()
    -- Runs IMMEDIATELY on a new thread
    -- Errors properly propagate to the output
    doExpensiveWork()
end)

task.delay(5, function()
    -- Runs after exactly 5 seconds
    performCleanup()
end)

-- task.defer: runs on the NEXT resumption cycle (useful when you need to yield
-- the current thread briefly but resume ASAP)
task.defer(function()
    -- Runs next cycle — equivalent to the old spawn() timing
    -- but with proper error handling
    initializeSystem()
end)

-- task.cancel: cancel a deferred or delayed thread
local delayedThread = task.delay(10, function()
    print("This will never print if cancelled")
end)

-- Cancel it before it fires
task.cancel(delayedThread)

-- Practical example: countdown timer
local function startCountdown(seconds: number, onTick: (remaining: number) -> ())
    return task.spawn(function()
        for i = seconds, 1, -1 do
            onTick(i)
            task.wait(1) -- Precise 1-second intervals
        end
        onTick(0)
    end)
end

local countdownThread = startCountdown(10, function(remaining)
    print("Time left:", remaining)
end)

-- Can cancel the countdown early if needed
-- task.cancel(countdownThread)
```

---

## SE-11 | Medium | Infinite Yield Warning

**Problem.** `Instance:WaitForChild(name)` with no timeout yields the current thread **forever** if the child never appears. Roblox prints an "Infinite yield possible" warning after 5s, but the thread stays stuck. In a critical path (module body, init script) the whole system hangs silently. Common when an instance is renamed but code isn't updated, when StreamingEnabled hasn't streamed it in yet, or a creation race.

**Fix.** **Always pass a timeout** and handle the `nil` return — fail fast and log a meaningful error instead of hanging.

```luau
-- DANGEROUS: No timeout — hangs forever if "WeaponSystem" doesn't exist
-- local weaponSystem = ReplicatedStorage:WaitForChild("WeaponSystem")

-- SAFE: Timeout with error handling
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local WAIT_TIMEOUT = 5 -- seconds

local function safeWaitForChild(
    parent: Instance,
    childName: string,
    timeout: number?
): Instance?
    local child = parent:WaitForChild(childName, timeout or WAIT_TIMEOUT)

    if not child then
        warn(
            string.format(
                "[safeWaitForChild] '%s' not found in '%s' after %d seconds. "
                    .. "Check that it exists and is spelled correctly.",
                childName,
                parent:GetFullName(),
                timeout or WAIT_TIMEOUT
            )
        )
    end

    return child
end

-- Usage: gracefully handle missing instances
local weaponFolder = safeWaitForChild(ReplicatedStorage, "Weapons", 10)
if not weaponFolder then
    -- Fall back, disable the feature, or error out early
    error("[Init] Cannot start without Weapons folder!")
end

-- Chain safely
local swordConfig = weaponFolder and safeWaitForChild(weaponFolder, "SwordConfig")
if swordConfig then
    print("Sword damage:", swordConfig:GetAttribute("Damage"))
end

-- For client scripts with StreamingEnabled, instances may not be streamed in yet.
-- Use WaitForChild with a generous timeout:
local function waitForStreamedModel(name: string): Model?
    local model = safeWaitForChild(workspace, name, 30) -- 30s for streaming
    if not model then
        warn(name, "did not stream in within 30 seconds")
    end
    return model :: Model?
end
```

---

## SE-12 | Low | String Patterns vs Regex

**Problem.** Luau uses **Lua string patterns**, not regular expressions. `\d`, `\w`, `\s` do not work. Luau escapes with `%`, not `\`, and the character classes differ. Patterns also lack alternation (`|`), non-greedy `*?`, lookahead/lookbehind, and quantified capture groups.

**Fix.** Learn the equivalents: `%d` (digit), `%D` (non-digit), `%w` (alphanumeric), `%s` (whitespace), `%a` (letter), `%l`/`%u` (lower/upper), `%.` (literal dot), `-` (lazy match), `%%` (literal percent), `%(` (literal paren).

```luau
local testString = "Player_123 scored 456 points on 2026-03-04!"

-- WRONG (regex habits):
-- string.match(testString, "\\d+")     -- Returns nil, not "123"
-- string.match(testString, "\\w+")     -- Returns nil
-- string.match(testString, "[\\d-]+")  -- Returns nil

-- CORRECT (Luau patterns):

-- Extract first number
local firstNumber = string.match(testString, "%d+")
print(firstNumber) -- "123"

-- Extract all numbers
for num in string.gmatch(testString, "%d+") do
    print("Found number:", num) -- "123", "456", "2026", "03", "04"
end

-- Extract a date pattern (YYYY-MM-DD)
local year, month, day = string.match(testString, "(%d+)-(%d+)-(%d+)")
print(year, month, day) -- "2026", "03", "04"

-- Extract a word (alphanumeric sequence)
local firstWord = string.match(testString, "%a+")
print(firstWord) -- "Player"

-- Match the player name format "Player_NNN"
local playerName = string.match(testString, "%a+_%d+")
print(playerName) -- "Player_123"

-- Lazy (non-greedy) match: use `-` instead of `*?`
local htmlish = "<tag>content</tag>"
local greedy = string.match(htmlish, "<(.+)>")      -- "tag>content</tag" (greedy)
local lazy = string.match(htmlish, "<(.-)>")         -- "tag" (non-greedy)
print("Greedy:", greedy)
print("Lazy:", lazy)

-- Escaping special characters: use % not \
local version = "v2.5.1"
local major, minor, patch = string.match(version, "v(%d+)%.(%d+)%.(%d+)")
print(major, minor, patch) -- "2", "5", "1"

-- Common gotcha: matching a literal percent sign requires %%
local discount = "Save 20% today!"
local pct = string.match(discount, "(%d+)%%")
print(pct) -- "20"
```
