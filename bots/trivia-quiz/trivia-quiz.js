/*
 * 상식퀴즈 (trivia-quiz) - 초기 프로토타입
 *
 * 지구퀴즈(earth-quiz)의 원형이 된 버전. 힌트 로직이 "정답 구간 인덱스(hintBar)"를
 * 기준으로 동작해 문제 문장에 빈칸이 하나일 때만 정상 작동한다는 한계가 있었고,
 * 이후 earth-quiz 에서 정답 문자열 자체를 마스킹하는 방식으로 재작성됐다.
 * 히스토리 기록용으로 남겨 둔다.
 */

const DATA_DIR = "sdcard/EarthQuiz/";
const QUESTION_DIR = DATA_DIR + "questions/";
const RUNTIME_DIR = DATA_DIR + "runtime/";

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


// $$$$$ 스크립트 및 광역변수 설정 $$$$$ //

const scriptName = "지구퀴즈";
let LIST = JSON.parse(FileStream.read(QUESTION_DIR + "korean-history.json")); //문항DB접근자
var Mode = {}; //채팅방 별 게임 진행 체크 유무
var QuestionNumber = {}; //채팅방 별 db의 문항번호 저장
var ChatroomContent = {}; //채팅방 별 게임(문제+정답) 저장
var GameLock = {}; //채팅방 별 게임 Block 유무
var hintNum = {};
var hintCount = {};
var hintBar = {};
//힌트변수
var pastmsg = {}; //도배 방지



// ##### response 함수 시작 ##### //

function response (room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    ///도배 방지 시작
    if(pastmsg[room] == undefined) { //새로운 방일 때
       pastmsg[room] = []; //방의 배열 생성
    }

    if (msg == "ㅈㅋ"){
      pastmsg[room].push(msg); //ㅈㅋ가 맞다면 배열에 넣음
    } else {
      pastmsg[room] = [] //ㅈㅋ가 아니라면 배열 초기화
    }


    ////봇 동작 원하는 방인지 확인
    const AbleRooms = ["흥덕 클라이밍", "준영경민", "TEST", "DEBUG ROOM"];
    if (!AbleRooms.includes(room)) {

      return false;
      }



    ////게임의 모드를 확인
    /*
     * Mode[room] = 0 -> 퀴즈 출제 전
     * Mode[room] = 1 -> 퀴즈 출제 중
     */
    if(Mode[room] == undefined) { //새로운 방일 때
       QuestionNumber[room] = []; //방의 배열 생성
       Mode[room] = 0; //퀴즈 출제 준비
    }


    // $$$$$ Start the Game Rank Area $$$$$ //
    //// 랭킹 파일이 없다면 생성
    var RANKING = FileStream.read(RUNTIME_DIR + "rank.json"); //랭킹DB접근자
    if (RANKING == null) 
      RANKING = {};
    else 
      RANKING = JSON.parse(RANKING);




    //// 랭킹
    if (msg == "지퀴랭킹" || msg == "ㅈㅋㄹㅋ") {
      if (RANKING[room] == undefined || RANKING[room].length == 0) {
        replier.reply("🌫 아직 이 방에는 정답 기록이 없어요!");
        return false;
      }
      RANKING[room].sort_by('score', ascending = false);
      var rankcontents = "[ 지구퀴즈 정답 횟수 랭킹 ]\n\n";
      for (var q = 0; q < RANKING[room].length; q++) {
        rankcontents += '[' + (q + 1) + '위] ';
        rankcontents += RANKING[room][q].name + " - ";
        rankcontents += RANKING[room][q].score + '회\n';
      }
      let Rank = rankcontents.replace("[1위]", "🥇").replace("[2위]", "🥈").replace("[3위]", "🥉").replace("[4위]", "\n" + "\u200b".repeat(1000) + "[4위]");
      replier.reply(Rank);
    }
    // $$$$$ End the Game Rank Area $$$$$ //


    // $$$$$ Start Game Preferences $$$$$ //
    //문제 출제
    if (msg == "ㅈㅋ") {

      //도배방지
      if (pastmsg[room].length > 1){
        return false;
      }




      //게임락 설정 확인
      if (GameLock[room] == 0){
        replier.reply("😨 지금은 못해요 🙅");
        return false;
      }
      //문제 출제 유무 확인
      if(Mode[room] == 1) {
        replier.reply("👇 이미 출제된 문제가 있습니다 🦄");
        replier.reply("🌎 "+ChatroomContent[room]["Q"]);
        return false;
      } else {
        QuestionNumber[room] = []; //Mode[room] == 0 일 때, 문항번호 값 삭제
      }

      //불러오기변수 설정
      var question = "Question"; //@Question : db의 문제 key
      var answer = "Enser"; //@Question : db의 정답 key

      //문항번호 생성
      var Total = LIST.length; //문항개수(덱 크기에 자동 연동)
      let N = parseInt(Math.random() * Total);
      QuestionNumber[room].push(N); //배열에 해당 방에 출제될 문항의 번호를 저장[0]

      var WORD = LIST[QuestionNumber[room][0]][question]; //db에서 문제 추출
      var ANS = LIST[QuestionNumber[room][0]][answer]; //db에서 정답 추출
      var underbar = ANS.length; //글자수 세기
      WORD = WORD.replace(/\^/g, "["+"□".repeat(underbar)+"]"); //글자수 만큼 빈칸처리

      hintBar[room] = WORD.indexOf("□"); //_의 위치

      ChatroomContent[room] = []; //방의 배열 생성
      ChatroomContent[room]["Q"] = WORD;
      ChatroomContent[room]["A"] = ANS;
      hintNum[room] = [];
      hintCount[room] = [];

      replier.reply("🌎 " + WORD); //문제 출제
      Mode[room] = 1; //게임모드 설정

    }

    //정답공개
    if(msg == "ㅈㅋㅈㄷ" && Mode[room] == 1){
      replier.reply("🎯 "+ChatroomContent[room]["A"]);
      QuestionNumber[room] = [];
      ChatroomContent[room] = [];
      response(room, "ㅈㅋ", sender, isGroupChat, replier, imageDB, packageName);
    }


// 힌트
if (msg == "ㅈㅋㅎㅌ" && Mode[room] == 1) {
    var change_Q = ChatroomContent[room]["Q"];
    var Fixed = ChatroomContent[room]["A"]; // 정답
    var FixedNum = Fixed.length; // 정답의 길이

    // 공개되지 않은 인덱스 목록 생성
    var hiddenIndexes = [];
    for (var i = 0; i < FixedNum; i++) {
        if (!hintNum[room].includes(i)) { // 힌트 배열에 포함되지 않은 경우
            hiddenIndexes.push(i); // 공개되지 않은 인덱스 추가
        }
    }

    // 공개할 힌트를 선택
    if (hiddenIndexes.length > 0) {
        var randomIndex = hiddenIndexes[Math.floor(Math.random() * hiddenIndexes.length)]; // 랜덤 선택
        hintNum[room].push(randomIndex); // 공개한 인덱스 추가

        // 공개된 글자만 남기고 나머지는 □로 대체
        change_Q = change_Q.split(""); // 문자열을 배열로 변환
        for (var i = 0; i < FixedNum; i++) {
            if (!hintNum[room].includes(i)) {
                change_Q[hintBar[room] + i] = "□"; // 공개되지 않은 글자는 □로 대체
            } else {
                change_Q[hintBar[room] + i] = Fixed[i]; // 공개된 글자는 그대로 유지
            }
        }
        change_Q = change_Q.join(""); // 배열을 문자열로 변환
    } else {
        replier.reply("🎉 모든 글자가 이미 공개되었습니다!"); // 모든 글자가 공개된 경우
        replier.reply("🎯 " + ChatroomContent[room]["A"]); // 정답 공개
        QuestionNumber[room] = [];
        ChatroomContent[room] = [];
        Mode[room] = 0;
        response(room, "ㅈㅋ", sender, isGroupChat, replier, imageDB, packageName);
    }

    // 모든 글자가 공개되었는지 확인
    if (change_Q.indexOf("□") == -1) {
        replier.reply("🎲 모든 글자가 공개되었습니다! ");
        replier.reply("🎯 " + ChatroomContent[room]["A"]); // 정답 공개
        QuestionNumber[room] = [];
        ChatroomContent[room] = [];
        Mode[room] = 0;
        response(room, "ㅈㅋ", sender, isGroupChat, replier, imageDB, packageName);
    } else {
        replier.reply("🎲 " + change_Q); // 변경된 문제 출력
    }
}


    // $$$$$ End Game Preferences $$$$$ //





    if (msg.includes("지퀴멈춰") || msg.includes("ㅈㅋㅁㅊ")){
      //if(Mode[room] == 1) {
       // replier.reply("🦄 출제된 문제를 먼저 풀어주세요");
        
        //return false;
     // }
      if(GameLock[room] != 0){
        GameLock[room] = 0;
        replier.reply("✋ 지구퀴즈를 그만할게요");
        return false;
      } else {
        replier.reply("🌚 이미 멈춰있어요..");
      }
    }

    if (msg.includes("ㅈㅋㄱㄱ") || msg.includes("ㅈㅋㄲ")){
      GameLock[room] = 1;
      replier.reply("🚀 이제 지구퀴즈가 가능합니다! 🌝");
      return false;
    }

    //정답처리
if (Mode[room] == 1 && msg.length == ChatroomContent[room]["A"].length && msg == ChatroomContent[room]["A"]) {
  
  if (msg.startsWith("ㅈㅋ")) {
    return false;
  }
  if (msg == "ㅈㄷㄱㄱ") {
    return false;
  }

  //답장
  replier.reply("🌿 " + sender + "님 [" + msg + "] 정답! ⚘");
  QuestionNumber[room] = [];
  ChatroomContent[room] = [];
  Mode[room] = 0;

  //랭킹반영
  if (!(room in RANKING)) {
    RANKING[room] = [];
  }
  if (RANKING[room].findObjectIndex('name', sender) == -1) {
    RANKING[room].push({
      "name": sender,
      "score": 1
    });
  } else {
    RANKING[room].findObject('name', sender)['score'] += 1;
  }
  FileStream.write(RUNTIME_DIR + "rank.json", JSON.stringify(RANKING, null, '\t'));
  
  response(room, "ㅈㅋ", sender, isGroupChat, replier, imageDB, packageName)
}

//오답처리
if (Mode[room] == 1 && msg.length == ChatroomContent[room]["A"].length && msg != ChatroomContent[room]["A"]) {
  
  if (msg.startsWith("ㅈㅋ")) {
    return false;
  }
  if (msg == "ㅈㄷㄱㄱ") {
    return false;
  }

  replier.reply("😨 " + msg + " 땡! 🥀");
}
    


}