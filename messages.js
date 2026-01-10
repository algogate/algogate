/** A constant dictionary of all allowed message "types". */
const MSG = Object.freeze({
    LEETCODE_SOLVED: "LEETCODE_SOLVED", // Sent by the LeetCode content script when it detects a new accepted problem

    GET_GATE_STATUS: "GET_GATE_STATUS", // Popup or blocker asks background

    GATE_STATUS: "GATE_STATUS", // Background replies with current gate status

    START_GRACE_TIMER: "START_GRACE_TIMER", // Content script tells background: user is on /problems/ while locked

    URL_CHANGED: "URL_CHANGED", // Content script tells background: user navigated (may have left /problems/)

    ACCEPT_GRACE: "ACCEPT_GRACE", // UI tells background: user accepts grace period unlock

    SHOW_COMPLETED_POPUP: "SHOW_COMPLETED_POPUP"
});

/** tiny helper to build messages consistently */
function makeMessage(type, payload = null) {
    return { type, payload };
}

/** Basic check: is it an object with a string type? */
function isMessage(x) {
    return !!x && typeof x === "object" && typeof x.type === "string";
}

/**
 * Validate message payload shapes by type.
 * Return: { ok: true } OR { ok: false, error: "..." }
 *
 * This prevents silent failures when one part sends fields another part doesn't expect.
 */
function validateMessage(msg) {
    if (!isMessage(msg)) return { ok: false, error: "Message must be an object with a string `type`." };

    switch (msg.type) {

        case MSG.LEETCODE_SOLVED: {
            const p = msg.payload;
            if (!p || typeof p !== "object") return { ok: false, error: "LEETCODE_SOLVED requires an object `payload`." };
            if (typeof p.problemSlug !== "string" || !p.problemSlug.trim()) {
                return { ok: false, error: "LEETCODE_SOLVED.payload.problemSlug must be a non-empty string." };
            }
            if (typeof p.timestamp !== "number" || !Number.isFinite(p.timestamp)) {
                return { ok: false, error: "LEETCODE_SOLVED.payload.timestamp must be a finite number (Date.now())." };
            }
            if (p.title != null && typeof p.title !== "string") {
                return { ok: false, error: "LEETCODE_SOLVED.payload.title must be a string if provided." };
            }
            if (p.difficulty != null && typeof p.difficulty !== "string") {
                return { ok: false, error: "LEETCODE_SOLVED.payload.difficulty must be a string if provided." };
            }
            if (p.isNewSolve != null && typeof p.isNewSolve !== "boolean") {
                return { ok: false, error: "LEETCODE_SOLVED.payload.isNewSolve must be a boolean if provided." };
            }
            return { ok: true };
        }


        case MSG.GET_GATE_STATUS: {
            if (msg.payload != null && typeof msg.payload !== "object") {
                return { ok: false, error: "GET_GATE_STATUS payload must be null or an object." };
            }
            return { ok: true };
        }


        case MSG.GATE_STATUS: {
            const p = msg.payload;
            if (!p || typeof p !== "object") return { ok: false, error: "GATE_STATUS requires an object `payload`." };
            if (typeof p.locked !== "boolean") return { ok: false, error: "GATE_STATUS.payload.locked must be boolean." };
            if (!(p.unlockUntil === null || (typeof p.unlockUntil === "number" && Number.isFinite(p.unlockUntil)))) {
                return { ok: false, error: "GATE_STATUS.payload.unlockUntil must be a finite number or null." };
            }
            if (typeof p.secondsRemaining !== "number") {
                return { ok: false, error: "GATE_STATUS.payload.secondsRemaining must be number." };
            }
            if (typeof p.graceActive !== "boolean") return { ok: false, error: "GATE_STATUS.payload.graceActive must be boolean." };
            if (typeof p.graceSecondsRemaining !== "number") return { ok: false, error: "GATE_STATUS.payload.graceSecondsRemaining must be number." };
            if (typeof p.graceOffered !== "boolean") return { ok: false, error: "GATE_STATUS.payload.graceOffered must be boolean." };
            return { ok: true };
        }

        case MSG.START_GRACE_TIMER: {
            if (msg.payload != null && typeof msg.payload !== "object") {
                return { ok: false, error: "START_GRACE_TIMER payload must be null or an object." };
            }
            return { ok: true };
        }

        case MSG.URL_CHANGED: {
            const p = msg.payload;
            if (!p || typeof p !== "object") return { ok: false, error: "URL_CHANGED requires an object `payload`." };
            if (typeof p.isOnProblems !== "boolean") {
                return { ok: false, error: "URL_CHANGED.payload.isOnProblems must be a boolean." };
            }
            return { ok: true };
        }

        case MSG.ACCEPT_GRACE: {
            const p = msg.payload;
            if (!p || typeof p !== "object") return { ok: false, error: "ACCEPT_GRACE requires an object `payload`." };
            if (typeof p.graceDuration !== "number" || !Number.isFinite(p.graceDuration)) {
                return { ok: false, error: "ACCEPT_GRACE.payload.graceDuration must be a finite number (ms)." };
            }
            return { ok: true };
        }

        case MSG.SHOW_COMPLETED_POPUP: {
            const p = msg.payload;
            if (!p || typeof p !== "object") return { ok: false, error: "SHOW_COMPLETED_POPUP requires an object payload." };
            if (typeof p.problemSlug !== "string" || !p.problemSlug.trim()) {
                return { ok: false, error: "SHOW_COMPLETED_POPUP.payload.problemSlug must be a non-empty string." };
            }
            if (p.title != null && typeof p.title !== "string") {
                return { ok: false, error: "SHOW_COMPLETED_POPUP.payload.title must be a string if provided." };
            }
            return { ok: true };
        }

        default:
            return { ok: false, error: `Unknown message type: ${msg.type}` };
    }
}