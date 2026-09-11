/*
 * simulate.js - 안드로이드 없이 봇 로직을 검증하는 로컬 하네스
 *
 * Messenger Bot R 이 주입하는 전역(FileStream, replier, imageDB, java...)을 Node 에서 흉내 내
 * 봇 스크립트를 그대로 실행한다. 단말의 /sdcard/EarthQuiz/ 는 이 저장소의 data/ 로 매핑된다.
 *
 * 사용법:
 *   node tools/simulate.js                       # 기본 시나리오 실행
 *   node tools/simulate.js earth-quiz "ㅈㅋ" "ㅈㅋㅎㅌ"   # 봇/메시지 직접 지정
 *
 * 주의: 봇은 파일에 실제로 쓴다.
 *   - data/runtime/  : 랭킹·방 명단 등이 생성된다 (.gitignore 처리됨)
 *   - data/questions/: quiz-submit 의 등록(#...#)·삭제(#삭제#) 명령은 문항 덱을 직접 수정한다.
 *   기본 시나리오는 읽기 전용 명령만 사용한다.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DEVICE_PREFIX = "sdcard/EarthQuiz/";

function toLocal(p) {
  // "sdcard/EarthQuiz/questions/x.json" -> "<repo>/data/questions/x.json"
  if (p.startsWith(DEVICE_PREFIX)) return path.join(ROOT, "data", p.slice(DEVICE_PREFIX.length));
  return path.join(ROOT, p);
}

const FileStream = {
  read(p) {
    const f = toLocal(p);
    return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  },
  write(p, data) {
    const f = toLocal(p);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, data, "utf8");
    return true;
  }
};

// java.lang.String(x).hashCode() 에뮬레이션 (관리자 인증에 쓰임)
function javaHashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}
const java = { lang: { String: (s) => ({ hashCode: () => javaHashCode(String(s)) }) } };

// Gemini 호출은 네트워크를 타므로 기본적으로 스텁 처리
const org = {
  jsoup: {
    Jsoup: {
      connect() {
        const chain = {
          header: () => chain,
          ignoreContentType: () => chain,
          requestBody: () => chain,
          post: () => ({
            body: () => ({
              text: () => JSON.stringify({
                candidates: [{ content: { parts: [{ text: "(시뮬레이터 응답: 실제 API 미호출)" }] } }]
              })
            })
          })
        };
        return chain;
      }
    }
  }
};

function loadBot(name) {
  const file = path.join(ROOT, "bots", name, name + ".js");
  // 호스트의 String/Array 를 넘기면 안 된다. 봇 스크립트가 프로토타입을 확장하는데
  // vm 컨텍스트의 문자열/배열은 컨텍스트 고유 intrinsic 을 쓰기 때문에 패치가 적용되지 않는다.
  const sandbox = { FileStream, java, org, console, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox;
}

function run(botName, room, sender, messages) {
  const bot = loadBot(botName);
  const imageDB = { getProfileImage: () => "profile:" + sender };

  for (const msg of messages) {
    const replies = [];
    const replier = { reply: (t) => replies.push(String(t)) };
    console.log("\x1b[36m" + sender + " > " + msg + "\x1b[0m");
    bot.response(room, msg, sender, true, replier, imageDB, "com.kakao.talk");
    for (const r of replies) console.log("  \x1b[32mBOT <\x1b[0m " + r.replace(/\u200b/g, "").replace(/\n/g, "\n        "));
  }
}

const [, , argBot, ...argMsgs] = process.argv;

if (argBot) {
  run(argBot, "DEBUG ROOM", "DEBUG SENDER", argMsgs.length ? argMsgs : ["ㅈㅋ"]);
} else {
  console.log("=== earth-quiz: 출제 -> 힌트 -> 정답공개 -> 랭킹 ===");
  run("earth-quiz", "DEBUG ROOM", "DEBUG SENDER", ["ㅈㅋ", "ㅈㅋㅎㅌ", "ㅈㅋㅎㅌ", "ㅈㅋㅈㄷ", "ㅈㅋㄹㅋ"]);

  console.log("\n=== quiz-submit: 공모 덱 / 정식 덱 검색 (읽기 전용) ===");
  run("quiz-submit", "지퀴관리자", "DEBUG SENDER", ["#검색#생명가능지대", "%검색%오르도비스기"]);

  console.log("\n=== welcome: 첫 참여자 환영 ===");
  run("welcome", "DEBUG ROOM", "새내기", ["안녕하세요"]);

  console.log("\n=== gemini-chat: 질의 (API 스텁) ===");
  run("gemini-chat", "DEBUG ROOM", "DEBUG SENDER", ["? 편서풍 파동이 뭐야", "! 그럼 제트류랑은 무슨 관계야"]);

  console.log("\n=== trivia-quiz: 출제 ===");
  run("trivia-quiz", "DEBUG ROOM", "DEBUG SENDER", ["ㅈㅋㄱㄱ", "ㅈㅋ"]);
}
