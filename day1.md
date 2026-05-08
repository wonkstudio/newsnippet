오늘 'Natural Language Processing with Transformers' 자료를 통해 학습한 핵심 지식을 정리한 문서입니다.

# 학습 정리: 트랜스포머를 활용한 자연어 처리 (NLP)

이 문서는 Hugging Face 생태계와 트랜스포머 아키텍처의 핵심 원리, 그리고 주요 NLP 태스크 적용 방법을 다룹니다.

---

1. 트랜스포머(Transformer) 핵심 아키텍처 

트랜스포머는 2017년 "Attention Is All You Need" 논문에서 제안된 이후 NLP 분야의 표준 아키텍처가 되었습니다.

* 
**인코더-디코더 구조**: 원래 기계 번역을 위해 설계되었으며, 텍스트 입력을 수치 표현으로 변환하는 **인코더**와 이를 바탕으로 새로운 텍스트를 생성하는 **디코더**로 구성됩니다.


* **어텐션(Attention) 메커니즘**: 문장 내 단어 간의 관계를 파악하여 문맥적 의미를 추출합니다. 특히 셀프 어텐션(Self-Attention)은 문장 내 모든 단어가 서로를 참조할 수 있게 하여 병렬 연산을 가능하게 합니다.


* 
**전이 학습(Transfer Learning)**: 대규모 데이터로 사전 훈련(Pretraining)된 모델의 지식을 특정 태스크에 맞게 미세 조정(Fine-tuning)하여 적은 데이터로도 높은 성능을 냅니다.



---

2. Hugging Face 생태계 

효율적인 NLP 애플리케이션 개발을 위한 도구 모음입니다.

* 
**Transformers 라이브러리**: PyTorch, TensorFlow, JAX를 모두 지원하며, 수천 개의 사전 훈련된 모델을 손쉽게 로드하고 훈련할 수 있는 통합 API를 제공합니다.


* 
**Hugging Face Hub**: 20,000개 이상의 모델, 데이터셋, 평가 메트릭을 공유하는 커뮤니티 플랫폼입니다.


* 
**Tokenizers 및 Datasets**: 매우 빠른 텍스트 처리와 대규모 데이터셋의 효율적인 관리를 지원합니다.



---

3. 주요 NLP 태스크 및 코드 예시 

Hugging Face의 `pipeline` 기능을 활용하면 복잡한 작업도 단 몇 줄의 코드로 수행할 수 있습니다.

### 텍스트 분류 (Text Classification)

문장의 감정(긍정/부정)이나 주제를 분류합니다.

```python
from transformers import pipeline
classifier = pipeline("text-classification")
results = classifier("I love learning about Transformers!")

```

### 개체명 인식 (Named Entity Recognition, NER)

텍스트에서 조직(ORG), 장소(LOC), 사람(PER) 등 실세계의 객체를 추출합니다.

```python
ner_tagger = pipeline("ner", aggregation_strategy="simple")
entities = ner_tagger("Lewis Tunstall works at Hugging Face in Switzerland.")

```

### 텍스트 요약 (Summarization)

긴 문서를 짧고 핵심적인 내용으로 압축합니다.

```python
summarizer = pipeline("summarization")
summary = summarizer(long_text, max_length=45)

```

---

4. 모델 학습 전략 

사전 훈련된 모델을 활용하는 두 가지 주요 방법이 있습니다.

1. **특징 추출(Feature Extraction)**: 트랜스포머의 가중치를 고정(freeze)하고 출력된 특징값(Hidden States)만 사용하여 간단한 분류기를 학습시킵니다. GPU가 없거나 연산 자원이 부족할 때 유용합니다.


2. **미세 조정(Fine-tuning)**: 모델 전체 가중치를 새로운 데이터에 맞게 업데이트합니다. 더 높은 성능을 보장하지만 많은 연산 자원이 필요합니다.



---

5. 주요 과제 및 한계 

* 
**언어 편향**: 영어 데이터가 지배적이며, 소수 언어에 대한 모델 지원이 부족합니다.


* 
**컨텍스트 크기 제한**: 대부분의 모델은 한 번에 처리할 수 있는 토큰 수(예: 512개)에 한계가 있어 긴 문서 처리에 제약이 있습니다.


* 
**모델의 불투명성**: 딥러닝 모델의 예측 근거를 완벽히 해석하기 어렵습니다.



---

참고 자료: Natural Language Processing with Transformers (O'Reilly, 2022)
제공해주신 자료(Natural Language Processing with Transformers)에서 다루는 가장 핵심적인 기술적 구성 요소들을 파이썬 코드로 정리해 드립니다. 이 코드들은 허깅페이스(Hugging Face) 생태계를 관통하는 핵심 워크플로우를 담고 있습니다.

---

### 1. 허깅페이스 파이프라인 (The Pipeline)

NLP 태스크를 가장 빠르고 직관적으로 실행하는 방법입니다. 저자들이 가장 먼저 소개하는 핵심 도구입니다.

```python
from transformers import pipeline

# 감성 분석(Text Classification) 예시
classifier = pipeline("sentiment-analysis")
result = classifier("I am learning how to use Transformers!")
print(result) # [{'label': 'POSITIVE', 'score': 0.99}]

# 개체명 인식(NER) 예시
ner_tagger = pipeline("ner", aggregation_strategy="simple")
text = "Hugging Face is based in New York City."
print(ner_tagger(text))

```

### 2. 토크나이저와 모델 로드 (Auto Classes)

특정 모델 이름만 알면 그에 맞는 설정과 토크나이저를 자동으로 불러오는 `Auto` 클래스 활용법입니다.

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

model_ckpt = "distilbert-base-uncased-finetuned-sst-2-english"

# 1. 토크나이저 로드 및 텍스트 인코딩
tokenizer = AutoTokenizer.from_pretrained(model_ckpt)
text = "Transformers are amazing!"
inputs = tokenizer(text, return_tensors="pt")

# 2. 모델 로드 및 추론
model = AutoModelForSequenceClassification.from_pretrained(model_ckpt)
with torch.no_grad():
    outputs = model(**inputs)

# 3. 확률 값 변환
predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
print(predictions)

```

### 3. 셀프 어텐션(Self-Attention) 메커니즘

트랜스포머의 핵심 엔진인 '스케일드 점곱 어텐션'의 수학적 구현입니다.

```python
from math import sqrt
import torch.nn.functional as F

def scaled_dot_product_attention(query, key, value):
    # d_k: 쿼리의 차원 수
    dim_k = query.size(-1)
    
    # 1. 점곱을 통한 유사도 점수 계산
    scores = torch.bmm(query, key.transpose(1, 2)) / sqrt(dim_k)
    
    # 2. 소프트맥스를 통한 가중치 계산
    weights = F.softmax(scores, dim=-1)
    
    # 3. 가중치를 밸류(Value)에 곱함
    return torch.bmm(weights, value)

```

### 4. 모델 미세 조정 (Fine-tuning with Trainer)

사전 학습된 모델을 나만의 데이터에 맞게 학습시키는 핵심 코드 구조입니다.

```python
from transformers import TrainingArguments, Trainer

# 학습 설정 (하이퍼파라미터 등)
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    evaluation_strategy="epoch",
    logging_steps=100,
    learning_rate=2e-5,
    weight_decay=0.01,
)

# Trainer 객체 생성 및 학습 시작
trainer = Trainer(
    model=model,                         # 학습할 모델
    args=training_args,                  # 학습 설정
    train_dataset=tokenized_datasets["train"], # 학습 데이터
    eval_dataset=tokenized_datasets["validation"], # 검증 데이터
    compute_metrics=compute_metrics      # 평가지표 계산 함수
)

# trainer.train() 실행으로 학습 시작

```

### 5. 데이터셋 맵핑 (Dataset Mapping)

대량의 데이터를 효율적으로 처리하기 위한 `datasets` 라이브러리의 핵심 메서드입니다.

```python
def tokenize(batch):
    return tokenizer(batch["text"], padding=True, truncation=True)

# 데이터셋 전체에 대해 토큰화 일괄 적용 (병렬 처리 지원)
dataset_encoded = raw_datasets.map(tokenize, batched=True, batch_size=None)

```

---

**요약하자면:**
저자들은 이 코드를 통해 "어떻게 하면 복잡한 수학적 구조(Attention)를 고성능 라이브러리(Transformers)를 사용하여 실제 서비스 가능한 코드(Pipeline/Trainer)로 바꿀 수 있는가"를 설명하는 데 집중하고 있습니다. 이 다섯 가지 코드 조각이 책 전체의 기술적 뼈대라고 할 수 있습니다.