/*
 * 인사봇 (welcome) - 신규 참여자 환영 + 방/구성원 기록
 * rooms.json 에 방별 구성원 명단을 누적해, 처음 말을 건 사람에게만 환영 메시지를 보낸다.
 * (지구퀴즈 봇에도 같은 로직이 response_great 로 통합돼 있다. 이 봇은 분리 운영용.)
 */

const DATA_DIR = "sdcard/EarthQuiz/";
const QUESTION_DIR = DATA_DIR + "questions/";
const RUNTIME_DIR = DATA_DIR + "runtime/";


// JSON 파일을 읽고 배열로 파싱
let ROOMS = JSON.parse(FileStream.read(RUNTIME_DIR + "rooms.json") || "[]");

// JSON 파일을 저장하는 함수
function saveRooms(r) {
    FileStream.write(RUNTIME_DIR + "rooms.json", JSON.stringify(r, null, '\t')); // JSON 파일로 저장
}


// 메시지 수신 시 호출되는 함수
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // 1. 방의 이름이 내가 원하는 작동방인지 확인
    const AbleRooms = ["🎯 퀴즈방 🎯", "DEBUG ROOM"];
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