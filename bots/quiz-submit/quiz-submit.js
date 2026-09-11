/*
 * 지퀴추가 (quiz-submit) - 문항 공모/검수 봇
 *
 * 오픈채팅방에서 받은 공모 문항을 submissions 덱에 적재하고,
 * 검수 후 정식 덱(earth-science)으로 옮기기 위한 검색/목록/삭제 도구를 제공한다.
 *   #문장ㅁㅁ#정답  : 공모 등록 (ㅁ 개수와 정답 글자수가 일치해야 통과)
 *   #검색# / #목록# / #삭제#N : 공모 덱(submissions) 대상
 *   %검색% / %삭제%N          : 정식 덱(earth-science) 대상
 */

const DATA_DIR = "sdcard/EarthQuiz/";
const QUESTION_DIR = DATA_DIR + "questions/";
const RUNTIME_DIR = DATA_DIR + "runtime/";

const scriptName = "지퀴추가";

////파일이 없다면 생성
let RECEIVE = FileStream.read(QUESTION_DIR + "earth-science-submissions.json"); //공모 덱 접근자
if (RECEIVE == null) 
  RECEIVE = [];
else 
  RECEIVE = JSON.parse(RECEIVE);

////파일이 없다면 생성
let ARCHIVE = FileStream.read(QUESTION_DIR + "earth-science.json"); //정식 덱 접근자
if (ARCHIVE == null) 
  ARCHIVE = [];
else 
  ARCHIVE = JSON.parse(ARCHIVE);

// ##### response 함수 시작 ##### //
function response (room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    if (msg.startsWith("#검색#")){
      var numList = [];
      msg = msg.replace("#검색#","");
      var search = 0;
      for (var i=0; i<RECEIVE.length; i++){
        if (RECEIVE[i]["Enser"] == msg){
          search = RECEIVE[i]["Number"];
          numList.push("🍉 ["+search+"]["+RECEIVE[i]["Enser"]+"]: "+RECEIVE[i]["Question"]);
        } else {
          if (RECEIVE[i]["Question"].includes(msg)){
            search = RECEIVE[i]["Number"];
            numList.push("🍇 ["+search+"]["+RECEIVE[i]["Enser"]+"]: "+RECEIVE[i]["Question"]);
          }
        } 
      }
      if (numList.length == 0){
        replier.reply("🍄 ["+msg+"] 없어요..");
        return false;
      } else {
        replier.reply("🍋 ["+msg+"] 검색결과 🍋\n" + "\u200b".repeat(1000)+numList.join("\n"));
        return false;
      }
    }

    if (msg.startsWith("%검색%")){
      var numList = [];
      msg = msg.replace("%검색%","");
      var search = 0;
      for (var i=0; i<ARCHIVE.length; i++){
        if (ARCHIVE[i]["Enser"] == msg){
          search = ARCHIVE[i]["Number"];
          numList.push("🍉 ["+search+"]["+ARCHIVE[i]["Enser"]+"]: "+ARCHIVE[i]["Question"]);
        } else {
          if (ARCHIVE[i]["Question"].includes(msg)){
            search = ARCHIVE[i]["Number"];
            numList.push("🍇 ["+search+"]["+ARCHIVE[i]["Enser"]+"]: "+ARCHIVE[i]["Question"]);
          }
        } 
      }
      if (numList.length == 0){
        replier.reply("🪐 ["+msg+"] 없어요..");
        return false;
      } else {
        replier.reply("🌏 ["+msg+"] 검색결과 🌏\n" + "\u200b".repeat(1000)+numList.join("\n"));
        return false;
      }
    }

    if (msg.startsWith("#삭제#")) {
      msg = msg.replace("#삭제#","");
      if (isNaN(msg) || msg < 1 || msg > RECEIVE.length) { //범위 밖 번호 방어
        replier.reply("🍄 1 ~ " + RECEIVE.length + " 사이의 번호를 입력해주세요!");
        return false;
      }
      var DELETE = "🥥 삭제항목"+"\u200b".repeat(1000)+"\n\n["+RECEIVE[msg-1]["Enser"]+"]: "+RECEIVE[msg-1]["Question"];
      RECEIVE.splice(msg-1, 1);
      for (var i=0; i<RECEIVE.length; i++){
        RECEIVE[i]["Number"] = i+1;
      }
      FileStream.write(QUESTION_DIR + "earth-science-submissions.json", JSON.stringify(RECEIVE, null, '\t'));
      replier.reply("✅ 문항 번호가 다시 업데이트 됩니다.");
      replier.reply(DELETE);
    }

    if (msg.startsWith("%삭제%")) {
      msg = msg.replace("%삭제%","");
      if (isNaN(msg) || msg < 1 || msg > ARCHIVE.length) { //범위 밖 번호 방어
        replier.reply("🍄 1 ~ " + ARCHIVE.length + " 사이의 번호를 입력해주세요!");
        return false;
      }
      var DELETE = "🍑 삭제항목"+"\u200b".repeat(1000)+"\n\n["+ARCHIVE[msg-1]["Enser"]+"]: "+ARCHIVE[msg-1]["Question"];
      ARCHIVE.splice(msg-1, 1);
      for (var i=0; i<ARCHIVE.length; i++){
        ARCHIVE[i]["Number"] = i+1;
      }
      FileStream.write(QUESTION_DIR + "earth-science.json", JSON.stringify(ARCHIVE, null, '\t'));
      replier.reply("✅ 문항 번호가 다시 업데이트 됩니다.");
      replier.reply(DELETE);
    }

    if (msg.startsWith("#목록#")){
      var numList = [];
      msg = msg.replace("#목록#","");
      var search = 0;
      for (var i=0; i<RECEIVE.length; i++){
          search = RECEIVE[i]["Number"];
          numList.push("🍉 ["+search+"]["+RECEIVE[i]["Enser"]+"]: "+RECEIVE[i]["Question"]);
      }
      replier.reply("🍋 문항공모 목록 🍋\n" + "\u200b".repeat(1000)+numList.join("\n\n"));
      return false;
    }


    if (msg.startsWith("#")) {
      var question = msg.split("#")[1];
      if (!question.includes("ㅁ")){
        return false;
      }
      var answer = msg.split("#")[2];
      if(answer.replace(/\s/g, "") == ""){
        replier.reply("🍄 답을 입력해주세요!");
        return false;
      }




      var blankS = question.indexOf("ㅁ");
      var blankC = 0;
      var blank_trash = question;
      var search_check = 0;
      while(search_check != -1){
        blank_trash = blank_trash.replace("ㅁ","ㄴ");
        blankC += 1;
        search_check = blank_trash.indexOf("ㅁ");
      }

      var answerT = answer.replace(/\,|\s|\./g, ""); //답안(쉼표와 공백제거)

      if (blankC != answerT.length){ //길이가 다르다면
        replier.reply("🍄 빈칸의 길이를 확인해주세요");
        replier.reply(blankC+"\n"+answerT+"\n"+search_check+"\n"+blank_trash);
        return false;
      }

      var Header = "";
      if (answerT == "ㅇ" || answerT == "ㄴ") Header = "(ㅇ/ㄴ) ";
      if (answerT == "<" || answerT == ">" || answerT == "=") Header = "(부등호) ";
      
      var raw = {"Question":Header + question.replace(/\ㅁ/g, "□"), "Enser":answerT, "Number":RECEIVE.length+1};
      RECEIVE.push(raw);
      FileStream.write(QUESTION_DIR + "earth-science-submissions.json", JSON.stringify(RECEIVE, null, '\t'));
      replier.reply("🍑 [답: "+answerT+"] 문항을 ["+(RECEIVE.length)+"]번으로 추가하였습니다");
  }

}