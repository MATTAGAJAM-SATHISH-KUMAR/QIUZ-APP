sap.ui.define([], function () {
    "use strict";

    return {
        formatDifficulty: function (sDifficulty) {
            if (!sDifficulty) { return ""; }
            return sDifficulty.charAt(0).toUpperCase() + sDifficulty.slice(1);
        },

        formatDifficultyState: function (sDifficulty) {
            switch (sDifficulty) {
                case "easy": return "Success";
                case "medium": return "Warning";
                case "hard": return "Error";
                case "expert": return "Error";
                default: return "None";
            }
        },

        formatTimeLimit: function (iMinutes) {
            if (!iMinutes) { return "Unlimited"; }
            return iMinutes + " min";
        },

        formatScore: function (nScore, nMax) {
            if (nScore == null || nMax == null) { return "—"; }
            return nScore + " / " + nMax;
        },

        formatPercent: function (nValue) {
            if (nValue == null) { return "—"; }
            return parseFloat(nValue).toFixed(1) + "%";
        },

        formatPassedState: function (bPassed) {
            return bPassed ? "Success" : "Error";
        },

        formatPassedText: function (bPassed) {
            return bPassed ? "Passed" : "Failed";
        },

        formatStatus: function (sStatus) {
            if (!sStatus) { return ""; }
            return sStatus.replace(/_/g, " ").replace(/\b\w/g, function (c) {
                return c.toUpperCase();
            });
        },

        formatStatusState: function (sStatus) {
            switch (sStatus) {
                case "draft": return "None";
                case "published": return "Success";
                case "archived": return "Warning";
                case "submitted": return "Information";
                case "graded": return "Success";
                case "in_progress": return "Warning";
                case "expired": return "Error";
                default: return "None";
            }
        },

        formatDate: function (sDate) {
            if (!sDate) { return ""; }
            var oDate = new Date(sDate);
            return oDate.toLocaleDateString() + " " + oDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },

        formatSeconds: function (iSeconds) {
            if (!iSeconds) { return "—"; }
            var iMins = Math.floor(iSeconds / 60);
            var iSecs = iSeconds % 60;
            return iMins + "m " + iSecs + "s";
        },

        formatTimerDisplay: function (iTotalSeconds) {
            if (iTotalSeconds == null) { return ""; }
            var iMins = Math.floor(iTotalSeconds / 60);
            var iSecs = iTotalSeconds % 60;
            return String(iMins).padStart(2, "0") + ":" + String(iSecs).padStart(2, "0");
        },

        formatBoolean: function (bValue) {
            return bValue ? "Yes" : "No";
        }
    };
});
