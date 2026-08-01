---
layout: '../../layouts/BlogPost.astro'
section: 'math-notes'
title: '조합과 순열'
date: '2025-08-20'
tags: ['조합','순열']
---
한 학기 배운 내용 복습 차원에서 정리하는 조합과 순열.

ABC와 BAC는 같은 경우라고 할 수 있을까? 파이썬으로 직접 경우의 수 만들어보자.

순열: 다른 순서는 다른 경우의 수
예시 - 발표순서를 정하는 경우의 수

```python
def factorial(n):
    result = 1
    for number in range(1, n + 1):
        result *= number
    return result

def permutation_count(n, r):
    if r < 0 or r > n:
        return 0
    return factorial(n) // factorial(n - r)
print(permutation_count(3, 2))
```

조합: 다른 순서는 같은 경우의 수
예시 - 두 명의 대표를 선출하는 경우

조합 개수 계산 함수

```python
def factorial(n):
    result = 1
    for number in range(1, n + 1):
        result *= number
    return result

def combination_count(n, r):
    if r < 0 or r > n:
        return 0
    return factorial(n) // (
        factorial(r) * factorial(n - r)
    )
print(combination_count(3, 2))
```