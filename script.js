const API_KEY = "AQ.Ab8RN6K2kYw9Ad11Qq_Vk3tzSk1pjdYdwUr1CqkIi10JCaqV2g";
let seconds = 0;

let timerInterval = null;

const timerDisplay =
document.getElementById("timer");
function updateTimer(){

    const mins =
    String(
        Math.floor(seconds / 60)
    ).padStart(2,"0");

    const secs =
    String(
        seconds % 60
    ).padStart(2,"0");

    timerDisplay.innerText =
    `${mins}:${secs}`;
}

let currentLanguage = "vi";

const transcriptBox =
document.getElementById("transcript");

const SpeechRecognition =
window.SpeechRecognition ||
window.webkitSpeechRecognition;

const recognition =
new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = true;

recognition.lang = "vi-VN";

function saveNote(){

    const date =
    document.getElementById(
        "studyDate"
    ).value;

    const note =
    document.getElementById(
        "transcript"
    ).value;

    if(!date){

        alert(
            "Vui lòng chọn ngày!"
        );

        return;
    }

    localStorage.setItem(
        "note_" + date,
        note
    );

    alert(
        "Đã lưu ghi chú!"
    );
}

function loadNote(){

    const date =
    document.getElementById(
        "studyDate"
    ).value;

    const note =
    localStorage.getItem(
        "note_" + date
    );

    if(note){

        document.getElementById(
            "transcript"
        ).value = note;

    }else{

        alert(
            "Chưa có ghi chú ngày này!"
        );
    }
}

document
.getElementById("recordBtn")
.addEventListener("click", () => {

    recognition.start();

    seconds = 0;

    updateTimer();

    timerInterval =
    setInterval(() => {

        seconds++;

        updateTimer();

    },1000);

    document
    .getElementById("recordBtn")
    .classList.add("recording");
});

recognition.onresult = (event) => {

    let text = "";

    for(
        let i=0;
        i<event.results.length;
        i++
    ){
        text += event.results[i][0].transcript;
    }

    transcriptBox.value = text;
};

function setLanguage(lang){

    currentLanguage = lang;

    if(lang==="vi"){

        recognition.lang="vi-VN";

       document.getElementById(
    "calendarTitle"
).innerText =
"📅 Lịch học";

document.getElementById(
    "saveBtn"
).innerText =
"💾 Lưu ghi chú";

document.getElementById(
    "loadBtn"
).innerText =
"📖 Xem ghi chú";

        document.getElementById("appTitle").innerText =
        "🐱 Trợ lý Ghi chú AI";

        document.getElementById("recordBtn").innerText =
        "🎤 Ghi âm";

        document.getElementById("stopBtn").innerText =
        "⏹ Dừng";

        document.getElementById("analyzeBtn").innerText =
        "✨ Phân tích AI";

        document.getElementById("transcriptTitle").innerText =
        "Nội dung";

    }else{

        recognition.lang="en-US";

        document.getElementById(
    "calendarTitle"
).innerText =
"📅 Study Calendar";

document.getElementById(
    "saveBtn"
).innerText =
"💾 Save Note";

document.getElementById(
    "loadBtn"
).innerText =
"📖 Load Note";

        document.getElementById("appTitle").innerText =
        "🐱 VoiceHelper";

        document.getElementById("recordBtn").innerText =
        "🎤 Record";

        document.getElementById("stopBtn").innerText =
        "⏹ Stop";

        document.getElementById("analyzeBtn").innerText =
        "✨ Analyze";

        document.getElementById("transcriptTitle").innerText =
        "Transcript";
    }
}
document
.getElementById("analyzeBtn")
.addEventListener("click", analyze);

async function analyze(){

    const text =
    transcriptBox.value;

    const prompt = `
Analyze this content:

${text}

Return:

1. Summary

2. 3 Key Points

3. 5 Flashcards

Format clearly.
`;

    const response =
    await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
        method:"POST",

        headers:{
            "Content-Type":
            "application/json"
        },

        body:JSON.stringify({
            contents:[
                {
                    parts:[
                        {
                            text:prompt
                        }
                    ]
                }
            ]
        })
    });

    const data =
    await response.json();

    const result =
    data.candidates[0]
    .content.parts[0].text;

    document.getElementById(
        "result"
    ).innerText = result;
}

function exportTXT(){

    const text =
    transcriptBox.value;

    const blob =
    new Blob(
        [text],
        {type:"text/plain"}
    );

    const a =
    document.createElement("a");

    a.href =
    URL.createObjectURL(blob);

    a.download =
    "notes.txt";

    a.click();
}

function exportMD(){

    const content =
    document.getElementById(
        "result"
    ).innerText;

    const blob =
    new Blob(
        [content],
        {type:"text/markdown"}
    );

    const a =
    document.createElement("a");

    a.href =
    URL.createObjectURL(blob);

    a.download =
    "notes.md";

    a.click();
}
document
.getElementById("stopBtn")
.addEventListener("click", () => {

    recognition.stop();

    clearInterval(
        timerInterval
    );

    document
    .getElementById("recordBtn")
    .classList.remove(
        "recording"
    );

});