---
title: "Skill IA"
weight: 50
---

# Skill IA — pourquoi et comment

Une skill IA est un fichier `SKILL.md` qu'un agent IA lit avant d'écrire du Why. Ce n'est pas un paquet, pas un document `.oo`, pas du code compilé. C'est l'instruction : elle dit à l'agent les règles du langage — le modèle mémoire, ce qui n'existe pas — pour que le code généré compile du premier coup. L'agent ne devine pas un idiom du C, de Go ou de Python ; il suit la skill.

Pourquoi. Ce qui rejette du code, c'est le bloc `arena` et les refus du langage. La skill les encode. L'agent écrit, compile, lit le diagnostic, corrige. La boucle est courte parce que la règle est là, pas dans l'intuition.

La skill de ce dépôt s'appelle `why-lang`. Elle est installée comme skill globale, donc visible par tous les projets. L'agent la déclenche tout seul quand on lui demande du Why ; on peut aussi la déclencher à la main avec `@why-lang`.

## La boucle

1. L'agent lit la skill.
2. Il écrit un paquet : un répertoire de `.wc`, avec `func main()`.
3. `why check <répertoire>` vérifie, sans émettre. Le diagnostic est `fichier:ligne:colonne: message`.
4. `why run <répertoire>` compile puis lance. Le code de sortie du processus est le résultat.
5. Un diagnostic ? L'agent corrige et relance. Il ne livre pas du code non compilé.

## Cinq problèmes, résolus

Chaque programme est un paquet d'un seul `.wc`. Il a été compilé et lancé avec `why run` ; le nombre affiché est le code de sortie réel. `func main() int` rend un entier : c'est le code de sortie du processus.

### 1. FizzBuzz

Somme des entiers de 1 à 15 divisibles par 3 ou par 5.

```
// fizzbuzz — somme des i (1..15) divisibles par 3 ou 5.
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

`why run fizzbuzz` → **code de sortie 60** (`3 + 5 + 6 + 9 + 10 + 12 + 15`).

### 2. Fibonacci

Le n-ième nombre de Fibonacci, par itération. `F0 = 0`, `F1 = 1`.

```
// fibonacci — le n-ième nombre (F0=0, F1=1).
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

`why run fibonacci` → **code de sortie 233** (`fib(13)`).

### 3. Recherche dichotomique

Index de la cible dans une tranche triée, en 1-based, ou 0 si absente.

```
// binarysearch — index 1-based de la cible dans la tranche triée, 0 si absente.
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

`why run binarysearch` → **code de sortie 7** (l'index 0-based de `13` est 6, donc 6 + 1).

### 4. Quicksort

Tri en place, récursif. La preuve du tri est la somme pondérée `xs[i] * (i+1)`, qui ne vaut 128 que si la tranche est triée.

```
// quicksort — tri en place, puis somme pondérée (preuve du tri).
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

`why run quicksort` → **code de sortie 128**. `[5,3,8,1,9,2]` trié donne `[1,2,3,5,8,9]`, et `1·1 + 2·2 + 3·3 + 5·4 + 8·5 + 9·6 = 128`. Sans le tri, la même somme pondérée vaudrait 96.

### 5. Crible d'Ératosthène

Nombre de premiers ≤ n. La table `est` naît dans l'arène `a` et meurt avec elle : une seule libération.

```
// tamis — crible d'Ératosthène : nombre de premiers ≤ n.
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

`why run sieve` → **code de sortie 10** (les dix premiers ≤ 30 : 2, 3, 5, 7, 11, 13, 17, 19, 23, 29).

## Ce que la skill garde en tête

Ces cinq programmes touchent tout ce qui est difficile en Why, et la skill le dit avant que l'agent n'écrive :

- **Le modèle mémoire.** Une tranche ou une table née dans un bloc `arena` y meurt ; elle ne sort pas de l'appel. Le crible l'alloue dans `a` et la laisse mourir à l'accolade.
- **Pas de `break`, pas de `continue`.** La marche est un énoncé du corps de la boucle ; c'est pour ça que chaque `for` avance son compteur lui-même.
- **Pas d'affectation multiple.** On ne tire pas `v` d'un `(T, error)` hors d'une fonction qui rend `error` ; `or return` est le seul chemin.
- **`int` seulement.** Pas de flottant, pas de concaténation de `string`. Le résultat sort par le code de sortie, pas par `print`.
- **La boucle de vérification.** Rien n'est livré sans un `why run` qui passe.

## Installer la skill

La skill est un dossier `why-lang/` avec un `SKILL.md` et des exemples. Installée en skill globale, elle est visible par tous les projets ; on l'active ou la désactive dans `Réglages → Skills`. On la déclenche à la main avec `@why-lang`, ou l'agent la lit tout seul dès qu'on demande du Why.
