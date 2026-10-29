// ==========================================
// [공용] 임원진 승인 창 및 세션 기반 누적 점수 관리
// ==========================================

// 1. CSS 주입
(function injectAuthModalCSS() {
    if (document.getElementById('auth-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'auth-modal-style';
    style.innerHTML = `
        #auth-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            padding: 20px;
        }
        #auth-modal-box {
            width: 100%;
            max-width: 380px;
            background: #181818;
            border: 2px solid #444;
            border-radius: 16px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            color: #fff;
            font-family: Arial, sans-serif;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .auth-modal-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 5px;
        }
        .auth-modal-input-group {
            display: flex;
            gap: 10px;
        }
        .auth-modal-input {
            flex: 1;
            padding: 12px;
            background: #222;
            border: 1px solid #555;
            border-radius: 8px;
            color: #fff;
            font-size: 16px;
            text-align: center;
            letter-spacing: 2px;
        }
        .auth-modal-input:focus {
            outline: none;
            border-color: #00ff88;
        }
        .auth-modal-btn {
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
        }
        .auth-modal-btn:active {
            transform: scale(0.96);
        }
        #auth-btn-confirm {
            background: #fff;
            color: #000;
        }
        #auth-btn-cancel {
            background: #444;
            color: #fff;
        }
    `;
    document.head.appendChild(style);
})();

// 2. HTML 구조 주입
(function injectAuthModalHTML() {
    if (document.getElementById('auth-modal-overlay')) return;

    const modalHTML = `
        <div id="auth-modal-overlay">
            <div id="auth-modal-box">
                <div class="auth-modal-title" id="auth-modal-title-text">승인 코드 5자리를 입력하세요</div>
                <div class="auth-modal-input-group">
                    <input type="password" id="auth-code-input" maxlength="5" placeholder="•••••" class="auth-modal-input">
                    <button id="auth-btn-confirm" class="auth-modal-btn">확인</button>
                    <button id="auth-btn-cancel" class="auth-modal-btn">취소</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
})();

// 3. 세션 기반 점수 관리 유틸리티 (새로고침 시 초기화, 페이지 이동 시 유지)
const ScoreManager = {
    getScore() {
        return Number(sessionStorage.getItem('gameTotalScore')) || 0;
    },
    addScore(points) {
        const current = this.getScore();
        const updated = current + points;
        sessionStorage.setItem('gameTotalScore', updated);
        return updated;
    },
    resetScore() {
        sessionStorage.setItem('gameTotalScore', 0);
    }
};

// 화면에 점수판(#game-score)이 있다면 자동으로 현재 누적 점수 반영
document.addEventListener('DOMContentLoaded', () => {
    const scoreEl = document.getElementById('game-score');
    if (scoreEl) {
        scoreEl.textContent = `현재 점수: ${ScoreManager.getScore().toFixed(2)}점`;
    }
});

// 4. 모달 제어 및 4가지 분기 로직
let currentActionType = null;
let currentActionPayload = null;

function openAuthModal(actionType, payload = null) {
    const overlay = document.getElementById('auth-modal-overlay');
    const input = document.getElementById('auth-code-input');
    const titleText = document.getElementById('auth-modal-title-text');

    input.value = '';
    overlay.style.display = 'flex';
    input.focus();

    currentActionType = actionType;
    currentActionPayload = payload;

    switch (actionType) {
        case 'SAVE_SCORE': titleText.textContent = "[점수 저장] 승인 코드 입력"; break;
        case 'PASS': titleText.textContent = "[패스/0점] 승인 코드 입력"; break;
        case 'RETRY': titleText.textContent = "[재시도] 승인 코드 입력"; break;
        case 'END_GAME': titleText.textContent = "[게임 종료] 승인 코드 입력"; break;
        default: titleText.textContent = "승인 코드 5자리를 입력하세요";
    }
}

function closeAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    overlay.style.display = 'none';
    currentActionType = null;
    currentActionPayload = null;
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('auth-modal-overlay');
    const input = document.getElementById('auth-code-input');
    const confirmBtn = document.getElementById('auth-btn-confirm');
    const cancelBtn = document.getElementById('auth-btn-cancel');

    cancelBtn.addEventListener('click', closeAuthModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAuthModal();
    });

    confirmBtn.addEventListener('click', () => {
        const enteredCode = input.value.trim();
        const action = currentActionType;
        const payload = currentActionPayload;

        // 🔑 4가지 경우에 따른 서로 다른 5자리 승인 코드
        const CODES = {
            SAVE_SCORE: "11111", // 1) 점수 저장 코드
            PASS:       "22222", // 2) 패스(0점) 코드
            RETRY:      "33333", // 3) 재시도 코드
            END_GAME:   "44444"  // 4) 게임 종료 코드
        };

        if (enteredCode === CODES[action]) {
            alert("승인이 완료되었습니다.");
            closeAuthModal();

            switch (action) {
                case 'SAVE_SCORE': {
                    const points = payload ? (payload.percentage || (payload.confidence * 100)) : 100;
                    const newTotal = ScoreManager.addScore(points);
                    sessionStorage.setItem('canPlay', 'true');
                    alert(`점수가 누적되었습니다! (총 점수: ${newTotal.toFixed(2)}점)`);
                    location.href = "index.html";
                    break;
                }
                case 'PASS': {
                    ScoreManager.addScore(0);
                    sessionStorage.setItem('canPlay', 'true');
                    alert("PASS 처리되었습니다. (0점 추가)");
                    location.href = "index.html";
                    break;
                }
                case 'RETRY': {
                    alert("재시도가 허용됩니다.");
                    location.href = "cam1.html";
                    break;
                }
                case 'END_GAME': {
                    alert("게임을 종료합니다.");
                    location.href = "end.html";
                    break;
                }
            }
        } else {
            alert("승인 코드가 틀렸습니다!");
            input.value = '';
            input.focus();
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmBtn.click();
    });
});