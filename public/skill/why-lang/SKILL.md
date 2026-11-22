---
name: why-lang
display-name: Why Language
description: Write and run programs in the Why language (.wc source, arena
  memory model, built with the why toolchain). Use for any Why code.
---

# Why language

Why is a small systems language. Its surface is close to Go (C signs, name-then-type
declarations); its product is a native binary with no runtime. The one added idea is the
`arena` block: the author names the closing brace that is the death, and the compiler
inserts the release. There is no garbage collector, no borrow checker, no inheritance, no
author-written destructor.

This skill lets you generate **valid, idiomatic Why programs** and verify them with the
`why` toolchain. Follow it closely: Why rejects many idioms from C/Go/Python/JS, and the
memory model will refuse code that is semantically wrong even when it is syntactically fine.

## Verify before you finish

Why programs are verified by compiling and running them. The loop is:

```
why check <dir>      # type-check the package in <dir>; writes nothing
why run   <dir>      # build then run; the process exit code is the program's result
why build <dir>      # build the .wo into <dir> (named after the directory)
why play             # local interactive tour on 127.0.0.1:8742
```

A package is **one directory** of `.wc` files. `func main()` is the entry point. `func main() int`
makes the returned integer the process exit code; bare `func main()` exits 0. Diagnostics go to
stderr as `file:line:col: message` (English by default; French when `LC_ALL`/`LC_MESSAGES`/`LANG`
is `fr`). A host fault (index out of range, division by zero, arena exhausted) prints
`why: file:line:col: message` and stops the process — it is not a recoverable `error`.

In this workspace the toolchain and the authoritative sources live in the **why** project (the
folder containing the `why` binary, `why.md`, `testdata/`, `demos/`, and `ref/`). To run a
package you wrote, place it in a directory and call `why run <that-dir>` from the why project.
`testdata/` is the executable contract and the best place to copy a working pattern for any
construct; `demos/` are larger worked examples. When in doubt about a rule, the spec `why.md`
wins — read the relevant section before guessing.

## Core syntax

**Lexicon.** UTF-8, two-space indent (a tab is an error), newline ends a statement,
`//` comments to end of line. No preprocessor, no header, no macro, no semicolons.
A name is letters, digits, `_`, not starting with a digit. A name starting with a capital
is exported (visible from other packages); lowercase is package-private. A name must not
shadow another visible name. A parameter may share a field's name; the field is then `me.nom`.

**Values and types.** There is exactly one number type, `int` (the signed machine word).
`u8` is a byte. `string` is a run of bytes of known length, **not** Unicode text, and is immutable.
`bool` is `true`/`false`. `nil` is the zero of `error` and of pointers. The other kinds:
struct (a value, copied on assignment), `*T`, `[]T` (slice), `map[K]V`, `chan[T]`,
`entree[T]`, `sortie[T]`, interface, `Id`.

**Declarations and assignment.** `:=` declares; `=` assigns; `==` compares. The type follows
the name. Several names of the same type share the type: `a, b int`. `nom := Type` declares the
zero value of `Type`. `xs := []T` is the empty slice; `m := map[K]V` is the empty map.
Compound forms `+=`, `-=`, `*=`, `/=`, `%=` exist.

```
n := 0            // zero int
xs := []int       // empty slice
m := map[int]string // empty map
a, b int          // two ints
```

**Expressions.** Operands and arguments evaluate left to right. Integer operators `+ - * / %`
truncation toward zero; unary minus is `0 - n`. Comparisons `== != < > <= >=` need two values
of the same kind and yield a `bool`. `! && ||` take booleans and short-circuit. There are **no
floating point** numbers and **no string concatenation operator** (`string` is bytes).

**Indexing and windows.** `x[i]` reads; `xs[i] = v` writes into a slice (`s[i] = v` on a string
is refused). `len(x)` works on slices, strings, and maps (not channels). A window `x[lo:hi]`
shares storage; missing bound before `:` is 0, after is `len(x)`. `[]u8(s)` copies a string's
bytes into the current arena. `map[K]V{k: v}` is a literal. A map **does not grow**: reading an
absent key is a host fault, and `m[k] = v` only writes an existing key.

**Control flow.** `if` takes a bool; `else` sits on the same line as the closing brace;
`else if` chains. `for cond { }` repeats while true — the step is a statement in the body.
There is **no `break`** and **no `continue`**. `for x in xs` copies the slice before the first
turn; `for i, x in xs` also binds the index. `for v in c` (channel) is in Concurrency.

```
if n < 1 {
  return 1
} else if n < 3 {
  return 2
} else {
  return 4
}

i := 0
s := 0
for i < 4 {
  s = s + i
  i = i + 1
}

for x in []int{10, 20, 12} {
  s = s + x
}
```

## Functions and methods

One form: `func`. A method is `func (me T) nom(...)` or `func (me *T) nom(...)` where `T` is a
struct and the receiver is always named `me`. There is no `this`, no class, no overloading, and a
function and a method cannot share a name. A value receiver copies; a pointer receiver borrows.
Calling `x.m(...)` passes the address of `x` when the receiver is `*T` and `x` is an addressable
value — there is **no `&` operator**.

A `return` that is always reached ends the function; code after it in the same block is reported
as `code non exécuté` (compilation continues). A `select` whose arms all end leaves the following
statement executed unless an `or return` closes it.

```
struct Compte { solde int }

func (me *Compte) debiter(m int) error {
  if me.solde < m { return error("solde") }
  me.solde = me.solde - m
  return nil
}
```

## Structs, interfaces, composition

A struct has at least one field and does not contain itself (a `*T` field may: `struct Noeud { v int, suite *Noeud }`).
Composition is a **named field**, not embedding: `struct Boite { c Compte }` is called
`b.c.debiter(1)`. Method promotion is refused.

An interface is a list of method signatures (no receiver). A struct satisfies it when it has those
methods with matching params and results; there is no `implements` and no type assertion. A value
is copied into the interface; the call goes through a vtable. An interface born inside a call does
not escape the call. An empty interface is refused.

```
interface Taille { taille() int }
struct Compteur { n int }
func (me Compteur) taille() int { return me.n }
func lire(t Taille) int { return t.taille() }
```

## Generics

A struct or function may take type parameters; they are monomorphized at compile time so the
emitted C only sees concrete functions. The only constraint is an interface. Instantiate at the
call site (`Pile[int]`, `identique[int](v)`) — it is never inferred. A method reuses the struct's
parameters in order and adds none. There is no `comptime`, no specialization, no type varargs.

```
struct Pile[T] { data []T, n int }
func (me *Pile[T]) pousser(a arena, v T) {
  me.data = a.append(me.data, v)
  me.n = len(me.data)
}
```

## Memory — the `arena` block

Every value lives in an arena. There are three:

1. **The call stack** — local struct, integer, pointer; dies when the function returns.
2. **An `arena nom { }` block** — everything allocated in it dies at the closing brace; the
   compiler inserts one release.
3. **`arena thread { }`** — the thread's arena, dies with the thread, not at the brace.

The author never writes `free`; they name the block whose end is the death. An arena can be passed
as a parameter written `arena`, and `a.make([]T, n)` / `a.append(xs, v)` allocate into it.

```
func parse(a arena, buf []u8) ([]Ligne, error) {
  n := len(buf)
  ls := a.make([]Ligne, n)
  // ... fill ls ...
  return ls
}
```

The rules that most often reject code:

- A reference does not escape its arena. Returning a slice/map/interface born in a block, or
  storing it in a name that outlives the block, is refused: `la tranche ne sort pas`,
  `la map ne sort pas`, `l'interface ne sort pas`.
- A pointer to the stack cannot leave the call: `le pointeur ne sort pas de l'appel`. A pointer
  to block data stored where it outlives the block: `le pointeur ne sort pas`.
- A block arena stored in a longer-lived name: `l'arène ne sort pas`.
- One mutable pointer or many read-only, not both mutable at once: `pointeur mutable`.
- No pointer arithmetic, no integer-to-pointer cast.

A **guard** is `struct Nom garde`. A guard owns its storage; `t := Nom` owns nothing; `t.make`/
`t.append` allocate into it. `return` and `=` **move** a guard (the source becomes empty); reading
a moved guard is `garde déplacée`. A struct containing a guard is a guard. `defer` runs a call at
block exit — use it for foreign (C) resources, not for Why memory.

## Errors

`error` is a value, not an exception. `nil` is no error. Create with `error("texte")`;
`error("")` is `nil`. Compare with `==`. A function returns `(T, error)`. `or return` propagates
the error of the current function: after a `(T, error)` call the expression is the `T`; after an
`error`-only call it yields nothing. A function that does not return `error` cannot use
`or return` (`or return: the function does not return error`). An ignored `error` (outside `defer`
and `thread`) is `erreur ignorée`. There is no `try`, `catch`, or recoverable panic.

**Key trap:** there is no multi-assignment (`v, e := f()` is refused), and a `(T, error)` call used
as a bare `T` is refused (`or return attendu`). The *only* way to pull the `T` out of a
`(T, error)` result is `or return`, which is only legal inside a function that returns `error`
(or `(T, error)`). Consequence: a `func main() int` cannot extract a value from a
`(T, error)` function — it checks the error status with `==`/`!=` and returns an exit code, while
the value extraction happens inside an `error`-returning helper.

```
func lire() (int, error) {
  return 40
}
func total() (int, error) {
  n := lire() or return
  return n + 2
}
func run() error {
  n := total() or return
  if n != 42 { return error("non") }
  return nil
}
func main() int {
  if run() != nil { return 1 }
  return 42
}
```

## Concurrency

Threads are the system's; there is no scheduler or goroutine. The brace that launches a thread
**waits for it** — no handle is written. A channel is a guard and stays a name.

- `c := chan[T](n)` opens a bounded file of `n` places (0 is a rendezvous). It is a guard.
- `c.send(v)` returns `error`; a full file blocks (not an error).
- `c.receive()` returns `(T, error)`; an empty file blocks.
- `thread f(args)` launches a thread and the enclosing brace waits for it.
- `for v in c` receives until the channel is closed.
- `select` waits on arms `case v := c.receive()` / `case c.send(v)`; the first ready arm in text
  order runs; with all channels closed it yields `error("fermé")`, which `or return` can consume.
- `p := freeze(x)` moves `x` and marks the storage immutable; a write reaching it is a `freeze`
  fault. A channel that is `freeze` refuses send and receive.
- `arena shared nom { }` lets two threads read the same arena via `freeze` or a channel; the thread
  that opened it is the only one that may `nom.make`/`nom.append`.

Only `int`, `bool`, `u8`, a struct of those, a channel, or a struct holding an `entree[T]`/
`sortie[T]` may cross as a channel/thread element. Sending a `string`, `error`, slice, map,
pointer, or interface is **not in this version** unless it is `freeze` in an open `arena shared`.

```
func ajouter(c *chan[int], n int) error {
  c.send(n) or return
  return nil
}
func somme() error {
  c := chan[int](0)
  thread ajouter(c, 20)
  thread ajouter(c, 22)
  a := c.receive() or return
  b := c.receive() or return
  if a + b != 42 { return error("non") }
  return nil
}
```

## Foreign (C)

`extern func` declares a C function with a hand-written signature; Why does not parse C headers.
An `extern` takes and returns only `int`, `string`, `[]u8` (a pair points at the `(`). Why does not
free C-allocated memory; `defer` does.

```
extern func longueur(s string) int
extern func remplir(buf []u8) int
```

## What does not exist

Writing any of the following is an error or `pas dans cette version`:

- No floating point, no complex, no `float`/`double`.
- No `break`, no `continue`, no `goto`, no label.
- No string concatenation operator, no string mutation, no `\` escapes, no Unicode semantics.
- No map growth: absent key is a fault; a map only reads or overwrites existing keys.
- No pointer arithmetic, no integer↔pointer casts, no `**T`, no pointer to slice/map/string/error/interface.
- No garbage collector, no named lifetimes, no author-written destructor.
- No inheritance, no embedding/promotion, no overloading, no abstract classes.
- No macros, no annotations, no `comptime`/compile-time code.
- No exceptions, no `try`/`catch`/recoverable panic.
- No second grammar for documents: `arena` is not a word of `.oo`.
- No `new`. Allocation is `a.make` / `a.append` in an arena, or a guard's `make`/`append`.
- No multi-assignment / tuple destructuring: `v, e := f()` is not a statement. Extract a
  `(T, error)` result only with `or return` inside an `error`-returning function.
- No anonymous/inline functions: `thread` takes a call of a named function, not `func() { ... }()`.

## Patterns

- **Compute and return.** The simplest program returns an `int` (the exit code) from `main`.
- **Arena for any heap data.** Wrap heap allocations in `arena nom { }`; pass the arena into
  functions that must build slices/maps that outlive the call.
- **Guard for owning storage.** Use `struct X garde` when a value should own its slice/map and
  be moved by `return`/`=`.
- **`or return` for errors.** Make the function return `(T, error)` and propagate with `or return`;
  compare with `==` when you need to branch.
- **Channels for threads.** Launch `thread`, communicate over a bounded `chan[T]`, let the brace
  wait. Use `select` to race multiple channels; `freeze` + `arena shared` to let a reader thread see
  immutable data.
- **extern for I/O and C.** Files, network, and printing are libraries or `extern` functions, not
  the language.

## Examples

Working snippets are in the `examples/` folder of this skill:

- `examples/arith.wc` — functions, control flow, return-as-exit-code.
- `examples/arena.wc` — arena block, `a.make`, slice, window.
- `examples/structs.wc` — struct, methods, interface, composition.
- `examples/errors.wc` — `(T, error)`, `or return`, comparison.
- `examples/channels.wc` — channel, thread, `select`.
- `examples/generics.wc` — generic struct with a method.

## Sources of truth

If a behavior is not obvious here, do not guess:

- `why.md` in the why project is the spec; it decides. Each section opens with the *why*.
- `ref/` is the human-readable reference, in spec order.
- `testdata/` is the executable contract — one folder per construct, each with a `main.wc` and the
  expected exit code. `go test ./...` is the test harness.
- `demos/` are larger worked programs (`compteur`, `hanoi`, `fraction`, `todo`, `serveur`, ...).

Prefer copying a `testdata/` pattern for a construct you have not written before.
