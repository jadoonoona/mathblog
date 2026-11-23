---
layout: '../../../layouts/BlogPost.astro'
section: 'mathematics'
title: 'Overfitting and Underfitting: L1, L2 Regularization and Early Stopping'
date: '2026-11-23'
description: 'Week 13 notes on controlling model complexity with weight penalties and choosing when to stop training using validation metrics.'
category: 'Machine learning'
tags: ['Overfitting', 'Underfitting', 'L1 and L2', 'Early Stopping', 'Neural networks']
lang: 'en'
---

The goal of training a neural network is to **predict well on data it has never seen**. This ability is called generalization. This lesson covers overfitting and underfitting, which interfere with generalization, and two ways to manage them: regularization and early stopping.

These notes are based on the Week 13 Big Data Analysis and AI Modeling lesson and its Python exercise. Accuracy figures below are hypothetical illustrations, not results obtained by running the exercise dataset.

## Why split data into training, validation and test sets?

| Dataset | Purpose | When it is used |
| --- | --- | --- |
| Training | Compute the loss and update weights. | During training |
| Validation | Choose architecture, regularization strength and stopping time. | During model development |
| Test | Assess the generalization of the selected model. | At final evaluation |

Validation data does not directly update weights through backpropagation, but it influences model selection. Repeatedly adjusting settings based on test performance weakens the final evaluation. **Early stopping monitors validation metrics rather than test metrics.**

## Overfitting: fitting the training data too closely

Overfitting occurs when a model captures incidental noise and individual examples too strongly, rather than learning patterns that transfer to new data. Saying that it has “learned too well” means that it has **fit the training data too closely**.

For example, 100% training accuracy alongside 20% validation and test accuracy would suggest a serious generalization problem. These numbers do not define overfitting: distribution differences, incorrect preprocessing and label errors also need investigation. Perfect training accuracy alone does not prove overfitting.

In a typical learning curve, training loss keeps decreasing while validation loss begins to rise. Fitting the training examples more closely no longer improves predictions on unseen examples.

## Underfitting: failing to learn the necessary patterns

Underfitting occurs when a model cannot adequately represent or learn important patterns. Both training and validation performance are usually poor.

Too few neurons can limit the model's capacity and cause underfitting, but neuron count is only one possible cause:

- Too few layers or neurons to represent the relationships.
- Too little training or ineffective optimization.
- Excessive regularization or dropout.
- Missing features needed for prediction.

| Situation | Training performance | Validation performance | What to check first |
| --- | --- | --- | --- |
| Underfitting | Poor | Poor | Capacity, training progress, features, regularization strength |
| Appropriate fit | Good | Good | Whether performance holds on unseen data |
| Overfitting | Very high | Relatively poor | Data quality and size, complexity, training duration |

Neither reducing neurons nor training longer is always beneficial. Compare training and validation performance to understand the problem before making changes.

## L1 and L2 regularization: adding a cost for weights

Weight regularization adds a **weight penalty** to the prediction loss. It is distinct from preprocessing operations such as standardization or scaling inputs to the range 0–1.

$$
J(W)=L_{\text{data}}(W)+\lambda R(W)
$$

Here, $L_{\text{data}}$ is the prediction loss, $R(W)$ is the penalty and $\lambda$ controls its strength. Training balances fitting the data against the cost of unnecessarily large weights. Regularization does not directly change the number of neurons; it controls how the existing architecture uses its capacity.

### L1: the sum of absolute weights

$$
J_{L1}(W)=L_{\text{data}}(W)+\lambda\sum_j |w_j|
$$

L1 charges a cost proportional to each weight's absolute value. Away from zero, its penalty gradient is $\lambda\,\mathrm{sign}(w_j)$. The pull toward zero has the same magnitude regardless of the weight's size. This encourages **sparsity**, where some weights become zero.

In neural networks, applying L1 with ordinary gradient-based optimization does not guarantee that every small weight becomes exactly zero. A zero connection weight also does not necessarily eliminate an entire input feature: that input may still connect to other neurons.

### L2: the sum of squared weights

$$
J_{L2}(W)=L_{\text{data}}(W)+\lambda\sum_j w_j^2
$$

L2 penalizes large weights more strongly. Its penalty gradient is $2\lambda w_j$, so larger weights experience a stronger pull toward zero. It generally keeps weights small throughout the network, with less tendency than L1 to make them exactly zero.

For $W=(2,-1,0.5)$ and $\lambda=0.01$, the L1 penalty is $0.01(2+1+0.5)=0.035$, while the L2 penalty is $0.01(4+1+0.25)=0.0525$. This amount is added to the data loss. Equal values of $\lambda$ do not imply equal effects across the two methods.

| Comparison | L1 | L2 |
| --- | --- | --- |
| Penalty | $\lambda\sum_j |w_j|$ | $\lambda\sum_j w_j^2$ |
| Main effect | Encourages some connections to become zero | Shrinks large weights more strongly |
| Weight pattern | Encourages sparse solutions | Encourages small weights throughout |
| Shared limitation | Too much can cause underfitting | Too much can cause underfitting |

A smaller $\lambda$ gives weaker regularization; a larger value gives stronger regularization. Choose its strength using validation performance. Keras uses the formulas above for `L1` and `L2`. A layer's `kernel_regularizer` penalizes its connection weights; biases require a separate `bias_regularizer`. [Keras regularizers documentation](https://keras.io/api/layers/regularizers/)

## Early stopping: stop when validation performance stops improving

Early stopping ends training when a validation metric has not improved for a specified period, even if the maximum number of epochs has not been reached. It helps limit training that lowers training loss while harming generalization.

Suppose validation loss is lowest at epoch 12, followed by five epochs without improvement. With `patience=5`, training stops at the end of epoch 17. Setting `restore_best_weights=True` restores the weights from epoch 12 instead of keeping the final weights. An epoch is one complete pass through the training data.

| Validation metric | `monitor` | `mode` | Desired direction |
| --- | --- | --- | --- |
| Loss | `'val_loss'` | `'min'` | Lower |
| Accuracy | `'val_accuracy'` | `'max'` | Higher fraction of correct predictions |
| Recall | `'val_recall'` | `'max'` | Higher fraction of actual positives detected |

Recall is $\mathrm{Recall}=TP/(TP+FN)$. It is useful when missed positive cases matter, but predicting more cases as positive can increase it. Interpret it alongside precision. Accuracy alone can also be misleading when classes are imbalanced.

`min_delta` specifies the minimum change required to count as improvement. `patience` controls how many epochs to wait without improvement. The monitored metric must be present in the training logs. The example explicitly registers `recall`, making `val_recall` available. Choose one stopping criterion that fits the task. [Keras EarlyStopping documentation](https://keras.io/api/callbacks/early_stopping/)

## Applying these ideas to the lesson code

The exercise combines L1, dropout and early stopping in a binary classification network. Each has a different role:

- **L1 and L2** add a weight penalty to the loss.
- **Dropout** randomly sets some neuron outputs to zero during training, reducing dependence on particular connections. It is inactive during inference.
- **Early stopping** controls training duration using validation performance.

The example below assumes that numeric features `X` and binary labels `y` are already prepared. It revises the exercise's splitting and scaling procedure; it is not a report of an executed experiment. It assumes independent samples. Time series require a split that respects time order.

```python
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Reserve 20% of all samples for final evaluation.
X_dev, X_test, y_dev, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
# Split the remainder: 60% training and 20% validation overall.
X_train, X_val, y_train, y_val = train_test_split(
    X_dev, y_dev, test_size=0.25,
    random_state=42, stratify=y_dev
)

# Apply training-set means and standard deviations to every split.
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

# Evaluate only after all model and threshold choices are final.
test_metrics = model.evaluate(X_test, y_test, return_dict=True)
print(test_metrics)
```

L1 applies only to the first Dense layer in this example. To compare L2, replace `L1(0.001)` with `L2(0.001)` in that layer and compare validation performance. The first layer's ReLU activation is an explicit addition to the original exercise.

To stop based on accuracy, use `monitor='val_accuracy', mode='max'`. For recall, use `monitor='val_recall', mode='max'`. Pass callbacks as a list, as shown above.

### Other details to check in the exercise

The original file does not define `train_df_y`, `val_df_y`, `X` or `y`, so it cannot run as written. Identify the actual target column, exclude it from the input features and prepare binary labels.

Calling the original `get_X()` separately on training and validation data fits different means and standard deviations. Instead, fit the transformer on training data and use only `transform()` on validation and test data. The same principle applies to other preprocessing steps that learn from data, including encoders and missing-value imputers. [scikit-learn preprocessing pitfalls](https://scikit-learn.org/stable/common_pitfalls.html)

For binary classification, assess a confusion matrix, accuracy, precision and recall as appropriate, rather than relying only on the exercise's regression metrics MAE, MSE and $R^2$. Accuracy, recall and precision in this example use the default probability threshold of 0.5.

## How to read the training results

First check whether training performance itself is adequate. If both training and validation performance are poor, examine capacity, features and optimization progress. If only training performance is strong, investigate the gap, preprocessing and distribution differences, then consider regularization or early stopping.

Learning curves are easier to read when comparing like with like: training loss against validation loss, accuracy against accuracy, and recall against recall. With Keras weight regularization, both `loss` and `val_loss` include the regularization penalty. Dropout operates only during training, so validation loss can sometimes be lower than training loss. Consider the overall trend and the data conditions rather than a single point.

**Regularization controls how weights are used; early stopping controls how long training continues.** Both help turn a good fit on training data into predictions that generalize to new data.
