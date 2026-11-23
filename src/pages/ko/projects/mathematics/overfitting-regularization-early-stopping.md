---
layout: '../../../../layouts/BlogPost.astro'
section: 'mathematics'
title: '과적합과 과소적합: L1·L2 정규화와 Early Stopping'
date: '2026-11-23'
description: '13주차 빅데이터 분석 및 AI 모델링 수업 정리. 가중치 페널티로 복잡도를 조절하고, 검증 지표로 학습을 멈추는 원리.'
category: 'Machine learning'
tags: ['과적합', '과소적합', 'L1·L2 정규화', 'Early Stopping', '신경망']
lang: 'ko'
---

신경망 학습의 목표는 학습 데이터의 정답을 모두 외우는 것이 아니라, **처음 보는 데이터에서도 잘 예측하는 것**이다. 이 능력을 일반화(generalization)라고 한다. 오늘 수업에서는 일반화를 방해하는 과적합과 과소적합, 그리고 이를 조절하는 정규화와 조기 종료를 배웠다.

이 글은 13주차 「빅데이터 분석 및 AI 모델링」 수업 메모와 실습 파일을 바탕으로 정리했다. 아래 정확도 수치는 개념 설명을 위한 가상 예시이며, 실습 데이터를 실행해 얻은 결과는 아니다.

## 학습·검증·테스트 데이터를 나누는 이유

| 데이터 | 역할 | 사용 시점 |
| --- | --- | --- |
| 학습(train) | 손실을 계산하고 가중치를 갱신한다. | 학습 중 |
| 검증(validation) | 모델 구조, 정규화 강도, 학습 종료 시점을 선택한다. | 모델을 개발하는 동안 |
| 테스트(test) | 선택이 끝난 모델의 일반화 성능을 최종 평가한다. | 최종 평가 시 |

검증 데이터는 역전파로 가중치를 갱신하는 데 직접 쓰지 않지만, 모델을 선택하는 데 쓰인다. 테스트 데이터까지 보면서 설정을 반복해서 바꾸면 최종 평가의 의미가 약해진다. **Early Stopping은 테스트 지표가 아닌 검증 지표를 관찰한다.**

## 과적합: 학습 데이터에 지나치게 맞춘 상태

과적합(overfitting)은 학습 데이터의 공통 패턴뿐 아니라 우연한 잡음이나 개별 사례까지 지나치게 반영해, 새로운 데이터에서는 성능이 떨어지는 현상이다. 수업에서 말한 ‘너무 잘 배웠다’는 표현은 **학습 데이터에만 너무 잘 맞췄다**는 뜻으로 이해하면 좋다.

예를 들어 학습 정확도는 100%인데 검증·테스트 정확도는 20%라면 일반화에 큰 문제가 있음을 의심할 수 있다. 다만 이 수치가 과적합의 정의는 아니다. 데이터 분포 차이, 잘못된 전처리, 정답 라벨 오류도 확인해야 한다. 학습 정확도가 100%라는 사실만으로 과적합이라고 단정할 수도 없다.

전형적인 학습 곡선에서는 학습 손실이 계속 감소하지만 검증 손실은 어느 시점부터 증가한다. 학습 데이터를 더 잘 맞추는 일이 새로운 데이터의 예측 개선으로 이어지지 않는 것이다.

## 과소적합: 필요한 패턴을 충분히 배우지 못한 상태

과소적합(underfitting)은 데이터의 중요한 패턴조차 충분히 표현하거나 학습하지 못한 상태다. 보통 학습 성능과 검증 성능이 모두 낮다.

뉴런 수가 너무 적으면 모델의 표현력이 부족해 과소적합이 생길 수 있다. 하지만 원인이 뉴런 수에만 있는 것은 아니다.

- 층이나 뉴런이 부족해 관계를 표현하기 어려운 경우
- 학습 횟수가 부족하거나 최적화가 잘 진행되지 않은 경우
- 정규화나 Dropout을 지나치게 강하게 적용한 경우
- 예측에 필요한 특성이 부족한 경우

| 구분 | 학습 성능 | 검증 성능 | 먼저 확인할 점 |
| --- | --- | --- | --- |
| 과소적합 | 낮음 | 낮음 | 표현력, 학습 진행 상태, 입력 특성, 정규화 강도 |
| 적절한 적합 | 양호 | 양호 | 새로운 데이터에서도 성능이 유지되는지 |
| 과적합 | 매우 높음 | 상대적으로 낮음 | 데이터 품질·규모, 모델 복잡도, 학습 시간 |

따라서 ‘뉴런을 줄이면 무조건 좋다’거나 ‘오래 학습하면 무조건 좋다’는 규칙은 없다. 학습과 검증 성능을 함께 보면서 원인을 구분해야 한다.

## L1·L2 정규화: 가중치에 비용을 부과하기

가중치 정규화(regularization)는 예측 오차에 **가중치 페널티**를 더해 학습하는 방법이다. 여기서 정규화는 입력값을 표준화하거나 0~1로 바꾸는 전처리와 구별된다.

$$
J(W)=L_{\text{data}}(W)+\lambda R(W)
$$

$L_{\text{data}}$는 예측 오차, $R(W)$는 가중치에 대한 페널티, $\lambda$는 페널티의 강도다. 모델은 오차를 줄이면서 가중치가 불필요하게 커지는 데 드는 비용도 고려한다. 뉴런 수를 직접 바꾸지는 않지만, 주어진 구조 안에서 모델이 사용하는 복잡도를 제어한다.

### L1: 가중치 절댓값의 합

$$
J_{L1}(W)=L_{\text{data}}(W)+\lambda\sum_j |w_j|
$$

L1은 가중치 절댓값에 비례하는 비용을 부과한다. 0이 아닌 가중치에서 페널티의 기울기는 $\lambda\,\mathrm{sign}(w_j)$다. 크기와 무관하게 0 쪽으로 당기는 힘이 작용해, 일부 가중치가 0이 되도록 유도하는 **희소성(sparsity)**이 특징이다.

다만 신경망에서 일반적인 경사 기반 최적화로 L1을 적용했다고 모든 작은 가중치가 정확히 0이 되는 것은 아니다. 또한 연결 하나의 가중치가 0이라고 입력 특성 전체가 제거된 것은 아니다. 그 입력에서 다른 뉴런으로 이어지는 연결은 남을 수 있다.

### L2: 가중치 제곱의 합

$$
J_{L2}(W)=L_{\text{data}}(W)+\lambda\sum_j w_j^2
$$

L2는 큰 가중치에 더 큰 비용을 부과한다. 페널티의 기울기는 $2\lambda w_j$이므로, 가중치가 클수록 0 쪽으로 당기는 힘도 커진다. 대체로 여러 가중치를 작게 유지하며, 정확히 0으로 만드는 효과는 L1보다 약하다.

예를 들어 $W=(2,-1,0.5)$이고 $\lambda=0.01$이면 L1 페널티는 $0.01(2+1+0.5)=0.035$, L2 페널티는 $0.01(4+1+0.25)=0.0525$다. 이 값이 데이터 손실에 더해진다. 같은 $\lambda$라고 두 방식의 효과가 같은 것은 아니다.

| 비교 | L1 | L2 |
| --- | --- | --- |
| 페널티 | $\lambda\sum_j |w_j|$ | $\lambda\sum_j w_j^2$ |
| 특징 | 일부 연결을 0으로 유도하는 경향 | 큰 가중치를 더 강하게 축소 |
| 가중치 분포 | 희소한 해를 유도 | 전반적으로 작은 가중치를 유도 |
| 공통 주의점 | 너무 강하면 과소적합 | 너무 강하면 과소적합 |

$\lambda$가 작으면 규제가 약하고, 크면 강하다. 적절한 값은 검증 성능으로 선택한다. Keras의 `L1`, `L2`는 위 식처럼 계산하며, `kernel_regularizer`는 지정한 층의 연결 가중치에 적용된다. 편향은 `bias_regularizer`로 별도 지정한다. [Keras 정규화 문서](https://keras.io/api/layers/regularizers/)

## Early Stopping: 검증 성능이 좋아지지 않으면 멈추기

조기 종료(Early Stopping)는 최대 학습 횟수를 크게 정해 놓더라도 검증 지표가 일정 기간 개선되지 않으면 학습을 멈추는 방법이다. 학습 손실만 계속 낮추다가 일반화 성능이 나빠지는 상황을 줄이는 데 사용한다.

예를 들어 검증 손실이 가장 낮았던 시점이 12번째 epoch이고, 그 뒤 5번 연속 개선되지 않았다면 `patience=5` 설정에서 17번째 epoch가 끝날 때 멈춘다. `restore_best_weights=True`이면 마지막 시점 대신 최선이었던 12번째 epoch의 가중치를 복원한다. epoch은 학습 데이터를 한 차례 모두 학습하는 단위다.

| 관찰할 검증 지표 | `monitor` | `mode` | 의미 |
| --- | --- | --- | --- |
| 손실 | `'val_loss'` | `'min'` | 작아질수록 좋음 |
| 정확도 | `'val_accuracy'` | `'max'` | 전체 정답 비율이 높을수록 좋음 |
| 재현율 | `'val_recall'` | `'max'` | 실제 양성을 찾아낸 비율이 높을수록 좋음 |

재현율은 $\mathrm{Recall}=TP/(TP+FN)$이다. 양성 사례를 놓치는 것이 중요한 문제에서는 유용하지만, 양성으로 많이 예측하는 것만으로도 높아질 수 있으므로 정밀도(precision)와 함께 해석해야 한다. 정확도도 클래스 불균형이 심하면 단독으로 보기 어렵다.

`min_delta`는 개선으로 인정할 최소 변화량이고, `patience`는 개선 없이 기다릴 epoch 수다. 모니터링할 지표는 실제 학습 로그에 있어야 한다. 아래 예제는 `recall`을 명시적으로 등록하므로 `val_recall`도 사용할 수 있다. 종료 기준은 문제의 목적에 맞게 하나를 정한다. [Keras EarlyStopping 문서](https://keras.io/api/callbacks/early_stopping/)

## 수업 코드에 적용하기

실습은 이진 분류 신경망에 L1, Dropout, Early Stopping을 함께 적용했다. 각 방법의 역할은 다르다.

- **L1·L2**: 손실에 가중치 비용을 더한다.
- **Dropout**: 학습 중 일부 뉴런의 출력을 무작위로 0으로 만들어 특정 연결에 대한 의존을 줄인다. 추론 시에는 적용하지 않는다.
- **Early Stopping**: 검증 성능으로 학습 기간을 조절한다.

다음은 전처리까지 마친 수치형 특성 `X`와 0·1 정답 `y`가 준비되어 있다고 가정한 예제다. 원본 파일을 그대로 실행한 결과가 아니라, 학습·검증·테스트 분리와 전처리 기준을 보완한 학습 코드다. 독립적인 표본을 가정하며, 시계열이라면 시간 순서에 맞는 분할이 필요하다.

```python
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# 전체의 20%는 최종 평가용으로 보관한다.
X_dev, X_test, y_dev, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
# 나머지를 나누면 전체 기준 학습 60%, 검증 20%가 된다.
X_train, X_val, y_train, y_val = train_test_split(
    X_dev, y_dev, test_size=0.25,
    random_state=42, stratify=y_dev
)

# 학습 데이터에서 얻은 평균·표준편차를 모든 분할에 적용한다.
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_val = scaler.transform(X_val)
X_test = scaler.transform(X_test)

model = tf.keras.Sequential([
    tf.keras.Input(shape=(X_train.shape[1],)),
    tf.keras.layers.Dense(
        128, activation='relu',
        kernel_regularizer=tf.keras.regularizers.L1(0.001)
    ),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=[
        tf.keras.metrics.BinaryAccuracy(name='accuracy'),
        tf.keras.metrics.Recall(name='recall'),
        tf.keras.metrics.Precision(name='precision')
    ]
)

early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss',
    mode='min',
    patience=5,
    min_delta=0.0001,
    restore_best_weights=True,
    verbose=1
)

history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=50,
    callbacks=[early_stopping]
)

# 모델·임계값 등 모든 선택이 끝난 후 최종 평가한다.
test_metrics = model.evaluate(X_test, y_test, return_dict=True)
print(test_metrics)
```

위 예제의 L1은 첫 번째 Dense 층에만 적용된다. L2와 비교하려면 같은 자리의 `L1(0.001)`을 `L2(0.001)`로 바꾸고 검증 성능을 비교하면 된다. 첫 층의 ReLU는 원본 코드에는 없던 설정으로, 예제에서는 명시적으로 추가했다.

정확도 기준으로 멈추려면 `monitor='val_accuracy', mode='max'`, 재현율 기준이면 `monitor='val_recall', mode='max'`로 바꾼다. `callbacks`에는 예제처럼 리스트를 전달한다.

### 실습에서 함께 확인할 부분

원본 파일에는 `train_df_y`, `val_df_y`, `X`, `y`의 정의가 빠져 있어 그대로 실행하면 오류가 발생한다. 실제 목표 열을 확인하고 특성에서 제외한 뒤, 정답을 0·1로 준비해야 한다.

또한 원본의 `get_X()`를 학습·검증 데이터 각각에 호출하면 각기 다른 평균과 표준편차를 학습한다. 검증·테스트에서는 학습 데이터에 맞춘 변환기의 `transform()`만 사용해야 한다. 인코더나 결측치 대체처럼 데이터에서 기준을 배우는 다른 전처리에도 같은 원칙이 적용된다. [scikit-learn 전처리 주의사항](https://scikit-learn.org/stable/common_pitfalls.html)

이진 분류에서는 원본의 회귀 지표인 MAE·MSE·$R^2$만으로 분류 품질을 판단하기보다, 혼동행렬·정확도·정밀도·재현율 등을 목적에 맞게 확인한다. 위 예제에서 정확도·재현율·정밀도는 기본 확률 임계값 0.5를 사용한다.

## 학습 결과를 읽는 순서

먼저 학습 성능 자체가 충분한지 확인한다. 학습·검증 성능이 모두 낮으면 표현력, 입력 특성, 학습 진행 상태를 점검한다. 학습 성능만 높다면 두 데이터 사이의 격차와 전처리, 분포 차이를 확인하고 정규화나 조기 종료를 검토한다.

학습 곡선은 손실끼리, 정확도끼리, 재현율끼리 비교하면 읽기 쉽다. Keras에서 가중치 정규화를 적용한 `loss`와 `val_loss`에는 정규화 비용도 포함된다. Dropout은 학습 중에만 동작하므로 검증 손실이 학습 손실보다 낮게 나오는 경우도 있다. 곡선의 한 지점보다 전체 추세와 데이터 조건을 함께 보는 것이 중요하다.

**정규화는 가중치의 사용을 조절하고, Early Stopping은 학습 시간을 조절한다.** 두 방법 모두 학습 데이터를 잘 맞추는 능력이 새로운 데이터의 예측으로 이어지도록 돕는 도구다.
