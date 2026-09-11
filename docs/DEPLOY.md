# 배포 가이드

안드로이드 단말 한 대와 카카오톡 계정 하나면 됩니다. 서버는 필요 없습니다.

## 0. 준비물

| | |
|---|---|
| 안드로이드 단말 | 상시 켜 둘 수 있는 여분의 폰 권장 |
| [Messenger Bot R](https://play.google.com/store/apps/details?id=com.xfl.msgbot) | 카카오톡 알림을 후킹해 스크립트를 실행하는 런타임 |
| 카카오톡 | 봇 계정으로 쓸 계정 |
| Gemini API 키 | `gemini-chat` 봇을 쓸 경우에만. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료 발급 |

## 1. 앱 권한

Messenger Bot R 설치 후 다음을 허용합니다.

- **알림 접근** (설정 → 알림 → 알림 접근 허용) — 없으면 메시지를 못 받습니다.
- **저장소 접근** — `/sdcard/` 아래 파일을 읽고 씁니다.
- **배터리 최적화 제외** — 없으면 안드로이드가 백그라운드에서 봇을 정리해 버립니다.

## 2. 파일 복사

저장소를 내려받아 아래 매핑대로 단말에 넣습니다. USB 연결, ADB, 클라우드 드라이브 무엇이든 상관없습니다.

| 저장소 | 단말 경로 |
|---|---|
| `bots/earth-quiz/` | `/sdcard/Bots/earth-quiz/` |
| `bots/quiz-submit/` | `/sdcard/Bots/quiz-submit/` |
| `bots/gemini-chat/` | `/sdcard/Bots/gemini-chat/` |
| `bots/welcome/` | `/sdcard/Bots/welcome/` |
| `bots/trivia-quiz/` | `/sdcard/Bots/trivia-quiz/` |
| `data/questions/` | `/sdcard/EarthQuiz/questions/` |

ADB를 쓴다면:

```bash
adb push bots/. /sdcard/Bots/
adb push data/questions/. /sdcard/EarthQuiz/questions/
```

> **폴더 이름이 곧 봇 이름입니다.** 그리고 각 폴더의 `bot.json` 에 있는 `main` 값이 같은 폴더 안 스크립트 파일명과 일치해야 앱이 봇을 인식합니다. 폴더나 파일 이름을 바꾼다면 `bot.json` 도 같이 고치세요.

`data/runtime/` 은 복사하지 않아도 됩니다. 랭킹·방 명단·관리자 목록은 봇이 첫 실행 때 자동으로 만듭니다. 구조가 궁금하면 `data/runtime/*.example.json` 을 보세요.

## 3. 설정

### 3-1. 동작할 방 지정

각 스크립트 상단의 `AbleRooms` 배열에 **카카오톡 방 이름을 정확히** 넣습니다. 이모지와 공백까지 일치해야 합니다.

```js
const AbleRooms = ["🎯 퀴즈방 🎯", "DEBUG ROOM", "퀴즈"];
```

여기 없는 방에서는 봇이 아무 반응도 하지 않습니다. 실수로 엉뚱한 단톡방에서 봇이 떠드는 사고를 막는 최소한의 안전장치입니다.

`earth-quiz.js` 에는 배열이 두 곳(`response_great` 의 환영 대상, `response` 의 동작 대상)에 있으니 둘 다 확인하세요.

### 3-2. Gemini API 키

`bots/gemini-chat/gemini-chat.js`:

```js
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // <- 발급받은 키로 교체
```

키는 저장소에 커밋하지 마세요. 이 파일은 단말에서만 수정하거나, 수정한 파일이 커밋되지 않도록 관리하는 것을 권합니다.

### 3-3. 관리자 등록

1. `지퀴관리자` 라는 이름의 방을 만들고 `earth-quiz.js` 의 `AbleRooms` 에 추가합니다.
2. 그 방에서 `등록` 을 보냅니다.
3. 현재 프로필 이미지의 해시가 `data/runtime/admin.json` 에 저장되고, 이후 관리자 명령(`ㅈㅋㅁㅊ`, `ㅈㅋㄱㄱ`, `차단`)을 쓸 수 있습니다.

> 프로필 이미지를 바꾸면 해시가 달라져 인증이 깨집니다. 그때는 `등록` 을 다시 하면 됩니다.

## 4. 실행

앱의 봇 목록에서 원하는 봇을 켠 뒤, 지정한 방에 `ㅈㅋ` 를 보냅니다. 문제가 올라오면 성공입니다.

`DEBUG ROOM` 은 앱 내장 테스트 콘솔입니다. 실제 카톡방에 붙이기 전에 여기서 먼저 돌려 보세요.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 아무 반응이 없다 | 알림 접근 권한 / `AbleRooms` 에 방 이름이 정확히 들어갔는지 (이모지·공백 포함) |
| `🌫 문항 파일을 찾을 수 없어요` | `/sdcard/EarthQuiz/questions/` 에 JSON 6개가 있는지 |
| 봇 목록에 안 보인다 | `bot.json` 의 `main` 값과 실제 스크립트 파일명이 같은지 |
| 관리자 명령이 `🌩 권한이 없습니다` | 프로필 이미지를 바꿨는지 → `지퀴관리자` 방에서 `등록` 재실행 |
| 한동안 잘 되다 멈춘다 | 배터리 최적화 예외에 Messenger Bot R과 카카오톡이 모두 들어가 있는지 |
| AI 답변이 오류로만 온다 | API 키 교체 여부, 단말 네트워크, Gemini 무료 할당량 |

## 단말 없이 확인하기

로직만 확인하고 싶다면 Node 하네스를 쓰면 됩니다. `FileStream`·`replier`·`java.lang.String` 을 흉내 내고 `/sdcard/EarthQuiz/` 를 저장소의 `data/` 로 매핑합니다.

```bash
node tools/simulate.js                              # 전 봇 기본 시나리오
node tools/simulate.js earth-quiz "ㅈㅋ" "ㅈㅋㅎㅌ"   # 봇·메시지 직접 지정
```

Gemini 호출은 스텁 처리돼 실제 네트워크를 타지 않습니다.
