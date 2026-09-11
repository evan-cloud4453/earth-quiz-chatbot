# 지구퀴즈 봇 (Earth Quiz Bot)

> 지구과학 과외 학생들이 **전범위 복습을 꾸준히** 하게 만들기 위해, 이미 하루 종일 켜져 있는 앱 — 카카오톡 — 안으로 퀴즈를 가져온 프로젝트입니다.
> 직접 구축한 **약 3,000문항**의 빈칸 퀴즈 DB, 오픈채팅방 문항 공모 파이프라인, 그리고 방을 나가지 않고 바로 질문할 수 있는 Gemini 연동까지를 안드로이드 단말 하나 위에서 돌렸습니다.

`2024` · `JavaScript (Rhino / ES5+)` · `Messenger Bot R` · `Google Gemini API`

---

<details>
<summary><b>🇬🇧 English summary (click to expand)</b></summary>

<br>

**Earth Quiz Bot** is a KakaoTalk chatbot I built in 2024 to keep my earth-science tutoring students reviewing the whole syllabus instead of only what we covered that week.

**The problem.** Revision assignments were consistently ignored. The students were not short on ability — they were short on friction tolerance. Anything that required opening a separate app or site simply did not get done.

**The approach.** Put the quiz where they already are. The bot runs on `Messenger Bot R`, an Android runtime that hooks KakaoTalk notifications and replies through them, so no server, no app install, and no signup was needed — a spare phone was the entire infrastructure.

**What it does**

| | |
|---|---|
| **Fill-in-the-blank quiz** | `^` in a question is expanded into `□` boxes matching the answer length, so the blank itself carries a hint. Answers are graded only when the submitted length matches, which keeps normal chatter from being mistaken for a guess. |
| **Progressive hints** | `ㅈㅋㅎㅌ` reveals one random character at a time; when every character is exposed the bot concedes and moves on. |
| **Per-room leaderboards** | Correct answers are tallied per chat room and persisted to disk. |
| **Crowdsourced questions** | Members of the open chat room "수능 지구과학 연구소" submitted questions with `#sentence with ㅁㅁ#answer`. The bot validates that the number of blanks matches the answer length, files it into a review deck, and gives me search / list / delete tooling to promote entries into the main deck. |
| **In-chat LLM** | `?` asks Gemini 1.5 Flash a fresh question, `!` continues the previous thread with accumulated context — so a student stuck on a concept never has to leave the room. |
| **Ops guards** | Room whitelisting, admin auth via a hash of the sender's profile image, a global game lock, user blocking, and a 5-second mute for single-character spam answers. |

**Question bank** — ~3,000 items across six decks: earth science (1,623, hand-built from exam material), Korean history (345), general knowledge (450), nonsense riddles (412), science trivia (139), and community submissions (30).

**Repo notes.** Everything here is the 2024 code, reorganised for publication: folders renamed to English, the seven opaque `db1…db8` files consolidated into named subject decks (with the loaders rewritten to match), the leaked API key replaced with a placeholder, and all real student names and chat logs excluded. `tools/simulate.js` stubs the Android runtime so you can run every bot locally with `node tools/simulate.js` — no phone required.

</details>

---

## 왜 만들었나

지구과학 과외를 하면서 가장 풀리지 않던 문제는 **전범위 복습**이었습니다. 진도는 나가는데 앞 단원은 계속 증발했고, 복습 과제를 내주면 거의 돌아오지 않았습니다.

원인을 뜯어보니 실력 문제가 아니라 **마찰 문제**였습니다. 학생 입장에서 복습은 "따로 앱을 켜고 / 따로 사이트에 들어가서 / 따로 시간을 내야 하는 일"이었고, 그 세 단계를 넘길 동기가 없었던 겁니다.

그래서 반대로 접근했습니다. **학생이 이미 하루 종일 켜 두는 곳으로 복습을 가져가자.** 카카오톡 단체방에 퀴즈를 던지면, 복습이 과제가 아니라 대화가 됩니다. 답을 아는 사람은 그냥 채팅을 치면 되고, 모르면 힌트를 받고, 맞히면 랭킹이 올라갑니다.

서버도 회원가입도 없이, 남는 안드로이드 폰 한 대가 인프라 전부입니다.

## 어떻게 돌아가나

```
카카오톡 알림
      │
      ▼
Messenger Bot R  (안드로이드 런타임: 알림 후킹 → response() 호출 → 알림으로 답장)
      │
      ├─ earth-quiz    출제 · 채점 · 힌트 · 랭킹 · 관리자 명령
      ├─ quiz-submit   공모 문항 등록 · 검색 · 검수 · 정식 덱 이관
      ├─ gemini-chat   ? / ! 명령으로 Gemini 1.5 Flash 질의응답
      ├─ welcome       신규 참여자 환영 + 방/구성원 기록
      └─ trivia-quiz   초기 프로토타입 (히스토리 보존용)
      │
      ▼
/sdcard/EarthQuiz/
      ├─ questions/   문항 덱 (읽기 전용)
      └─ runtime/     랭킹 · 방 명단 · 관리자 · 차단 목록 (실행 중 생성)
```

Messenger Bot R은 서버가 아니라 **알림을 가로채 답장하는 방식**이라 별도 백엔드가 필요 없습니다. 대신 네트워크 호출은 번들된 Jsoup으로 직접 POST해야 하고(`fetch` 없음), 상태는 전부 로컬 JSON 파일에 직렬화해야 합니다. 그 제약이 이 프로젝트 설계의 대부분을 결정했습니다.

## 명령어

전체 목록과 예외 동작은 [docs/COMMANDS.md](docs/COMMANDS.md)에 정리돼 있습니다.

### 퀴즈

| 명령 | 동작 |
|---|---|
| `ㅈㅋ` | 문제 출제 (6개 덱 중 무작위) |
| `ㅈㅋㅎㅌ` | 힌트 — 정답의 한 글자를 무작위로 공개 |
| `ㅈㅋㅈㄷ` | 정답 공개 후 다음 문제로 |
| `ㅈㅋㅇㅇ` / `ㅈㅋㄴㄴ` | 자동 연속 출제 켜기 / 끄기 |
| `ㅈㅋㄹㅋ` | 방별 정답 횟수 랭킹 |
| (정답 입력) | 그냥 채팅으로 답을 치면 채점 |

### 관리자 (프로필 이미지 해시로 인증)

| 명령 | 동작 |
|---|---|
| `ㅈㅋㅁㅊ` / `ㅈㅋㄱㄱ` | 해당 방 퀴즈 잠금 / 해제 |
| `차단 이름` | 특정 사용자 채점 대상에서 제외 |
| `등록` (지퀴관리자 방) | 현재 프로필 이미지 해시를 관리자로 등록 |

### 문항 공모

| 명령 | 동작 |
|---|---|
| `#문장 안에 ㅁㅁㅁ#정답` | 공모 덱에 등록 (`ㅁ` 개수 = 정답 글자 수여야 통과) |
| `#검색#키워드` / `#목록#` | 공모 덱 조회 |
| `#삭제#3` | 공모 덱에서 3번 삭제 (이후 번호 자동 재채번) |
| `%검색%키워드` / `%삭제%3` | 정식 덱(earth-science) 대상 동일 기능 |

### AI 질의응답

| 명령 | 동작 |
|---|---|
| `? 편서풍 파동이 뭐야` | Gemini에 새 질문 |
| `! 그럼 제트류랑은 무슨 관계야` | 직전 대화 맥락을 이어서 질문 |

## 문항 DB

퀴즈의 실체는 결국 문제입니다. 지구과학 문항은 수능·모의고사 범위를 직접 빈칸 문제로 재가공해 쌓았고, 여기에 카카오톡 오픈채팅방 **"수능 지구과학 연구소"** 에서 문항 공모를 받아 검수 후 편입했습니다.

| 덱 | 주제 | 문항 수 | 출처 |
|---|---|---:|---|
| `earth-science` | 수능 지구과학 전범위 | 1,623 | 직접 구축 |
| `general-knowledge` | 일반 상식 | 450 | 직접 구축 |
| `nonsense` | 넌센스 퀴즈 | 412 | 직접 구축 |
| `korean-history` | 한국사 | 345 | 직접 구축 |
| `science-trivia` | 과학 상식 | 139 | 직접 구축 |
| `earth-science-submissions` | 지구과학 공모 (검수 대기) | 30 | 오픈채팅방 공모 |
| | **합계** | **2,999** | |

문항 포맷은 단순합니다. `^` 하나가 빈칸이고, 봇이 정답 글자 수만큼 `□`로 펼칩니다.

```json
{"Question": "^에 최초의 척추동물이 출현하였다.", "Enser": "오르도비스기", "Number": 1}
```

```
🌎 [□□□□□□]에 최초의 척추동물이 출현하였다.
```

## 설계에서 신경 쓴 부분

**빈칸이 곧 힌트다.** 정답 글자 수만큼 `□`를 펼치는 건 화면을 예쁘게 하려던 게 아니라, "아예 모르겠다"와 "떠오를 것 같다" 사이의 간격을 좁히기 위한 장치였습니다. 글자 수를 아는 순간 학생들은 포기하는 대신 추측을 시작했습니다.

**채점 대상을 길이로 거른다.** 단체방은 잡담이 섞입니다. 모든 메시지를 채점하면 대화가 전부 "땡!"으로 도배됩니다. 그래서 **정답과 글자 수가 같은 메시지만** 채점 대상으로 삼았습니다. 규칙 하나로 잡담과 답안이 자연스럽게 분리됩니다.

```js
if (Mode[room] == 1 && msg.replace(/\s|\,|\./gi, "").length == ChatroomContent[room]["A"].length && ...)
```

**한 글자 오답은 5초 뮤트.** 글자 수 필터를 도입하자 이번엔 한 글자 정답 문제에서 무차별 찍기가 나왔습니다. 1글자 오답을 낸 사람은 5초간 채점 대상에서 제외했습니다.

**관리자 인증을 프로필 이미지 해시로.** 카카오톡 닉네임은 누구나 바꿀 수 있어 이름만으로는 신원이 안 됩니다. Messenger Bot R이 넘겨주는 프로필 이미지의 해시값을 등록해 두고 대조하는 방식으로, 별도 인증 체계 없이 사칭을 막았습니다.

```js
if (ADMIN[sender] == java.lang.String(imageDB.getProfileImage()).hashCode()) { ... }
```

**공모를 파이프라인으로.** 오픈채팅방에서 받은 문항을 바로 정식 덱에 넣으면 품질 관리가 안 됩니다. 공모는 별도 덱(`earth-science-submissions`)에 쌓이고, 등록 시점에 **빈칸 개수와 정답 글자 수가 일치하는지 자동 검증**합니다. 이후 검색·목록·삭제 명령으로 검수한 뒤 정식 덱으로 옮기는 2단계 구조입니다.

**나가지 않아도 되게.** 모르는 개념이 나오면 학생은 방을 떠나 검색하러 갑니다. 그리고 대개 돌아오지 않습니다. `?`/`!` 명령으로 그 자리에서 Gemini에 물어볼 수 있게 만든 건 그래서였습니다.

## 로컬에서 실행해 보기

안드로이드 단말 없이도 전 봇의 동작을 확인할 수 있게, `FileStream`·`replier`·`java.lang.String` 등 Messenger Bot R이 주입하는 전역을 Node에서 흉내 내는 하네스를 넣어 뒀습니다. `/sdcard/EarthQuiz/` 는 저장소의 `data/` 로 매핑됩니다.

```bash
node tools/simulate.js
```

```
=== earth-quiz: 출제 -> 힌트 -> 정답공개 -> 랭킹 ===
DEBUG SENDER > ㅈㅋ
  BOT < 🌎 체내의 세포 신호 전달을 담당하는 것은 [□□□]이다.
DEBUG SENDER > ㅈㅋㅎㅌ
  BOT < 🎲 신□□
DEBUG SENDER > ㅈㅋㅎㅌ
  BOT < 🎲 신□계
DEBUG SENDER > ㅈㅋㅈㄷ
  BOT < 🎯 신경계
```

봇과 메시지를 직접 지정할 수도 있습니다.

```bash
node tools/simulate.js earth-quiz "ㅈㅋ" "ㅈㅋㅎㅌ"
```

> Gemini 호출은 네트워크를 타지 않도록 스텁 처리돼 있습니다.

## 실제 단말에 배포하기

1. Google Play에서 **Messenger Bot R** 설치 후, 알림 접근 권한과 저장소 권한을 허용합니다.
2. 이 저장소의 폴더를 단말로 복사합니다.

   | 저장소 | 단말 |
   |---|---|
   | `bots/*` | `/sdcard/Bots/*` |
   | `data/*` | `/sdcard/EarthQuiz/*` |

   `bot.json`의 `main` 값이 같은 폴더의 스크립트 파일명과 일치해야 앱이 봇을 인식합니다.
3. `bots/gemini-chat/gemini-chat.js` 의 `GEMINI_API_KEY` 를 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급받은 키로 교체합니다.
4. 각 스크립트 상단 `AbleRooms` 배열에 **봇을 돌릴 카카오톡 방 이름**을 넣습니다. 여기에 없는 방에서는 아무 반응도 하지 않습니다.
5. 앱에서 봇을 켜고, 지정한 방에 `ㅈㅋ` 를 보냅니다.

`data/runtime/` 의 랭킹·방 명단 파일은 첫 실행 때 자동 생성됩니다. 구조가 궁금하면 같은 폴더의 `*.example.json` 을 참고하세요. 자세한 절차는 [docs/DEPLOY.md](docs/DEPLOY.md)에 있습니다.

## 저장소 구조

```
earth-quiz-chatbot/
├─ bots/
│  ├─ earth-quiz/       # 메인 퀴즈 엔진 (출제·채점·힌트·랭킹·관리자)
│  ├─ quiz-submit/      # 문항 공모 등록 / 검수 도구
│  ├─ gemini-chat/      # Gemini 질의응답
│  ├─ welcome/          # 신규 참여자 환영
│  └─ trivia-quiz/      # 초기 프로토타입 (히스토리)
├─ data/
│  ├─ questions/        # 문항 덱 6종 (2,999문항)
│  └─ runtime/          # 런타임 상태 — *.example.json 만 추적
├─ tools/
│  └─ simulate.js       # 안드로이드 없이 돌리는 로컬 하네스
├─ docs/
│  ├─ COMMANDS.md       # 전체 명령어 레퍼런스
│  └─ DEPLOY.md         # 배포 절차 상세
└─ push.ps1             # 최초 커밋 & 푸시 헬퍼
```

## 공개하면서 정리한 것

2024년 당시 코드를 기능 변경 없이 공개 가능한 형태로 다듬었습니다. 로직 자체는 그대로입니다.

- **API 키 제거** — 소스 3곳에 하드코딩돼 있던 Gemini 키를 플레이스홀더로 교체했습니다. *(원본 키는 이미 노출됐으므로 폐기 대상입니다.)*
- **개인정보 제외** — 랭킹·방 명단의 실제 학생 이름과 디버그 대화 로그 1,272건을 저장소에서 제외하고, 구조만 보여주는 익명 샘플로 대체했습니다.
- **문항 DB 정리** — 의미를 알 수 없던 `db1`~`db8`을 주제별 덱으로 통합·명명하고(중복 18건 제거), 로더 코드를 `DECKS` 배열 기반으로 다시 썼습니다.
- **구조 정리** — 폴더명을 영문화하고 루트의 `.txt` 백업 중복본을 제거했습니다.
- **버그 수정** — 기록이 없는 방에서 랭킹 조회 시 크래시, 상식퀴즈의 문항 수 하드코딩(`Total = 44`), 공모 삭제 시 범위 미검증, Gemini 예외 처리에서 스코프 밖 `replier` 참조를 고쳤습니다.

## 한계와 회고

- **단일 단말 의존.** 폰이 꺼지거나 카톡이 백그라운드에서 정리되면 봇도 멈춥니다. 알림 후킹 방식이라 안정적인 상시 가동에는 한계가 있었습니다.
- **전역 상태.** 방별 게임 상태를 전역 객체에 들고 있어 앱이 재시작되면 진행 중이던 문제가 사라집니다. 파일로 스냅샷했으면 더 좋았을 부분입니다.
- **채점이 글자 수에 묶여 있음.** 잡담을 걸러 주는 대신 유의어나 띄어쓰기 변형 정답을 못 받아 줍니다. 정답 별칭(alias) 배열을 뒀다면 해결됐을 문제입니다.
- **문항 난이도 정보가 없음.** 덱과 문항 모두 균등 무작위라 개인별 취약 단원을 집중 공략하지 못합니다. 오답 이력을 남겨 간격 반복(spaced repetition)으로 확장하는 게 다음 단계였습니다.

그래도 목표는 달성했습니다. **복습을 과제가 아니라 대화로 바꾸자** 는 가설은 맞았고, 학생들이 시키지 않아도 `ㅈㅋ` 를 치기 시작했습니다.
