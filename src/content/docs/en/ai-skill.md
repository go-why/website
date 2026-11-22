---
title: "AI Skill"
weight: 50
---

# AI Skill — why and how

An AI skill is a `SKILL.md` file an AI agent reads before writing Why. It is not a package, not a `.oo` document, not compiled code. It is the instruction: it tells the agent the rules of the language — the memory model, what does not exist — so the generated code compiles on the first try. The agent does not guess an idiom from C, Go, or Python; it follows the skill.

Why. What rejects code is the `arena` block and the refusals of the language. The skill encodes them. The agent writes, compiles, reads the diagnostic, fixes. The loop is short because the rule is there, not left to intuition.

This repository's skill is called `why-lang`. It is installed as a global skill, so it is visible to every project. The agent triggers it on its own when asked for Why; you can also trigger it manually with `@why-lang`.

## The loop

1. The agent reads the skill.
2. It writes a package: a directory of `.wc`, with `func main()`.
3. `why check <dir>` type-checks, emitting nothing. The diagnostic is `file:line:col: message`.
4. `why run <dir>` builds then runs. The process exit code is the result.
5. A diagnostic? The agent fixes and re-runs. It does not ship uncompiled code.

## Five problems, solved

Each program is a single-`.wc` package. It was compiled and run with `why run`; the number shown is the real exit code. `func main() int` returns an integer: that is the process exit code.

### 1. FizzBuzz

Sum of the integers from 1 to 15 divisible by 3 or by 5.

```
// fizzbuzz — sum of i (1..15) divisible by 3 or 5.
func est(i int) bool {
  if i % 3 == 0 || i % 5 == 0 {
    return true
  }
  return false
}

func main() int {
  s := 0
  i := 1
  for i <= 15 {
    if est(i) {
      s = s + i
    }
    i = i + 1
  }
  return s
}
```

`why run fizzbuzz` → **exit code 60** (`3 + 5 + 6 + 9 + 10 + 12 + 15`).

### 2. Fibonacci

The n-th Fibonacci number, iteratively. `F0 = 0`, `F1 = 1`.

```
// fibonacci — the n-th number (F0=0, F1=1).
func fib(n int) int {
  a := 0
  b := 1
  i := 0
  for i < n {
    s := a + b
    a = b
    b = s
    i = i + 1
  }
  return a
}

func main() int {
  return fib(13)
}
```

`why run fibonacci` → **exit code 233** (`fib(13)`).

### 3. Binary search

Index of the target in a sorted slice, 1-based, or 0 if absent.

```
// binarysearch — 1-based index of the target in the sorted slice, 0 if absent.
func cherche(xs []int, cible int) int {
  lo := 0
  hi := len(xs) - 1
  for lo <= hi {
    mi := (lo + hi) / 2
    if xs[mi] == cible {
      return mi + 1
    } else if xs[mi] < cible {
      lo = mi + 1
    } else {
      hi = mi - 1
    }
  }
  return 0
}

func main() int {
  xs := []int{1, 3, 5, 7, 9, 11, 13, 15, 17, 19}
  return cherche(xs, 13)
}
```

`why run binarysearch` → **exit code 7** (the 0-based index of `13` is 6, so 6 + 1).

### 4. Quicksort

In-place, recursive sort. The proof of the sort is the weighted sum `xs[i] * (i+1)`, which is 128 only if the slice is sorted.

```
// quicksort — in-place sort, then weighted sum (proof of the sort).
func echange(xs []int, i int, j int) {
  t := xs[i]
  xs[i] = xs[j]
  xs[j] = t
}

func trier(xs []int, lo int, hi int) {
  if lo >= hi {
    return
  }
  p := xs[hi]
  i := lo
  j := lo
  for j < hi {
    if xs[j] <= p {
      echange(xs, i, j)
      i = i + 1
    }
    j = j + 1
  }
  echange(xs, i, hi)
  trier(xs, lo, i - 1)
  trier(xs, i + 1, hi)
}

func main() int {
  xs := []int{5, 3, 8, 1, 9, 2}
  trier(xs, 0, len(xs) - 1)
  s := 0
  i := 0
  for i < len(xs) {
    s = s + xs[i] * (i + 1)
    i = i + 1
  }
  return s
}
```

`why run quicksort` → **exit code 128**. Sorting `[5,3,8,1,9,2]` gives `[1,2,3,5,8,9]`, and `1·1 + 2·2 + 3·3 + 5·4 + 8·5 + 9·6 = 128`. Without the sort the same weighted sum would be 96.

### 5. Sieve of Eratosthenes

Count of primes ≤ n. The table `est` is born in the arena `a` and dies with it: a single release.

```
// tamis — Sieve of Eratosthenes: count of primes ≤ n.
func tamis(n int) int {
  arena a {
    est := a.make([]bool, n + 1)
    k := 2
    for k <= n {
      est[k] = true
      k = k + 1
    }
    i := 2
    j := 0
    for i * i <= n {
      if est[i] {
        j = i * i
        for j <= n {
          est[j] = false
          j = j + i
        }
      }
      i = i + 1
    }
    c := 0
    m := 2
    for m <= n {
      if est[m] {
        c = c + 1
      }
      m = m + 1
    }
    return c
  }
}

func main() int {
  return tamis(30)
}
```

`why run sieve` → **exit code 10** (the ten primes ≤ 30: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29).

## What the skill keeps in mind

These five programs touch everything that is hard in Why, and the skill says it before the agent writes:

- **The memory model.** A slice or table born in an `arena` block dies there; it does not escape the call. The sieve allocates it in `a` and lets it die at the brace.
- **No `break`, no `continue`.** The step is a statement in the loop body; that is why each `for` advances its own counter.
- **No multi-assignment.** You cannot pull `v` out of a `(T, error)` outside a function that returns `error`; `or return` is the only way.
- **`int` only.** No floating point, no `string` concatenation. The result leaves through the exit code, not through `print`.
- **The verification loop.** Nothing is shipped without a passing `why run`.

## Installing the skill

The skill is a `why-lang/` folder with a `SKILL.md` and examples. Installed as a global skill, it is visible to every project; enable or disable it in `Settings → Skills`. Trigger it manually with `@why-lang`, or the agent reads it on its own as soon as you ask for Why.
