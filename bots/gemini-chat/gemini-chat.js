/*
 * 챗봇 (gemini-chat) - 카카오톡 안에서 바로 쓰는 Gemini 질의응답
 *
 * 퀴즈를 풀다 모르는 개념이 나와도 다른 앱/사이트로 나가지 않게 하려고 붙인 기능.
 *   ? 질문   -> 새 대화 시작 (문맥 초기화 없이 단발 질의)
 *   ! 질문   -> 직전까지의 질문/답변을 함께 실어 보내 맥락을 이어감
 *
 * API 키는 저장소에 커밋하지 않습니다. 아래 상수를 본인 키로 교체한 뒤 배포하세요.
 *   https://aistudio.google.com/app/apikey
 */

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // <- 발급받은 키로 교체
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;

// 답변 길이가 길면 카톡에서 읽기 불편해 톤/길이를 프롬프트로 제어한다.
const STYLE_HINT = " 답변은 핵심만 짧고 간결하게 해주며, 말투 및 어조는 질문자의 어조에 맞게 대답해줘.";

// 맥락 유지용 대화 버퍼. 봇이 재시작되면 초기화된다.
let previousConversation = [];
const MAX_HISTORY = 6; // 프롬프트가 무한정 길어지지 않도록 최근 N턴만 유지

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 1. 방의 이름이 내가 원하는 작동방인지 확인
    const AbleRooms = ["🎯 퀴즈방 🎯", "DEBUG ROOM", "퀴즈", "준영경민", "TEST"];
    if (!AbleRooms.includes(room)) return false;

    // "?" 로 시작하면 새 질문
    if (msg.startsWith("?")) {
        let question = msg.slice(1).trim();

        if (question.length === 0) {
            replier.reply("질문을 입력해 주세요. 예) ? 편서풍 파동이 뭐야");
            return;
        }

        if (question.length > 10) question += STYLE_HINT;

        let result = sendGeminiQuestion(question, replier);

        previousConversation.push({ question: question, answer: result });
        if (previousConversation.length > MAX_HISTORY) previousConversation.shift();

        replier.reply(result);

    // "!" 로 시작하면 직전 대화를 이어서 질문
    } else if (msg.startsWith("!")) {
        let newQuestion = msg.slice(1).trim();

        if (newQuestion.length === 0) {
            replier.reply("이어서 물어볼 내용을 입력해 주세요.");
            return;
        }

        if (previousConversation.length === 0) {
            replier.reply("이전 대화가 없습니다. '?' 명령어로 새로운 질문을 시작해 주세요.");
            return;
        }

        // 이전 질문과 답변을 이어서 새로운 질문을 전송
        let conversation = previousConversation.map(function(conv, index) {
            return "이전 질문" + (index + 1) + ": " + conv.question + ",\n이전 답변" + (index + 1) + ": " + conv.answer;
        }).join("\n\n");

        let fullConversation = conversation + "\n\n새로운 질문: " + newQuestion;

        let result = sendGeminiQuestion(fullConversation, replier);

        previousConversation.push({ question: newQuestion, answer: result });
        if (previousConversation.length > MAX_HISTORY) previousConversation.shift();

        replier.reply(result);
    }
}

/*
 * Gemini API로 질문을 전송하는 함수
 * Messenger Bot R 에는 fetch 가 없어 번들된 Jsoup 으로 직접 POST 한다.
 * @param replier 오류를 방에 알려주기 위해 넘겨받는다 (전역에 없는 값이므로 인자로 전달 필수)
 */
function sendGeminiQuestion(question, replier) {
    let responseMessage = "";

    try {
        let response = org.jsoup.Jsoup.connect(GEMINI_API_URL)
            .header("Content-Type", "application/json")
            .ignoreContentType(true) // 응답 타입 무시
            .requestBody(JSON.stringify({
                "contents": [{
                    "parts": [{
                        "text": question
                    }]
                }]
            }))
            .post();

        let jsonResponse = JSON.parse(response.body().text());

        // 안전필터 등으로 candidates 가 비어 오는 경우를 방어
        if (!jsonResponse.candidates || jsonResponse.candidates.length === 0) {
            return "답변을 생성하지 못했어요. 질문을 조금 바꿔서 다시 물어봐 주세요.";
        }

        responseMessage = jsonResponse.candidates[0].content.parts[0].text.trim();
    } catch (e) {
        responseMessage = "질문을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.";
        if (replier) replier.reply("에러: " + e.toString()); // 디버깅용
    }

    return responseMessage;
}
