"""
Speech-to-Text App với Meeting Mode
Sử dụng SpeechRecognition + Streamlit
"""

import streamlit as st
import speech_recognition as sr
import threading
import time
import queue
from datetime import datetime

# ─────────────────────────────────────────────
# CẤU HÌNH TRANG
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="🎙️ Speech-to-Text | Meeting Mode",
    page_icon="🎙️",
    layout="wide",
)

# ─────────────────────────────────────────────
# CSS TUỲ CHỈNH
# ─────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

/* Header */
.app-header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    padding: 2rem 2.5rem;
    border-radius: 16px;
    margin-bottom: 1.5rem;
    color: white;
}
.app-header h1 { margin: 0; font-size: 2rem; font-weight: 700; }
.app-header p  { margin: 0.4rem 0 0; opacity: 0.75; font-size: 0.95rem; }

/* Transcript box */
.transcript-box {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 1.5rem;
    min-height: 320px;
    max-height: 520px;
    overflow-y: auto;
    font-size: 0.95rem;
    line-height: 1.7;
    color: #e6edf3;
}

/* Chat bubbles – meeting mode */
.bubble-wrapper { display: flex; margin-bottom: 1rem; align-items: flex-start; }
.bubble-wrapper.right { flex-direction: row-reverse; }

.avatar {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
}
.avatar-1 { background: #0f3460; color: #58a6ff; margin-right: 10px; }
.avatar-2 { background: #3d1a78; color: #d2a8ff; margin-left: 10px; }

.bubble {
    max-width: 72%;
    padding: 0.7rem 1rem;
    border-radius: 12px;
    font-size: 0.92rem;
    line-height: 1.6;
}
.bubble-1 {
    background: #1c2d40;
    border: 1px solid #1f4068;
    color: #cdd9e5;
    border-top-left-radius: 2px;
}
.bubble-2 {
    background: #261c3f;
    border: 1px solid #4b2d8a;
    color: #d5c8f0;
    border-top-right-radius: 2px;
}
.speaker-label {
    font-size: 0.72rem;
    font-weight: 600;
    opacity: 0.6;
    margin-bottom: 3px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}
.ts { font-size: 0.7rem; opacity: 0.45; margin-top: 4px; }

/* Normal transcript line */
.normal-line {
    padding: 0.4rem 0;
    border-bottom: 1px solid #21262d;
    color: #e6edf3;
}
.normal-line .ts { display: inline; margin-left: 8px; }

/* Status badge */
.status-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.03em;
}
.status-listening {
    background: #0d3b1e; color: #3fb950;
    border: 1px solid #238636;
    animation: pulse 1.6s infinite;
}
.status-idle { background: #1c2128; color: #8b949e; border: 1px solid #30363d; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }

/* Metric cards */
.metric-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 1rem 1.2rem;
    text-align: center;
}
.metric-card .val { font-size: 1.6rem; font-weight: 700; color: #58a6ff; }
.metric-card .lbl { font-size: 0.75rem; color: #8b949e; margin-top: 2px; }

/* Buttons */
.stButton > button {
    border-radius: 8px !important;
    font-weight: 600 !important;
    transition: all .2s !important;
}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# SESSION STATE KHỞI TẠO
# ─────────────────────────────────────────────
def init_state():
    defaults = {
        "is_listening":    False,
        "meeting_mode":    False,
        "current_speaker": 1,
        "transcript":      [],        # list of dict
        "word_count":      0,
        "session_start":   None,
        "result_queue":    queue.Queue(),
        "stop_event":      threading.Event(),
        "listen_thread":   None,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_state()

# ─────────────────────────────────────────────
# HÀM NGHE + NHẬN DẠNG (chạy trên thread phụ)
# ─────────────────────────────────────────────
DEFAULT_LANGUAGE = "vi-VN"

PAUSE_THRESHOLD   = 1.2   # giây im lặng → kết thúc 1 lượt nói
ENERGY_THRESHOLD  = 300   # ngưỡng tiếng ồn môi trường

def listen_loop(result_q: queue.Queue, stop_evt: threading.Event,
                lang: str, meeting: bool):
    """
    Vòng lặp liên tục: lắng nghe → nhận dạng → đẩy kết quả vào queue.
    Chạy trong thread riêng để không block Streamlit.
    """
    recognizer = sr.Recognizer()
    recognizer.pause_threshold   = PAUSE_THRESHOLD
    recognizer.energy_threshold  = ENERGY_THRESHOLD
    recognizer.dynamic_energy_threshold = True

    try:
        mic = sr.Microphone()
    except Exception as e:
        result_q.put({"type": "error", "text": f"Không tìm thấy micro: {e}"})
        return

    with mic as source:
        recognizer.adjust_for_ambient_noise(source, duration=1)

    while not stop_evt.is_set():
        try:
            with mic as source:
                audio = recognizer.listen(source, timeout=5, phrase_time_limit=30)

            if stop_evt.is_set():
                break

            try:
                text = recognizer.recognize_google(audio, language=lang)
                if text.strip():
                    result_q.put({
                        "type":    "text",
                        "text":    text.strip(),
                        "time":    datetime.now().strftime("%H:%M:%S"),
                        "meeting": meeting,
                    })
            except sr.UnknownValueError:
                pass  # im lặng / không rõ
            except sr.RequestError as e:
                result_q.put({"type": "error",
                              "text": f"Lỗi Google API: {e}. Kiểm tra kết nối mạng."})

        except sr.WaitTimeoutError:
            pass  # hết 5 giây không có âm thanh → vòng tiếp
        except Exception as e:
            if not stop_evt.is_set():
                result_q.put({"type": "error", "text": str(e)})
            break

# ─────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────
st.markdown("""
<div class="app-header">
  <h1>🎙️ Speech-to-Text</h1>
  <p>Nhận dạng giọng nói thời gian thực · Hỗ trợ Tiếng Việt & English · Meeting Mode</p>
</div>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# THANH ĐIỀU KHIỂN
# ─────────────────────────────────────────────
ctrl_col2, ctrl_col3, ctrl_col4 = st.columns([2, 2, 2])

with ctrl_col2:
    meeting_toggle = st.toggle(
        "👥 Meeting Mode",
        value=st.session_state.meeting_mode,
        disabled=st.session_state.is_listening,
        help="Phân chia hội thoại theo từng lượt phát biểu",
    )
    st.session_state.meeting_mode = meeting_toggle

with ctrl_col3:
    if st.session_state.meeting_mode and st.session_state.is_listening:
        spk = st.session_state.current_speaker
        label = f"Người nói {spk}"
        color = "#58a6ff" if spk == 1 else "#d2a8ff"
        st.markdown(f"**🔄 Đang ghi:**")
        st.markdown(f"<span style='color:{color};font-weight:700;font-size:1.1rem'>"
                    f"{label}</span>", unsafe_allow_html=True)
        if st.button("↔️ Đổi người nói", use_container_width=True):
            st.session_state.current_speaker = 2 if spk == 1 else 1
            st.rerun()
    else:
        st.markdown("&nbsp;")

with ctrl_col4:
    if not st.session_state.is_listening:
        if st.button("▶️ Bắt đầu ghi âm", type="primary",
                     use_container_width=True):
            st.session_state.is_listening  = True
            st.session_state.session_start = datetime.now()
            st.session_state.stop_event    = threading.Event()
            t = threading.Thread(
                target=listen_loop,
                args=(
                    st.session_state.result_queue,
                    st.session_state.stop_event,
                    DEFAULT_LANGUAGE,
                    st.session_state.meeting_mode,
                ),
                daemon=True,
            )
            st.session_state.listen_thread = t
            t.start()
            st.rerun()
    else:
        if st.button("⏹️ Dừng ghi âm", type="secondary",
                     use_container_width=True):
            st.session_state.is_listening = False
            st.session_state.stop_event.set()
            st.rerun()

st.markdown("---")

# ─────────────────────────────────────────────
# ĐỌC KẾT QUẢ TỪ QUEUE (không block)
# ─────────────────────────────────────────────
new_items = 0
while not st.session_state.result_queue.empty():
    item = st.session_state.result_queue.get_nowait()
    if item["type"] == "text":
        entry = {
            "text":    item["text"],
            "time":    item["time"],
            "speaker": st.session_state.current_speaker
                       if item["meeting"] else None,
        }
        st.session_state.transcript.append(entry)
        st.session_state.word_count += len(item["text"].split())

        # Meeting mode: tự động đổi người nói sau mỗi câu nếu muốn
        # (người dùng cũng có thể đổi thủ công qua nút bấm)
        if item["meeting"]:
            st.session_state.current_speaker = (
                2 if st.session_state.current_speaker == 1 else 1
            )
        new_items += 1

    elif item["type"] == "error":
        st.error(item["text"])

# ─────────────────────────────────────────────
# STATUS + METRICS
# ─────────────────────────────────────────────
stat_col, m1, m2, m3 = st.columns([3, 1, 1, 1])

with stat_col:
    if st.session_state.is_listening:
        st.markdown(
            '<span class="status-badge status-listening">🔴 Đang lắng nghe…</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<span class="status-badge status-idle">⚪ Chờ bắt đầu</span>',
            unsafe_allow_html=True,
        )

with m1:
    st.markdown(f"""<div class="metric-card">
        <div class="val">{len(st.session_state.transcript)}</div>
        <div class="lbl">Câu</div></div>""", unsafe_allow_html=True)

with m2:
    st.markdown(f"""<div class="metric-card">
        <div class="val">{st.session_state.word_count}</div>
        <div class="lbl">Từ</div></div>""", unsafe_allow_html=True)

with m3:
    if st.session_state.session_start:
        elapsed = int((datetime.now() - st.session_state.session_start
                       ).total_seconds())
        mins, secs = divmod(elapsed, 60)
        timer_str = f"{mins:02d}:{secs:02d}"
    else:
        timer_str = "00:00"
    st.markdown(f"""<div class="metric-card">
        <div class="val">{timer_str}</div>
        <div class="lbl">Thời gian</div></div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# HIỂN THỊ TRANSCRIPT
# ─────────────────────────────────────────────
transcript = st.session_state.transcript

if not transcript:
    st.markdown("""
    <div class="transcript-box" style="display:flex;align-items:center;
         justify-content:center;color:#484f58;font-size:1rem;">
      <div style="text-align:center">
        <div style="font-size:2.5rem;margin-bottom:.5rem">🎙️</div>
        <div>Nhấn <strong>Bắt đầu ghi âm</strong> và bắt đầu nói…</div>
        <div style="font-size:.8rem;margin-top:.4rem;opacity:.6">
          Đảm bảo trình duyệt có quyền truy cập micro</div>
      </div>
    </div>
    """, unsafe_allow_html=True)

else:
    if st.session_state.meeting_mode:
        # ── CHẾ ĐỘ MEETING: hiển thị dạng chat bubble ──
        bubbles_html = '<div class="transcript-box">'
        for entry in transcript:
            spk = entry.get("speaker", 1) or 1
            side   = "right" if spk == 2 else ""
            av_cls = f"avatar-{spk}"
            bb_cls = f"bubble-{spk}"
            initial = "A" if spk == 1 else "B"
            label   = f"Người nói {spk}"
            bubbles_html += f"""
            <div class="bubble-wrapper {side}">
              <div class="avatar {av_cls}">{initial}</div>
              <div>
                <div class="speaker-label" style="text-align:{'left' if spk==1 else 'right'}">{label}</div>
                <div class="bubble {bb_cls}">{entry['text']}</div>
                <div class="ts" style="text-align:{'left' if spk==1 else 'right'}">{entry['time']}</div>
              </div>
            </div>"""
        bubbles_html += "</div>"
        st.markdown(bubbles_html, unsafe_allow_html=True)

    else:
        # ── CHẾ ĐỘ THƯỜNG: danh sách dòng ──
        lines_html = '<div class="transcript-box">'
        for entry in transcript:
            lines_html += f"""
            <div class="normal-line">
              {entry['text']}
              <span class="ts">{entry['time']}</span>
            </div>"""
        lines_html += "</div>"
        st.markdown(lines_html, unsafe_allow_html=True)

# ─────────────────────────────────────────────
# NÚT XOÁ + XUẤT FILE
# ─────────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)

if st.button("🗑️ Xoá transcript", disabled=not transcript):
    st.session_state.transcript  = []
    st.session_state.word_count  = 0
    st.session_state.session_start = None
    st.rerun()

# ─────────────────────────────────────────────
# AUTO-REFRESH KHI ĐANG NGHE
# ─────────────────────────────────────────────
if st.session_state.is_listening:
    time.sleep(1.5)
    st.rerun()
