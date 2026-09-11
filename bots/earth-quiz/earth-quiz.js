/*
 * 지구퀴즈 (earth-quiz) - 메인 퀴즈 엔진
 * Messenger Bot R / Rhino(ES5+) 환경에서 동작합니다.
 *
 * 데이터 경로 규약
 *   저장소 data/  ->  단말 /sdcard/EarthQuiz/
 *   문항 DB       ->  /sdcard/EarthQuiz/questions/<deck>.json
 *   런타임 상태   ->  /sdcard/EarthQuiz/runtime/*.json  (첫 실행 시 자동 생성)
 */

const DATA_DIR = "sdcard/EarthQuiz/";
const QUESTION_DIR = DATA_DIR + "questions/";
const RUNTIME_DIR = DATA_DIR + "runtime/";

// 출제 대상 문항 덱. 파일명은 data/questions/<name>.json 과 1:1 대응한다.
const DECKS = [
  "earth-science",             // 수능 지구과학 1,623문항 (메인)
  "earth-science-submissions", // 오픈채팅방 공모 문항 (지퀴추가 봇이 여기에 적재)
  "korean-history",            // 한국사
  "science-trivia",            // 과학 상식
  "nonsense",                  // 넌센스
  "general-knowledge"          // 일반 상식
];

// JSON 파일을 읽고 배열로 파싱
let ROOMS = JSON.parse(FileStream.read(RUNTIME_DIR + "rooms.json") || "[]");

// JSON 파일을 저장하는 함수
function saveRooms(r) {
    FileStream.write(RUNTIME_DIR + "rooms.json", JSON.stringify(r, null, '\t')); // JSON 파일로 저장
}


// 메시지 수신 시 호출되는 함수
function response_great(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // 1. 방의 이름이 내가 원하는 작동방인지 확인
    const AbleRooms = ["🎯 퀴즈방 🎯", "DEBUG ROOM" ,"퀴즈","준영경민","TEST"];
    if (!AbleRooms.includes(room)) return false;

    // 2. 해당 방이 JSON에 있는지 확인
    const foundRoom = ROOMS.find(r => r.name === room); // 변수 이름 변경
    if (!foundRoom) {
        // 방이 없으면 새로 추가
        var newData = {
            "name": room, // 새로 추가할 방 이름을 사용
            "members": [],
            "memberCount": 0
        };
        
        // 데이터 배열에 추가
        ROOMS.push(newData);
        saveRooms(ROOMS);
        
        // 새 방에 사용자 추가 및 인사말 전송
        newData.members.push(sender); // 새로운 방에 사용자 추가
        newData.memberCount++; // 사용자 수 증가
        saveRooms(ROOMS); // 업데이트된 방 정보 저장
        replier.reply("🎉✨ " + sender + "님, 환영합니다! ✨🎉\n\n" +
                        room + "에 오신 것을 환영합니다!\n" +
                       "👥 이 방은 퀴즈를 즐기고, 다양한 정보와 소통을 위한 공간입니다.\n\n" +
                       "📜 지구퀴즈 봇 사용 설명서를 참조해 주세요!\n" +
                       "⚠️ 욕설, 비방글, 도배는 금지되어 있습니다.\n\n" +
                       "즐거운 퀴즈 시간 되세요! 🧠💡");
    } else {
      
        // 방이 이미 존재하는 경우
        if (foundRoom.members.includes(sender)) {
            return false; // 이미 구성원일 경우 종료
        } else {
            // 사용자 추가 및 인사말 전송
            foundRoom.members.push(sender);
            foundRoom.memberCount++;
            saveRooms(ROOMS);
            
            // 간단한 인사말
            replier.reply("🎉✨ " + sender + "님, 환영합니다! ✨🎉\n\n" +
                        room + "에 오신 것을 환영합니다!\n" +
                       "👥 이 방은 퀴즈를 즐기고, 다양한 정보와 소통을 위한 공간입니다.\n\n" +
                       "📜 지구퀴즈 봇 사용 설명서를 참조해 주세요!\n" +
                       "⚠️ 욕설, 비방글, 도배는 금지되어 있습니다.\n\n" +
                       "즐거운 퀴즈 시간 되세요! 🧠💡");
        }
    }
}



// $$$$$ 스크립트 및 광역변수 설정 $$$$$ //
const scriptName = "지구퀴즈";
var Mode = {}; //채팅방 별 게임 진행 체크 유무
var QuestionNumber = {}; //채팅방 별 db의 문항번호 저장
var ChatroomContent = {}; //채팅방 별 게임(문제+정답) 저장
var GameLock = {}; //채팅방 별 게임 Block 유무
var Outuser = {}; //아웃유저
var hintNum = {};
var hintCount = {}; //힌트변수
let ADMIN = FileStream.read(RUNTIME_DIR + "admin.json"); //ADMIN DB위치
  if (ADMIN == null) ADMIN = {};
  else ADMIN = JSON.parse(ADMIN);
//불러오기변수 설정
var question = "Question"; //@Question : db의 문제 key
var answer = "Enser"; //@Question : db의 정답 key
var consecutive = {}; //지퀴연속

// ##### Start of Function Area ##### //

/*
 * 이름을 기준으로 객체 배열을 정렬하는 함수
 * @name : 정렬할 기준이 되는 key
 * @param ascending : 오름차순 여부
 */
Array.prototype.sort_by = function(score, ascending) {
  if (ascending) {
    return this.sort(function(a, b) {
  if (a[score] > b[score]) {
    return 1;
  }
  if (a[score] < b[score]) {
    return -1;
  }
  return 0;
});
  } else {
    return this.sort(function(a, b) {
  if (a[score] > b[score]) {
    return -1;
  }
  if (a[score] < b[score]) {
    return 1;
  }
  return 0;
});
  }
};


/*
 * 객체 배열 중에 key에 해당하는 값이 value인 객체의 인덱스를 반환하는 함수
 * @param key 찾을 값에 대한 key
 * @param value key에 해당하는 값
 */
Array.prototype.findObjectIndex = function(key, value) {
  for (var i = 0; i < this.length; i++) 
    if (this[i][key] == value) 
      return i;
  return -1;
};

/*
 * 객체 배열 중에 key에 해당하는 값이 value인 객체를 반환하는 함수  
 * 해당하는 객체가 없을 경우 null을 반환.
 * @param key 찾을 값에 대한 key
 * @param value key에 해당하는 값
 */
Array.prototype.findObject = function(key, value) {
  if (this.findObjectIndex(key, value) != -1) 
    return this[this.findObjectIndex(key, value)];
  else 
    return null;
};


/* str = str.replaceAt(3, "a");
 * 위의 예시와 같이 해당 인덱스의 글자를 바꿔주는 함수
 */
String.prototype.replaceAt = function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}
// ##### End of Function Area ##### //

function clear(ROOM){
  QuestionNumber[ROOM] = [];
  ChatroomContent[ROOM] = [];
  Mode[ROOM] = 0;
  Outuser[ROOM] = [];
}

function game(ROOM){
  //게임락 설정 확인
  if (GameLock[ROOM] == 1){
    return "☁";
    return false;
  }

  //문제 출제 유무 확인
  if(Mode[ROOM] == 1) {
      var RETURN = "👇 이미 출제된 문제가 있습니다 🦄\n\n🌻 "+ChatroomContent[ROOM]["Q"];
    return RETURN;
  } else {
    QuestionNumber[ROOM] = []; //Mode[ROOM] == 0 일 때, 문항번호 값 삭제
  }

  var nansu = parseInt(Math.random() * 2) + 1;
  var deck = DECKS[parseInt(Math.random() * DECKS.length)]; //덱 무작위 선택
  var RAW = FileStream.read(QUESTION_DIR + deck + ".json"); //문항DB접근자
  if (RAW == null) return "🌫 문항 파일을 찾을 수 없어요: " + deck + ".json";
  let LIST = JSON.parse(RAW);
  if (LIST.length == 0) return "🌫 [" + deck + "] 덱이 비어 있어요.";

  //문항번호 생성
  var Total = LIST.length - 1; //문항개수(0부터)
  var N = parseInt(Math.random() * Total);
  QuestionNumber[ROOM][0] = N; //배열에 해당 방에 출제될 문항의 번호를 저장[0]

  var WORD = LIST[QuestionNumber[ROOM][0]][question]; //db에서 문제 추출
  var ANS = LIST[QuestionNumber[ROOM][0]][answer]; //db에서 정답 추출
  var underbar = ANS.length; //글자수 세기
  if (WORD.includes("^")) {
    WORD = WORD.replace(/\^/g, "["+"□".repeat(underbar)+"]"); //글자수 만큼 빈칸처리
  }

  ChatroomContent[ROOM] = []; //방의 배열 생성
  ChatroomContent[ROOM]["Q"] = WORD;
  ChatroomContent[ROOM]["A"] = ANS;
  hintNum[ROOM] = [];
  hintCount[ROOM] = [];
  
  Mode[ROOM] = 1; //게임모드 설정
  var emo = "🌎 ";
  if (nansu == 2){
    emo = "🔆 ";
  }
  return emo + WORD;
}

let CUTOFF = FileStream.read(RUNTIME_DIR + "cutoff.json"); //DB위치
  if (CUTOFF == null) 
    CUTOFF = {};
  else 
    CUTOFF = JSON.parse(CUTOFF);
// ##### response 함수 시작 ##### //

function response (room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    ////봇 동작 원하는 방인지 확인
    const AbleRooms = ["DEBUG ROOM","준영경민","퀴즈", "TEST", "흥덕 클라이밍","지퀴관리자","🎯 퀴즈방 🎯"];
    if(!AbleRooms.includes(room)) return false;
    
    response_great(room, msg, sender, isGroupChat, replier, imageDB, packageName);
    
    ////게임의 모드를 확인
    /*
     * Mode[room] = 0 -> 퀴즈 출제 전
     * Mode[room] = 1 -> 퀴즈 출제 중
     */
    if(Mode[room] == undefined) { //새로운 방일 때
       QuestionNumber[room] = []; //방의 배열 생성
       Mode[room] = 0; //퀴즈 출제 준비
    }
    if(Outuser[room] == undefined) Outuser[room] = [];
    if(consecutive[room] == undefined) consecutive[room] = 0;

    // $$$$$ Start the Game Rank Area $$$$$ //
    //// 랭킹 파일이 없다면 생성
    var RANKING = FileStream.read(RUNTIME_DIR + "rank.json"); //랭킹DB접근자
    if (RANKING == null) RANKING = {};
    else RANKING = JSON.parse(RANKING);

    //// 랭킹
    if (msg == "지퀴랭킹" || msg == "ㅈㅋㄹㅋ") {
      if (RANKING[room] == undefined || RANKING[room].length == 0) {
        replier.reply("🌫 아직 이 방에는 정답 기록이 없어요!");
        return false;
      }
      RANKING[room].sort_by('score', ascending = false);
      var rankcontents = "[지구퀴즈 정답 횟수 랭킹]\n\n";
      for (var q = 0; q < RANKING[room].length; q++) {
        rankcontents += '[' + (q + 1) + '위] ';
        rankcontents += RANKING[room][q].name + " - ";
        rankcontents += RANKING[room][q].score + '회\n';
      }
      let Rank = rankcontents.replace("[1위]", "🥇 🎉").replace("[2위]", "🥈").replace("[3위]", "🥉").replace("[4위]", "\n" + "\u200b".repeat(1000) + "[4위]");
      replier.reply(Rank.replace("\n🥈", " 🎉\n🥈"));
    }
    // $$$$$ End the Game Rank Area $$$$$ //


    // $$$$$ Start Game Preferences $$$$$ //
    //문제 출제
    if (msg == "ㅈㅋ") {
      if(consecutive[room] == 1){
        replier.reply("🚧 자동출제가 켜져있습니다! 🚧");
        replier.reply(game(room));
        return false;
      } else replier.reply(game(room));
    }

    if(msg=="ㅈㅋㅇㅇ"){
      consecutive[room] = 1;
      replier.reply("🌊");
      if(consecutive[room] == 1) replier.reply(game(room));
    }
    if(msg=="ㅈㅋㄴㄴ"){
      consecutive[room] = 0;
      replier.reply("🧊");
    }

    //정답공개
    if(msg == "ㅈㅋㅈㄷ" && Mode[room] == 1){
      if (Outuser[room].includes(sender)) {
        replier.reply("🍭 ["+sender+"]님은 현재 OUT이에요.. 🔇");
        return false;
      }
      replier.reply("🎯 "+ChatroomContent[room]["A"]);
      clear(room);
      if(consecutive[room] == 1) {
        setTimeout(function() {
          replier.reply(game(room)); //자동출제
        }, 1000);
      };
    }

    //힌트
    if(msg == "ㅈㅋㅎㅌ" && Mode[room] == 1 && !Outuser[room].includes(sender)){
      //(광역변수를 사용중임)
      var Fixed = ChatroomContent[room]["A"]; //답안
      var hintblank = "□".repeat(Fixed.length); //힌트길이생성
      var blank_check = 0; //반복문 제어
      while (blank_check == 0){
        var M = parseInt(Math.random() * Fixed.length); //답안의 길이 중 난수 생성
        if (!hintNum[room].includes(M)){ //힌트룸 배열에 M이 없다면
          hintNum[room].push(M); //M 값을 추가 후
          hintCount[room] += "1"; //Count값을 증가
          blank_check = 1;
        } else {
          continue; //나올때까지 반복
        }
      }

      for (var i = 0; i < hintCount[room].length; i++){ //문자열 대체과정
        hintblank = hintblank.replaceAt(hintNum[room][i], Fixed[hintNum[room][i]]);
      }

      if (hintblank.indexOf("□") == -1){
        replier.reply("🎲 정답을 공개합니다..! ");
        replier.reply("🎯 "+ChatroomContent[room]["A"]);
        clear(room);
        if(consecutive[room] == 1) {
        setTimeout(function() {
          replier.reply(game(room)); //자동출제
        }, 1000);
        };
        return false;
      } else {
        replier.reply("🎲 "+ hintblank);
      }

    }
    // $$$$$ End Game Preferences $$$$$ //



    if(room == "지퀴관리자"&& msg == "등록"){
      if (!(sender in ADMIN)) {
        ADMIN[sender] = 0;
      }
      replier.reply(java.lang.String(imageDB.getProfileImage()).hashCode());
      ADMIN[sender] = java.lang.String(imageDB.getProfileImage()).hashCode();
      FileStream.write(RUNTIME_DIR + "admin.json", JSON.stringify(ADMIN, null, '\t'));
      replier.reply("✅ 현재의 ["+sender+"]님을 지퀴관리자로 등록할게요!");
    }

    if (msg == "ㅈㅋㅁㅊ"){
      if ( ADMIN[sender] == java.lang.String(imageDB.getProfileImage()).hashCode() ) {
        if(Mode[room] == 1) {
          replier.reply("🎯 "+ChatroomContent[room]["A"]);
          clear(room);
        }
        if(GameLock[room] != 1){
          GameLock[room] = 1;
          replier.reply("☁ 지구퀴즈를 그만할게요");
          consecutive[room] = 0;
          return false;
        } else {
          replier.reply("🌫 이미 멈춰있어요..");
          return false;
        }
      } else {
        replier.reply("🌩 권한이 없습니다 ✋");
        return false;
      }
    }

    if (msg == "ㅈㅋㄱㄱ"){
      if ( ADMIN[sender] == java.lang.String(imageDB.getProfileImage()).hashCode() ) {
        if(GameLock[room] != 0){
          GameLock[room] = 0;
          replier.reply("🚀 이제 지구퀴즈가 가능합니다! 🌤");
          replier.reply(game(room));
          return false;
        } else {
          replier.reply("🌎 이미 가능합니다! ");
          return false;
        }
      } else {
        replier.reply("🌩 권한이 없습니다 ✋");
        return false;
      }
    }

    //정답처리
    if(Mode[room] == 1 && CUTOFF[sender] != 1 && !Outuser[room].includes(sender) && msg.replace(/\s|\,|\./gi, "").length == (ChatroomContent[room]["A"]).length && ( msg.replace(/\s|\,/gi, "") == ChatroomContent[room]["A"])) {
      if(msg.startsWith("ㅈㅋ")){
        return false;
      }
      if(msg == "ㅈㄷㄱㄱ"){
        return false;
      }
      //답장
      replier.reply("🌿 " + sender + "님 ["+msg.replace(/\s|\,/gi, "")+"] 정답! 🌈");
      clear(room);
      //랭킹반영
      if (!(room in RANKING)) {
        RANKING[room] = [];
      }
      if (RANKING[room].findObjectIndex('name', sender) == -1) {
        RANKING[room].push({
        "name": sender, 
        "score": 1});
      } else {
        RANKING[room].findObject('name', sender)['score'] += 1;
      }
      FileStream.write(RUNTIME_DIR + "rank.json", JSON.stringify(RANKING, null, '\t'));
      if(consecutive[room] == 1) {
        setTimeout(function() {
          replier.reply(game(room)); //자동출제
        }, 100);
      };
      return false;
    }
  
    //오답처리
    if(Mode[room] == 1 && CUTOFF[sender] != 1 && !Outuser[room].includes(sender) && msg.replace(/\s|\,|\./gi, "").length == (ChatroomContent[room]["A"]).length && ( msg.replace(/\s|\,/gi, "") != ChatroomContent[room]["A"])) {
      if(msg.startsWith("ㅈㅋ")){
        return false;
      }
      if(msg == "ㅈㄷㄱㄱ"){
        return false;
      }

      if (msg.replace(/\s|\,/gi, "").length == 1){
        replier.reply("🍭 ["+sender+"]님 5️⃣초간 🔇!");
        Outuser[room].push(sender);
        setTimeout(function() {
          Outuser[room].splice(Outuser[room].indexOf(sender),1);
          replier.reply("🍭 ["+sender+"] 🔊");
        }, 5000);
        return false;
     }

      replier.reply("☄ " + msg.replace(/\s|\,/gi, "") + " 땡! ☄");
    }

    if ( msg.startsWith("차단 ") && (ADMIN[sender] == java.lang.String(imageDB.getProfileImage()).hashCode()) ) {
      var target = msg.replace("차단 ", "");
      if (CUTOFF[target] != 1){
        CUTOFF[target] = 1;
        replier.reply("📛 ["+target+"]님을 차단했어요!");
        return false;
      } else {
        replier.reply("☑ ["+target+"]님은 이미 차단돼있어요..");
      }
    }

}