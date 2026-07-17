# Luau Idioms & Roblox Gotchas

Luau is Roblox's fork of Lua 5.1 with gradual typing, `continue`, compound assignment (`+=`), string interpolation (backticks), and extra built-ins. This file covers the Roblox-specific idioms and the gotchas that bite people coming from other languages. Deprecated timing, the `#`-with-nil-gaps trap, and string patterns are covered in `sharp-edges.md`.

---

## Task library

Modern replacement for the deprecated globals `wait()`, `spawn()`, `delay()`. Faster, predictable timing, proper error tracebacks.

```luau
-- task.wait: yields the current thread for a duration (returns actual elapsed time)
local elapsed = task.wait(2) -- waits ~2 seconds
print(`Actually waited {elapsed} seconds`)

-- task.spawn: runs a function IMMEDIATELY in a new thread (resumes caller after)
task.spawn(function()
    print("This runs immediately in a new coroutine")
    task.wait(5)
    print("This runs 5 seconds later")
end)
print("This also runs immediately, after the spawned function yields")

-- task.delay: runs a function after a delay
task.delay(3, function()
    print("This runs after 3 seconds")
end)

-- task.defer: runs a function at the END of the current resumption cycle
-- (defer runs after the current thread and any task.spawn calls finish)
task.defer(function()
    print("Runs next cycle — the well-behaved replacement for old spawn() timing")
end)

-- task.cancel: cancels a thread created by task.spawn or task.delay
local thread = task.delay(10, function()
    print("This will never run")
end)
task.cancel(thread)
```

Timing vs legacy: `wait()` had a ~0.03s minimum yield regardless of argument (`wait(0)` waited 1–2 frames), `spawn()` deferred to a later cycle with unpredictable timing and **swallowed errors silently**, and `delay()` inherited `wait()`'s imprecision. `task.wait`/`task.spawn` fire on the next frame / immediately and surface errors to the output. Use `task.desynchronize()` / `task.synchronize()` to switch between parallel and serial execution under Parallel Luau.

---

## Typed Luau essentials

```luau
--!strict
-- Put --!strict at the top of a file to enable strict type checking.
-- Types are analysis-time only; they do not affect runtime behavior.

-- Typed function signatures
local function add(a: number, b: number): number
    return a + b
end

-- Optional parameters/fields use `?` (shorthand for `T | nil`)
local function greet(name: string, title: string?): string
    if title then
        return `{title} {name}`
    end
    return name
end

-- Union types
local id: string | number = "abc123"
id = 42 -- also valid

-- Typed table / record
type PlayerData = {
    name: string,
    level: number,
    inventory: { string },
    stats: { health: number, mana: number },
}

-- Array and dictionary types
local scores: { number } = { 100, 95, 87 }
local flags: { [string]: boolean } = { shadows = true, particles = false }
```

### type() vs typeof()

`typeof()` is **Roblox-aware** and preferred: it returns `"Vector3"`, `"Instance"`, `"RBXScriptConnection"`, etc., where `type()` only knows base Lua types and returns `"userdata"` for all of those. Use `typeof()` for narrowing and validation.

```luau
print(type(Vector3.new()))   --> "userdata"
print(typeof(Vector3.new())) --> "Vector3"
```

### Type narrowing and guards

```luau
-- typeof narrows a union
local function process(value: string | number)
    if typeof(value) == "string" then
        print(string.upper(value)) -- narrowed to string
    else
        print(value * 2)           -- narrowed to number
    end
end

-- :IsA() narrows an Instance to a subclass
local function handlePart(instance: Instance)
    if instance:IsA("BasePart") then
        instance.Anchored = true -- narrowed to BasePart
    end
end

-- assert narrows away nil
local function getPlayerData(player: Player)
    local leaderstats = player:FindFirstChild("leaderstats")
    assert(leaderstats, "Player missing leaderstats")
    -- leaderstats is now non-nil
    return leaderstats
end
```

### Generics (briefly)

```luau
local function first<T>(list: { T }): T?
    return list[1]
end
local name = first({ "Alice", "Bob" }) -- inferred string?
local num = first({ 1, 2, 3 })         -- inferred number?

type Result<T> = { success: boolean, value: T?, error: string? }
```

### Export types across modules

```luau
-- ReplicatedStorage/Types.luau
export type WeaponData = {
    name: string,
    damage: number,
    rarity: "Common" | "Rare" | "Epic" | "Legendary",
}

-- Consumer:
local Types = require(game.ReplicatedStorage.Types)
local function make(): Types.WeaponData
    return { name = "Sword", damage = 25, rarity = "Common" }
end
```

---

## Roblox instance & event idioms

```luau
-- Set Parent LAST after configuring all properties (avoids extra replication/change events)
local part = Instance.new("Part")
part.Size = Vector3.new(50, 1, 50)
part.Anchored = true
part.Material = Enum.Material.Grass
part.Parent = workspace -- last

-- GetService is the canonical service accessor; store in a local at the top of the script
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

-- Event connections
local conn = Players.PlayerAdded:Connect(function(player: Player) end)
conn:Disconnect()                 -- disconnect when done (prevents leaks)
Players.PlayerAdded:Once(function(p) end)   -- auto-disconnects after firing once
local player = Players.PlayerAdded:Wait()   -- yields until it fires

-- Heartbeat fires every frame AFTER physics (use for most game logic)
RunService.Heartbeat:Connect(function(deltaTime: number) end)
-- Stepped fires every frame BEFORE physics
RunService.Stepped:Connect(function(elapsed: number, deltaTime: number) end)

-- Property-change and child signals
part:GetPropertyChangedSignal("Position"):Connect(function() end)
workspace.ChildAdded:Connect(function(child: Instance) end)
```

Tree traversal: `FindFirstChild(name[, recursive])`, `FindFirstChildOfClass("Humanoid")`, `FindFirstChildWhichIsA("BasePart")` (respects class hierarchy), `WaitForChild(name, timeout)`, `GetChildren()`, `GetDescendants()`. Tag-based lookup via `CollectionService:GetTagged("Enemy")` plus `GetInstanceAddedSignal` / `GetInstanceRemovedSignal`.

---

## Math helpers

```luau
-- Clamp (built-in)
local health = math.clamp(currentHealth, 0, MAX_HEALTH)

-- Linear interpolation
local function lerp(a: number, b: number, t: number): number
    return a + (b - a) * t
end

-- Remap a value from one range to another
local function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin))
end

-- Round to N decimal places
local function roundTo(value: number, places: number): number
    local factor = 10 ^ places
    return math.round(value * factor) / factor
end
print(roundTo(3.14159, 2)) --> 3.14

-- Vector helpers
local distance = (posA - posB).Magnitude     -- distance between two Vector3s
local direction = (target - origin).Unit      -- normalized direction

-- Other built-ins: math.sign(-7) --> -1, math.round(3.5) --> 4, math.huge --> inf
-- Random.new():NextInteger(1, 100) gives better randomness than math.random
```

---

## Gotchas

### 1-based indexing

Arrays start at `[1]`. `array[0]` is `nil` (not an error). Iterate `for i = 1, #items`.

### Setting a table value to nil removes the key

```luau
local t = { a = 1, b = 2, c = 3 }
t.b = nil -- "b" key no longer exists; t is { a = 1, c = 3 }
```

You cannot store `nil` as a meaningful value. To distinguish "absent" from "unset", use a sentinel:

```luau
local NONE = newproxy(false) -- unique sentinel
cache["key"] = NONE          -- "checked, value is absent"
-- cache["other"] is nil     -- "not checked yet"
```

Setting an array element to `nil` creates a gap — use `table.remove(list, i)` to shift down instead (see `sharp-edges.md` SE-9).

### No type coercion; only nil and false are falsy

```luau
print(0 == "0")    --> false
print(1 == true)   --> false

-- 0, "", and {} are all TRUTHY
if 0 then print("0 is truthy") end   --> prints
if "" then print("empty is truthy") end --> prints

-- So `if value then` does NOT check for empty/zero — be explicit:
if value ~= nil and value ~= "" then end
if value ~= nil and value ~= 0 then end
```

### Tables are references, not values

```luau
local original = { 1, 2, 3 }
local alias = original
alias[1] = 99
print(original[1]) --> 99 (same table)

-- table.clone is a SHALLOW copy — nested tables are still shared
local nested = { data = { 1, 2, 3 } }
local shallow = table.clone(nested)
shallow.data[1] = 99
print(nested.data[1]) --> 99 (shared reference!)
-- Deep-copy recursively if you need independent nested structures.
```

### Metatable class pitfalls

```luau
-- Forgetting __index breaks method lookup:
local MyClass = {}
-- MISSING: MyClass.__index = MyClass
function MyClass.new() return setmetatable({}, MyClass) end
function MyClass.doThing(self) end
-- MyClass.new():doThing() --> ERROR: attempt to call a nil value

-- Assigning to the class table instead of the instance leaks state across all instances:
function MyClass.setName(self, name)
    -- BAD: MyClass.name = name  (shared by every instance)
    self.name = name -- GOOD: per-instance
end
```

Standard class pattern:

```luau
local Weapon = {}
Weapon.__index = Weapon

export type Weapon = typeof(setmetatable(
    {} :: { name: string, damage: number, durability: number },
    Weapon
))

function Weapon.new(name: string, damage: number, durability: number): Weapon
    local self = setmetatable({}, Weapon)
    self.name = name
    self.damage = damage
    self.durability = durability
    return self
end

function Weapon.attack(self: Weapon, target: Humanoid)
    if self.durability <= 0 then return end
    target:TakeDamage(self.damage)
    self.durability -= 1
end
```

### `for` loops capture a fresh variable; `while` loops do not

```luau
-- Numeric for: each iteration gets a NEW `i`, so closures capture correctly
local fns = {}
for i = 1, 5 do
    fns[i] = function() return i end
end
print(fns[1]()) --> 1  (works)

-- while loop: the variable is SHARED — all closures see its final value
local bad = {}
local i = 1
while i <= 5 do
    bad[i] = function() return i end
    i += 1
end
print(bad[1]()) --> 6  (bug!)

-- Fix: capture into a per-iteration local
local good = {}
local j = 1
while j <= 5 do
    local captured = j
    good[j] = function() return captured end
    j += 1
end
print(good[1]()) --> 1
```

### Wrap fallible calls in pcall

DataStore, HTTP, and any yielding API can error and kill the thread. Guard them:

```luau
local success, data = pcall(dataStore.GetAsync, dataStore, "key")
if not success then
    warn("DataStore read failed:", data)
    data = {} -- fallback
end
```
