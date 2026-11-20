---
layout: '../../layouts/BlogPost.astro'
section: 'math-notes'
title: '원-핫 인코딩 두 가지 방법: OneHotEncoder와 to_categorical'
date: '2026-11-20'
description: '가입·미가입 예제로 OneHotEncoder와 to_categorical의 입력 형태와 변환 과정을 비교한다.'
category: 'Machine learning'
lang: 'ko'
tags: ['Python', '머신러닝', '데이터 전처리', 'One-Hot Encoding']
---

수업에서 `가입`, `미가입`을 숫자로 바꾸는 코드를 보고, 원-핫 인코딩을 두 가지 방법으로 정리해 봤다. 같은 결과를 만들 수 있지만, 입력을 준비하는 과정이 조금 다르다.

## 원-핫 인코딩이란?

**범주마다 자리를 하나씩 만들고, 해당하는 자리만 1로 표시하는 방법**이다. 열의 순서를 `[가입, 미가입]`으로 정하면 다음과 같다.

<div class="note-table-scroll" role="region" aria-label="가입·미가입의 원-핫 표현" tabindex="0">

| 원래 값 | 가입 | 미가입 | 벡터 표현 |
| --- | ---: | ---: | --- |
| 가입 | 1 | 0 | `[1, 0]` |
| 미가입 | 0 | 1 | `[0, 1]` |

</div>


여기서 1은 ‘이 범주에 해당한다’, 0은 ‘해당하지 않는다’는 뜻이다. `1.`, `0.`처럼 소수점이 붙어 출력돼도 의미는 같다.

순서가 없는 여러 범주를 0, 1, 2로만 표시하면 일부 모델은 숫자의 크기나 간격에 의미를 부여할 수 있다. 원-핫 인코딩은 범주별 칸을 따로 둔다. 다만 이진 범주를 0과 1로 표현하는 것도 가능하며, 모든 범주형 데이터에 원-핫 인코딩이 필수인 것은 아니다.

필요한 패키지가 설치돼 있지 않다면 터미널에서 먼저 설치한다. 아래 `OneHotEncoder` 코드는 scikit-learn 1.2 이상을 기준으로 한다.

```bash
python -m pip install numpy "scikit-learn>=1.2" tensorflow
```

## 1. OneHotEncoder: 문자열을 바로 변환하기

scikit-learn의 `OneHotEncoder`는 문자열 범주를 직접 받아 원-핫 배열을 만들 수 있다. 별도로 `LabelEncoder`를 거칠 필요가 없다.

```python
import numpy as np
from sklearn.preprocessing import OneHotEncoder

labels = ["가입", "미가입", "가입", "미가입"]

# OneHotEncoder는 (행 수, 열 수) 형태의 2차원 입력을 받는다.
X = np.array(labels).reshape(-1, 1)

encoder = OneHotEncoder(
    sparse_output=False,
    handle_unknown="ignore",
)
one_hot = encoder.fit_transform(X)

print(encoder.categories_[0])  # 결과 배열의 열 순서
print(one_hot)
print(one_hot.shape)
```

출력:

```text
['가입' '미가입']
[[1. 0.]
 [0. 1.]
 [1. 0.]
 [0. 1.]]
(4, 2)
```

`reshape(-1, 1)`은 데이터를 **한 열짜리 표**로 만든다. `-1`은 행 수를 자동으로 계산하고, `1`은 열을 하나로 지정한다는 뜻이다. 이 예제에서는 입력이 `(4, 1)`, 결과가 `(4, 2)`가 된다.

`fit_transform()`은 범주 목록을 익힌 뒤 변환까지 수행한다. `sparse_output=False`는 결과를 바로 확인하기 쉬운 일반 NumPy 배열로 받는 설정이다. 열의 순서는 입력 순서로 추측하지 말고 `categories_`로 확인하면 된다.

`handle_unknown="ignore"`를 지정하면 이후 `transform()`에서 처음 보는 값은 이 변수에 해당하는 모든 칸이 0이 된다. 이 예제에서는 `[0, 0]`이며, 새 범주용 열이 생기는 것은 아니다.

## 2. to_categorical: 정수 번호를 원-핫으로 바꾸기

TensorFlow/Keras의 `to_categorical`은 **정수로 된 클래스 번호**를 원-핫 배열로 바꾼다. 문자열은 먼저 `LabelEncoder`로 번호를 붙인다.

```python
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras.utils import to_categorical

labels = ["가입", "미가입", "가입", "미가입"]

# 1단계: 문자열을 0부터 시작하는 정수 번호로 바꾼다.
label_encoder = LabelEncoder()
integer_labels = label_encoder.fit_transform(labels)

# 2단계: 정수 번호를 원-핫 배열로 바꾼다.
one_hot = to_categorical(
    integer_labels,
    num_classes=len(label_encoder.classes_),
)

print(label_encoder.classes_)  # 정수 번호에 대응하는 범주 순서
print(integer_labels)
print(one_hot)
print(one_hot.shape)
```

출력:

```text
['가입' '미가입']
[0 1 0 1]
[[1. 0.]
 [0. 1.]
 [1. 0.]
 [0. 1.]]
(4, 2)
```

이 예제에서는 `LabelEncoder`가 `가입 → 0`, `미가입 → 1`로 바꾼다. **여기까지는 정수 인코딩**이다. 그다음 `to_categorical`이 `0 → [1, 0]`, `1 → [0, 1]`로 바꿔 원-핫 인코딩이 완성된다.

`num_classes`는 전체 클래스 수, 즉 결과의 열 개수다. 여기서는 두 개다. 생략하면 `입력의 최댓값 + 1`로 계산되므로, 클래스 번호는 0부터 시작하도록 준비하고 학습·검증 데이터에는 동일한 클래스 수를 지정하는 편이 명확하다. 이미 정답이 `[0, 1, 0, 1]` 같은 번호라면 `LabelEncoder` 단계는 생략할 수 있다.

## 두 방법의 차이

<div class="note-table-scroll" role="region" aria-label="OneHotEncoder와 to_categorical 비교" tabindex="0">

| 구분 | OneHotEncoder | to_categorical |
| --- | --- | --- |
| 소속 | scikit-learn | TensorFlow/Keras |
| 이 예제의 입력 | 문자열을 담은 2차원 배열 | 0부터 시작하는 정수 번호 배열 |
| 문자열 전처리 | 직접 처리 가능 | 먼저 정수 번호로 변환 |
| 주로 쓰는 곳 | 모델에 넣을 범주형 입력 변수 `X` | 신경망 분류 모델의 정답 `y` |

</div>


두 방법의 활용 범위가 반드시 `X`와 `y`로 나뉘는 것은 아니다. 위 표는 일반적인 사용 맥락이다. `LabelEncoder` 자체는 정답 레이블 `y`를 정수로 바꾸는 도구로 설계돼 있다.

## 수업 노트북의 모델에 적용할 때

수업 노트북에는 `LabelEncoder → to_categorical` 코드가 있었다. 위 `to_categorical` 예제는 그 코드를 바탕으로 변수명과 출력 설명을 보완했다. `OneHotEncoder` 예제는 같은 데이터로 비교하려고 새로 추가했다. 두 예제는 원본 CSV 없이 각각 실행할 수 있다.

원본 노트북은 여행보험 가입 여부를 예측하며, 출력층이 `Dense(1, activation="sigmoid")`, 손실함수가 `binary_crossentropy`다. **이 조합에서는 정답을 0과 1로 두면 되므로, 정답을 두 열짜리 원-핫 배열로 바꿀 필요가 없다.**

한 샘플에 정답 클래스가 하나인 분류에서는 다음 조합을 자주 사용한다. `C`는 전체 클래스 수다.

<div class="note-table-scroll" role="region" aria-label="정답 표현과 출력층·손실함수의 조합" tabindex="0">

| 정답 표현 | 출력층 | 손실함수 |
| --- | --- | --- |
| 이진 정답 `0 / 1` | `Dense(1, activation="sigmoid")` | `binary_crossentropy` |
| 원-핫 정답 | `Dense(C, activation="softmax")` | `categorical_crossentropy` |
| 정수 클래스 번호 `0 … C-1` | `Dense(C, activation="softmax")` | `sparse_categorical_crossentropy` |

</div>


따라서 정답을 어떤 형태로 바꿀지는 모델의 출력층과 손실함수를 함께 보고 정한다. 노트북 주석에 있던 손실함수 이름도 `categorical_crossentropy`로 적으면 된다.

실제 학습에서는 인코더를 훈련 데이터에 `fit`하고, 검증·테스트 데이터에는 같은 인코더의 `transform`을 사용한다. `to_categorical` 경로에서도 같은 `LabelEncoder`와 `num_classes`를 재사용한다.

## 참고 문서

- [scikit-learn: OneHotEncoder](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.OneHotEncoder.html)
- [scikit-learn: LabelEncoder](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.LabelEncoder.html)
- [TensorFlow: to_categorical](https://www.tensorflow.org/api_docs/python/tf/keras/utils/to_categorical)
- [Keras: 분류 손실함수](https://keras.io/api/losses/probabilistic_losses/)
