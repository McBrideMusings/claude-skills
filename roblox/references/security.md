# Roblox Security Hardening

**Never trust the client.** Every `RemoteEvent:FireServer()` is an anonymous, attacker-controlled request: argument types, values, and counts are all forgeable. The client is a display layer that renders the world and collects input; the server decides what actually happens. Obfuscation, random remote names, and encrypted payloads are NOT security — only server-side validation is. Treat everything below as the minimum for any remote-connected feature.

---

## RemoteValidator module

Place in `ServerScriptService`. Type checks, extra-argument rejection, NaN-guarded range checks, per-player cooldowns, existence/authorization/distance checks, and cooldown cleanup on leave.

```luau
-- ServerScriptService/Modules/RemoteValidator.luau

local RemoteValidator = {}

--[[ -----------------------------------------------------------------------
    Type Checking
    Validates that arguments match expected types.
----------------------------------------------------------------------- ]]

type TypeSpec = string | (value: any) -> boolean

function RemoteValidator.checkType(value: any, expected: TypeSpec): boolean
    if type(expected) == "function" then
        return expected(value)
    end
    return typeof(value) == expected
end

function RemoteValidator.validateArgs(
    args: { any },
    schema: { { name: string, type: TypeSpec, optional: boolean? } }
): (boolean, string?)
    for i, spec in schema do
        local value = args[i]

        if value == nil then
            if not spec.optional then
                return false, `Missing required argument: {spec.name}`
            end
            continue
        end

        if not RemoteValidator.checkType(value, spec.type) then
            return false, `Invalid type for {spec.name}: expected {tostring(spec.type)}, got {typeof(value)}`
        end
    end

    -- Reject extra arguments that were not declared in the schema
    if #args > #schema then
        return false, `Too many arguments: expected {#schema}, got {#args}`
    end

    return true, nil
end

--[[ -----------------------------------------------------------------------
    Range Checking
    Validates that numeric values fall within acceptable bounds.
----------------------------------------------------------------------- ]]

function RemoteValidator.checkRange(value: number, min: number, max: number): boolean
    return type(value) == "number"
        and value == value -- NaN check
        and value >= min
        and value <= max
end

function RemoteValidator.checkIntegerRange(value: number, min: number, max: number): boolean
    return RemoteValidator.checkRange(value, min, max)
        and math.floor(value) == value
end

--[[ -----------------------------------------------------------------------
    Cooldown Tracking
    Per-player, per-action cooldown enforcement.
----------------------------------------------------------------------- ]]

local cooldowns: { [Player]: { [string]: number } } = {}

function RemoteValidator.checkCooldown(player: Player, action: string, cooldownSeconds: number): boolean
    local now = os.clock()
    local playerCooldowns = cooldowns[player]

    if not playerCooldowns then
        playerCooldowns = {}
        cooldowns[player] = playerCooldowns
    end

    local lastUsed = playerCooldowns[action]
    if lastUsed and (now - lastUsed) < cooldownSeconds then
        return false
    end

    playerCooldowns[action] = now
    return true
end

function RemoteValidator.clearPlayerCooldowns(player: Player)
    cooldowns[player] = nil
end

--[[ -----------------------------------------------------------------------
    Existence Checks
    Validates that targets, objects, and instances actually exist.
----------------------------------------------------------------------- ]]

function RemoteValidator.playerExists(playerName: string): Player?
    local Players = game:GetService("Players")
    return Players:FindFirstChild(playerName) :: Player?
end

function RemoteValidator.characterAlive(player: Player): boolean
    local character = player.Character
    if not character then
        return false
    end

    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then
        return false
    end

    return humanoid.Health > 0
end

function RemoteValidator.instanceExists(parent: Instance, name: string, className: string?): Instance?
    local child = parent:FindFirstChild(name)
    if not child then
        return nil
    end

    if className and not child:IsA(className) then
        return nil
    end

    return child
end

--[[ -----------------------------------------------------------------------
    Authorization
    Checks if a player is allowed to perform an action.
----------------------------------------------------------------------- ]]

function RemoteValidator.playerOwnsItem(player: Player, itemId: string, inventoryFolder: Folder?): boolean
    local folder = inventoryFolder or player:FindFirstChild("Inventory") :: Folder?
    if not folder then
        return false
    end

    return folder:FindFirstChild(itemId) ~= nil
end

function RemoteValidator.playerHasAttribute(player: Player, attribute: string, expectedValue: any?): boolean
    local value = player:GetAttribute(attribute)
    if expectedValue ~= nil then
        return value == expectedValue
    end
    return value ~= nil
end

--[[ -----------------------------------------------------------------------
    Distance Check
    Validates that two positions are within an acceptable range.
----------------------------------------------------------------------- ]]

function RemoteValidator.withinRange(posA: Vector3, posB: Vector3, maxDistance: number): boolean
    return (posA - posB).Magnitude <= maxDistance
end

function RemoteValidator.playerWithinRange(player: Player, targetPos: Vector3, maxDistance: number): boolean
    local character = player.Character
    if not character then
        return false
    end

    local root = character:FindFirstChild("HumanoidRootPart")
    if not root then
        return false
    end

    return RemoteValidator.withinRange(root.Position, targetPos, maxDistance)
end

--[[ -----------------------------------------------------------------------
    Cleanup
----------------------------------------------------------------------- ]]

game:GetService("Players").PlayerRemoving:Connect(function(player)
    RemoteValidator.clearPlayerCooldowns(player)
end)

return RemoteValidator
```

---

## Remote handler template: never trust the client

The 10-step chain — validate types → confirm target isA Player → range-check damage → cooldown → attacker alive → target alive → distance → authorization → **server computes damage** → apply.

```luau
-- ServerScriptService/RemoteHandlers/DamageHandler.server.luau

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Validator = require(ServerScriptService.Modules.RemoteValidator)
local DamageRemote = ReplicatedStorage.Remotes.DealDamage

local MAX_DAMAGE = 50
local DAMAGE_COOLDOWN = 0.5 -- seconds
local ATTACK_RANGE = 15    -- studs

local ARG_SCHEMA = {
    { name = "targetPlayer", type = "Instance" },
    { name = "damage",       type = "number" },
}

DamageRemote.OnServerEvent:Connect(function(player: Player, ...: any)
    local args = { ... }

    -- 1. Validate argument types
    local valid, err = Validator.validateArgs(args, ARG_SCHEMA)
    if not valid then
        warn(`[DamageHandler] {player.Name}: {err}`)
        return
    end

    local targetPlayer: Player = args[1]
    local damage: number = args[2]

    -- 2. Validate the target is actually a Player
    if not targetPlayer:IsA("Player") then
        return
    end

    -- 3. Validate damage range
    if not Validator.checkIntegerRange(damage, 1, MAX_DAMAGE) then
        warn(`[DamageHandler] {player.Name}: damage out of range ({damage})`)
        return
    end

    -- 4. Cooldown check
    if not Validator.checkCooldown(player, "DealDamage", DAMAGE_COOLDOWN) then
        return
    end

    -- 5. Verify attacker is alive
    if not Validator.characterAlive(player) then
        return
    end

    -- 6. Verify target is alive
    if not Validator.characterAlive(targetPlayer) then
        return
    end

    -- 7. Range check -- attacker must be near the target
    local targetRoot = targetPlayer.Character and targetPlayer.Character:FindFirstChild("HumanoidRootPart")
    if not targetRoot then
        return
    end

    if not Validator.playerWithinRange(player, targetRoot.Position, ATTACK_RANGE) then
        warn(`[DamageHandler] {player.Name}: target out of range`)
        return
    end

    -- 8. Authorization -- verify the player has a weapon equipped
    local character = player.Character
    local weapon = character and character:FindFirstChildOfClass("Tool")
    if not weapon or not weapon:GetAttribute("CanDealDamage") then
        warn(`[DamageHandler] {player.Name}: no valid weapon equipped`)
        return
    end

    -- 9. Server calculates actual damage (never trust client damage value directly)
    local serverDamage = math.min(damage, weapon:GetAttribute("MaxDamage") or MAX_DAMAGE)

    -- 10. Apply damage
    local targetHumanoid = targetPlayer.Character:FindFirstChildOfClass("Humanoid")
    if targetHumanoid then
        targetHumanoid:TakeDamage(serverDamage)
    end
end)
```

---

## Per-player rate limiter module

Sliding-window rate limiting with optional cooldown, kick-after-violations, burst detection, and a `wrapRemote` convenience.

```luau
-- ServerScriptService/Modules/RateLimiter.luau

local Players = game:GetService("Players")

local RateLimiter = {}

--[[ Configuration per action ]]
export type RateLimitConfig = {
    maxRequests: number,   -- max requests in the window
    windowSeconds: number, -- time window in seconds
    cooldownSeconds: number?, -- optional cooldown after hitting the limit
    kickAfterViolations: number?, -- kick after this many limit hits (nil = never)
    kickMessage: string?,  -- custom kick message
}

--[[ Internal tracking ]]
type PlayerActionData = {
    timestamps: { number },    -- ring buffer of request timestamps
    violations: number,        -- number of times the player hit the limit
    cooldownUntil: number,     -- os.clock() when cooldown expires
}

local tracking: { [Player]: { [string]: PlayerActionData } } = {}

local DEFAULT_KICK_MESSAGE = "Too many requests. Please try again later."

--[[ -----------------------------------------------------------------------
    Core Rate Limiting
----------------------------------------------------------------------- ]]

function RateLimiter.check(player: Player, action: string, config: RateLimitConfig): boolean
    local now = os.clock()

    -- Initialize player tracking
    if not tracking[player] then
        tracking[player] = {}
    end

    local playerActions = tracking[player]

    if not playerActions[action] then
        playerActions[action] = {
            timestamps = {},
            violations = 0,
            cooldownUntil = 0,
        }
    end

    local data = playerActions[action]

    -- Check if player is in cooldown
    if now < data.cooldownUntil then
        return false
    end

    -- Prune timestamps outside the window
    local windowStart = now - config.windowSeconds
    local pruned = {}
    for _, ts in data.timestamps do
        if ts > windowStart then
            table.insert(pruned, ts)
        end
    end
    data.timestamps = pruned

    -- Check if at the limit
    if #data.timestamps >= config.maxRequests then
        data.violations += 1

        -- Apply cooldown if configured
        if config.cooldownSeconds then
            data.cooldownUntil = now + config.cooldownSeconds
        end

        -- Kick for persistent abuse
        if config.kickAfterViolations and data.violations >= config.kickAfterViolations then
            local message = config.kickMessage or DEFAULT_KICK_MESSAGE
            warn(`[RateLimiter] Kicking {player.Name}: {data.violations} violations on "{action}"`)
            task.defer(function()
                player:Kick(message)
            end)
        else
            warn(`[RateLimiter] {player.Name}: rate limited on "{action}" (violation #{data.violations})`)
        end

        return false
    end

    -- Record this request
    table.insert(data.timestamps, now)
    return true
end

--[[ -----------------------------------------------------------------------
    Flood Detection
    Detects rapid-fire requests that exceed a burst threshold.
----------------------------------------------------------------------- ]]

function RateLimiter.checkBurst(player: Player, action: string, maxBurst: number, burstWindowSeconds: number): boolean
    local now = os.clock()

    if not tracking[player] then
        tracking[player] = {}
    end

    local burstAction = action .. "__burst"
    local playerActions = tracking[player]

    if not playerActions[burstAction] then
        playerActions[burstAction] = {
            timestamps = {},
            violations = 0,
            cooldownUntil = 0,
        }
    end

    local data = playerActions[burstAction]

    -- Prune old timestamps
    local windowStart = now - burstWindowSeconds
    local pruned = {}
    for _, ts in data.timestamps do
        if ts > windowStart then
            table.insert(pruned, ts)
        end
    end
    data.timestamps = pruned

    table.insert(data.timestamps, now)

    if #data.timestamps > maxBurst then
        data.violations += 1
        return false
    end

    return true
end

--[[ -----------------------------------------------------------------------
    Convenience: Wrap a RemoteEvent with rate limiting
----------------------------------------------------------------------- ]]

function RateLimiter.wrapRemote(
    remote: RemoteEvent,
    config: RateLimitConfig,
    handler: (player: Player, ...any) -> ()
)
    remote.OnServerEvent:Connect(function(player: Player, ...: any)
        if not RateLimiter.check(player, remote.Name, config) then
            return
        end

        handler(player, ...)
    end)
end

--[[ -----------------------------------------------------------------------
    Cleanup
----------------------------------------------------------------------- ]]

Players.PlayerRemoving:Connect(function(player)
    tracking[player] = nil
end)

return RateLimiter
```

```luau
local RateLimiter = require(ServerScriptService.Modules.RateLimiter)

-- Simple usage: 10 requests per 5 seconds, kick after 3 violations
RateLimiter.wrapRemote(ShootRemote, {
    maxRequests = 10,
    windowSeconds = 5,
    cooldownSeconds = 2,
    kickAfterViolations = 3,
    kickMessage = "Firing too fast. Disconnected.",
}, function(player, ...)
    -- Handle the shoot action (already rate-limited)
    handleShoot(player, ...)
end)

-- Manual usage with burst detection
ChatRemote.OnServerEvent:Connect(function(player, message)
    if not RateLimiter.check(player, "Chat", {
        maxRequests = 5,
        windowSeconds = 10,
        cooldownSeconds = 5,
        kickAfterViolations = 5,
    }) then
        return
    end

    -- Burst detection: no more than 3 messages in 1 second
    if not RateLimiter.checkBurst(player, "Chat", 3, 1) then
        warn(`[Chat] {player.Name}: burst detected`)
        return
    end

    processChat(player, message)
end)
```

---

## Quick checklist

Before shipping any remote-connected feature, verify:

- [ ] All arguments are type-checked with `typeof()`
- [ ] All numeric values are range-checked (including NaN: `value == value`)
- [ ] A server-side cooldown prevents rapid firing
- [ ] The player is authorized to perform the action
- [ ] The target/object exists before operating on it
- [ ] The server calculates outcomes (damage, rewards, prices) — never the client
- [ ] No sensitive data is exposed in `ReplicatedStorage` or remote payloads
- [ ] Rate limiting is in place
- [ ] Suspicious activity is logged with player identification
- [ ] Extra arguments beyond the schema are rejected
