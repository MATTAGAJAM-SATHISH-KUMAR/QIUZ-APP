sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
], function (BaseController, JSONModel, MessageToast, MessageBox, formatter) {
    "use strict";

    return BaseController.extend("quiz.app.controller.TakeQuiz", {
        formatter: formatter,
        _iTimerId: null,

        onInit: function () {
            this.setModel(new JSONModel({
                busy: true,
                attemptId: null,
                quizTitle: "",
                timeLimit: null,
                startedAt: null,
                questions: [],
                currentIndex: 0,
                currentQuestion: null,
                totalQuestions: 0,
                questionLabel: "",
                progressPercent: 0,
                timeDisplay: "",
                timeWarning: false,
                answers: {}
            }), "quizView");

            this.getRouter().getRoute("takeQuiz").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            if (!this.checkAuth()) { return; }
            var sQuizId = oEvent.getParameter("arguments").quizId;
            this._startQuiz(sQuizId);
        },

        _startQuiz: function (sQuizId) {
            var oModel = this.getModel("quizView");
            oModel.setProperty("/busy", true);

            this.callAction("quiz", "startAttempt", { quizId: sQuizId })
                .then(function (oResult) {
                    oModel.setProperty("/attemptId", oResult.attemptId);
                    oModel.setProperty("/quizTitle", oResult.quizTitle);
                    oModel.setProperty("/timeLimit", oResult.timeLimit);
                    oModel.setProperty("/startedAt", oResult.startedAt);
                    oModel.setProperty("/questions", oResult.questions || []);
                    oModel.setProperty("/totalQuestions", (oResult.questions || []).length);
                    oModel.setProperty("/currentIndex", 0);
                    oModel.setProperty("/answers", {});

                    this._updateCurrentQuestion();
                    this._startTimer(oResult.timeLimit, oResult.startedAt);
                    oModel.setProperty("/busy", false);
                }.bind(this))
                .catch(function (oError) {
                    oModel.setProperty("/busy", false);
                    MessageBox.error("Failed to start quiz. " + (oError.message || ""));
                    this.onNavBack();
                }.bind(this));
        },

        _updateCurrentQuestion: function () {
            var oModel = this.getModel("quizView");
            var iIndex = oModel.getProperty("/currentIndex");
            var aQuestions = oModel.getProperty("/questions");
            var iTotal = aQuestions.length;

            oModel.setProperty("/currentQuestion", aQuestions[iIndex] || null);
            oModel.setProperty("/questionLabel",
                this.getResourceBundle().getText("questionOf", [iIndex + 1, iTotal]));
            oModel.setProperty("/progressPercent", Math.round(((iIndex + 1) / iTotal) * 100));

            // Restore saved answer for this question
            var sQuestionId = aQuestions[iIndex] ? aQuestions[iIndex].id : null;
            var oAnswers = oModel.getProperty("/answers");
            oModel.setProperty("/currentAnswer", oAnswers[sQuestionId] || {});

            // Restore list selection
            this._restoreSelection();
        },

        _restoreSelection: function () {
            var oModel = this.getModel("quizView");
            var oQuestion = oModel.getProperty("/currentQuestion");
            if (!oQuestion) { return; }

            var oAnswers = oModel.getProperty("/answers");
            var sSaved = oAnswers[oQuestion.id];
            if (!sSaved) { return; }

            // Selection restoration is handled on next render cycle
            setTimeout(function () {
                var sType = oQuestion.questionType;
                if (sType === "mcq_single" || sType === "true_false") {
                    var oList = this.byId("singleOptionsList");
                    if (oList && sSaved.selectedOptions) {
                        var aItems = oList.getItems();
                        aItems.forEach(function (oItem) {
                            var sOptionId = oItem.getBindingContext("quizView").getProperty("id");
                            if (sSaved.selectedOptions.indexOf(sOptionId) >= 0) {
                                oList.setSelectedItem(oItem);
                            }
                        });
                    }
                } else if (sType === "mcq_multi") {
                    var oMultiList = this.byId("multiOptionsList");
                    if (oMultiList && sSaved.selectedOptions) {
                        var aMultiItems = oMultiList.getItems();
                        aMultiItems.forEach(function (oItem) {
                            var sOptionId = oItem.getBindingContext("quizView").getProperty("id");
                            oItem.setSelected(sSaved.selectedOptions.indexOf(sOptionId) >= 0);
                        });
                    }
                }
            }.bind(this), 100);
        },

        _startTimer: function (iTimeLimit, sStartedAt) {
            if (this._iTimerId) {
                clearInterval(this._iTimerId);
            }
            if (!iTimeLimit) { return; }

            var oModel = this.getModel("quizView");
            var dStart = new Date(sStartedAt);
            var iLimitMs = iTimeLimit * 60 * 1000;

            this._iTimerId = setInterval(function () {
                var iElapsed = Date.now() - dStart.getTime();
                var iRemaining = Math.max(0, Math.floor((iLimitMs - iElapsed) / 1000));

                oModel.setProperty("/timeDisplay", formatter.formatTimerDisplay(iRemaining));
                oModel.setProperty("/timeWarning", iRemaining < 60);

                if (iRemaining <= 0) {
                    clearInterval(this._iTimerId);
                    this._autoSubmit();
                }
            }.bind(this), 1000);
        },

        _autoSubmit: function () {
            MessageBox.warning("Time is up! Your quiz is being submitted automatically.");
            this._submitQuiz();
        },

        onSingleSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var sOptionId = oItem.getBindingContext("quizView").getProperty("id");
            this._saveCurrentAnswer([sOptionId]);
        },

        onMultiSelect: function (oEvent) {
            var oList = oEvent.getSource();
            var aSelected = oList.getSelectedItems().map(function (oItem) {
                return oItem.getBindingContext("quizView").getProperty("id");
            });
            this._saveCurrentAnswer(aSelected);
        },

        _saveCurrentAnswer: function (aSelectedOptions) {
            var oModel = this.getModel("quizView");
            var oQuestion = oModel.getProperty("/currentQuestion");
            if (!oQuestion) { return; }

            var oAnswers = oModel.getProperty("/answers");
            oAnswers[oQuestion.id] = {
                selectedOptions: aSelectedOptions,
                questionId: oQuestion.id
            };
            oModel.setProperty("/answers", oAnswers);

            // Auto-save to server
            this.callAction("quiz", "saveAnswer", {
                attemptId: oModel.getProperty("/attemptId"),
                questionId: oQuestion.id,
                selectedOptions: aSelectedOptions
            }).catch(function () {
                // Silent fail — answer is saved locally
            });
        },

        onPrevious: function () {
            var oModel = this.getModel("quizView");
            var iIndex = oModel.getProperty("/currentIndex");
            if (iIndex > 0) {
                oModel.setProperty("/currentIndex", iIndex - 1);
                this._updateCurrentQuestion();
            }
        },

        onNext: function () {
            var oModel = this.getModel("quizView");
            var iIndex = oModel.getProperty("/currentIndex");
            var iTotal = oModel.getProperty("/totalQuestions");
            if (iIndex < iTotal - 1) {
                oModel.setProperty("/currentIndex", iIndex + 1);
                this._updateCurrentQuestion();
            }
        },

        onSubmit: function () {
            MessageBox.confirm(this.getResourceBundle().getText("submitConfirm"), {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._submitQuiz();
                    }
                }.bind(this)
            });
        },

        _submitQuiz: function () {
            if (this._iTimerId) {
                clearInterval(this._iTimerId);
            }

            var oModel = this.getModel("quizView");
            var sAttemptId = oModel.getProperty("/attemptId");

            oModel.setProperty("/busy", true);

            this.callAction("quiz", "submitAttempt", { attemptId: sAttemptId })
                .then(function (oResult) {
                    MessageToast.show(this.getResourceBundle().getText("quizSubmitted"));
                    this.navTo("attemptReview", { attemptId: oResult.attemptId });
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error("Failed to submit. " + (oError.message || ""));
                })
                .finally(function () {
                    oModel.setProperty("/busy", false);
                });
        },

        onExit: function () {
            if (this._iTimerId) {
                clearInterval(this._iTimerId);
            }
        }
    });
});
